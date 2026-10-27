import { barcodeKey, validBarcode } from './domain';

export type ProductResult = { status: 'found'; name: string } | { status: 'missing' | 'unavailable' };

// A barcode lookup sends only the code, never the session or its prices/items.
export async function lookupProduct(barcode: string, signal?: AbortSignal): Promise<ProductResult> {
  if (!validBarcode(barcode)) return { status: 'missing' };
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 7000);
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcodeKey(barcode))}?fields=product_name,product_name_en`, {
      headers: { Accept: 'application/json', 'User-Agent': 'ShopScan/1.0 (personal grocery scanner)' },
      signal: controller.signal,
    });
    if (response.status === 404) return { status: 'missing' };
    if (!response.ok) return { status: 'unavailable' };
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('product' in data) || !data.product || typeof data.product !== 'object') return { status: 'missing' };
    const product = data.product as Record<string, unknown>;
    const name = [product.product_name_en, product.product_name].find(value => typeof value === 'string' && value.trim());
    return typeof name === 'string' ? { status: 'found', name: name.trim().slice(0, 200) } : { status: 'missing' };
  } catch {
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

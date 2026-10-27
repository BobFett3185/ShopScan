export type Session = { id: string; name: string; createdAt: string; updatedAt: string; status: 'active' | 'finished' };
export type SessionSummary = Session & { itemCount: number };
export type Item = { id: string; sessionId: string; barcode: string; productName: string; price: number; quantity: number; createdAt: string; updatedAt: string };
export type Draft = { productName: string; barcode: string; price: string; quantity: string };
export type ItemInput = Pick<Item, 'productName' | 'barcode' | 'price' | 'quantity'>;
export type FieldErrors = Partial<Record<keyof Draft, string>>;

export function cents(value: string): number {
  const text = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Enter a non-negative price with up to 2 decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount)) throw new Error('This price is too large.');
  return amount;
}

export function decimal(amount: number): string {
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`;
}
export function money(amount: number): string { return `$${decimal(amount)}`; }
export function total(items: Pick<Item, 'price' | 'quantity'>[]): number {
  return items.reduce((sum, item) => {
    const line = item.price * item.quantity;
    const next = sum + line;
    if (!Number.isSafeInteger(line) || !Number.isSafeInteger(next)) throw new Error('The total is too large. Reduce the price or quantity.');
    return next;
  }, 0);
}
export function barcodeKey(code: string): string {
  const text = code.trim();
  return /^\d{12}$/.test(text) ? `0${text}` : text;
}
export function validBarcode(code: string): boolean { return /^(\d{8}|\d{12}|\d{13})$/.test(code.trim()); }
export function validate(draft: Draft, barcodeRequired = false): { errors: FieldErrors; value?: ItemInput } {
  const errors: FieldErrors = {};
  const productName = draft.productName.trim();
  const barcode = draft.barcode.trim();
  if (!productName || productName.length > 200) errors.productName = 'Enter a product name (up to 200 characters).';
  if ((barcodeRequired || barcode !== '') && !validBarcode(barcode)) errors.barcode = 'Enter an 8, 12, or 13-digit grocery barcode.';
  let price = 0;
  try { price = cents(draft.price); } catch (error) { errors.price = (error as Error).message; }
  const quantity = Number(draft.quantity);
  if (!/^\d+$/.test(draft.quantity.trim()) || !Number.isSafeInteger(quantity) || quantity < 1) errors.quantity = 'Enter a positive whole-number quantity.';
  if (!errors.price && !errors.quantity) {
    try { total([{ price, quantity }]); } catch (error) { errors.quantity = (error as Error).message; }
  }
  return Object.keys(errors).length ? { errors } : { errors, value: { productName, barcode, price, quantity } };
}

const headers = ['Date', 'Session Name', 'Product Name', 'Barcode', 'Price', 'Quantity', 'Line Total'];
function csvCell(text: string): string { return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function safeText(text: string): string { return /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? `'${text}` : text; }
export function toCsv(session: Session, items: Item[]): string {
  const rows = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).map(item => [
    session.createdAt.slice(0, 10), safeText(session.name), safeText(item.productName), item.barcode,
    decimal(item.price), String(item.quantity), decimal(total([item])),
  ].map(csvCell).join(','));
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n') + '\r\n';
}

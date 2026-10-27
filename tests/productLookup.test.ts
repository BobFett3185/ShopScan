import { lookupProduct } from '../src/productLookup';

const originalFetch = global.fetch;
const mockFetch = jest.fn();
beforeEach(() => { global.fetch = mockFetch; mockFetch.mockReset(); });
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });
test('fetches a canonical barcode and returns an English name', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ product: { product_name: 'Lait', product_name_en: 'Milk', quantity: '500 g' } }) });
  expect(await lookupProduct('123456789012')).toEqual({ status: 'found', name: 'Milk' });
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/0123456789012?fields=product_name,product_name_en'), expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.stringContaining('ShopScan/') }) }));
});
test('uses the original product name when English is absent', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ product: { product_name: '  Café  ' } }) });
  expect(await lookupProduct('3017620422003')).toEqual({ status: 'found', name: 'Café' });
});
test.each([null, {}, { product: {} }, { product: { product_name: 123 } }])('handles missing or malformed product data', async data => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => data });
  expect(await lookupProduct('3017620422003')).toEqual({ status: 'missing' });
});
test('handles missing products, rate limits, and offline access', async () => {
  mockFetch.mockResolvedValueOnce({ status: 404 }).mockResolvedValueOnce({ status: 429, ok: false }).mockRejectedValueOnce(new Error('Offline'));
  expect(await lookupProduct('3017620422003')).toEqual({ status: 'missing' });
  expect(await lookupProduct('3017620422003')).toEqual({ status: 'unavailable' });
  expect(await lookupProduct('3017620422003')).toEqual({ status: 'unavailable' });
});
test('times out and releases the form for manual entry', async () => {
  jest.useFakeTimers();
  mockFetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')))));
  const result = lookupProduct('3017620422003');
  await jest.advanceTimersByTimeAsync(7000);
  expect(await result).toEqual({ status: 'unavailable' });
});
test('aborts an in-flight lookup when its screen leaves', async () => {
  mockFetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')))));
  const controller = new AbortController(); const result = lookupProduct('3017620422003', controller.signal);
  controller.abort(); expect(await result).toEqual({ status: 'unavailable' });
});

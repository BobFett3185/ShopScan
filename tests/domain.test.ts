import { parse } from 'csv-parse/sync';
import { barcodeKey, cents, decimal, Item, Session, toCsv, total, validate } from '../src/domain';

const draft = { productName: 'Milk', barcode: '', price: '3.49', quantity: '1' };
test('uses exact cents for prices, quantities, and totals', () => {
  expect(cents('0.10')).toBe(10);
  expect(cents('3,49')).toBe(349);
  expect(decimal(total([{ price: cents('0.10'), quantity: 3 }, { price: cents('0.20'), quantity: 1 }]))).toBe('0.50');
  expect(cents('0')).toBe(0);
});
test.each(['', '-1', '1.234', '1e3', 'NaN', 'Infinity', '1,234.56', '9007199254740992'])('rejects invalid price %s', price => {
  expect(validate({ ...draft, price }).errors.price).toBeDefined();
});
test.each(['0', '-2', '1.5', '1e2', '', '9007199254740992'])('rejects invalid quantity %s', quantity => {
  expect(validate({ ...draft, quantity }).errors.quantity).toBeDefined();
});
test('requires names and barcode only in barcode flows', () => {
  expect(validate({ ...draft, productName: '  ' }).errors.productName).toBeDefined();
  expect(validate(draft).value).toBeDefined();
  expect(validate(draft, true).errors.barcode).toBeDefined();
  expect(validate({ ...draft, barcode: '001234567890' }, true).value?.barcode).toBe('001234567890');
});
test('rejects unsafe line and aggregate totals', () => {
  expect(() => total([{ price: Number.MAX_SAFE_INTEGER, quantity: 2 }])).toThrow();
  expect(() => total([{ price: Number.MAX_SAFE_INTEGER, quantity: 1 }, { price: 1, quantity: 1 }])).toThrow();
});
test('normalizes UPC-A versus EAN without stripping barcode zeros', () => {
  expect(barcodeKey('123456789012')).toBe(barcodeKey('0123456789012'));
  expect(barcodeKey('00123456')).toBe('00123456');
});
test('CSV round trips Unicode, commas, quotes, newlines, empty codes and safe text', () => {
  const session: Session = { id: 's1', name: 'Market, "Saturday"', status: 'active', createdAt: '2026-10-27T12:00:00.000Z', updatedAt: '2026-10-27T12:00:00.000Z' };
  const item: Item = { id: '1', sessionId: 's1', productName: 'Café, "milk"\n🥛', barcode: '001234567890', price: 349, quantity: 2, createdAt: session.createdAt, updatedAt: session.createdAt };
  const csv = toCsv(session, [item, { ...item, id: '2', barcode: '', productName: '=1+1', price: 0 }]);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('\r\n');
  const rows = parse<Record<string, string>>(csv, { columns: true, bom: true });
  expect(Object.keys(rows[0])).toEqual(['Date', 'Session Name', 'Product Name', 'Barcode', 'Price', 'Quantity', 'Line Total']);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ Date: '2026-10-27', 'Session Name': session.name, 'Product Name': item.productName, Barcode: '001234567890', Price: '3.49', Quantity: '2', 'Line Total': '6.98' });
  expect(rows[1]['Product Name']).toBe("'=1+1");
  expect(rows[1].Barcode).toBe('');
  expect(rows[1].Price).toBe('0.00');
});

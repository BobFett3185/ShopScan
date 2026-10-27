import { shareSession } from '../src/export';
import { Item, Session } from '../src/domain';

const mockWrite = jest.fn(); const mockShare = jest.fn(); const mockAvailable = jest.fn();
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache/' },
  Directory: class { create() {} list() { return []; } },
  File: class { uri = 'file:///cache/export.csv'; write(text: string) { mockWrite(text); } },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: () => mockAvailable(), shareAsync: (...args: unknown[]) => mockShare(...args) }));
const session: Session = { id: 'trip', name: 'Trip', status: 'active', createdAt: '2026-10-27T12:00:00.000Z', updatedAt: '2026-10-27T12:00:00.000Z' };
const item: Item = { id: 'item', sessionId: 'trip', productName: 'Milk', barcode: '', price: 349, quantity: 1, createdAt: session.createdAt, updatedAt: session.createdAt };
beforeEach(() => { mockWrite.mockReset(); mockShare.mockReset(); mockAvailable.mockResolvedValue(true); });
test('writes CSV and passes file metadata to the share sheet', async () => {
  await shareSession(session, [item]);
  expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('3.49,1,3.49'));
  expect(mockShare).toHaveBeenCalledWith('file:///cache/export.csv', expect.objectContaining({ mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' }));
});
test('empty session and unavailable sharing do not write files', async () => {
  await expect(shareSession(session, [])).rejects.toThrow('Add an item');
  mockAvailable.mockResolvedValue(false);
  await expect(shareSession(session, [item])).rejects.toThrow('unavailable');
  expect(mockWrite).not.toHaveBeenCalled();
});
test('write failure does not open share sheet', async () => {
  mockWrite.mockImplementation(() => { throw new Error('Disk full'); });
  await expect(shareSession(session, [item])).rejects.toThrow('Disk full');
  expect(mockShare).not.toHaveBeenCalled();
});
test('share cancellation and repeated export leave source data unchanged', async () => {
  const before = JSON.stringify([session, item]);
  mockShare.mockResolvedValue(undefined);
  await shareSession(session, [item]); await shareSession(session, [item]);
  expect(JSON.stringify([session, item])).toBe(before);
  expect(mockShare).toHaveBeenCalledTimes(2);
});

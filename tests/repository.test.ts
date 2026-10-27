/** @jest-environment node */
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database, DuplicateBarcodeError, initialize, Repository } from '../src/repository';
import { toCsv, total } from '../src/domain';

// Real SQLite engine, adapted to the same small interface used by expo-sqlite.
function adapter(sqlite: DatabaseSync): Database {
  return {
    execSync: sql => sqlite.exec(sql),
    runSync: (sql, ...params) => sqlite.prepare(sql).run(...params),
    getFirstSync: <T,>(sql: string, ...params: (string | number | null)[]) => (sqlite.prepare(sql).get(...params) as T) ?? null,
    getAllSync: <T,>(sql: string, ...params: (string | number | null)[]) => sqlite.prepare(sql).all(...params) as T[],
    withTransactionSync: task => { sqlite.exec('BEGIN'); try { task(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
  };
}
let sqlite: DatabaseSync;
let repo: Repository;
let clock: number;
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  const db = adapter(sqlite); initialize(db);
  let id = 0; clock = 0;
  repo = new Repository(db, () => `id-${++id}`, () => new Date(Date.UTC(2026, 9, 27, 12, 0, clock++)).toISOString());
});
afterEach(() => sqlite.close());
const milk = { productName: 'Milk', barcode: '123456789012', price: 349, quantity: 1 };

test('creates, manually adds, edits, deletes and updates counts/timestamps', () => {
  const session = repo.create('Weekly groceries');
  repo.saveItem(session.id, { ...milk, barcode: '' });
  let [item] = repo.items(session.id);
  expect(repo.sessions()[0].itemCount).toBe(1);
  expect(repo.session(session.id).updatedAt).not.toBe(session.updatedAt);
  repo.saveItem(session.id, { ...item, quantity: 2, price: 325 }, item.id);
  [item] = repo.items(session.id);
  expect(total([item])).toBe(650);
  repo.removeItem(session.id, item.id);
  expect(repo.items(session.id)).toHaveLength(0);
  expect(repo.sessions()[0].itemCount).toBe(0);
});
test('duplicate barcodes offer a safe increment and sessions stay independent', () => {
  const one = repo.create('One'); const two = repo.create('Two');
  repo.saveItem(one.id, milk);
  expect(() => repo.saveItem(one.id, { ...milk, barcode: '0123456789012' })).toThrow(DuplicateBarcodeError);
  const match = repo.duplicate(one.id, '0123456789012')!;
  repo.increment(one.id, match.id);
  expect(repo.items(one.id)[0]).toMatchObject({ price: 349, quantity: 2 });
  repo.saveItem(two.id, milk);
  expect(repo.items(two.id)[0].quantity).toBe(1);
});
test('allows multiple manual rows and blocks edits colliding with an existing code', () => {
  const session = repo.create('');
  repo.saveItem(session.id, milk);
  repo.saveItem(session.id, { ...milk, barcode: '' });
  repo.saveItem(session.id, { ...milk, barcode: '' });
  const manual = repo.items(session.id)[1];
  expect(() => repo.saveItem(session.id, milk, manual.id)).toThrow(DuplicateBarcodeError);
  expect(repo.items(session.id)).toHaveLength(3);
});
test('finished sessions can export and resume, without export changing state', () => {
  const session = repo.create('Weekend'); repo.saveItem(session.id, milk);
  repo.setStatus(session.id, 'finished');
  const before = repo.session(session.id);
  expect(toCsv(before, repo.items(session.id))).toContain('Weekend');
  expect(repo.session(session.id)).toEqual(before);
  expect(() => repo.saveItem(session.id, { ...milk, barcode: '' })).toThrow('Continue Shopping');
  repo.setStatus(session.id, 'active'); repo.saveItem(session.id, { ...milk, barcode: '' });
  expect(repo.items(session.id)).toHaveLength(2);
});
test('delete cascades without deleting another trip', () => {
  const one = repo.create('One'); const two = repo.create('Two');
  repo.saveItem(one.id, milk); repo.saveItem(two.id, milk);
  repo.removeSession(one.id);
  expect(repo.items(one.id)).toHaveLength(0);
  expect(repo.items(two.id)).toHaveLength(1);
});
test('failure updating parent rolls back item write', () => {
  const session = repo.create('Atomic');
  sqlite.exec("CREATE TRIGGER reject_update BEFORE UPDATE ON sessions BEGIN SELECT RAISE(ABORT, 'disk write failed'); END;");
  expect(() => repo.saveItem(session.id, milk)).toThrow('disk write failed');
  expect(repo.items(session.id)).toHaveLength(0);
  expect(repo.session(session.id).updatedAt).toBe(session.updatedAt);
});
test('reopening an on-disk database preserves data and permits continued shopping', () => {
  const dir = mkdtempSync(join(tmpdir(), 'shopscan-test-'));
  const path = join(dir, 'sessions.db');
  let disk = new DatabaseSync(path);
  try {
    let db = adapter(disk); initialize(db);
    let saved = new Repository(db, () => 'trip');
    const session = saved.create('Saved trip');
    saved = new Repository(db, () => 'item'); saved.saveItem(session.id, milk);
    disk.close(); disk = new DatabaseSync(path); db = adapter(disk); initialize(db);
    const reopened = new Repository(db, () => 'next-item');
    expect(reopened.session(session.id).name).toBe('Saved trip');
    expect(reopened.items(session.id)[0].productName).toBe('Milk');
    reopened.saveItem(session.id, { ...milk, barcode: '' });
    expect(reopened.items(session.id)).toHaveLength(2);
  } finally { disk.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('newer database schema is rejected without erasing sessions', () => {
  const session = repo.create('Keep me');
  sqlite.exec('PRAGMA user_version = 99');
  expect(() => initialize(adapter(sqlite))).toThrow('newer ShopScan');
  expect(repo.session(session.id).name).toBe('Keep me');
});

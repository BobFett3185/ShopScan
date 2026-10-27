import { barcodeKey, decimal, Item, ItemInput, Session, SessionSummary, total, validate } from './domain';

type Param = string | number | null;
export interface Database {
  execSync(sql: string): void;
  runSync(sql: string, ...params: Param[]): unknown;
  getFirstSync<T>(sql: string, ...params: Param[]): T | null;
  getAllSync<T>(sql: string, ...params: Param[]): T[];
  withTransactionSync(task: () => void): void;
}
export class DuplicateBarcodeError extends Error {
  constructor(public item: Item) { super('This barcode is already in your session.'); }
}
export function initialize(db: Database) {
  db.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const version = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  if (version > 1) throw new Error('This data was saved by a newer ShopScan version. Update the app to open it.');
  if (version === 0) db.withTransactionSync(() => {
    db.execSync(`
      CREATE TABLE sessions (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('active','finished')));
      CREATE TABLE items (id TEXT PRIMARY KEY NOT NULL, sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, barcode TEXT NOT NULL, barcodeKey TEXT, productName TEXT NOT NULL, price INTEGER NOT NULL CHECK(price >= 0), quantity INTEGER NOT NULL CHECK(quantity > 0), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
      CREATE INDEX items_session ON items(sessionId);
      CREATE UNIQUE INDEX items_barcode ON items(sessionId, barcodeKey) WHERE barcodeKey IS NOT NULL;
      PRAGMA user_version = 1;
    `);
  });
}

export class Repository {
  constructor(private db: Database, private uuid: () => string, private now = () => new Date().toISOString()) {}
  sessions(): SessionSummary[] {
    return this.db.getAllSync<SessionSummary>('SELECT s.*, COUNT(i.id) AS itemCount FROM sessions s LEFT JOIN items i ON s.id = i.sessionId GROUP BY s.id ORDER BY s.updatedAt DESC, s.id');
  }
  session(id: string): Session {
    const session = this.db.getFirstSync<Session>('SELECT * FROM sessions WHERE id = ?', id);
    if (!session) throw new Error('This session no longer exists. Return to your shopping trips.');
    return session;
  }
  items(sessionId: string): Item[] { return this.db.getAllSync<Item>('SELECT * FROM items WHERE sessionId = ? ORDER BY createdAt, id', sessionId); }
  create(name: string): Session {
    const time = this.now();
    const resolved = name.trim() || `Shopping – ${new Date(time).toLocaleDateString()}`;
    if (resolved.length > 100) throw new Error('Keep the session name under 101 characters.');
    const session: Session = { id: this.uuid(), name: resolved, createdAt: time, updatedAt: time, status: 'active' };
    this.db.runSync('INSERT INTO sessions VALUES (?, ?, ?, ?, ?)', session.id, session.name, time, time, session.status);
    return session;
  }
  removeSession(id: string) { this.db.runSync('DELETE FROM sessions WHERE id = ?', id); }
  setStatus(id: string, status: Session['status']) {
    this.session(id);
    this.db.runSync('UPDATE sessions SET status = ?, updatedAt = ? WHERE id = ?', status, this.now(), id);
  }
  duplicate(sessionId: string, barcode: string, excludeId = ''): Item | undefined {
    if (!barcode.trim()) return undefined;
    return this.items(sessionId).find(item => item.id !== excludeId && barcodeKey(item.barcode) === barcodeKey(barcode));
  }
  saveItem(sessionId: string, input: ItemInput, itemId?: string): void {
    // Validate again at the storage boundary, independently of form behavior.
    if (!Number.isSafeInteger(input.price) || input.price < 0) throw new Error('Invalid price.');
    const checked = validate({ ...input, price: decimal(input.price), quantity: String(input.quantity) });
    if (!checked.value) throw new Error(Object.values(checked.errors)[0]);
    const value = checked.value;
    this.db.withTransactionSync(() => {
      this.requireActive(sessionId);
      const items = this.items(sessionId);
      if (itemId && !items.some(item => item.id === itemId)) throw new Error('This item no longer exists.');
      const duplicate = this.duplicate(sessionId, value.barcode, itemId);
      if (duplicate) throw new DuplicateBarcodeError(duplicate);
      total([...items.filter(item => item.id !== itemId), value]);
      const time = this.now();
      const key = value.barcode ? barcodeKey(value.barcode) : null;
      if (itemId) this.db.runSync('UPDATE items SET productName = ?, barcode = ?, barcodeKey = ?, price = ?, quantity = ?, updatedAt = ? WHERE id = ? AND sessionId = ?', value.productName, value.barcode, key, value.price, value.quantity, time, itemId, sessionId);
      else this.db.runSync('INSERT INTO items (id, sessionId, barcode, barcodeKey, productName, price, quantity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', this.uuid(), sessionId, value.barcode, key, value.productName, value.price, value.quantity, time, time);
      this.touch(sessionId, time);
    });
  }
  increment(sessionId: string, itemId: string) {
    const item = this.items(sessionId).find(row => row.id === itemId);
    if (!item) throw new Error('This item no longer exists.');
    this.saveItem(sessionId, { ...item, quantity: item.quantity + 1 }, itemId);
  }
  removeItem(sessionId: string, itemId: string) {
    this.db.withTransactionSync(() => {
      this.requireActive(sessionId);
      this.db.runSync('DELETE FROM items WHERE id = ? AND sessionId = ?', itemId, sessionId);
      this.touch(sessionId, this.now());
    });
  }
  private requireActive(id: string) { if (this.session(id).status !== 'active') throw new Error('Choose Continue Shopping before changing a finished session.'); }
  private touch(id: string, time: string) { this.db.runSync('UPDATE sessions SET updatedAt = ? WHERE id = ?', time, id); }
}

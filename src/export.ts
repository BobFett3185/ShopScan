import { Directory, File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Item, Session, toCsv } from './domain';

export async function shareSession(session: Session, items: Item[]) {
  if (!items.length) throw new Error('Add an item before exporting.');
  if (!(await isAvailableAsync())) throw new Error('File sharing is unavailable on this device. Your session is still saved.');
  const directory = new Directory(Paths.cache, 'shopscan-exports');
  directory.create({ intermediates: true, idempotent: true });
  // Retain recent attachments so receiving apps can finish reading them.
  for (const entry of directory.list()) {
    if (entry instanceof File && entry.modificationTime && Date.now() - entry.modificationTime > 7 * 86400000) {
      try { entry.delete(); } catch { /* Cleanup is best-effort, never an export blocker. */ }
    }
  }
  const file = new File(directory, `shopscan-${session.createdAt.slice(0, 10)}-${session.id.slice(0, 8)}-${Date.now()}.csv`);
  file.write(toCsv(session, items));
  await shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export shopping session' });
}

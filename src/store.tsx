import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { openDatabaseAsync } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator } from 'react-native';
import { initialize, Repository } from './repository';
import { Button, Copy, ErrorText, Page } from './ui';

const Store = createContext<{ repo: Repository; revision: number; changed: () => void } | null>(null);
export function StoreProvider({ children }: PropsWithChildren) {
  const [repo, setRepo] = useState<Repository>();
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void openDatabaseAsync('shopscan.db').then(db => {
      if (cancelled) return;
      initialize(db);
      setRepo(new Repository(db, randomUUID));
      setError('');
    }).catch(reason => {
      if (!cancelled) setError(`Could not open saved shopping sessions. ${message(reason)}`);
    });
    return () => { cancelled = true; };
  }, [attempt]);
  const changed = useCallback(() => setRevision(value => value + 1), []);
  if (!repo) return <Page>{error ? <><ErrorText message={error} /><Button title="Try again" onPress={() => retry(value => value + 1)} /></> : <><ActivityIndicator /><Copy>Opening your shopping trips…</Copy></>}</Page>;
  return <Store.Provider value={{ repo, revision, changed }}>{children}</Store.Provider>;
}
export function useStore() { const store = useContext(Store); if (!store) throw new Error('ShopScan storage is not ready.'); return store; }
export function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function run(work: () => void | Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await work(); } catch (reason) { setError(message(reason)); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, run };
}

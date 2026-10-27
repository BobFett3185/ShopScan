import { useState } from 'react';
import { router } from 'expo-router';
import { useAction, useStore } from '../../store';
import { Button, Copy, ErrorText, Field, Heading, Page } from '../../ui';

export default function NewSession() {
  const [name, setName] = useState('');
  const { repo, changed } = useStore();
  const action = useAction();
  return <Page><Heading>Ready when you are.</Heading><Copy subtle>Give this trip a name, or leave it blank to use today’s date.</Copy>
    <Field label="Session name (optional)" value={name} onChangeText={setName} maxLength={100} placeholder={`Shopping – ${new Date().toLocaleDateString()}`} autoCapitalize="sentences" />
    <ErrorText message={action.error} /><Button title="Start Shopping" busy={action.busy} onPress={() => void action.run(() => { const session = repo.create(name); changed(); router.replace(`/sessions/${session.id}`); })} />
  </Page>;
}

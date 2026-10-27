import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { money, total } from '../../../domain';
import { shareSession } from '../../../export';
import { useAction, useStore } from '../../../store';
import { Button, Copy, ErrorText, Heading, Page, styles, useColors } from '../../../ui';

export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, changed } = useStore();
  const action = useAction(); const c = useColors();
  const session = repo.session(id); const items = repo.items(id);
  return <Page footer={<Button title={session.status === 'finished' ? 'Back to session' : 'Mark Finished'} busy={action.busy} onPress={() => void action.run(() => { if (session.status !== 'finished') { repo.setStatus(id, 'finished'); changed(); } router.back(); })} />}>
    <Heading>{session.name}</Heading><Copy subtle>You can return to this trip and keep shopping at any time.</Copy>
    {items.map(item => <View key={item.id} style={[styles.row, { paddingVertical: 14, borderBottomColor: c.line, borderBottomWidth: 1 }]}><Text style={{ color: c.text, fontSize: 17, flex: 1 }}>{item.productName} × {item.quantity}</Text><Text style={{ color: c.text, fontSize: 17, fontVariant: ['tabular-nums'] }}>{money(total([item]))}</Text></View>)}
    <View style={styles.row}><Copy>Estimated total</Copy><Text style={[styles.amount, { color: c.text }]}>{money(total(items))}</Text></View>
    <Copy subtle>USD, before tax or discounts.</Copy><ErrorText message={action.error} />
    <Button title="Export CSV" secondary disabled={!items.length} busy={action.busy} onPress={() => void action.run(() => shareSession(session, items))} />
    <Copy subtle>Export to Files, Sheets, Excel, or another app. When importing a CSV, set Barcode to text to keep leading zeros.</Copy>
  </Page>;
}

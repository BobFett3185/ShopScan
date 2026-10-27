import { router, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Text, View } from 'react-native';
import { money, total } from '../../../domain';
import { shareSession } from '../../../export';
import { useAction, useStore } from '../../../store';
import { Button, Copy, Empty, ErrorText, Heading, Page, styles, useColors } from '../../../ui';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, changed } = useStore();
  const action = useAction();
  const c = useColors();
  const session = repo.session(id);
  const items = repo.items(id);
  const active = session.status === 'active';
  return <Page scroll={false} footer={<>
    <View style={styles.row}><Text style={{ color: c.muted, fontSize: 16, flex: 1 }}>Estimated total</Text><Text accessibilityLabel={`Estimated total ${money(total(items))}`} style={[styles.amount, { color: c.text }]}>{money(total(items))}</Text></View>
    <Button title={active ? 'Scan Item' : 'Continue Shopping'} disabled={action.busy} onPress={() => active ? router.push(`/sessions/${id}/scan`) : void action.run(() => { repo.setStatus(id, 'active'); changed(); })} />
    {active ? <Button title="Add Manually" secondary disabled={action.busy} onPress={() => router.push(`/sessions/${id}/item`)} /> : null}
  </>}>
    <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={{ padding: 24, flexGrow: 1 }}
      ListHeaderComponent={<View style={{ gap: 10, marginBottom: 20 }}><Heading>{session.name}</Heading><Copy subtle>{active ? 'In progress' : 'Finished'} · {items.length} {items.length === 1 ? 'item' : 'items'}</Copy><ErrorText message={action.error} /></View>}
      ListEmptyComponent={<Empty title="What’s in your basket?" detail="Scan a barcode or add an item manually. You’ll enter the name and price from the shelf." />}
      renderItem={({ item }) => <View style={{ paddingVertical: 18, borderBottomWidth: 1, borderColor: c.line, gap: 12 }}>
        <Text style={[styles.title, { color: c.text }]}>{item.productName}</Text>
        <View style={styles.row}><Text style={{ color: c.muted, fontSize: 16, flex: 1 }}>{money(item.price)} × {item.quantity}</Text><Text style={[styles.amount, { color: c.text }]}>{money(total([item]))}</Text></View>
        {active ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button title="Edit item" secondary disabled={action.busy} onPress={() => router.push({ pathname: '/sessions/[id]/item', params: { id, itemId: item.id } })} /><Button title="Delete item" danger disabled={action.busy} onPress={() => Alert.alert('Delete item?', `Remove “${item.productName}” from this trip?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void action.run(() => { repo.removeItem(id, item.id); changed(); }) }])} /></View> : null}
      </View>}
      ListFooterComponent={<View style={{ gap: 12, paddingTop: 24 }}>
        {active ? <Button title="Finish / Review" secondary disabled={action.busy} onPress={() => router.push(`/sessions/${id}/review`)} /> : null}
        <Button title="Export CSV" secondary disabled={!items.length} busy={action.busy} onPress={() => void action.run(() => shareSession(session, items))} />
        {!items.length ? <Copy subtle>Add an item to enable CSV export.</Copy> : null}
        <Button title={active ? 'Pause / Save' : 'Back to trips'} secondary disabled={action.busy} onPress={() => router.dismissTo('/')} />
        <Copy subtle>{active ? 'Every saved item stays on this phone. ' : ''}USD subtotal, before tax or discounts.</Copy>
      </View>} />
  </Page>;
}

import { router } from 'expo-router';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useAction, useStore } from '../store';
import { Button, Copy, Empty, ErrorText, Heading, Page, styles, useColors } from '../ui';

export default function Home() {
  const { repo, changed } = useStore();
  const c = useColors();
  const action = useAction();
  const sessions = repo.sessions();
  return <Page scroll={false} footer={<Button title="Start Shopping" onPress={() => router.push('/sessions/new')} />}>
    <FlatList data={sessions} keyExtractor={item => item.id} contentContainerStyle={{ padding: 24, flexGrow: 1 }} ListHeaderComponent={<View style={{ gap: 8, marginBottom: 24 }}><Heading>Your shopping trips</Heading><Copy subtle>Pick up where you left off.</Copy><ErrorText message={action.error} /></View>}
      ListEmptyComponent={<Empty title="A fresh start." detail="Start a trip, scan your groceries, and keep a running total as you shop. Everything saves on this phone." />}
      renderItem={({ item }) => <View style={{ borderBottomWidth: 1, borderColor: c.line, paddingVertical: 16, gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}, ${item.itemCount} items, ${item.status}`} onPress={() => router.push(`/sessions/${item.id}`)} style={({ pressed }) => ({ gap: 6, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.title, { color: c.text }]}>{item.name}</Text>
          <Text style={[styles.small, { color: c.primary }]}>{item.status === 'finished' ? 'Finished' : 'In progress'} · {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}</Text>
          <Text style={[styles.small, { color: c.muted }]}>Started {new Date(item.createdAt).toLocaleDateString()}</Text>
          <Text style={[styles.small, { color: c.muted }]}>Updated {new Date(item.updatedAt).toLocaleString()}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`} disabled={action.busy} style={{ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }} onPress={() => Alert.alert('Delete this trip?', `“${item.name}” and all its items will be deleted from this phone.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void action.run(() => { repo.removeSession(item.id); changed(); }) }])}><Text style={{ color: c.error, fontSize: 16 }}>Delete trip</Text></Pressable>
      </View>} />
  </Page>;
}

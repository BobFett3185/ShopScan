import { PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const light = { background: '#F6F8F5', surface: '#FFFFFF', text: '#172B24', muted: '#52665C', primary: '#176448', onPrimary: '#FFFFFF', line: '#D7E0D9', soft: '#E2EFE6', error: '#B3261E' };
const dark = { background: '#111B16', surface: '#1C2922', text: '#EDF4EF', muted: '#B0C4B7', primary: '#99D8B5', onPrimary: '#103B29', line: '#3D5044', soft: '#263E30', error: '#FFB4AB' };
export function useColors() { return useColorScheme() === 'dark' ? dark : light; }
export function Page({ children, footer, scroll = true }: PropsWithChildren<{ footer?: React.ReactNode; scroll?: boolean }>) {
  const c = useColors();
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.flex, { backgroundColor: c.background }]}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      {scroll ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={styles.flex}>{children}</View>}
      {footer ? <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.line }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Heading({ children }: PropsWithChildren) { const c = useColors(); return <Text accessibilityRole="header" style={[styles.heading, { color: c.text }]}>{children}</Text>; }
export function Copy({ children, subtle = false }: PropsWithChildren<{ subtle?: boolean }>) { const c = useColors(); return <Text style={[styles.copy, { color: subtle ? c.muted : c.text }]}>{children}</Text>; }
export function Button({ title, onPress, secondary = false, danger = false, disabled = false, busy = false }: { title: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean; busy?: boolean }) {
  const c = useColors();
  const foreground = danger ? c.error : secondary ? c.primary : c.onPrimary;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: secondary || danger ? c.soft : c.primary, opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1 }]}>
    {busy ? <ActivityIndicator color={foreground} /> : null}<Text style={[styles.buttonText, { color: foreground }]}>{title}</Text>
  </Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const c = useColors();
  return <View style={styles.field}>
    <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} accessibilityHint={error} placeholderTextColor={c.muted} selectionColor={c.primary} style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: error ? c.error : c.line }, props.style]} />
    {error ? <ErrorText message={error} /> : null}
  </View>;
}
export function ErrorText({ message }: { message?: string }) { const c = useColors(); return message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { color: c.error }]}>{message}</Text> : null; }
export function Empty({ title, detail }: { title: string; detail: string }) { return <View style={styles.empty}><Heading>{title}</Heading><Copy subtle>{detail}</Copy></View>; }
export const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { padding: 24, gap: 16, flexGrow: 1 }, footer: { padding: 16, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  heading: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6 }, copy: { fontSize: 17, lineHeight: 25 },
  button: { minHeight: 52, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buttonText: { fontSize: 17, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  field: { gap: 8 }, label: { fontSize: 16, fontWeight: '600' }, input: { borderWidth: 1, borderRadius: 12, minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18 },
  error: { fontSize: 15, lineHeight: 22 }, empty: { paddingVertical: 36, gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 20, fontWeight: '600' }, small: { fontSize: 14, lineHeight: 21 }, amount: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
});

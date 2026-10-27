import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams, useIsFocused } from 'expo-router';
import { validBarcode } from '../../../domain';
import { useAction, useStore } from '../../../store';
import { Button, Copy, ErrorText, Field, Page, useColors } from '../../../ui';

export default function Scan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, changed } = useStore(); const action = useAction(); const c = useColors();
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const [barcode, setBarcode] = useState(''); const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [locked, setLocked] = useState(false); const lock = useRef(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active'); const focused = useIsFocused();
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state === 'active') void refreshPermission().catch(() => setError('Could not refresh camera access. Try Allow camera again, or enter the barcode.'));
    });
    return () => listener.remove();
  }, [refreshPermission]);
  function unlock() { lock.current = false; setLocked(false); }
  function accept(code: string) {
    if (lock.current) return;
    if (!validBarcode(code)) { setError('Enter an 8, 12, or 13-digit UPC/EAN barcode.'); return; }
    lock.current = true; setLocked(true); setError('');
    void action.run(() => {
      try {
        const duplicate = repo.duplicate(id, code);
        if (!duplicate) { router.replace({ pathname: '/sessions/[id]/item', params: { id, barcode: code.trim(), required: '1' } }); return; }
        Alert.alert('Already in your basket', `${duplicate.productName} is already here. Quantity: ${duplicate.quantity}.`, [
          { text: 'Cancel', style: 'cancel', onPress: unlock },
          { text: 'Edit item', onPress: () => router.replace({ pathname: '/sessions/[id]/item', params: { id, itemId: duplicate.id } }) },
          { text: 'Increase quantity', onPress: () => void action.run(() => { try { repo.increment(id, duplicate.id); changed(); router.back(); } finally { unlock(); } }) },
        ], { cancelable: false });
      } catch (reason) { unlock(); throw reason; }
    });
  }
  return <Page>
    <Copy>Point your camera at the barcode. You’ll enter the product name and shelf price next.</Copy>
    {permission?.granted && !cameraError ? <View style={{ height: 260, borderRadius: 16, overflow: 'hidden', backgroundColor: c.soft }}>
      {focused && foreground && !locked ? <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }} onBarcodeScanned={({ data }) => accept(data)} onMountError={() => setCameraError('The camera could not start. Enter the barcode below instead.')} /> : null}
    </View> : <View style={{ paddingVertical: 16, gap: 12 }}>
      <Copy subtle>{cameraError || 'Allow camera access to scan groceries. You can also type a barcode below.'}</Copy>
      {!cameraError ? <Button title={permission?.canAskAgain === false ? 'Open Settings' : 'Allow camera'} secondary onPress={() => void action.run(async () => { if (permission?.canAskAgain === false) await Linking.openSettings(); else await requestPermission(); })} /> : null}
    </View>}
    <Field label="Enter barcode manually" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" maxLength={13} placeholder="8, 12, or 13 digits" error={error} />
    <ErrorText message={action.error} /><Button title="Use barcode" disabled={locked || !barcode.trim()} busy={action.busy} onPress={() => accept(barcode)} />
    <Button title="Add Manually" secondary disabled={locked} onPress={() => router.replace(`/sessions/${id}/item`)} />
  </Page>;
}

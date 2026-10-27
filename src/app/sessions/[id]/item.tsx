import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { decimal, Draft, FieldErrors, validate } from '../../../domain';
import { DuplicateBarcodeError } from '../../../repository';
import { lookupProduct, ProductResult } from '../../../productLookup';
import { useAction, useStore } from '../../../store';
import { Button, Copy, ErrorText, Field, Heading, Page } from '../../../ui';

export default function ItemForm() {
  const { id, itemId, barcode = '', required } = useLocalSearchParams<{ id: string; itemId?: string; barcode?: string; required?: string }>();
  const { repo, changed } = useStore(); const action = useAction(); const navigation = useNavigation();
  const [initial] = useState<Draft>(() => {
    const item = itemId ? repo.items(id).find(row => row.id === itemId) : undefined;
    if (itemId && !item) throw new Error('This item no longer exists.');
    return item ? { productName: item.productName, barcode: item.barcode, price: decimal(item.price), quantity: String(item.quantity) } : { productName: '', barcode, price: '', quantity: '1' };
  });
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [lookup, setLookup] = useState<ProductResult['status'] | 'loading' | 'idle'>(!itemId && barcode ? 'loading' : 'idle');
  const [lookupAttempt, setLookupAttempt] = useState(0);
  useEffect(() => {
    if (itemId || !initial.barcode) return;
    const controller = new AbortController();
    void lookupProduct(initial.barcode, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setLookup(result.status);
      if (result.status === 'found') setDraft(current => current.productName.trim() || current.barcode !== initial.barcode ? current : { ...current, productName: result.name });
    });
    return () => controller.abort();
  }, [initial.barcode, itemId, lookupAttempt]);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  usePreventRemove(dirty && !saved, ({ data }) => Alert.alert('Discard changes?', 'This item has unsaved changes.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) }]));
  useEffect(() => { if (saved) router.back(); }, [saved]);
  function update(key: keyof Draft, value: string) { setDraft(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); }
  function save() {
    const checked = validate(draft, required === '1' || Boolean(initial.barcode));
    setErrors(checked.errors);
    if (!checked.value) return;
    void action.run(() => {
      try { repo.saveItem(id, checked.value!, itemId); changed(); setSaved(true); }
      catch (error) {
        if (!(error instanceof DuplicateBarcodeError)) throw error;
        Alert.alert('Already in your basket', `${error.item.productName} uses this barcode. Your draft will stay here while you edit the existing item.`, [{ text: 'Keep editing', style: 'cancel' }, { text: 'Edit existing item', onPress: () => router.push({ pathname: '/sessions/[id]/item', params: { id, itemId: error.item.id } }) }]);
      }
    });
  }
  return <Page><Heading>{itemId ? 'Edit your item' : 'Add to your basket'}</Heading><Copy subtle>Use the price on the shelf. Prices are per item, in USD.</Copy>
    {lookup === 'loading' ? <><ActivityIndicator accessibilityLabel="Looking up product" /><Copy subtle>Finding your product… Quantity starts at 1.</Copy></> : null}
    {lookup === 'found' ? <Copy subtle>Product found. Check the name and enter the shelf price.</Copy> : null}
    {lookup === 'missing' ? <Copy subtle>This barcode isn’t in the food database yet. Enter the name below; quantity is already 1.</Copy> : null}
    {lookup === 'unavailable' ? <><Copy subtle>Product lookup couldn’t connect. Enter the name yourself or try again.</Copy><Button title="Retry product lookup" secondary onPress={() => { setLookup('loading'); setLookupAttempt(value => value + 1); }} /></> : null}
    {lookup !== 'idle' ? <Button title="Product data: Open Food Facts (ODbL)" secondary onPress={() => void action.run(() => Linking.openURL('https://world.openfoodfacts.org'))} /> : null}
    <Field label="Product name" value={draft.productName} onChangeText={value => update('productName', value)} error={errors.productName} maxLength={200} placeholder="e.g. Whole milk" autoCapitalize="sentences" />
    <Field label={`Barcode${required === '1' || initial.barcode ? '' : ' (optional)'}`} value={draft.barcode} onChangeText={value => update('barcode', value)} error={errors.barcode} maxLength={13} keyboardType="number-pad" />
    <Field label="Unit price (USD)" value={draft.price} onChangeText={value => update('price', value)} error={errors.price} keyboardType="decimal-pad" placeholder="0.00" />
    <Field label="Quantity" value={draft.quantity} onChangeText={value => update('quantity', value)} error={errors.quantity} keyboardType="number-pad" />
    <ErrorText message={action.error} /><Button title="Save item" busy={action.busy} onPress={save} /><Button title="Cancel" secondary disabled={action.busy} onPress={() => router.back()} />
  </Page>;
}

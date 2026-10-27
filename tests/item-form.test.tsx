import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ItemForm from '../src/app/sessions/[id]/item';
import type { ProductResult } from '../src/productLookup';

const mockSave = jest.fn();
const mockChanged = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'trip' };
const mockLookup = jest.fn();
jest.mock('../src/productLookup', () => ({ lookupProduct: (...args: unknown[]) => mockLookup(...args) }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() }, useLocalSearchParams: () => mockParams, useNavigation: () => ({ dispatch: jest.fn() }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('../src/store', () => {
  const actual = jest.requireActual('../src/store');
  return { ...actual, useStore: () => ({ repo: { saveItem: mockSave, items: () => [] }, changed: mockChanged }) };
});
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(() => { jest.clearAllMocks(); mockSave.mockReset(); mockParams = { id: 'trip' }; mockLookup.mockResolvedValue({ status: 'missing' }); });
function enterItem() {
  fireEvent.changeText(screen.getByLabelText('Product name'), 'Milk');
  fireEvent.changeText(screen.getByLabelText('Unit price (USD)'), '3.49');
  fireEvent.changeText(screen.getByLabelText('Quantity'), '2');
}
test('manual entry saves exact cents and returns after commit', async () => {
  render(<ItemForm />); enterItem(); fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(mockSave).toHaveBeenCalledWith('trip', { productName: 'Milk', barcode: '', price: 349, quantity: 2 }, undefined);
  expect(mockChanged).toHaveBeenCalledTimes(1);
});
test('invalid form shows inline errors without writing', () => {
  render(<ItemForm />); fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
  expect(screen.getByText('Enter a product name (up to 200 characters).')).toBeTruthy();
  expect(mockSave).not.toHaveBeenCalled();
});
test('failed save retains draft and does not navigate or report success', async () => {
  mockSave.mockImplementation(() => { throw new Error('Storage is full. Try again.'); });
  render(<ItemForm />); enterItem(); fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
  await screen.findByText('Storage is full. Try again.');
  expect(screen.getByDisplayValue('Milk')).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockChanged).not.toHaveBeenCalled();
});
test('scanned product name and quantity populate while price stays blank', async () => {
  mockParams = { id: 'trip', barcode: '3017620422003', required: '1' };
  mockLookup.mockResolvedValue({ status: 'found', name: 'Nutella' });
  render(<ItemForm />);
  await screen.findByDisplayValue('Nutella');
  expect(screen.getByLabelText('Quantity').props.value).toBe('1');
  expect(screen.getByLabelText('Unit price (USD)').props.value).toBe('');
  fireEvent.changeText(screen.getByLabelText('Unit price (USD)'), '4.99');
  fireEvent.press(screen.getByRole('button', { name: 'Save item' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith('trip', { productName: 'Nutella', barcode: '3017620422003', price: 499, quantity: 1 }, undefined));
});
test('late product response never overwrites a name the shopper entered', async () => {
  mockParams = { id: 'trip', barcode: '3017620422003' };
  let finish!: (result: ProductResult) => void;
  mockLookup.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<ItemForm />);
  fireEvent.changeText(screen.getByLabelText('Product name'), 'My preferred name');
  await act(async () => finish({ status: 'found', name: 'Nutella' }));
  expect(screen.getByDisplayValue('My preferred name')).toBeTruthy();
});
test('offline lookup can retry without losing fields', async () => {
  mockParams = { id: 'trip', barcode: '3017620422003' };
  mockLookup.mockResolvedValueOnce({ status: 'unavailable' }).mockResolvedValueOnce({ status: 'found', name: 'Nutella' });
  render(<ItemForm />);
  await screen.findByText('Product lookup couldn’t connect. Enter the name yourself or try again.');
  fireEvent.changeText(screen.getByLabelText('Unit price (USD)'), '4.99');
  fireEvent.press(screen.getByRole('button', { name: 'Retry product lookup' }));
  await screen.findByDisplayValue('Nutella');
  expect(screen.getByDisplayValue('4.99')).toBeTruthy();
});

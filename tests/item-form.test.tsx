import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ItemForm from '../src/app/sessions/[id]/item';

const mockSave = jest.fn();
const mockChanged = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() }, useLocalSearchParams: () => ({ id: 'trip' }), useNavigation: () => ({ dispatch: jest.fn() }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('../src/store', () => {
  const actual = jest.requireActual('../src/store');
  return { ...actual, useStore: () => ({ repo: { saveItem: mockSave, items: () => [] }, changed: mockChanged }) };
});
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(() => { jest.clearAllMocks(); mockSave.mockReset(); });
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

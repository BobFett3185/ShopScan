import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Scan from '../src/app/sessions/[id]/scan';

const mockReplace = jest.fn(); const mockBack = jest.fn(); const mockDuplicate = jest.fn(); const mockIncrement = jest.fn(); const mockChanged = jest.fn();
const mockRequestPermission = jest.fn(); const mockRefreshPermission = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args), back: () => mockBack() }, useLocalSearchParams: () => ({ id: 'trip' }), useIsFocused: () => true }));
jest.mock('expo-camera', () => ({ useCameraPermissions: () => [{ granted: false, canAskAgain: true }, mockRequestPermission, mockRefreshPermission], CameraView: 'CameraView' }));
jest.mock('../src/store', () => ({ ...jest.requireActual('../src/store'), useStore: () => ({ repo: { duplicate: mockDuplicate, increment: mockIncrement }, changed: mockChanged }) }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
beforeEach(() => { jest.clearAllMocks(); mockDuplicate.mockReturnValue(undefined); });
afterEach(() => jest.restoreAllMocks());

test('manual barcode entry works without camera permission', async () => {
  render(<Scan />);
  fireEvent.changeText(screen.getByLabelText('Enter barcode manually'), '0123456789012');
  fireEvent.press(screen.getByRole('button', { name: 'Use barcode' }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/sessions/[id]/item', params: { id: 'trip', barcode: '0123456789012', required: '1' } }));
});
test('invalid typed barcode leaves the scanner open with a useful error', () => {
  render(<Scan />);
  fireEvent.changeText(screen.getByLabelText('Enter barcode manually'), '12');
  fireEvent.press(screen.getByRole('button', { name: 'Use barcode' }));
  expect(screen.getByText('Enter an 8, 12, or 13-digit UPC/EAN barcode.')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
test('duplicate scan is locked until a choice and can increase existing quantity', async () => {
  mockDuplicate.mockReturnValue({ id: 'milk', productName: 'Milk', quantity: 1 });
  const alert = jest.spyOn(Alert, 'alert');
  render(<Scan />); fireEvent.changeText(screen.getByLabelText('Enter barcode manually'), '0123456789012');
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Use barcode' })); });
  fireEvent.press(screen.getByRole('button', { name: 'Use barcode' }));
  expect(alert).toHaveBeenCalledTimes(1);
  const increase = alert.mock.calls[0][2]?.find(button => button.text === 'Increase quantity');
  await act(async () => { increase?.onPress?.(); });
  expect(mockIncrement).toHaveBeenCalledWith('trip', 'milk');
  expect(mockBack).toHaveBeenCalledTimes(1);
});

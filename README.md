# ShopScan

ShopScan is a local-first grocery shopping app for **Apple iPhone (iOS) and Android phones**, built with Expo React Native and TypeScript.

Scan a food item's barcode, enter its name and unit price, track quantities and an estimated shopping total, and export a session as CSV through the native share sheet. Sessions remain available to resume and export again.

## Base implementation

Includes saved shopping sessions, manual item entry/edit/delete, UPC/EAN scanning and typed barcode fallback, duplicate quantity handling, pause/resume/finish, integer-cent totals, SQLite persistence, and CSV sharing. Names and shelf prices are entered by the shopper. The interface follows the device's light/dark appearance.

Verified: 37 tests, TypeScript, lint, Expo Doctor (21/21), and Android/iOS bundle compilation. Physical camera/share-sheet checks remain pending. See [verification and known limitations](docs/VERIFICATION.md).

## Test on your phone

1. Install **Expo Go** from the Apple App Store or Google Play Store. This project uses **Expo SDK 57**, chosen for physical-device Expo Go compatibility during the SDK 58 transition. If Expo Go reports an SDK mismatch, follow the version guidance at [Expo Go downloads](https://expo.dev/go).
2. Connect your computer and phone to the same Wi-Fi network.
3. Open a terminal in this folder. Use Node 22.17 or a newer supported LTS version. Dependencies are already installed in this workspace; on a fresh checkout run `npm ci` first.
4. Run `npm start`. Leave that terminal running.
5. On **iPhone**, scan the terminal QR code using the Camera app and tap the Expo Go link. On **Android**, use Expo Go's QR scanner (or your phone's camera if it offers to open Expo Go).
6. If Expo Go on iPhone requests account matching, run `npx expo login` on the computer and sign into the same Expo account in Expo Go. This is development tooling; ShopScan itself does not have accounts.
7. Allow camera access when you choose Scan Item. You can always use Add Manually or type a barcode instead.

If the phone cannot reach Metro, check Wi-Fi/client isolation and allow Node through Windows Firewall on your private network. A fallback is `npx expo start --tunnel`; Expo may offer to install its tunnel helper. Tunnel mode needs internet, but the app's shopping data still stays local. Avoid exposing the development server on a public network.

See [Expo's device instructions](https://docs.expo.dev/get-started/start-developing/) and [SDK transition guidance](https://docs.expo.dev/get-started/create-a-project/).

## Five-minute phone check

1. Start Shopping; enter a trip name.
2. Add Manually: `Milk`, price `3.49`, quantity `2`. Confirm total **$6.98**.
3. Scan an actual grocery barcode, or type `0123456789012`. Enter a name and price, then save.
4. Scan/type the same code again. Choose Increase quantity; verify it stays one row.
5. Edit and delete an item, checking the total each time. Try canceling deletion too.
6. Pause / Save, close Expo Go completely, reopen the project, and resume the trip. Saved rows should remain.
7. Finish / Review, mark finished, and then Continue Shopping to add more.
8. Export CSV. Save to Files or share to a spreadsheet app. If Sheets/Excel is not a share destination, save the file and import it there. Import Barcode as **text** to preserve leading zeros.

Camera scanning and native sharing must be tested on real iPhone and Android hardware. Emulator cameras are not a substitute. Expo Go stores development data on that device; uninstalling it or clearing its data can remove sessions. CSV export is not a full restorable backup.

## Development checks

```sh
npm run typecheck
npm run lint
npm test
npm run export:check
```

The export check compiles Android and iOS JavaScript bundles; it is not a signed app-store build. `npm run android` opens a configured Android emulator. `npm run ios` needs macOS and Xcode; on Windows use a physical iPhone with Expo Go. Publishing standalone apps requires a separate signing/distribution setup.

## Source map

- `src/app/`: Home, session creation/detail/review, scanner, item forms, native navigation.
- `src/domain.ts`: validation, cents arithmetic, barcode comparison, CSV serialization.
- `src/repository.ts`, `src/store.tsx`: SQLite schema/transactions and app data lifecycle.
- `src/export.ts`: temporary CSV files and native sharing.
- `src/ui.tsx`: accessible native controls, spacing, light/dark color roles.
- `tests/`: domain/CSV, actual SQLite persistence, form interaction, and export orchestration checks.
- [Verification report](docs/VERIFICATION.md): executed checks and remaining device validation.

## Planning documents

- [Requirements](docs/REQUIREMENTS.md): scope, screens, behavior, validation, and data contract.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): technology, proposed structure, delivery phases, and future run instructions.
- [Acceptance checklist](docs/ACCEPTANCE_TESTS.md): automated checks and manual iOS/Android verification.

## Boundaries

No accounts, backend, cloud sync, product database, automatic product names or prices, Google API integration, payments, recommendations, social features, or maps. Barcode scanning does not look up a store's price. Users enter prices themselves. All shopping data stays on the device until the user shares an export.

Both mobile platforms are release requirements. A browser version, tablet-specific layout, and App Store/Play Store publication are outside this initial implementation. Real iPhone and Android hardware must be used to verify camera scanning.

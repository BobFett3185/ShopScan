# ShopScan

ShopScan is a local-first grocery shopping app for **Apple iPhone (iOS) and Android phones**, built with Expo React Native and TypeScript.

Scan a food item's barcode to fill its product name from Open Food Facts and set quantity to 1. Enter the shelf price, save, and scan the same item again to add one to its quantity. Export a session as CSV through the native share sheet. Sessions remain available to resume and export again.

## Base implementation

Includes saved shopping sessions, automatic product-name lookup, manual item entry/edit/delete, UPC/EAN scanning and typed barcode fallback, automatic duplicate quantity increments, pause/resume/finish, integer-cent totals, SQLite persistence, and CSV sharing. Shelf prices are entered by the shopper. Missing products or offline lookups fall back to editable manual names. The interface follows the device's light/dark appearance.

Verified: 49 tests, TypeScript, lint, Expo Doctor (21/21 on the base dependency set), and Android/iOS bundle compilation. Physical camera/share-sheet checks remain pending. See [verification and known limitations](docs/VERIFICATION.md).

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
3. Scan a grocery barcode, or type `3017620422003` to test a known Nutella product. With internet access, the name should fill in and quantity should be 1. Enter the price, then save.
4. Scan/type the same code again. Quantity automatically increases by 1; verify it stays one row.
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

No accounts, app backend, cloud sync, automatic prices, Google API integration, payments, recommendations, social features, or maps. New scanned/typed barcodes are sent directly to Open Food Facts for name lookup; session names, prices, quantities, and the rest of the basket are not sent. New-product lookup needs internet; manual shopping and saved sessions work offline. Product coverage is incomplete and names remain editable.

Product data: [Open Food Facts](https://world.openfoodfacts.org), available under [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). The app identifies itself with a custom User-Agent; add a real maintainer contact to that header before public distribution. Quantity means packages purchased, not package weight. No database migration or reinstall is required for this update—reload the app in Expo Go.

Both mobile platforms are release requirements. A browser version, tablet-specific layout, and App Store/Play Store publication are outside this initial implementation. Real iPhone and Android hardware must be used to verify camera scanning.

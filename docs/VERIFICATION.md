# Base implementation verification

Verified October 27, 2026 on Windows with Node 22.17.0, Expo 57.0.31, React Native 0.86.3, and React 19.2.3.

## Executed checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with no warnings |
| `npm test` | 49 tests passed across 6 suites after product autofill update |
| `npx expo install --check` | Dependencies compatible with SDK 57 |
| `npx --yes expo-doctor` | 21/21 checks passed |
| `npm run export:check` | Android and iOS Hermes bundles successfully generated in ignored `dist/` |

The first bundle attempt was blocked by Windows sandbox permissions for the Hermes compiler. The approved rerun outside the sandbox succeeded. These are JavaScript/native-bytecode bundle checks, not signed native builds or proof of device behavior.

## What the tests cover

Product-autofill update: a live Open Food Facts v3 request for `3017620422003` successfully returned `Nutella`. Added tests for product-name/quantity autofill with blank shelf price, user-edit preservation during delayed responses, retry without losing fields, malformed/missing products, HTTP rate limits, offline errors, timeout, and cancellation. No dependencies or database migrations were added. Real-device lookup/scan testing remains pending; reload the existing Expo Go project to test the update.

- Integer-cent parsing, exact totals, zero prices, unsafe totals, and invalid names/prices/quantities.
- UPC-A/EAN comparison, barcode validation, and manual barcode omission.
- Real SQLite schema, create/add/edit/delete, parent timestamps, distinct item counts, duplicate constraints, quantity increments, finished-session resume, cascade deletion, and transactional rollback after a simulated parent-write failure.
- Closing and reopening a real SQLite database file, then continuing the saved session. This uses Node's SQLite engine through the same repository interface; it does not substitute for the expo-sqlite device test.
- CSV parsing round-trip for the exact seven columns, two decimal places, commas/quotes/newlines, UTF-8 BOM, Unicode, leading zeros in source, empty barcodes, and formula-like names.
- Item form validation, successful save/navigation, and preserving a draft when storage fails.
- Typed barcode entry without camera permission, invalid barcode feedback, duplicate scan locking, and automatic quantity increments on repeat scans.
- Export file/share metadata, empty-session handling, unavailable sharing, write failures, cancellation and repeat exports without source mutation. Native services are mocked in these unit tests.

## Remaining device acceptance

No physical iPhone or Android phone was connected. The installed Android SDK had no configured emulator profile. No native screenshots or visual runtime inspection were performed. This Windows environment cannot run Apple's iOS Simulator.

Still verify on **both real platforms**:

- Camera permission grant/deny/Settings-return and real UPC-A, UPC-E, EAN-8, EAN-13 labels.
- Native share sheet, saving the CSV, and actual import into Google Sheets and Excel.
- Force quit/relaunch in Expo Go, device reboot, and offline use after loading the development bundle.
- Light/dark appearance, large accessibility text, keyboard avoidance, VoiceOver/TalkBack, native back gestures, and controls on small phone displays.
- Native release builds before store distribution. App identifiers in `app.json` are initial placeholders to confirm before publishing.

Follow the five-minute check in README.md and the full checklist in ACCEPTANCE_TESTS.md. No device-only case is marked passed based solely on a mocked test or a bundle export.

## Platform baseline

Expo SDK 57 documents **iOS 16.4+** and **Android 7+ (API 24+)** as its minimum OS versions. Expo Go availability may impose additional constraints; use the matching Expo Go version. These are framework support floors, not a claim that every supported phone was tested. Source: [Expo SDK 57 compatibility table](https://docs.expo.dev/versions/v57.0.0/).

## Known limitations and dependency follow-up

- Sessions remain device-local; new product-name lookup sends the barcode to Open Food Facts. USD only, whole-number quantities, no taxes/discounts or automatic prices. CSV import/restoration and cross-device backup are not implemented.
- CSV cannot enforce spreadsheet cell types. Barcode leading zeros are preserved in the file; import that column as text. Formula-like user names are prefixed with an apostrophe in exports.
- Saved items persist; unsaved form drafts are not persisted across app termination. SQLite transactions are deliberately small and synchronous; very large sessions would need additional performance work.
- `npm audit` reports **6 dependency entries: 3 moderate and 3 high**, stemming from `zod` in Expo CLI and `decode-uri-component` through Expo Router's `query-string`. Parent-package entries duplicate those dependency chains. The CSV test parser was upgraded to its patched 7.0.3 release. The remaining suggested automatic fixes change Expo SDK major versions; no forced downgrade/upgrade was applied. Resolve/reassess these upstream advisories before production distribution. Expo Doctor passing does not clear npm security advisories.

## Files delivered

Project configuration and lockfile; six route screens plus the root layout in `src/app/`; shared native UI in `src/ui.tsx`; domain/CSV logic in `src/domain.ts`; SQLite repository and provider in `src/repository.ts` and `src/store.tsx`; native export in `src/export.ts`; product-name lookup in `src/productLookup.ts`; six test suites; product/design notes; and updated setup, implementation, and acceptance documentation.

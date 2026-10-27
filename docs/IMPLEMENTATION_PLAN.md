# ShopScan implementation plan

## Status

The base implementation now exists. This document preserves the original implementation sequence. See README.md for current commands and docs/VERIFICATION.md for actual verification. The initial workspace contained only Git; the app was built after the planning phase was approved.

Implementation choices: Expo SDK 57 / React Native 0.86.3 for current Expo Go compatibility; the small domain and UI helpers are consolidated in `src/domain.ts` and `src/ui.tsx`, and schema/repository logic lives in `src/repository.ts`. SQLite mutations are synchronous, short transactions, so saved state cannot race ahead of a commit. Large-scale datasets would warrant moving database work off the UI thread. The app supports light/dark themes and native stack navigation.

## Technology decisions

| Concern | Planned choice | Reason |
| --- | --- | --- |
| App | Expo React Native + strict TypeScript | Shared iOS/Android app |
| Navigation | Expo Router stack routes | Small, explicit Home/session/form/scanner flow |
| Persistence | `expo-sqlite` | Durable local records, atomic mutations and relational integrity |
| Scanning | `expo-camera` | Camera permission and UPC/EAN scanning on mobile |
| CSV file | `expo-file-system` | Write a local export file |
| Native export | `expo-sharing` | User chooses destination through the OS share sheet |
| State | React hooks/context plus a repository layer | Database is authoritative; no separate global store needed |
| IDs | Expo-compatible UUID generation | Local unique identifiers without a service |
| Tests | Expo-compatible Jest setup and React Native Testing Library | Domain rules and important screen interactions |

Use the stable Expo release supported at implementation time, install compatible native packages with `npx expo install`, and commit the lockfile. Record actual SDK and minimum iOS/Android versions then. Do not add a backend, ORM, cloud service, or second persistence system.

Expo documents [SQLite persistence](https://docs.expo.dev/versions/latest/sdk/sqlite/), [camera/barcode support](https://docs.expo.dev/versions/latest/sdk/camera/), [local files](https://docs.expo.dev/versions/latest/sdk/filesystem/), and [native sharing](https://docs.expo.dev/versions/latest/sdk/sharing/). Verify APIs against the pinned SDK during implementation, particularly filesystem APIs and scanner barcode types.

## Proposed source structure — not created yet

```text
src/
  app/
    _layout.tsx                 database initialization and route stack
    index.tsx                   Home
    sessions/new.tsx            session naming form
    sessions/[id]/index.tsx     items, total, actions
    sessions/[id]/review.tsx    finish/review and continue
    sessions/[id]/scan.tsx      camera and manual barcode entry
    sessions/[id]/item.tsx      shared add/edit form; optional item ID
  components/                  session row, item row, total bar, empty/error states
  domain/
    models.ts                  session/item contracts
    money.ts                   parse, validate, format, calculate
    barcode.ts                 comparison and typed-input validation
    validation.ts              session and item form rules
  storage/
    database.ts                connection and initialization
    migrations.ts              schema versions and constraints
    sessionRepository.ts       reads and transactional mutations
  features/
    sessions/                  session hooks and operation state
    scanning/                  scan lock and duplicate resolution
    export/                    CSV serialization and native share orchestration
  theme/                       small set of colors, spacing, typography
tests/                         domain, repository, and interaction tests
```

Keep business rules independent of screens and native APIs so tests can exercise them. Keep form drafts in component state. Load session summaries and items from the repository; refresh after successful writes. Do not store parallel copies of totals.

## Delivery phases and gates

### 1. Initialize both mobile targets

Create a minimal Expo TypeScript app in this repository while preserving these docs and Git history. Remove template demo screens. Set up Router, safe-area handling, strict type checks, lint, test scripts, and package lockfile. Configure camera permission wording and app identity; omit microphone/audio permissions where package configuration permits because only barcodes are needed.

Gate: the base screen runs on iPhone and Android; toolchain/OS requirements and exact run commands are recorded. Browser-only success is insufficient.

### 2. Domain and local persistence

Implement integer-cents calculations, validation, barcode canonicalization, SQLite schema/migration, foreign keys, and transactional repository methods. Include a nonempty barcode uniqueness constraint using the canonical key. Serialize conflicting writes and guard duplicate submissions.

Gate: tests cover currency boundaries, validation, duplicate equivalence, atomic timestamp updates, and delete cascade; a real local database retains committed records across app restart.

### 3. Manual shopping flow

Build Home, Start Shopping, session list/total, shared item form, delete confirmation, pause, review, finish, and continue. Make this complete workflow work before introducing camera behavior. Include pending states, errors/retry, empty states, and unsaved-form navigation handling.

Gate: users can create a session, add/edit/delete manual items, pause, force quit, reopen, finish, and continue on both platforms with correct totals.

### 4. Barcode flow

Implement permission UI, scanner lifecycle, one-result scan lock, manual barcode fallback, duplicate choices, and scanner-to-form navigation. Unmount/deactivate the camera when leaving the scanner or backgrounding the app. Recheck duplicate constraints on save to handle edited barcodes and rapid interactions.

Gate: representative UPC/EAN products scan on a real iPhone and Android phone, repeated camera frames do not create duplicate actions, and denied permissions leave the manual workflow usable.

### 5. CSV export

Implement a pure serializer, snapshot query, safe cache filename, file writing, and native sharing. Surface failure/cancellation appropriately. Preserve session data/status and allow repeated exports. Add concise import guidance for barcode text formatting.

Gate: CSV fixtures round-trip through a parser; real exported files open in Google Sheets and Excel with correct columns, Unicode, quotes, numeric totals, and documented barcode-import behavior. The share sheet works on both platforms.

### 6. Cross-platform acceptance and handoff

Run the complete acceptance checklist, type check, lint, and tests. Check VoiceOver/TalkBack, large text, keyboard layouts, Android back, offline behavior, and both native permission/share flows. Update README with commands that were actually executed, platform versions, verification results, files changed, and limitations.

Gate: no release-blocking flow failures; any checks not run are explicit. App-store distribution/signing is a separate task, not assumed complete with a working Expo project.

## Future development/run instructions

The workflow below is now implemented. See README.md for the full phone-testing guide.

1. Install the Node version required by the selected Expo SDK and install the committed dependencies with `npm ci`.
2. Start Metro with `npx expo start`. Open the project in an SDK-compatible Expo Go app or configured development build. Development tooling may require an Expo account; ShopScan itself will not have user accounts.
3. **Android:** open on a physical Android phone, or start an Android Studio emulator and press `a` in Expo CLI.
4. **iPhone:** open on a physical iPhone. On macOS with Xcode/iOS Simulator installed, press `i` in Expo CLI. This Windows workspace cannot run Apple's iOS Simulator or build iOS locally; use an iPhone for device testing and a Mac or separately configured cloud build when a signed native build is needed.
5. Implement and document `npm run typecheck`, `npm run lint`, and `npm test` scripts in phase 1.

Expo's [development instructions](https://docs.expo.dev/get-started/start-developing/) describe starting Metro and opening devices/emulators. Camera scanning must be tested on physical devices because simulator/emulator camera behavior may be absent or incomplete. Native release builds must also be checked before distribution; Expo Go verification alone is not a release build test.

## Known limitations and remaining decisions

- Automated/build checks and device checks are tracked separately in docs/VERIFICATION.md. Physical-device acceptance remains necessary.
- USD is the proposed single currency. Minimum OS versions depend on the SDK selected at implementation.
- User correction implemented: names populate through Open Food Facts (`src/productLookup.ts`); repeat scans increment quantity. Prices remain manual. Internet/coverage failures fall back to manual names. No price accuracy guarantee.
- Device-local storage provides no cross-device sync or restoration feature.
- Spreadsheet apps control CSV type inference and share destinations. Barcode leading zeros require text-column import when the receiving app guesses numbers.
- Taxes and fractional quantities are outside the estimated-total calculation.

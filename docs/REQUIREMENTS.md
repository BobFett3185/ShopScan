# ShopScan requirements

## 1. Product goal and supported platforms

Help a shopper record purchases during a grocery trip, see an estimated total, pause and return later, and export the record for spreadsheet use.

The same Expo React Native TypeScript codebase must support Apple iPhone (iOS) and Android phones with equivalent core functionality. Camera permissions, scanning, persistence, and native file sharing must be verified separately on both platforms. The base implementation pins Expo SDK 57, whose framework support floor is iOS 16.4+ and Android 7+ (API 24+); see [verification](VERIFICATION.md) for compatibility sources and unverified device checks.

Core shopping functions must work offline. Sending a shared file through another app may require that app's internet connection. No app login is required.

## 2. MVP scope and explicit assumptions

- Users supply product names and unit prices. Scanning supplies a barcode only.
- Proposed first-release currency: USD, with two decimal places throughout. Currency conversion and multi-currency sessions are excluded. Confirm this default before implementation if another currency is needed.
- Totals are estimated merchandise subtotals: no tax, coupons, deposits, discounts, or checkout/payment calculation.
- Quantity is a positive whole number. Weighted goods can be entered manually as one item at their total price; fractional quantities are excluded.
- Session item count means distinct item rows, not sum of quantities.
- Sessions are independent: matching a barcode in another session does not prefill or merge products.
- There is no app-managed backup or CSV import. Uninstalling the app or clearing its storage may remove local sessions; exports remain wherever the user saved them.
- Saving an item is the commit point. Every committed change saves immediately; unfinished form drafts are not guaranteed to survive termination.

## 3. Screens and user flows

### Home

- List all active and finished sessions, most recently modified first.
- Each row shows name, creation date, last-modified time, distinct item count, and a small status label.
- Provide a prominent **Start Shopping** button.
- Tapping a session opens its items. Finished sessions can be reviewed, exported, and explicitly continued.
- Session deletion requires confirmation naming the session and explaining that its items will also be deleted. Cancel changes nothing.
- Empty state explains the app and offers Start Shopping. Loading, storage errors, and retry must be distinct from an empty list.

### Start Shopping form

- Ask for an optional name. Whitespace-only input uses `Shopping – [current local date]`.
- Trim a supplied name; permit up to 100 characters. Duplicate session names are allowed.
- Create an empty active session locally before navigating into it. Disable repeated submission while saving.
- Cancel does not create a session. A save failure keeps the form visible with a clear retry message.

### Shopping session

- Show the session name and an item list with product name, unit price, quantity, and line total.
- Keep the estimated total easy to see and **Scan Item** the primary action near the bottom of the screen.
- Include Add Manually, Edit Item, Delete Item, Pause / Save, Finish / Review, and Export CSV.
- Add Manually opens a blank item form with quantity 1 and an optional barcode.
- Item deletion requires confirmation and updates the total after the deletion is saved.
- Pause / Save waits for pending writes, returns Home, and leaves status active. There is no separate paused status.
- Finish / Review opens a summary of rows and total; **Mark Finished** saves status finished. Review alone does not change status.
- A finished session remains available. **Continue Shopping** changes it to active and enables additions/edits/deletions again. Export alone never changes status.
- Navigation away from an edited form prompts to discard or keep editing. Existing saved rows remain safe.
- Empty session state offers scanning and manual entry. Export is disabled with an explanation until at least one item exists.

### Scanner and duplicate handling

- Ask for camera permission when Scan Item is first used, explaining that the camera reads product barcodes.
- Support standard UPC-A, UPC-E, EAN-13, and EAN-8 grocery barcodes through the selected camera package. Verify all supported formats on both platforms.
- If permission is denied, camera unavailable, or decoding fails, show manual barcode entry and Add Manually. When permission cannot be requested again, offer Open Settings.
- Keep manual barcode entry accessible even when scanning works, for testing and damaged labels.
- Pause scanning after the first accepted code to avoid repeated frames adding or opening multiple items. Resume only after the current flow is dismissed or completed.
- Preserve barcode values as text, including leading zeros. Use one canonical comparison rule for scanning and typed entry: a 12-digit UPC-A and its zero-prefixed 13-digit EAN equivalent compare as the same product. Preserve the original value for display/export. Other codes match trimmed text exactly; do not invent UPC-E conversions.
- For an existing barcode in this session, offer **Increase Quantity by 1**, **Edit Item**, and Cancel. Increasing quantity retains the existing name and unit price.
- For a new code, open the item form with barcode filled and quantity 1. Do not create a row until the form is saved.
- Recheck duplicates when saving, including manually entered or edited barcodes. Do not silently merge rows or allow two rows with the same nonempty canonical barcode. Route the user to the existing item; preserve the draft while they decide.
- Manual barcode fallback is text entry with digit validation; accept common 8-, 12-, and 13-digit UPC/EAN lengths. Do not require checksum validation for MVP testing. This is distinct from Add Manually, which can omit the barcode entirely.

### Item form and validation

| Field | Contract |
| --- | --- |
| Product name | Required after trimming; maximum 200 characters |
| Barcode | Text; required for scanner/manual-barcode flow; optional only for Add Manually; existing barcode-less manual items remain editable |
| Price | Required unit price; zero allowed; non-negative decimal with at most two decimal places |
| Quantity | Required positive whole number; default 1 |

Reject negative amounts, blank prices, exponent notation, NaN/Infinity, fractional quantities, and ambiguous currency/grouping separators. Allow a single dot or comma decimal separator in price input and normalize it; explain the expected input inline. Reject extra decimal places rather than silently rounding. Keep entered values when validation or saving fails.

Store prices as integer cents, parse input without binary floating-point multiplication, and calculate line totals and session totals using integer arithmetic. Reject values or aggregates exceeding JavaScript's safe-integer range before writing. Display amounts with two decimal places and a currency symbol; export numeric amounts with two decimal places and no symbol or grouping separators.

## 4. Data model and durability

### Session

| Field | Storage and meaning |
| --- | --- |
| id | Locally generated UUID; primary key |
| name | Nonempty resolved session name |
| createdAt | UTC ISO 8601 timestamp; immutable |
| updatedAt | UTC ISO 8601 timestamp of latest committed session/item change |
| status | `active` or `finished` |

### Item

| Field | Storage and meaning |
| --- | --- |
| id | Locally generated UUID; primary key |
| sessionId | Foreign key to session |
| barcode | Text, empty string for barcode-less manual entries |
| productName | Validated name |
| price | Integer cents; represents the requested unit-price field |
| quantity | Positive integer |
| createdAt | UTC ISO 8601 timestamp; immutable |
| updatedAt | UTC ISO 8601 timestamp of latest item change |

Line totals, session totals, and item counts are derived; do not persist duplicate totals. A derived canonical barcode key may be indexed for uniqueness within a session, excluding empty barcodes.

Use SQLite as the single persisted source of truth. Each item mutation and its parent session timestamp update must commit in one transaction. Delete a session and its items atomically. Add schema versioning from the initial schema. Never reset the database silently after an initialization/migration error.

Persist every successful add, edit, quantity change, deletion, and status change immediately. Opening or exporting a session does not modify its timestamp. Show saved state only after commit; failed writes show an actionable error and do not pretend the change succeeded. Handle rapid taps and in-flight writes without lost updates. Back navigation and pause wait for pending operations. Previously committed data survives force quit, restart, and device reboot.

## 5. CSV export contract

- Export a consistent snapshot of the selected session after pending writes finish.
- Exact header order: `Date,Session Name,Product Name,Barcode,Price,Quantity,Line Total`.
- One data row per item, ordered by creation time with ID as a stable tie-breaker. No totals/footer row or extra metadata columns.
- Date is the session creation date in UTC, formatted `YYYY-MM-DD`, consistently for all rows. The UI may display timestamps in local time.
- Price and Line Total use a dot decimal separator, exactly two decimal places, no currency symbol or thousands grouping. Quantity is an integer.
- Use UTF-8 with a BOM for Excel compatibility and CRLF record separators. Quote fields containing commas, double quotes, CR, or LF; double embedded quotation marks. Preserve Unicode.
- Treat user-entered names as spreadsheet text: prefix potentially executable formula-like values beginning with `=`, `+`, `-`, or `@` (including after leading whitespace/control characters) with an apostrophe in the export. Document that spreadsheet readers may display that apostrophe; do not modify stored names.
- Barcode stays plain text in CSV; do not emit spreadsheet formulas to force its type. CSV cannot enforce spreadsheet column types, so leading zeros may be removed by automatic import. Document importing Barcode as text in Sheets/Excel and verify the source file preserves zeros.
- Use a sanitized filename such as `shopscan-2026-10-27-<short-session-id>.csv`; do not use raw session names as paths.
- Create the temporary file in app cache, then invoke the native share sheet with CSV metadata. Retain the file long enough for the receiving app; clean old exports on a later launch rather than immediately after sharing.
- Handle file-write failure, unavailable sharing, and share cancellation without changing or deleting the session. Do not report that another app successfully imported a file merely because sharing was launched.
- Google Sheets, Excel, email, and file-saving destinations depend on installed apps and OS capabilities. Offer a valid shareable file; direct Sheets login/API integration is excluded.

## 6. Usability and accessibility

Use simple session cards and item rows, generous touch targets (at least 48 logical units where practical), clear focus/reading order, accessible labels for icon actions, and inline errors associated with fields. Support VoiceOver on iOS and TalkBack on Android, dynamic text sizing, sufficient contrast, safe areas, keyboard avoidance, and Android hardware back. Do not use color alone to indicate errors or status. Verify that the keyboard and larger text cannot cover Save or the total.

## 7. Completion definition

The MVP is complete only when the checklist in [Acceptance tests](ACCEPTANCE_TESTS.md) passes, with real-device scanning and sharing verified on both iOS and Android. Unexecuted checks must be labeled unverified. Type checks, lint, and meaningful tests must pass, and final documentation must include actual commands, changed files, and known limitations.

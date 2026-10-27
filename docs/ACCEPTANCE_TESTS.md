# ShopScan acceptance checklist

Status: Base implementation and automated tests now exist. See [Verification report](VERIFICATION.md) for executed checks. This checklist remains the broader physical-device acceptance plan; unchecked device cases are not implied to have passed.

Record device model, OS, Expo SDK/build type, result, and any issue for each platform. Every core device case must pass on both a real iPhone and a real Android phone. Simulator results supplement these checks.

## Automated verification planned

- [ ] TypeScript strict type check and lint pass.
- [ ] Money: `0.10 × 3 + 0.20 = 0.50`; zero prices; one/two decimals; dot/comma decimal input; no displayed floating-point artifacts.
- [ ] Validation rejects blank names/prices, negatives, excess decimal places, exponent notation, nonfinite values, zero/fractional quantities, and unsafe integer totals.
- [ ] Barcode matching preserves leading zeros, recognizes UPC-A/zero-prefixed EAN equivalence, permits multiple barcode-less manual items, and isolates sessions.
- [ ] Repository creates/loads/updates/deletes records; transactions preserve consistency; parent timestamps change on child writes; failed writes do not partially commit; duplicate constraints hold.
- [ ] Initial schema migration succeeds, reopening does not erase data, and migration failure never silently resets storage.
- [ ] Interaction tests cover duplicate quantity/edit/cancel choices, form validation, discard confirmation, and save-error retention.
- [ ] CSV parser round-trip verifies exact seven headers, row ordering, cents formatting, quotes, commas, CR/LF, accented names, emoji, empty/manual barcodes, and leading zeros in raw data.
- [ ] CSV handles formula-like user names as text and contains no extra footer/total rows.
- [ ] Share orchestration handles write errors, share errors/unavailability, cancellation, and repeat exports without session mutation.

## Device scenarios — run on iOS and Android

| Scenario | Expected result |
| --- | --- |
| Fresh install | Helpful empty state; no sign-in required |
| Create with blank or whitespace name | Date-based default name; one active session |
| Create with custom name; rapidly tap create | One correctly named session, no duplicate submission |
| Add a manual item | Required name, entered unit price, default quantity 1, correct total; barcode may be empty |
| Invalid inputs | Inline understandable errors; draft retained; nothing saved |
| Camera permission granted | Scanner opens and reads representative UPC-A, UPC-E, EAN-8, EAN-13 labels |
| Permission denied/permanently denied | Explanation, manual fallback, and Settings action where appropriate |
| Camera unavailable / unreadable label | Manual barcode entry and Add Manually remain usable |
| New barcode | Prefilled barcode form; no guessed product/price; cancel creates no item |
| Hold barcode in camera | One accepted scan until flow completes, no repeated dialogs or writes |
| Existing barcode | Explicit increase/edit/cancel choices; increment keeps name/price; cancel leaves data unchanged |
| Manual barcode or edited barcode collision | Same duplicate rule; no hidden merge or extra duplicate row |
| Same barcode in another session | Independent item and price |
| Edit price/name/quantity | Saved row, line total, estimated total, and modified timestamp update correctly |
| Delete item and cancel deletion | Confirm removes only intended item; cancel does nothing; last-item removal restores empty state |
| Leave dirty form | Discard/keep-editing choice; committed rows unaffected |
| Pause | Returns Home; status active; session and count saved |
| Kill app immediately after save; relaunch/reboot | All committed changes survive; incomplete drafts need not survive |
| Resume old session | Prior items load; new items and edits persist |
| Finish/review | Review does not change status until Mark Finished; finished record remains accessible |
| Continue finished session | Status returns to active; items can be changed and exported again |
| Delete session | Named confirmation; deletes only selected session and its items |
| Storage failure simulation | Actionable error; no false success; retry does not duplicate records |
| Offline/airplane mode | Create, scan, edit, save, resume, and generate CSV still work |
| Accessibility and small display | VoiceOver/TalkBack labels, readable large text, reachable controls, visible total, no keyboard obstruction |
| Android back / iOS navigation | No unintended lost drafts or interrupted committed writes |

## Export verification — run on both platforms

1. Create a session with multiple quantities, a zero-price item, a barcode beginning with zero, and names containing commas, quotes, accented letters, and emoji. Include a formula-like name such as `=1+1`.
2. Export while active; verify the native share sheet and a `.csv` attachment. Cancel sharing and verify the session remains usable.
3. Save/share the file, inspect its raw encoding/content, and open/import in Google Sheets and Microsoft Excel. If an app is not offered directly, save the file first and import it there.
4. Verify exact column names/order, one row per item, session creation date, escaped names, numeric Price/Quantity/Line Total, and exact line amounts. Verify formula-like names do not execute as formulas.
5. Verify raw barcodes retain all digits. Import Barcode as text to preserve leading zeros; document the automatic-import limitation instead of claiming CSV can force column types.
6. Finish the session and export again. Neither export changes status, updatedAt, item count, or stored values. Edit after Continue Shopping and verify a fresh export reflects the new data.
7. Verify empty-session export explains why it is disabled; sharing unavailable/file-write errors show a useful message; old cache-file cleanup does not break a just-shared attachment.

## Future completion report

Report exact check commands/results, devices/OS versions tested, real-device scan formats verified, spreadsheet applications/import methods checked, changed files, and unresolved limitations. Do not mark unavailable device tests as passed. Current planning deliverables do not satisfy implementation acceptance.

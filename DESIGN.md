# ShopScan design

Native shopping utility: a clear list you can use with one hand in a bright grocery aisle. Native stack navigation and confirmation dialogs adapt to iOS and Android. No decorative animation or marketing dashboard.

## Tokens and hierarchy
Light: paper #F6F8F5, surface #FFFFFF, ink #172B24, muted #52665C, primary #176448, error #B3261E. Dark equivalents live in src/ui.tsx. Native system typography follows device font scaling: 32 title, 22 section, 17 body, 14 supporting text. Tabular numerals align monetary values. Spacing uses 4/8/12/16/24/32. Actions have 48-point minimum targets.

## Layout
Home: title, short explanation, saved-session rows, bottom Start Shopping action. Session: name/status, item rows, fixed estimated-total and Scan Item action; manual entry and review/export are secondary. Forms use visible labels and inline errors. Lists use separators rather than nested cards. Native body fonts are intentional for platform familiarity and accessibility.

## Interaction
Immediate pressed-color/opacity feedback, no decorative movement. Native navigation transitions; honor reduced motion. Saving disables conflicting actions. Empty and failed states name the next useful action. Dark mode uses explicit semantic colors. Review and finish are separate decisions.

## Skills applied
Frontend Design (local and plugin copies): deliberate restrained palette and hierarchy. Impeccable: native platform structure and craft checks (context launcher unavailable). Emil Design Engineering: prompt feedback and low animation frequency. Hackathon Frontend: complete create/add/review/export path. React best practices: derived totals, direct imports, focused state. Web Interface Guidelines: transferable labeling, contrast, errors and keyboard principles. shadcn was reviewed; its DOM components are inapplicable to React Native and are not installed.

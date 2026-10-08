# Kornet UI Library

Premium logistics/accounting surfaces use `src/components/ui` plus HSL tokens in `src/index.css`.

## Principles
- Keyboard first: every primary action should expose a shortcut (`Button kbd`, `PageHeader primaryAction`, command palette).
- Dense but calm: use `FormSection` for Logisuite-style groups, 2–3 column form grids, compact density for operators.
- No fake business data: use `EmptyState`, `Skeleton`, or real API rows only.
- Money/document numbers: use `font-mono tabular-nums`, `MoneyInput`, and `formatMoney`.
- Accessibility: visible labels, `FormField` errors beside controls, `IconButton label`, Radix dialogs/menus/tooltips.

## Component map
- Actions: `Button`, `IconButton`, `Kbd`.
- Fields: `Input`, `NumberInput`, `MoneyInput`, `DateInput`, `Select`, `Combobox`, `Textarea`, `Checkbox`, `Switch`, `SegmentedControl`, `FormField`.
- Structure: `Card`, `StatCard`, `FormSection`, `Tabs`, `PageHeader`, `Toolbar`, `FilterBar`, `SplitView`.
- Data: `DataGrid`, `EditableGrid`, `exportRowsToExcel`.
- Overlays: `Sheet/Drawer`, `Dialog`, `ConfirmDialog`, `Popover`, `Tooltip`, `DropdownMenu`.
- Feedback: `Toast`, `Skeleton`, `EmptyState`, `StatusPill`, `Timeline`, `Stepper`.

## CRUD page pattern
Use `PageHeader` + `Toolbar` + `SplitView`. Put the list in `DataGrid`, open create/edit in `Sheet`, and group inputs with `FormSection`. Keep server-calculated totals read-only; UI previews are hints only.

## Hotkeys
Use `useHotkeys([{ key: 'Mod+S', description: 'Save', handler }])`. Do not bind printable keys while focus is in inputs; the hook handles this for bare keys.

## Do / don't
Do use semantic tokens (`bg-card`, `text-muted-foreground`). Do not hardcode business statuses; use `StatusPill`. Do not animate layout properties or exceed 200ms for route and panel transitions.

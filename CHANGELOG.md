# Change Log

All notable changes to the "keycheat" extension will be documented in this file.

## [0.0.4] - 2026-08-25
- Detect Devin editor so keybindings load from the correct User directory.
- Stop applying shift-symbol substitution to `ctrl+` keys so `ctrl+;` renders as `ctrl+;` instead of `ctrl+:`.

## [0.0.3] - 2025-07-10
- Optional `hidden` property for both VSCode keybindings and Vim bindings. If hidden is true, the keybinding is not shown in the Keycheat picker.

## [0.0.2] - 2025-06-26
- Optional `label` property support for both VSCode keybindings and Vim bindings. If present, the label is shown in the Keycheat picker for easier identification of your custom shortcuts.

## [0.0.1] - 2025-06-25
- Initial release

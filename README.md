# Keycheat
![Keycheat screenshot](media/screenshot.png)

## What is Keycheat?
Keycheat is your personal command cheat sheet for VS Code. Hit a shortcut, get a searchable list of *your* keybindings (including Vim bindings if you use VSCodeVim), and run them instantly. It’s like muscle memory, but searchable.


## Features

- **Super Fast Access:** Pop up your keybindings with `Ctrl+Alt+K` (or map your own!)
- **Search Everything:** Fuzzy-search all your custom keybindings (and Vim bindings if you use them)
- **Recent Commands:** Remembers what you use most and floats them to the top
- **Works with VSCodeVim:** Shows your Vim mode custom bindings too
- **Custom Labels:** Optionally add a `label` property to your keybindings or Vim bindings for descriptive names—these will be shown in the Keycheat picker.
- **Zero Setup:** Just install and go. It reads your existing keybindings and settings.
- **Cross-Platform:** Mac, Windows, Linux—no worries


## How to Use

1. **Open Keycheat**
   - Press `Ctrl+Alt+K` (or use the Command Palette: `Keycheat: Show Key Bindings`)
2. **Search**
   - Start typing to filter through your keybindings
   - If a keybinding or Vim binding has a `label` property, it will be shown before the command name for easier identification.
3. **Hit Enter**
   - Run the command instantly!

## Configuration
Keycheat adds a couple of settings (totally optional):

- `keycheat.rememberRecent` (default: `true`):
  - Remembers your recently used commands and shows them first

## Example: Using the `label` Property

You can add a `label` to your keybindings or Vim bindings for a more descriptive display in Keycheat.

**VSCode Keybindings Example (`keybindings.json`):**
```json
{
  "key": "ctrl+shift+p",
  "command": "workbench.action.showCommands",
  "label": "Show Command Palette"
}
```

**VSCodeVim Example (`settings.json`):**
```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["space", "f"],
      "commands": ["workbench.action.quickOpen"],
      "label": "Quick File Open"
    }
  ]
}
```

The `label` will appear alongside the keybinding in the Keycheat picker, making it easier to recognize your custom shortcuts!

## Pro Tips

- **Vim User?** Your custom Vim bindings show up if you’re using VSCodeVim!
- **Remap the Shortcut:** Change the default `Ctrl+Alt+K` to anything you want in your VS Code keybindings.
- **Privacy:** Keycheat only reads your local config. Nothing is sent anywhere.


## Issues & Feedback
Found a bug? Have an idea? [Open an issue](https://github.com/joshskidmore/vscode-keycheat/issues) or submit a PR!

## Changelog
See [CHANGELOG.md](./CHANGELOG.md) for what’s new.

## License
MIT


Made with love️ by [@joshskidmore](https://github.com/joshskidmore)

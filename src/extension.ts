import * as fs from 'fs';
import { parse } from 'json5';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const RECENT_KEY = 'keycheat.recentCommands';
const MAX_RECENT = 15;

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('keycheat.show', async () => {
    try {
      const rememberRecent = vscode.workspace
        .getConfiguration('keycheat')
        .get<boolean>('rememberRecent', true);

      const keybindingsRaw = fs.readFileSync(getUserPath('keybindings.json'), 'utf8');
      const settingsRaw = fs.readFileSync(getUserPath('settings.json'), 'utf8');
      const keybindings = parse(keybindingsRaw);
      const settings = parse(settingsRaw);

      let items: vscode.QuickPickItem[] = [
        ...parseVSCodeKeybindings(keybindings),
        ...parseVimKeybindings(settings, 'vim.normalModeKeyBindings',            'Normal'),
        ...parseVimKeybindings(settings, 'vim.normalModeKeyBindingsNonRecursive','Normal (Non-Recursive)'),
      ];

      let recent: string[] = [];

      if (rememberRecent) {
        recent = context.globalState.get<string[]>(RECENT_KEY, []);
      }

      items.sort((a, b) => {
        const aCmd = extractCommandId(a.label);
        const bCmd = extractCommandId(b.label);
        const aIdx = recent.indexOf(aCmd);
        const bIdx = recent.indexOf(bCmd);

        if (aIdx !== -1 || bIdx !== -1) {
          return (aIdx !== -1 ? aIdx : MAX_RECENT) - (bIdx !== -1 ? bIdx : MAX_RECENT);
        }

        return groupFromKey(a.label).localeCompare(groupFromKey(b.label));
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Search your keybindings…',
        matchOnDescription: true,
        matchOnDetail:      true,
      });

      if (selected) {
        const cmdId = extractCommandId(selected.label);

        if (rememberRecent && cmdId) {
          const updated = [cmdId, ...recent.filter(id => id !== cmdId)].slice(0, MAX_RECENT);
          await context.globalState.update(RECENT_KEY, updated);
        }

        if (cmdId) {
          const allCommands = await vscode.commands.getCommands(true);

          if (allCommands.includes(cmdId)) {
            await vscode.commands.executeCommand(cmdId);
          }
        }
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        vscode.window.showErrorMessage(`[Keycheat] Error: ${(err as { message: string }).message}`);
      } else {
        vscode.window.showErrorMessage(`[Keycheat] Error: Unknown error`);
      }
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {}



/**
 * Gets the path to the user directory for the current platform
 * 
 * @param filename The filename to get the path for
 * @returns The path to the user directory
 */
const getUserPath = (filename: string): string => {
  const home    = os.homedir();
  const isWin   = process.platform === 'win32';
  const appName = vscode.env.appName;

  const codeName = appName.includes('Cursor') ? 'Cursor'
                  : appName.includes('Windsurf') ? 'Windsurf'
                  : appName.includes('Insiders') ? 'Code - Insiders'
                  : appName.includes('VSCodium') ? 'VSCodium'
                  : 'Code';

  if (isWin) {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');

    return path.join(appData, codeName, 'User', filename);
  }

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', codeName, 'User', filename);
  }

  return path.join(home, '.config', codeName, 'User', filename);
};

interface VSCodeKeybinding {
  key: string;
  command: string;
  when?: string;
}

/**
 * Parses VSCode keybindings into QuickPickItems
 * 
 * @param data The data to parse
 * @returns The parsed keybindings
 */
const parseVSCodeKeybindings = (data: unknown): vscode.QuickPickItem[] => {
  const arr = Array.isArray(data) ? data as VSCodeKeybinding[] : [];

  return arr
    .filter((e): e is VSCodeKeybinding => typeof e.key === 'string' && typeof e.command === 'string')
    .map(e => ({
      label: `${formatKeyLabel(e.key)} – ${e.command}`,
      description: '',
      detail: e.when ? `when: ${e.when}` : '',
    }));
};

interface VimKeybindingEntry {
  before: string[];
  commands: string[];
}

/**
 * Parses Vim keybindings into QuickPickItems
 * 
 * @param settings The settings to parse
 * @param key The key to parse
 * @param modeLabel The mode label to use
 * @returns The parsed keybindings
 */
const parseVimKeybindings = (settings: Record<string, unknown>, key: string, modeLabel: string): vscode.QuickPickItem[] => {
  const entries = Array.isArray(settings[key]) ? settings[key] as VimKeybindingEntry[] : [];
  const filterFn = (entry: VimKeybindingEntry): entry is VimKeybindingEntry => {
    const hasValidBefore = Array.isArray(entry.before);
    const hasValidCommands = Array.isArray(entry.commands);

    return hasValidBefore && hasValidCommands;
  };
  const mapFn = (entry: VimKeybindingEntry) => ({
      label: `${formatKeyLabel(entry.before.join(' '))} – ${entry.commands.join(', ')}`,
      description: `vim: ${modeLabel}`,
      detail: ''
  });

  return entries
    .filter(filterFn)
    .map(mapFn);
};

/**
 * Extracts the command ID from a keybinding label
 * 
 * @param label The keybinding label to extract the command ID from
 * @returns The command ID from the keybinding label
 */
const extractCommandId = (label: string): string => {
  return label.split('–')[1]?.trim() || '';
};

/**
 * Extracts the group from a keybinding label
 * 
 * @param label The keybinding label to extract the group from
 * @returns The group from the keybinding label
 */
const groupFromKey = (label: string): string => {
  const raw = label.split('–')[0].trim();

  if (raw.startsWith('<space>')) {
    return '<space>';
  }

  if (raw.startsWith('Ctrl')) {
    return 'Ctrl';
  }

  if (raw.startsWith('g')) {
    return 'g';
  }

  return raw.split(' ')[0];
};

/**
 * Formats a raw keybinding string into a human-readable format
 * 
 * @param raw The raw keybinding string to format.
 * @returns The formatted keybinding string.
 */
const formatKeyLabel = (raw: string): string => {
  return raw.split(' ')
    .map(k => {
      if (k === 'space') {
        return '<space>';
      }

      if (k.startsWith('space+')) {
        return '<space>' + prettyKey(k.slice(6));
      }

      return prettyKey(k);
    })
    .join(' ');
};

/**
 * Formats a raw keybinding string into a human-readable format
 * 
 * @param k The raw keybinding string to format.
 * @returns The formatted keybinding string.
 */
const prettyKey = (k: string): string => {
  if (k.startsWith('shift+')) {
    const char = k.slice(6);

    if (/^[a-z]$/.test(char)) {
      return char.toUpperCase();
    }
  }

  if (k.startsWith('ctrl+')) {
    const char = k.slice(5);

    return `Ctrl+${char.length === 1 ? char.toUpperCase() : char}`;
  }

  return k;
};
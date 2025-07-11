import * as fs from 'fs';
import { parse } from 'json5';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const RECENT_KEY = 'keycheat.recentCommands';
const MAX_RECENT = 15;

type KeycheatItem = vscode.QuickPickItem & { cmdId?: string };

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

      let items: KeycheatItem[] = [
        ...parseVSCodeKeybindings(keybindings),
        ...parseVimKeybindings({ settings, key: 'vim.normalModeKeyBindings', modeLabel: 'vim: normal' }),
        ...parseVimKeybindings({ settings, key: 'vim.normalModeKeyBindingsNonRecursive', modeLabel: 'vim: normal (non-recursive)' }),
      ];

      let recent: string[] = [];

      if (rememberRecent) {
        recent = context.globalState.get<string[]>(RECENT_KEY, []);
      }

      items.sort((a, b) => {
        const aIdx = recent.indexOf(a.cmdId || '');
        const bIdx = recent.indexOf(b.cmdId || '');

        if (aIdx !== -1 || bIdx !== -1) {
          return (aIdx !== -1 ? aIdx : MAX_RECENT) - (bIdx !== -1 ? bIdx : MAX_RECENT);
        }

        return groupFromKey(a.label).localeCompare(groupFromKey(b.label));
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Keycheat: Search your keys…',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (selected) {
        const cmdId = selected.cmdId;

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
  label?: string;
  hidden?: boolean;
  key: string;
  command: string;
  when?: string;
}

const parseVSCodeKeybindings = (data: unknown): KeycheatItem[] => {
  const arr = Array.isArray(data) ? data as VSCodeKeybinding[] : [];

  return arr
    .filter((e): e is VSCodeKeybinding => typeof e.key === 'string' && typeof e.command === 'string')
    .filter((e) => !e.command.startsWith('-'))
    .filter((e) => !e.hidden)
    .map(e => {
      const keyLabel = padRight(formatKeyLabel(e.key), 15);
      const cmd = e.command;
      const userLabel = (e as any).label as string | undefined;
      const detail = e.when ? `when: ${e.when}` : '';

      return {
        label: keyLabel,
        description: userLabel ? `${userLabel} - ${cmd}` : cmd,
        detail,
        iconPath: new vscode.ThemeIcon('keyboard'),
        cmdId: cmd
      };
    });
};

interface VimKeybindingEntry {
  label?: string;
  hidden?: boolean;
  before: string[];
  commands: string[];
}

interface VimKeybindingsParams {
  settings: Record<string, unknown>,
  key: string,
  modeLabel: string
}

const parseVimKeybindings = (parms: VimKeybindingsParams): KeycheatItem[] => {
  const { settings, key, modeLabel } = parms;
  const entries = Array.isArray(settings[key]) ? settings[key] as VimKeybindingEntry[] : [];

  return entries
    .filter((entry): entry is VimKeybindingEntry => Array.isArray(entry.before) && Array.isArray(entry.commands))
    .filter((entry) => !entry.hidden)
    .map(entry => {
      const keyLabel = padRight(formatKeyLabel(entry.before.join(' ')), 8);
      const commandLabel = entry.commands.join(', ');
      const userLabel = (entry as any).label as string | undefined;
      const detail = modeLabel;

      return {
        label: keyLabel,
        description: userLabel ? `${userLabel} - ${commandLabel}` : commandLabel,
        detail,
        iconPath: new vscode.ThemeIcon('chevron-right'),
        cmdId: entry.commands[0]
      };
    });
};

const groupFromKey = (label: string): string => {
  const raw = label.trim();

  if (raw.startsWith('<space>')) return '<space>';
  if (raw.startsWith('Ctrl')) return 'Ctrl';
  if (raw.startsWith('g')) return 'g';

  return raw.split(' ')[0];
};

const padRight = (str: string, minLen: number): string => {
  const extra = str.length >= minLen ? 2 : minLen - str.length;
  return str + ' '.repeat(extra);
};

const formatKeyLabel = (raw: string): string => {
  const label = raw.split(' ')
    .map(k => {
      if (k === 'space') return '<space>';
      if (k.startsWith('space+')) return '<space> ' + prettyKey(k.slice(6));
      return prettyKey(k);
    })
    .join(' ');

  return ` ${label}`;
};

const shiftedSymbols: Record<string, string> = {
  '1': '!',
  '2': '@',
  '3': '#',
  '4': '$',
  '5': '%',
  '6': '^',
  '7': '&',
  '8': '*',
  '9': '(',
  '0': ')',
  '`': '~',
  '-': '_',
  '=': '+',
  '[': '{',
  ']': '}',
  '\\': '|',   // ← fixed this line
  ';': ':',
  "'": '"',
  ',': '<',
  '.': '>',
  '/': '?'
};

const prettyKey = (k: string): string => {
  if (k.startsWith('shift+')) {
    const char = k.slice(6);
    if (/^[a-z]$/.test(char)) return char.toUpperCase();
    if (shiftedSymbols[char]) return shiftedSymbols[char];
    return char;
  }

  if (k.startsWith('ctrl+')) {
    const char = k.slice(5);
    const displayChar = shiftedSymbols[char] || char;
    return `<ctrl+${displayChar}>`;
  } else if (k.toLowerCase().match('ctrl|alt|shift|meta')) {
    return `<${k}>`;
  }

  return k;
};
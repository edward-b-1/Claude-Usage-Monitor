import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { fetchUsage } from './api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIE_FILE = join(homedir(), '.claude-monitor-cookie');

const INTERVALS = [
  { label: '30 seconds', ms: 30 * 1000 },
  { label: '1 minute',   ms: 60 * 1000 },
  { label: '5 minutes',  ms: 5 * 60 * 1000 },
  { label: '10 minutes', ms: 10 * 60 * 1000 },
];

let mainWindow = null;
let pollTimer = null;
let isAlwaysOnTop = false;
let pollIntervalMs = 60 * 1000;

function loadCookie() {
  if (existsSync(COOKIE_FILE)) return readFileSync(COOKIE_FILE, 'utf8').trim();
  return null;
}

async function pollUsage() {
  const cookie = loadCookie();
  if (!cookie) {
    mainWindow?.webContents.send('usage-error', `No cookie found at ${COOKIE_FILE}`);
    return;
  }
  try {
    const data = await fetchUsage(cookie);
    mainWindow?.webContents.send('usage-update', data);
  } catch (err) {
    mainWindow?.webContents.send('usage-error', err.message);
  }
}

function setInterval_(ms) {
  pollIntervalMs = ms;
  clearInterval(pollTimer);
  pollTimer = setInterval(pollUsage, pollIntervalMs);
}

function buildContextMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click() {
        isAlwaysOnTop = !isAlwaysOnTop;
        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
      },
    },
    {
      label: 'Refresh Interval',
      submenu: INTERVALS.map(({ label, ms }) => ({
        label,
        type: 'radio',
        checked: pollIntervalMs === ms,
        click() { setInterval_(ms); },
      })),
    },
    { type: 'separator' },
    { label: 'Refresh Now', click() { pollUsage(); } },
    { type: 'separator' },
    { label: 'Quit', click() { app.quit(); } },
  ]);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 185,
    resizable: false,
    frame: false,
    alwaysOnTop: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.on('context-menu', () => {
    buildContextMenu().popup({ window: mainWindow });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    clearInterval(pollTimer);
  });
}

ipcMain.on('request-refresh', () => pollUsage());
ipcMain.on('close-window', () => mainWindow?.close());

app.whenReady().then(() => {
  createWindow();
  pollUsage();
  pollTimer = setInterval(pollUsage, pollIntervalMs);
});

app.on('window-all-closed', () => app.quit());

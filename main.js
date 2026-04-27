import { app, BrowserWindow, Menu, ipcMain, session } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchUsage } from './api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PARTITION = 'persist:claude-ai';

const INTERVALS = [
  { label: '30 seconds', ms: 30 * 1000 },
  { label: '1 minute',   ms: 60 * 1000 },
  { label: '5 minutes',  ms: 5 * 60 * 1000 },
  { label: '10 minutes', ms: 10 * 60 * 1000 },
];

let mainWindow = null;
let loginWindow = null;
let pollTimer = null;
let isAlwaysOnTop = false;
let pollIntervalMs = 60 * 1000;
let cookieString = null;

function claudeSession() {
  return session.fromPartition(PARTITION);
}

async function extractCookies() {
  const cookies = await claudeSession().cookies.get({ url: 'https://claude.ai' });
  cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  return cookieString;
}

function makeFetch() {
  return (url) => fetch(url, {
    headers: {
      'Cookie': cookieString,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-GB,en;q=0.9',
      'Referer': 'https://claude.ai/',
      'Origin': 'https://claude.ai',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'anthropic-client-platform': 'web_claude_ai',
      'anthropic-client-version': '0.0.0',
    },
  });
}

async function isAuthenticated() {
  await extractCookies();
  if (!cookieString.includes('sessionKey')) return false;
  try {
    const res = await makeFetch()('https://claude.ai/api/account');
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.memberships?.length;
  } catch {
    return false;
  }
}

async function pollUsage() {
  try {
    const data = await fetchUsage(makeFetch());
    mainWindow?.webContents.send('usage-update', data);
  } catch (err) {
    mainWindow?.webContents.send('usage-error', err.message);
    if (err.message.includes('Authentication failed')) showLoginWindow();
  }
}

function startPolling() {
  pollUsage();
  clearInterval(pollTimer);
  pollTimer = setInterval(pollUsage, pollIntervalMs);
}

function setRefreshInterval(ms) {
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
        click() { setRefreshInterval(ms); },
      })),
    },
    { type: 'separator' },
    { label: 'Refresh Now', click() { pollUsage(); } },
    { type: 'separator' },
    {
      label: 'Sign Out',
      async click() {
        cookieString = null;
        await claudeSession().clearStorageData();
        clearInterval(pollTimer);
        mainWindow?.close();
        showLoginWindow();
      },
    },
    { type: 'separator' },
    { label: 'Quit', click() { app.quit(); } },
  ]);
}

function showLoginWindow() {
  if (loginWindow) return;

  loginWindow = new BrowserWindow({
    width: 960,
    height: 660,
    title: 'Sign in to Claude',
    webPreferences: {
      partition: PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loginWindow.loadURL('https://claude.ai/login');

  const ses = claudeSession();
  const onCookieChanged = async (_event, cookie, _cause, removed) => {
    if (cookie.name === 'sessionKey' && !removed) {
      ses.cookies.off('changed', onCookieChanged);
      // Wait briefly for any remaining cookies to settle
      setTimeout(async () => {
        await extractCookies();
        loginWindow?.close();
        loginWindow = null;
        createMainWindow();
      }, 1500);
    }
  };
  ses.cookies.on('changed', onCookieChanged);

  loginWindow.on('closed', () => {
    loginWindow = null;
    ses.cookies.off('changed', onCookieChanged);
    if (!mainWindow) app.quit();
  });
}

function createMainWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 190,
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

  startPolling();
}

ipcMain.on('request-refresh', () => pollUsage());
ipcMain.on('close-window', () => mainWindow?.close());

app.whenReady().then(async () => {
  if (await isAuthenticated()) {
    createMainWindow();
  } else {
    showLoginWindow();
  }
});

app.on('window-all-closed', () => app.quit());

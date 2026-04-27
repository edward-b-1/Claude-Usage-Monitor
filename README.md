# Claude Usage Monitor

A small always-on-top desktop app for Windows 11 that shows your current Claude token usage, queried live from claude.ai.

Displays three usage metrics with colour-coded progress bars:
- 5-hour rate limit window
- 7-day usage window
- Extra credit spend (monthly)

Right-click the window to toggle Always on Top, refresh, or quit.

## Getting started

### 1. Download the app

Download the latest build from the [Actions](https://github.com/edward-b-1/Claude-Usage-Monitor/actions) tab:

1. Open the most recent successful run
2. Scroll to **Artifacts** and download **Claude-Usage-Monitor-Windows**
3. Extract the zip — you'll find two files:
   - `Claude Usage Monitor Setup 1.0.0.exe` — installs the app with a Start Menu shortcut
   - `Claude Usage Monitor-portable.exe` — runs without installing

### 2. Get your session cookie

The app authenticates with claude.ai using your browser session cookie.

1. Open [claude.ai](https://claude.ai) and log in
2. Open DevTools (`F12`) → **Network** tab
3. Refresh the page, click any request to `claude.ai`
4. Go to **Headers** → **Request Headers** → right-click the `cookie:` line → **Copy value**

### 3. Save the cookie to a file

On Windows, open PowerShell and run:

```powershell
notepad $HOME\.claude-monitor-cookie
```

Paste the cookie string in, save, and close.

> **Security note:** Treat this file like a password. Do not share it or commit it to git.

### 4. Run the app

Launch the app. It will load usage data automatically on startup and refresh every 60 seconds. Use the refresh button or right-click → Refresh to update manually.

## Cookie expiry

Session cookies expire periodically. If the app shows an authentication error, repeat steps 2–3 above with a fresh cookie from your browser.

## Building from source

Builds are produced automatically via GitHub Actions on every push to `main`. To build locally on Windows:

```powershell
npm install
npm run build
```

Output is written to the `dist/` folder.

## License

[GNU General Public License v3.0](LICENSE)

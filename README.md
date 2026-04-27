# Claude Usage Monitor

A tool for monitoring your Claude token usage from [claude.ai](https://claude.ai), displayed as a small always-on-top window on Windows 11.

## Status

Currently in CLI phase — the CLI tool successfully queries the claude.ai internal API and displays usage stats. The Electron desktop app is in development.

## Features (CLI)

- Displays 5-hour rate limit window usage
- Displays 7-day usage window
- Displays extra credit usage (monthly spend vs limit)
- Shows time until each window resets

## Requirements

- Node.js v18 or later
- A claude.ai account (Free or Pro)

## Setup

**1. Clone the repo**

```bash
git clone git@github.com:edward-b-1/Claude-Usage-Monitor.git
cd Claude-Usage-Monitor
```

**2. Get your session cookie**

1. Open [claude.ai](https://claude.ai) in your browser and log in
2. Open DevTools (`F12`) → **Network** tab
3. Refresh the page, click any request to `claude.ai`
4. Go to **Headers** → **Request Headers** → right-click the `cookie:` line → **Copy value**

**3. Save the cookie to a file**

```bash
nano ~/.claude-monitor-cookie
```

Paste the cookie string (no quotes needed), then save (`Ctrl+O`, `Ctrl+X`).

> **Security note:** The cookie file is stored outside the project directory and is excluded from git. Treat it like a password — do not share it or commit it.

**4. Run**

```bash
node cli.js
```

## Example output

```
Claude Usage — Edward (alice@example.com's Organization)
──────────────────────────────────────────────────
5-hour window  [███████████████░░░░░] 75%  (resets in 25m)
7-day window   [███████░░░░░░░░░░░░░] 35%  (resets in 1d 14h)
Extra credits  [█████████████░░░░░░░] 66%  (£9.92 / £15.00 monthly)
```

## Cookie expiry

Session cookies expire periodically. If you see an authentication error, repeat step 2–3 above with a fresh cookie from your browser.

## License

[GNU General Public License v3.0](LICENSE)

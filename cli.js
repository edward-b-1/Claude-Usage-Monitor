#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const BASE_URL = 'https://claude.ai';
const COOKIE_FILE = join(homedir(), '.claude-monitor-cookie');

function loadCookie() {
  if (existsSync(COOKIE_FILE)) {
    return readFileSync(COOKIE_FILE, 'utf8').trim();
  }
  return null;
}

async function get(path, cookie) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Cookie': cookie,
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
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

function bar(pct, width = 20) {
  const filled = Math.round((pct / 100) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

function formatReset(isoString) {
  if (!isoString) return 'unknown';
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = d - now;
  if (diffMs < 0) return 'resetting soon';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (diffHours < 24) return `${diffHours}h ${mins}m`;
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  return `${days}d ${hours}h`;
}

async function fetchUsage(cookie) {
  // Get account + org ID
  const { status: accStatus, body: account } = await get('/api/account', cookie);
  if (accStatus !== 200) {
    console.error('Authentication failed (status ' + accStatus + '). Refresh your cookie in ~/.claude-monitor-cookie');
    process.exit(1);
  }

  const org = account?.memberships?.[0]?.organization;
  if (!org) {
    console.error('Could not find organisation in account data.');
    process.exit(1);
  }

  const { status, body: usage } = await get(`/api/organizations/${org.uuid}/usage`, cookie);
  if (status !== 200) {
    console.error('Failed to fetch usage (status ' + status + ')');
    process.exit(1);
  }

  return { account, org, usage };
}

function display({ account, org, usage }) {
  const name = account.display_name ?? account.full_name ?? account.email_address;
  console.log(`\nClaude Usage — ${name} (${org.name})`);
  console.log('─'.repeat(50));

  if (usage.five_hour) {
    const u = usage.five_hour.utilization;
    const reset = formatReset(usage.five_hour.resets_at);
    console.log(`5-hour window  ${bar(u)} ${u}%  (resets in ${reset})`);
  }

  if (usage.seven_day) {
    const u = usage.seven_day.utilization;
    const reset = formatReset(usage.seven_day.resets_at);
    console.log(`7-day window   ${bar(u)} ${u}%  (resets in ${reset})`);
  }

  if (usage.extra_usage?.is_enabled) {
    const eu = usage.extra_usage;
    const u = Math.round(eu.utilization);
    const currency = eu.currency === 'GBP' ? '£' : eu.currency + ' ';
    const used = (eu.used_credits / 100).toFixed(2);
    const limit = (eu.monthly_limit / 100).toFixed(2);
    console.log(`Extra credits  ${bar(u)} ${u}%  (${currency}${used} / ${currency}${limit} monthly)`);
  }

  console.log();
}

const cookie = loadCookie();
if (!cookie) {
  console.error('No cookie file found. Create ~/.claude-monitor-cookie with your claude.ai session cookie.');
  console.error('See README or run with --help for instructions.');
  process.exit(1);
}

const data = await fetchUsage(cookie);
display(data);

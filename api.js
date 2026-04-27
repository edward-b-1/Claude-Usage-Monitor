const BASE_URL = 'https://claude.ai';

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

export async function fetchUsage(cookie) {
  const { status: accStatus, body: account } = await get('/api/account', cookie);
  if (accStatus !== 200) {
    throw new Error(`Authentication failed (${accStatus}). Refresh your cookie.`);
  }

  const org = account?.memberships?.[0]?.organization;
  if (!org) throw new Error('Could not find organisation in account data.');

  const { status, body: usage } = await get(`/api/organizations/${org.uuid}/usage`, cookie);
  if (status !== 200) throw new Error(`Failed to fetch usage (${status}).`);

  return { account, org, usage };
}

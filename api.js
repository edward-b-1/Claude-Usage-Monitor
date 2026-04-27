const BASE_URL = 'https://claude.ai';

async function get(path, fetchFn) {
  const res = await fetchFn(`${BASE_URL}${path}`);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

export async function fetchUsage(fetchFn) {
  const { status: accStatus, body: account } = await get('/api/account', fetchFn);
  if (accStatus !== 200) {
    throw new Error(`Authentication failed (${accStatus})`);
  }

  const org = account?.memberships?.[0]?.organization;
  if (!org) throw new Error('Could not find organisation in account data.');

  const { status, body: usage } = await get(`/api/organizations/${org.uuid}/usage`, fetchFn);
  if (status !== 200) throw new Error(`Failed to fetch usage (${status}).`);

  return { account, org, usage };
}

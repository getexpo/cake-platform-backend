const base = 'http://localhost:4120';
const headers = { 'Content-Type': 'application/json' };
async function api(path, options = {}) {
  const res = await fetch(`${base}${path}`, options);
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
async function run() {
  await api('/api/dev/reset', { method: 'POST' });
  const customer = await api('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'customer@demo.com', role: 'customer' }) });
  const token = customer.data.token;
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const created = await api('/api/designs', { method: 'POST', headers: auth, body: JSON.stringify({ shopId: 'shop-1', title: 'Drift probe', summary: 'check list persistence', estimatedTotal: 99, config: { occasion: 'Birthday', mode: 'simple', cakeType: 'round', layerCount: 1, layers: [] } }) });
  const list = await api('/api/designs?shopId=shop-1', { headers: { Authorization: `Bearer ${token}` } });
  console.log(JSON.stringify({ createdStatus: created.status, createdId: created.data.id, listStatus: list.status, listIds: Array.isArray(list.data) ? list.data.map(x => x.id) : list.data }, null, 2));
}
run();

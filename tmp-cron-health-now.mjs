const ports = [4020,4120,4130];
const checks = [
  { path: '/', expectJson: true },
  { path: '/health', expectJson: true },
  { path: '/api/auth/me' },
  { path: '/api/owner/orders/summary' },
  { path: '/api/meta/order-statuses' },
  { path: '/api/admin/shops', auth: 'owner' },
  { path: '/api/admin/shops', auth: 'admin' },
  { path: '/api/owner/orders/test-order/complete-pickup', method: 'POST', auth: 'owner' },
  { path: '/api/dev/reset', method: 'POST' },
];

async function login(base, role, email) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  const data = await res.json();
  return data.token;
}

async function run() {
  const out = [];
  for (const port of ports) {
    const base = `http://localhost:${port}`;
    const record = { port };
    try {
      const ownerToken = await login(base, 'owner', 'owner@demo.com');
      const adminToken = await login(base, 'admin', 'admin@demo.com');
      for (const check of checks) {
        const headers = {};
        if (check.auth === 'owner') headers.Authorization = `Bearer ${ownerToken}`;
        if (check.auth === 'admin') headers.Authorization = `Bearer ${adminToken}`;
        if (check.method === 'POST') headers['Content-Type'] = 'application/json';
        const res = await fetch(`${base}${check.path}`, { method: check.method || 'GET', headers });
        const text = await res.text();
        let body;
        try { body = JSON.parse(text); } catch { body = text; }
        record[`${check.method || 'GET'} ${check.path}${check.auth ? ` [${check.auth}]` : ''}`] = {
          status: res.status,
          routes: Array.isArray(body?.routes) ? body.routes.length : undefined,
          persistence: body?.persistence,
          error: body?.error,
        };
      }
    } catch (error) {
      record.error = String(error);
    }
    out.push(record);
  }
  console.log(JSON.stringify(out, null, 2));
}
run();

const ports = [4216,4222,4224];
const routes = ['/', '/health', '/api/meta/order-statuses', '/api/auth/sessions', '/api/owner/locations', '/api/admin/team'];
const login = async (base, role, email) => {
  const res = await fetch(base + '/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, role})});
  return await res.json();
};
for (const port of ports) {
  const base = `http://localhost:${port}`;
  const out = { port };
  try {
    const owner = await login(base, 'owner', 'owner@demo.com');
    const admin = await login(base, 'admin', 'admin@platform.com');
    for (const path of routes) {
      const headers = {};
      if (path === '/api/owner/locations') headers.Authorization = `Bearer ${owner.token}`;
      if (path === '/api/admin/team') headers.Authorization = `Bearer ${admin.token}`;
      const res = await fetch(base + path, { headers });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      out[path] = { status: res.status };
      if (path === '/') { out[path].routeCount = Array.isArray(data?.routes) ? data.routes.length : null; out[path].persistence = data?.persistence; }
      if (path === '/health') out[path].persistence = data?.persistence;
      if (path === '/api/admin/team') out[path].count = Array.isArray(data) ? data.length : null;
      if (path === '/api/owner/locations') out[path].count = Array.isArray(data) ? data.length : null;
    }
  } catch (error) {
    out.error = String(error);
  }
  console.log(JSON.stringify(out));
}

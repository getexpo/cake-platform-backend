const ports = [4020, 4120]
const routes = [
  ['GET', '/api/auth/me'],
  ['GET', '/api/owner/orders/summary'],
  ['GET', '/api/owner/queue'],
  ['GET', '/api/meta/order-statuses'],
  ['POST', '/api/dev/reset'],
]

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

for (const port of ports) {
  const base = `http://localhost:${port}`
  const ownerLogin = await jsonFetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }),
  })
  const adminLogin = await jsonFetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@demo.com', role: 'admin' }),
  })
  const ownerToken = ownerLogin.data?.token
  const adminToken = adminLogin.data?.token
  console.log(`PORT ${port} LOGIN owner=${ownerLogin.status} admin=${adminLogin.status}`)
  for (const [method, path] of routes) {
    const result = await jsonFetch(`${base}${path}`, {
      method,
      headers: ownerToken ? { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    })
    console.log(`PORT ${port} ${method} ${path} -> ${result.status}`)
  }
  const ownerAdminShops = await jsonFetch(`${base}/api/admin/shops`, {
    headers: ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {},
  })
  const adminAdminShops = await jsonFetch(`${base}/api/admin/shops`, {
    headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
  })
  console.log(`PORT ${port} owner GET /api/admin/shops -> ${ownerAdminShops.status}`)
  console.log(`PORT ${port} admin GET /api/admin/shops -> ${adminAdminShops.status}`)
}

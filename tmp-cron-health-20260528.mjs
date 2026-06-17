const ports = [4020, 4120, 4122, 4124, 4126, 4130]

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

for (const port of ports) {
  const base = `http://localhost:${port}`
  const row = { port }
  try {
    const root = await fetchJson(`${base}/`)
    row.rootStatus = root.status
    row.routeCount = Array.isArray(root.data?.routes) ? root.data.routes.length : null
    row.hasCompletePickup = Array.isArray(root.data?.routes) ? root.data.routes.includes('/api/owner/orders/:id/complete-pickup') : null

    const ownerLogin = await fetchJson(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }),
    })
    const adminLogin = await fetchJson(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com', role: 'admin' }),
    })

    row.ownerLogin = ownerLogin.status
    row.adminLogin = adminLogin.status

    const ownerToken = ownerLogin.data?.token
    const adminToken = adminLogin.data?.token

    const authMe = await fetchJson(`${base}/api/auth/me`, {
      headers: ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {},
    })
    row.authMe = authMe.status

    const summary = await fetchJson(`${base}/api/owner/orders/summary`, {
      headers: ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {},
    })
    row.ownerSummary = summary.status

    const completePickupProbe = await fetchJson(`${base}/api/owner/orders/order-1/complete-pickup`, {
      method: 'POST',
      headers: ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {},
    })
    row.completePickupProbe = completePickupProbe.status

    const ownerAdmin = await fetchJson(`${base}/api/admin/shops`, {
      headers: ownerToken ? { Authorization: `Bearer ${ownerToken}` } : {},
    })
    const adminAdmin = await fetchJson(`${base}/api/admin/shops`, {
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    })
    row.ownerAdminShops = ownerAdmin.status
    row.adminAdminShops = adminAdmin.status

    const health = await fetchJson(`${base}/health`)
    row.persistence = health.data?.persistence || null
  } catch (error) {
    row.error = String(error)
  }

  console.log(JSON.stringify(row))
}

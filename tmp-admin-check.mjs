async function j(url, options = {}) {
  const r = await fetch(url, options)
  const t = await r.text()
  let d; try { d = JSON.parse(t) } catch { d = t }
  return { status: r.status, data: d }
}
const base = 'http://localhost:4120'
await j(base + '/api/dev/reset', { method: 'POST' })
for (const payload of [
  { email: 'owner@demo.com', role: 'owner' },
  { email: 'admin@demo.com', role: 'admin' },
  { email: 'admin@platform.com', role: 'admin' }
]) {
  const login = await j(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  console.log('LOGIN', payload.email, payload.role, login.status, JSON.stringify(login.data))
  const token = login.data.token
  const me = await j(base + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
  console.log('ME', payload.email, me.status, JSON.stringify(me.data))
  const shops = await j(base + '/api/admin/shops', { headers: { Authorization: `Bearer ${token}` } })
  console.log('ADMIN SHOPS', payload.email, shops.status, JSON.stringify(shops.data))
}

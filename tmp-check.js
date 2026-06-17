const headers = { 'Content-Type': 'application/json' }
const base = 'http://localhost:4194'

async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, options)
  const text = await response.text()
  console.log(path, response.status, text)
  return JSON.parse(text)
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` })

async function main() {
  await api('/api/dev/reset', { method: 'POST' })
  const customer = await api('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'customer@demo.com', role: 'customer' }) })
  const owner = await api('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }) })
  const design = await api('/api/designs', { method: 'POST', headers: { ...headers, ...bearer(customer.token) }, body: JSON.stringify({ shopId: 'shop-1', title: 'x', summary: 'x', estimatedTotal: 10, config: { occasion: 'Birthday', mode: 'simple', cakeType: 'round', layerCount: 2, layers: [] } }) })
  const order = await api(`/api/designs/${design.id}/reorder`, { method: 'POST', headers: { ...headers, ...bearer(customer.token) }, body: JSON.stringify({ pickupSlotId: 'slot-2', customer: 'Demo', total: 10, notes: 'test' }) })
  await api(`/api/owner/orders/${order.id}`, { headers: bearer(owner.token) })
  await api(`/api/owner/orders/${order.id}/complete-pickup`, { method: 'POST', headers: { ...headers, ...bearer(owner.token) } })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

const base = process.env.BASE_URL || 'http://localhost:4140'
const headers = { 'Content-Type': 'application/json' }
const auth = (token) => ({ Authorization: `Bearer ${token}` })

const api = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, options)
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: response.status, data }
}

await api('/api/dev/reset', { method: 'POST' })
const customer = await api('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'customer@demo.com', role: 'customer' }) })
const owner = await api('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }) })
const design = await api('/api/designs', {
  method: 'POST',
  headers: { ...headers, ...auth(customer.data.token) },
  body: JSON.stringify({ shopId: 'shop-1', title: 'x', summary: 'y', estimatedTotal: 10, config: { occasion: 'Birthday', mode: 'simple', cakeType: 'round', layerCount: 2, layers: [] } }),
})
const reorder = await api(`/api/designs/${design.data.id}/reorder`, {
  method: 'POST',
  headers: { ...headers, ...auth(customer.data.token) },
  body: JSON.stringify({ pickupSlotId: 'slot-2', customer: 'Demo', total: 10, notes: 'n' }),
})
const ops = await api(`/api/owner/orders/${reorder.data.id}/ops`, {
  method: 'PATCH',
  headers: { ...headers, ...auth(owner.data.token) },
  body: JSON.stringify({ notes: 'ops', assignedStaffId: 'staff-1', pickupSlotId: 'slot-1' }),
})
console.log(JSON.stringify({ design, reorder, ops }, null, 2))

const base = 'http://localhost:4176'
const headers = { 'Content-Type': 'application/json' }

async function parse(response) {
  const text = await response.text()
  try { return JSON.parse(text) } catch { return text }
}

async function req(path, options = {}) {
  const response = await fetch(`${base}${path}`, options)
  return { status: response.status, data: await parse(response) }
}

const authHeaders = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

async function main() {
  const out = { base }
  out.meta = await req('/api/meta/order-statuses')
  out.authMeAnon = await req('/api/auth/me')
  out.ownerQueueAnon = await req('/api/owner/queue')
  out.ownerLocationsAnon = await req('/api/owner/locations')

  await req('/api/dev/reset', { method: 'POST' })
  const customer = await req('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'customer@demo.com', role: 'customer' }) })
  const owner = await req('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }) })
  const admin = await req('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'admin@platform.com', role: 'admin' }) })

  out.ownerLocations = await req('/api/owner/locations', { headers: authHeaders(owner.data.token) })
  out.burnabyQueue = await req('/api/owner/queue?shopId=shop-2', { headers: authHeaders(owner.data.token) })
  out.richmondSlots = await req('/api/owner/pickup-slots?shopId=shop-3', { headers: authHeaders(owner.data.token) })

  const design = await req('/api/designs', {
    method: 'POST',
    headers: authHeaders(customer.data.token),
    body: JSON.stringify({
      shopId: 'shop-1',
      title: 'Cron test design',
      summary: 'Vanilla with ganache',
      estimatedTotal: 188,
      config: { occasion: 'Birthday', mode: 'simple', cakeType: 'round', layerCount: 2, layers: [] },
    }),
  })
  out.designCreate = design.status

  const reorder = await req(`/api/designs/${design.data.id}/reorder`, {
    method: 'POST',
    headers: authHeaders(customer.data.token),
    body: JSON.stringify({ pickupSlotId: 'slot-2', customer: 'Demo Customer', total: 188, notes: 'verification reorder' }),
  })

  out.prematurePickup = await req(`/api/owner/orders/${reorder.data.id}/complete-pickup`, {
    method: 'POST',
    headers: authHeaders(owner.data.token),
  })

  out.confirmed = await req(`/api/owner/orders/${reorder.data.id}/status`, {
    method: 'PATCH',
    headers: authHeaders(owner.data.token),
    body: JSON.stringify({ status: 'confirmed' }),
  })
  out.baking = await req(`/api/owner/orders/${reorder.data.id}/status`, {
    method: 'PATCH',
    headers: authHeaders(owner.data.token),
    body: JSON.stringify({ status: 'baking' }),
  })
  out.decorating = await req(`/api/owner/orders/${reorder.data.id}/status`, {
    method: 'PATCH',
    headers: authHeaders(owner.data.token),
    body: JSON.stringify({ status: 'decorating' }),
  })
  out.ready = await req(`/api/owner/orders/${reorder.data.id}/status`, {
    method: 'PATCH',
    headers: authHeaders(owner.data.token),
    body: JSON.stringify({ status: 'ready' }),
  })
  out.pickupAfterReady = await req(`/api/owner/orders/${reorder.data.id}/complete-pickup`, {
    method: 'POST',
    headers: authHeaders(owner.data.token),
  })

  const linked = await req('/api/orders', {
    method: 'POST',
    headers: authHeaders(customer.data.token),
    body: JSON.stringify({
      shopId: 'shop-1', customer: 'Demo Customer', total: 188, fulfillment: 'pickup', pickupSlotId: 'slot-1',
      notes: 'verification saved-design checkout', savedDesignId: design.data.id, designSnapshot: design.data.config,
    }),
  })

  const flagged = await req(`/api/owner/orders/${linked.data.id}/flag-exception`, {
    method: 'POST',
    headers: authHeaders(owner.data.token),
    body: JSON.stringify({ reason: 'verification support escalation', supportStatus: 'escalated', refundStatus: 'pending_review' }),
  })
  out.refund = await req(`/api/admin/disputes/${flagged.data.dispute.id}/refund`, {
    method: 'POST',
    headers: authHeaders(admin.data.token),
    body: JSON.stringify({ decision: 'approved', amount: 188, resolution: 'verification refund approval', note: 'Owner escalation validated' }),
  })

  console.log(JSON.stringify(out, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

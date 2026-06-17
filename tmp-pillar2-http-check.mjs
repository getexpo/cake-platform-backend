import { createApp } from './src/app.js'

const headers = { 'Content-Type': 'application/json' }
const app = createApp()
const server = app.listen(0)
const port = server.address().port
const base = `http://127.0.0.1:${port}`

async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, options)
  const data = await response.json()
  return { status: response.status, data }
}

try {
  await api('/api/dev/reset', { method: 'POST' })
  const customer = await api('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'customer@demo.com', role: 'customer' }) })
  const owner = await api('/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }) })
  const design = await api('/api/designs', { method: 'POST', headers: { ...headers, Authorization: `Bearer ${customer.data.token}` }, body: JSON.stringify({ shopId: 'shop-1', title: 'HTTP test design', config: {} }) })
  const reorder = await api(`/api/designs/${design.data.id}/reorder`, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${customer.data.token}` }, body: JSON.stringify({ pickupSlotId: 'slot-2' }) })
  const premature = await api(`/api/owner/orders/${reorder.data.id}/complete-pickup`, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${owner.data.token}` } })
  const invalidJump = await api(`/api/owner/orders/${reorder.data.id}/status`, { method: 'PATCH', headers: { ...headers, Authorization: `Bearer ${owner.data.token}` }, body: JSON.stringify({ status: 'ready' }) })
  await api(`/api/owner/orders/${reorder.data.id}/status`, { method: 'PATCH', headers: { ...headers, Authorization: `Bearer ${owner.data.token}` }, body: JSON.stringify({ status: 'confirmed' }) })
  await api(`/api/owner/orders/${reorder.data.id}/status`, { method: 'PATCH', headers: { ...headers, Authorization: `Bearer ${owner.data.token}` }, body: JSON.stringify({ status: 'baking' }) })
  await api(`/api/owner/orders/${reorder.data.id}/status`, { method: 'PATCH', headers: { ...headers, Authorization: `Bearer ${owner.data.token}` }, body: JSON.stringify({ status: 'decorating' }) })
  const ready = await api(`/api/owner/orders/${reorder.data.id}/status`, { method: 'PATCH', headers: { ...headers, Authorization: `Bearer ${owner.data.token}` }, body: JSON.stringify({ status: 'ready' }) })
  const pickedUp = await api(`/api/owner/orders/${reorder.data.id}/complete-pickup`, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${owner.data.token}` } })
  const flagged = await api('/api/owner/orders/ord-1/flag-exception', { method: 'POST', headers: { ...headers, Authorization: `Bearer ${owner.data.token}` }, body: JSON.stringify({ reason: 'HTTP support escalation', supportStatus: 'escalated', refundStatus: 'pending_review' }) })

  console.log(JSON.stringify({
    base,
    premature,
    invalidJump,
    readyStatus: ready.data.status,
    pickedUpStatus: pickedUp.data.status,
    pickedUpDecision: pickedUp.data.fulfillmentSnapshot?.decisionState,
    flaggedSupport: flagged.data.order?.supportStatus,
    flaggedRefund: flagged.data.order?.refundStatus,
    flaggedDisputeId: flagged.data.dispute?.id,
  }, null, 2))
} finally {
  server.close()
}

const headers = { 'Content-Type': 'application/json' }
const candidateBases = [process.env.BASE_URL, 'http://localhost:4224', 'http://localhost:4222', 'http://localhost:4220', 'http://localhost:4218', 'http://localhost:4216', 'http://localhost:4214', 'http://localhost:4212', 'http://localhost:4210', 'http://localhost:4206', 'http://localhost:4204', 'http://localhost:4202', 'http://localhost:4194', 'http://localhost:4192', 'http://localhost:4176', 'http://localhost:4174', 'http://localhost:4172', 'http://localhost:4170', 'http://localhost:4164', 'http://localhost:4160', 'http://localhost:4126', 'http://localhost:4124', 'http://localhost:4122', 'http://localhost:4120', 'http://localhost:4020'].filter(Boolean)
const requiredChecks = [
  { path: '/api/meta/order-statuses', allowedStatuses: [200] },
  { path: '/api/auth/me', allowedStatuses: [200, 401] },
  { path: '/api/auth/sessions', allowedStatuses: [200, 401] },
  { path: '/api/owner/queue', allowedStatuses: [200, 401, 403] },
  { path: '/api/owner/locations', allowedStatuses: [401, 403] },
  { path: '/api/admin/team', allowedStatuses: [401, 403] },
]

async function resolveBase() {
  for (const candidate of candidateBases) {
    try {
      const checks = await Promise.all(requiredChecks.map(async ({ path, allowedStatuses }) => {
        const response = await fetch(`${candidate}${path}`)
        return allowedStatuses.includes(response.status)
      }))

      if (checks.every(Boolean)) {
        return candidate
      }
    } catch {
      // try next candidate
    }
  }

  fail(`No compatible backend found. Tried: ${candidateBases.join(', ')}`)
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

let base = ''

async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, options)
  const text = await response.text()
  let data

  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  if (!response.ok) {
    fail(`${path} -> ${response.status} ${JSON.stringify(data)}`)
  }

  return data
}

async function apiExpectFailure(path, expectedStatus, options = {}) {
  const response = await fetch(`${base}${path}`, options)
  const text = await response.text()
  let data

  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  if (response.status !== expectedStatus) {
    fail(`${path} expected ${expectedStatus} but got ${response.status} ${JSON.stringify(data)}`)
  }

  return data
}

const customerAuth = (token) => ({ Authorization: `Bearer ${token}` })

async function main() {
  base = await resolveBase()

  await api('/api/dev/reset', { method: 'POST' })

  const customer = await api('/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: 'customer@demo.com', role: 'customer' }),
  })

  const owner = await api('/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }),
  })

  const statuses = await api('/api/meta/order-statuses')
  const ownerLocations = await api('/api/owner/locations', {
    headers: customerAuth(owner.token),
  })
  const ownerSessions = await api('/api/auth/sessions', {
    headers: customerAuth(owner.token),
  })
  const ownerOtherSession = await api('/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }),
  })
  const ownerSessionsAfterSecondLogin = await api('/api/auth/sessions', {
    headers: customerAuth(owner.token),
  })
  const revokeSingleOwnerSession = await api(`/api/auth/sessions/${ownerOtherSession.session.id}/revoke`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(owner.token) },
  })
  const ownerSessionsAfterSingleRevoke = await api('/api/auth/sessions', {
    headers: customerAuth(owner.token),
  })
  const ownerThirdSession = await api('/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }),
  })
  const revokeOthers = await api(`/api/auth/sessions/${owner.session.id}/revoke`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ scope: 'others' }),
  })
  const ownerSessionsAfterRevoke = await api('/api/auth/sessions', {
    headers: customerAuth(owner.token),
  })
  const burnabyQueue = await api('/api/owner/queue?shopId=shop-2', {
    headers: customerAuth(owner.token),
  })
  const richmondSlots = await api('/api/owner/pickup-slots?shopId=shop-3', {
    headers: customerAuth(owner.token),
  })

  const design = await api('/api/designs', {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      shopId: 'shop-1',
      title: 'Cron test design',
      summary: 'Vanilla with ganache',
      estimatedTotal: 188,
      config: {
        occasion: 'Birthday',
        mode: 'simple',
        cakeType: 'round',
        layerCount: 2,
        layers: [],
      },
    }),
  })

  const designs = await api('/api/designs?shopId=shop-1', {
    headers: customerAuth(customer.token),
  })

  const burnabyDesign = await api('/api/designs', {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      shopId: 'shop-2',
      title: 'Burnaby anniversary design',
      summary: 'Heart cake with berries',
      estimatedTotal: 210,
      config: {
        occasion: 'Anniversary',
        mode: 'advanced',
        cakeType: 'heart',
        layerCount: 2,
        layers: [],
      },
    }),
  })

  const allDesigns = await api('/api/designs', {
    headers: customerAuth(customer.token),
  })

  const linkedCheckoutOrder = await api('/api/orders', {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      shopId: 'shop-1',
      customer: 'Demo Customer',
      total: 188,
      fulfillment: 'pickup',
      pickupSlotId: 'slot-1',
      notes: 'verification saved-design checkout',
      savedDesignId: design.id,
      designSnapshot: design.config,
    }),
  })

  const mismatchedCheckout = await apiExpectFailure('/api/orders', 400, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      shopId: 'shop-1',
      customer: 'Demo Customer',
      total: 188,
      fulfillment: 'pickup',
      pickupSlotId: 'slot-4',
      notes: 'verification mismatched pickup slot',
      savedDesignId: design.id,
      designSnapshot: design.config,
    }),
  })

  const reorder = await api(`/api/designs/${design.id}/reorder`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      pickupSlotId: 'slot-2',
      customer: 'Demo Customer',
      total: 188,
      notes: 'verification reorder',
    }),
  })

  const burnabyReorder = await api(`/api/designs/${burnabyDesign.id}/reorder`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      pickupSlotId: 'slot-5',
      customer: 'Demo Customer',
      total: 210,
      notes: 'verification burnaby reorder',
    }),
  })

  const queue = await api('/api/owner/queue', {
    headers: customerAuth(owner.token),
  })

  const detail = await api(`/api/owner/orders/${reorder.id}`, {
    headers: customerAuth(owner.token),
  })

  const opsUpdated = await api(`/api/owner/orders/${reorder.id}/ops`, {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({
      notes: 'verification ops update',
      assignedStaffId: 'staff-1',
      pickupSlotId: 'slot-3',
    }),
  })

  const prematurePickup = await apiExpectFailure(`/api/owner/orders/${reorder.id}/complete-pickup`, 409, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(owner.token) },
  })

  const confirmed = await api(`/api/owner/orders/${reorder.id}/status`, {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ status: 'confirmed' }),
  })

  const baking = await api(`/api/owner/orders/${reorder.id}/status`, {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ status: 'baking' }),
  })

  const decorating = await api(`/api/owner/orders/${reorder.id}/status`, {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ status: 'decorating' }),
  })

  const updated = await api(`/api/owner/orders/${reorder.id}/status`, {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ status: 'ready' }),
  })

  const pickupCompleted = await api(`/api/owner/orders/${reorder.id}/complete-pickup`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(owner.token) },
  })

  const flaggedSupport = await api(`/api/owner/orders/${linkedCheckoutOrder.id}/flag-exception`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({
      reason: 'verification support escalation',
      supportStatus: 'escalated',
      refundStatus: 'pending_review',
    }),
  })

  const ownerExceptionNote = await api(`/api/owner/orders/${linkedCheckoutOrder.id}/exception-notes`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ body: 'verification owner follow-up note' }),
  })

  const notifications = await api(`/api/notifications?orderId=${reorder.id}`)

  const slots = await api('/api/owner/pickup-slots', {
    headers: customerAuth(owner.token),
  })

  const bulkApplied = await api('/api/owner/location-bulk-apply', {
    method: 'POST',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ templateKey: 'holiday-menu', shopIds: ['shop-2', 'shop-3'] }),
  })

  const burnabyTemplates = await api('/api/owner/templates?shopId=shop-2', {
    headers: customerAuth(owner.token),
  })

  const updatedTemplate = await api(`/api/owner/templates/${burnabyTemplates[0].id}`, {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({
      name: 'Burnaby Celebration Plus',
      maxLayers: 8,
      defaultMode: 'simple',
      allowedCakeTypes: ['round', 'heart', 'tall', 'premium'],
    }),
  })

  const ownerCancelled = await api('/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: 'owner@demo.com', role: 'owner' }),
  })

  const cancelledOrder = await api('/api/orders', {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      shopId: 'shop-1',
      customer: 'Cancel Flow',
      total: 99,
      pickupSlotId: 'slot-2',
      notes: 'cancel me',
      designSnapshot: { occasion: 'Birthday', cakeType: 'round', layerCount: 2 },
    }),
  })

  const cancelled = await api(`/api/owner/orders/${cancelledOrder.id}/cancel`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(ownerCancelled.token) },
    body: JSON.stringify({ reason: 'verification cancellation' }),
  })

  const admin = await api('/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: 'admin@platform.com', role: 'admin' }),
  })

  const adminTeam = await api('/api/admin/team', {
    headers: customerAuth(admin.token),
  })

  const assignedDispute = await api(`/api/admin/disputes/${flaggedSupport.dispute.id}/assign`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(admin.token) },
    body: JSON.stringify({ assignedAdminId: 'admin-2', note: 'verification reassignment' }),
  })

  const threadedDispute = await api(`/api/admin/disputes/${flaggedSupport.dispute.id}/messages`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(admin.token) },
    body: JSON.stringify({ body: 'verification admin note', visibility: 'internal' }),
  })

  const customerSupportMessage = await api(`/api/orders/${linkedCheckoutOrder.id}/support-messages`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({ body: 'Can pickup move 30 minutes later?' }),
  })

  const adminCustomerReply = await api(`/api/admin/disputes/${customerSupportMessage.dispute.id}/messages`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(admin.token) },
    body: JSON.stringify({ body: 'Yes, we can hold the cake a bit longer.', visibility: 'customer' }),
  })

  const customerSupportView = await api(`/api/orders/${linkedCheckoutOrder.id}/support`, {
    headers: customerAuth(customer.token),
  })

  const customerCancelledOrder = await api('/api/orders', {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      shopId: 'shop-1',
      customer: 'Customer Cancel Flow',
      total: 64,
      pickupSlotId: 'slot-3',
      notes: 'customer self cancel me',
      designSnapshot: { occasion: 'Birthday', cakeType: 'round', layerCount: 1 },
    }),
  })

  const customerCancelled = await api(`/api/orders/${customerCancelledOrder.id}/cancel`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({ reason: 'Changed plans before baking started' }),
  })

  const customerLateCancelOrder = await api('/api/orders', {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({
      shopId: 'shop-1',
      customer: 'Late Cancel Flow',
      total: 72,
      pickupSlotId: 'slot-1',
      notes: 'late cancel check',
      designSnapshot: { occasion: 'Birthday', cakeType: 'round', layerCount: 1 },
    }),
  })

  await api(`/api/owner/orders/${customerLateCancelOrder.id}/status`, {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ status: 'confirmed' }),
  })

  await api(`/api/owner/orders/${customerLateCancelOrder.id}/status`, {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ status: 'baking' }),
  })

  const customerLateCancelError = await apiExpectFailure(`/api/orders/${customerLateCancelOrder.id}/cancel`, 409, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(customer.token) },
    body: JSON.stringify({ reason: 'Tried after baking started' }),
  })

  const patchedSlot = await api('/api/owner/pickup-slots/slot-2', {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(owner.token) },
    body: JSON.stringify({ capacity: 8, active: false, pauseReason: 'verification slot pause' }),
  })

  const refundedDispute = await api(`/api/admin/disputes/${flaggedSupport.dispute.id}/refund`, {
    method: 'POST',
    headers: { ...headers, ...customerAuth(admin.token) },
    body: JSON.stringify({ decision: 'approved', amount: 188, resolution: 'verification refund approval', note: 'Owner escalation validated' }),
  })

  const resolvedDispute = await api('/api/admin/disputes/disp-1', {
    method: 'PATCH',
    headers: { ...headers, ...customerAuth(admin.token) },
    body: JSON.stringify({ status: 'resolved', refundStatus: 'approved', resolution: 'verification closeout' }),
  })

  const finalQueue = await api('/api/owner/queue', {
    headers: customerAuth(owner.token),
  })

  const disputeList = await api('/api/admin/disputes', {
    headers: customerAuth(admin.token),
  })

  console.log(JSON.stringify({
    base,
    statuses,
    createdDesign: design.id,
    ownerSessionCount: ownerSessions.sessions.length,
    ownerSessionCountAfterSecondLogin: ownerSessionsAfterSecondLogin.sessions.length,
    ownerOtherSessionId: ownerOtherSession.session.id,
    revokedSingleOwnerSession: revokeSingleOwnerSession.revokedCount,
    ownerSessionCountAfterSingleRevoke: ownerSessionsAfterSingleRevoke.sessions.length,
    ownerThirdSessionId: ownerThirdSession.session.id,
    revokedOtherOwnerSessions: revokeOthers.revokedCount,
    ownerSessionCountAfterRevoke: ownerSessionsAfterRevoke.sessions.length,
    ownerLocationCount: ownerLocations.length,
    scopedLocationProof: {
      burnabyQueue: burnabyQueue.newOrders.length + burnabyQueue.inProduction.length + burnabyQueue.ready.length + burnabyQueue.pickedUp.length + burnabyQueue.cancelled.length,
      richmondSlots: richmondSlots.length,
    },
    designCount: designs.length,
    allDesignCount: allDesigns.length,
    burnabyDesign: {
      id: burnabyDesign.id,
      shopId: burnabyDesign.shopId,
    },
    linkedCheckoutOrder: {
      id: linkedCheckoutOrder.id,
      savedDesignId: linkedCheckoutOrder.savedDesignId,
      savedDesignTitle: linkedCheckoutOrder.savedDesign?.title,
      pickupSlotId: linkedCheckoutOrder.pickupSlotId,
      shopId: linkedCheckoutOrder.shopId,
    },
    mismatchedCheckoutError: mismatchedCheckout.error,
    reorderId: reorder.id,
    burnabyReorder: {
      id: burnabyReorder.id,
      shopId: burnabyReorder.shopId,
      pickupSlotId: burnabyReorder.pickupSlotId,
      savedDesignId: burnabyReorder.savedDesignId,
    },
    queueCounts: {
      new: queue.newOrders.length,
      inProduction: queue.inProduction.length,
      ready: queue.ready.length,
      pickedUp: queue.pickedUp.length,
    },
    detailStatus: detail.status,
    opsUpdated: {
      pickupSlotId: opsUpdated.pickupSlotId,
      assignedStaffId: opsUpdated.assignedStaffId,
      notes: opsUpdated.notes,
      decisionState: opsUpdated.fulfillmentSnapshot?.decisionState,
    },
    prematurePickupError: prematurePickup.error,
    updatedStatusFlow: [confirmed.status, baking.status, decorating.status, updated.status],
    pickupCompletedStatus: pickupCompleted.status,
    pickupDecisionState: pickupCompleted.fulfillmentSnapshot?.decisionState,
    pickupCompletedAt: pickupCompleted.fulfillmentSnapshot?.pickupCompletedAt,
    notificationTypes: notifications.map((event) => event.type),
    ownerSlotCount: slots.length,
    bulkApplied: {
      count: bulkApplied.updatedShops.length,
      shopIds: bulkApplied.updatedShops.map((shop) => shop.id),
      template: bulkApplied.updatedShops[0]?.lastBulkTemplateKey,
    },
    updatedTemplate: {
      id: updatedTemplate.id,
      shopId: updatedTemplate.shopId,
      name: updatedTemplate.name,
      maxLayers: updatedTemplate.maxLayers,
      defaultMode: updatedTemplate.defaultMode,
      allowedCakeTypes: updatedTemplate.allowedCakeTypes,
    },
    patchedSlot: {
      id: patchedSlot.id,
      capacity: patchedSlot.capacity,
      active: patchedSlot.active,
      booked: patchedSlot.booked,
      operatorState: patchedSlot.operatorState,
      pauseReason: patchedSlot.pauseReason,
      impactedOrderCount: patchedSlot.impactedOrderCount,
    },
    cancelledOrder: {
      id: cancelled.id,
      status: cancelled.status,
      refundStatus: cancelled.refundStatus,
      supportStatus: cancelled.supportStatus,
    },
    flaggedSupport: {
      orderId: flaggedSupport.order.id,
      disputeId: flaggedSupport.dispute.id,
      supportStatus: flaggedSupport.order.supportStatus,
      refundStatus: flaggedSupport.order.refundStatus,
      attentionFlags: flaggedSupport.order.attentionFlags,
    },
    disputeAssignment: {
      adminCount: adminTeam.length,
      assignedAdminId: assignedDispute.assignedAdminId,
      assignedAdminName: assignedDispute.assignedAdmin?.name,
    },
    ownerExceptionNote: {
      messageId: ownerExceptionNote.message.id,
      disputeId: ownerExceptionNote.dispute.id,
      preview: ownerExceptionNote.dispute.lastMessagePreview,
      visibility: ownerExceptionNote.message.visibility,
    },
    refundedDispute: {
      disputeId: refundedDispute.dispute.id,
      refundStatus: refundedDispute.dispute.refundStatus,
      orderRefundStatus: refundedDispute.order.refundStatus,
      amount: refundedDispute.order.refundDecision?.amount,
      threadEntries: refundedDispute.dispute.messages?.length,
    },
    threadedDispute: {
      messageId: threadedDispute.message.id,
      preview: threadedDispute.dispute.lastMessagePreview,
      visibility: threadedDispute.message.visibility,
    },
    customerSupport: {
      disputeId: customerSupportMessage.dispute.id,
      supportStatus: customerSupportMessage.order.supportStatus,
      customerMessageVisibility: customerSupportMessage.message.visibility,
      adminReplyVisibility: adminCustomerReply.message.visibility,
      customerVisibleEntries: customerSupportView.disputes[0]?.messages?.length || 0,
      customerVisiblePreview: customerSupportView.disputes[0]?.lastMessagePreview,
    },
    customerCancellation: {
      id: customerCancelled.id,
      status: customerCancelled.status,
      supportStatus: customerCancelled.supportStatus,
      refundStatus: customerCancelled.refundStatus,
      reason: customerCancelled.cancellationReason,
      lateCancelError: customerLateCancelError.error,
    },
    finalQueueCounts: {
      new: finalQueue.newOrders.length,
      inProduction: finalQueue.inProduction.length,
      ready: finalQueue.ready.length,
      pickedUp: finalQueue.pickedUp.length,
      cancelled: finalQueue.cancelled.length,
    },
    finalQueueAttention: {
      totalAttentionOrders: finalQueue.attentionOrders?.length || 0,
      supportDisputes: finalQueue.attentionCounts?.support_dispute_open || 0,
      unassignedProduction: finalQueue.attentionCounts?.staff_unassigned || 0,
      pausedPickupSlots: finalQueue.attentionCounts?.pickup_slot_paused || 0,
    },
    dispute: {
      status: resolvedDispute.status,
      refundStatus: resolvedDispute.refundStatus,
      total: disputeList.length,
    },
  }, null, 2))
}

main().catch((error) => fail(error.stack || String(error)))

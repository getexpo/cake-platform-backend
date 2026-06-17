function getPickupAttentionFlags(order, pickupSlot) {
  const flags = []
  if (order.fulfillment === 'delivery') {
    if (!order.addressSnapshot?.line1) flags.push('delivery_address_missing')
    return flags
  }

  const remaining = pickupSlot && typeof pickupSlot.capacity === 'number' && typeof pickupSlot.booked === 'number'
    ? pickupSlot.capacity - pickupSlot.booked
    : null
  const pickupStartMs = pickupSlot?.startTime ? new Date(pickupSlot.startTime).getTime() : null
  const minutesUntilPickup = Number.isFinite(pickupStartMs)
    ? Math.round((pickupStartMs - Date.now()) / 60000)
    : null

  if (!pickupSlot) flags.push('pickup_slot_missing')
  if (pickupSlot && pickupSlot.active === false) flags.push('pickup_slot_paused')
  if (remaining !== null && remaining < 0) flags.push('pickup_slot_overbooked')
  if (order.status !== 'picked_up' && minutesUntilPickup !== null && minutesUntilPickup < 0) flags.push('pickup_window_passed')
  if (order.status === 'ready' && minutesUntilPickup !== null && minutesUntilPickup > 180) flags.push('ready_too_early_for_window')

  return flags
}

function deriveAttentionFlags(order, pickupSlot, disputes = []) {
  const flags = [...getPickupAttentionFlags(order, pickupSlot)]
  const hasOpenDispute = disputes.some((item) => item.status === 'open' || item.status === 'escalated')

  if (hasOpenDispute) flags.push('support_dispute_open')
  if (order.supportStatus && !['closed', 'resolved', 'monitoring'].includes(order.supportStatus)) {
    flags.push(`support_${order.supportStatus}`)
  }
  if (order.refundStatus && ['pending_review', 'approved'].includes(order.refundStatus)) {
    flags.push(`refund_${order.refundStatus}`)
  }
  if (!order.notes) flags.push('operator_notes_missing')
  if (['confirmed', 'baking', 'decorating', 'ready'].includes(order.status) && !order.assignedStaffId) {
    flags.push('staff_unassigned')
  }

  return [...new Set(flags)]
}

export function enrichDispute(dispute, repositories, viewer = null) {
  const assignedAdmin = dispute.assignedAdminId ? repositories.findById('users', dispute.assignedAdminId) : null
  const baseDispute = {
    ...dispute,
    assignedAdmin,
  }

  if (!viewer || ['admin', 'owner', 'staff'].includes(viewer.role)) return baseDispute
  if (viewer.role !== 'customer') return null

  const visibleMessages = (baseDispute.messages || []).filter((message) => message.visibility === 'customer' || message.authorRole === 'customer')
  const lastVisibleMessage = visibleMessages[visibleMessages.length - 1] || null

  return {
    ...baseDispute,
    messages: visibleMessages,
    lastMessageAt: lastVisibleMessage?.createdAt || baseDispute.lastMessageAt || baseDispute.createdAt,
    lastMessagePreview: lastVisibleMessage?.body?.slice(0, 140) || (baseDispute.status === 'resolved' ? baseDispute.resolution || 'Resolved by support' : 'Support request open'),
  }
}

export function enrichOrder(order, repositories, viewer = null) {
  const pickupSlot = repositories.findById('pickupSlots', order.pickupSlotId) || null
  const savedDesign = order.savedDesignId ? repositories.findById('savedDesigns', order.savedDesignId) : null
  const assignedStaff = order.assignedStaffId ? repositories.findById('users', order.assignedStaffId) : null
  const disputes = repositories.all('disputes')
    .filter((item) => item.orderId === order.id)
    .map((item) => enrichDispute(item, repositories, viewer))
    .filter(Boolean)
  const attentionFlags = deriveAttentionFlags(order, pickupSlot, disputes)
  const fulfillmentSnapshot = order.fulfillmentSnapshot || {
    method: order.fulfillment || 'pickup',
    pickupSlotId: order.pickupSlotId || null,
    pickupCompletedAt: order.pickupCompletion?.completedAt || null,
    addressSnapshot: order.addressSnapshot || null,
    deliveryPhase: (order.fulfillment || 'pickup') === 'pickup' ? 'pickup_ready_flow' : 'order_confirmed',
    decisionState: order.status === 'picked_up' ? 'pickup_completed' : ((order.fulfillment || 'pickup') === 'delivery' ? 'delivery_locked' : 'pickup_locked'),
    deliveryEligible: (order.fulfillment || 'pickup') === 'delivery',
  }
  return {
    ...order,
    pickupSlot,
    savedDesign,
    assignedStaff,
    disputes,
    attentionFlags,
    attentionLevel: attentionFlags.length,
    fulfillmentSnapshot,
  }
}

export function createAnalyticsSummary(repositories) {
  const orders = repositories.all('orders')
  const shops = repositories.all('shops')
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
  const activeShops = shops.length
  return {
    activeShops,
    totalOrders,
    totalRevenue,
    avgOrderValue: totalOrders ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
  }
}

export function createOrderStatusSummary(repositories, shopId) {
  const relevantOrders = shopId ? repositories.all('orders').filter((order) => order.shopId === shopId) : repositories.all('orders')
  const summary = relevantOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})

  return {
    total: relevantOrders.length,
    byStatus: summary,
  }
}

export function createOwnerQueueView(repositories, shopId) {
  const relevantOrders = shopId ? repositories.all('orders').filter((order) => order.shopId === shopId) : repositories.all('orders')
  const sortQueue = (items) => items
    .map((order) => enrichOrder(order, repositories))
    .sort((left, right) => {
      if ((right.attentionLevel || 0) !== (left.attentionLevel || 0)) return (right.attentionLevel || 0) - (left.attentionLevel || 0)
      return new Date(left.createdAt || 0) - new Date(right.createdAt || 0)
    })
  const enrichedOrders = sortQueue(relevantOrders)
  const attentionCounts = enrichedOrders.reduce((acc, order) => {
    for (const flag of order.attentionFlags || []) {
      acc[flag] = (acc[flag] || 0) + 1
    }
    return acc
  }, {})

  return {
    newOrders: enrichedOrders.filter((order) => order.status === 'new'),
    inProduction: enrichedOrders.filter((order) => ['confirmed', 'baking', 'decorating'].includes(order.status)),
    ready: enrichedOrders.filter((order) => order.status === 'ready'),
    pickedUp: enrichedOrders.filter((order) => order.status === 'picked_up'),
    cancelled: enrichedOrders.filter((order) => order.status === 'cancelled'),
    attentionCounts,
    attentionOrders: enrichedOrders.filter((order) => (order.attentionLevel || 0) > 0),
  }
}

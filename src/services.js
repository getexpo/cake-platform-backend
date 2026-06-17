import { orderStatuses } from './seed-data.js'

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildFulfillmentSnapshot({ fulfillment, pickupSlotId, addressSnapshot }) {
  const isPickup = fulfillment !== 'delivery'
  return {
    method: isPickup ? 'pickup' : 'delivery',
    pickupSlotId: isPickup ? pickupSlotId : null,
    pickupCompletedAt: null,
    addressSnapshot: isPickup ? null : (addressSnapshot || null),
    deliveryPhase: isPickup ? 'pickup_ready_flow' : 'order_confirmed',
    decisionState: isPickup ? 'pickup_locked' : 'delivery_locked',
    deliveryEligible: !isPickup,
  }
}

function buildSupportEvent(type, actor, extra = {}) {
  return {
    type,
    createdAt: new Date().toISOString(),
    actorId: actor?.id || null,
    actorRole: actor?.role || null,
    ...extra,
  }
}

const allowedStatusTransitions = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['baking', 'cancelled'],
  baking: ['decorating', 'cancelled'],
  decorating: ['ready', 'cancelled'],
  ready: ['picked_up', 'cancelled'],
  picked_up: [],
  cancelled: [],
}

export function createServices({ repositories }) {
  function getAccessibleShopIds(actor) {
    if (!actor) return []
    if (actor.role === 'admin') return repositories.all('shops').map((shop) => shop.id)
    if (actor.role === 'owner') return actor.managedShopIds?.length ? actor.managedShopIds : [actor.shopId]
    return actor.shopId ? [actor.shopId] : []
  }

  function listOrders(filters = {}) {
    let items = repositories.all('orders')
    if (filters.shopId) items = items.filter((item) => item.shopId === filters.shopId)
    if (filters.customerId) items = items.filter((item) => item.customerId === filters.customerId)
    if (filters.status) items = items.filter((item) => item.status === filters.status)
    return items
  }

  function findPickupSlotOrThrow(id) {
    const slot = repositories.findById('pickupSlots', id)
    if (!slot || !slot.active) throw new Error('Pickup slot unavailable')
    if (slot.booked >= slot.capacity) throw new Error('Pickup slot full')
    return slot
  }

  function reservePickupSlot(id) {
    const slot = findPickupSlotOrThrow(id)
    return repositories.patch('pickupSlots', id, { booked: slot.booked + 1 })
  }

  function releasePickupSlot(id) {
    if (!id) return null
    const slot = repositories.findById('pickupSlots', id)
    if (!slot) return null
    return repositories.patch('pickupSlots', id, { booked: Math.max(0, Number(slot.booked || 0) - 1) })
  }

  function queueNotification(orderId, type, status = 'queued', metadata = {}) {
    return repositories.save('notificationEvents', {
      id: createId('notif'),
      orderId,
      type,
      status,
      createdAt: new Date().toISOString(),
      ...metadata,
    })
  }

  function createOrder(payload) {
    const shop = repositories.findById('shops', payload.shopId)
    if (!shop) throw new Error('Shop not found')

    let savedDesign = null
    if (payload.savedDesignId) {
      savedDesign = repositories.findById('savedDesigns', payload.savedDesignId)
      if (!savedDesign) throw new Error('Saved design not found')
      if (payload.customerId && savedDesign.customerId !== payload.customerId) throw new Error('Saved design does not belong to this customer')
      if (savedDesign.shopId !== payload.shopId) throw new Error('Saved design belongs to a different shop')
    }

    const fulfillment = payload.fulfillment === 'delivery' ? 'delivery' : 'pickup'
    let reservedSlot = null
    if (fulfillment === 'pickup') {
      if (!payload.pickupSlotId) throw new Error('Pickup slot required')
      reservedSlot = reservePickupSlot(payload.pickupSlotId)
      if (reservedSlot.shopId !== payload.shopId) {
        releasePickupSlot(reservedSlot.id)
        throw new Error('Pickup slot belongs to a different shop')
      }
    }

    if (fulfillment === 'delivery' && !payload.addressSnapshot?.line1) {
      throw new Error('Delivery address required')
    }

    const order = repositories.save('orders', {
      id: createId('ord'),
      status: 'new',
      createdAt: new Date().toISOString(),
      ...payload,
      pickupSlotId: fulfillment === 'pickup' ? payload.pickupSlotId : null,
      fulfillment,
      designSnapshot: payload.designSnapshot || savedDesign?.config || null,
      fulfillmentSnapshot: buildFulfillmentSnapshot({ ...payload, fulfillment }),
    })
    queueNotification(order.id, 'order_confirmation')
    if (order.fulfillment === 'pickup') {
      queueNotification(order.id, 'pickup_reminder')
    } else {
      queueNotification(order.id, 'delivery_tracking_enabled')
    }
    return order
  }

  function createDesign(payload) {
    return repositories.save('savedDesigns', {
      id: createId('design'),
      lastUsedAt: new Date().toISOString(),
      isFavorite: false,
      ...payload,
    })
  }

  function updateDesign(designId, partial) {
    const design = repositories.findById('savedDesigns', designId)
    if (!design) {
      return { error: { code: 404, body: { error: 'Design not found' } } }
    }

    const nextPatch = {
      ...partial,
      lastUsedAt: new Date().toISOString(),
    }

    if (Object.prototype.hasOwnProperty.call(partial, 'isFavorite')) {
      nextPatch.isFavorite = Boolean(partial.isFavorite)
    }

    return {
      design: repositories.patch('savedDesigns', designId, nextPatch),
    }
  }

  function updatePickupSlot(slotId, partial) {
    const slot = repositories.findById('pickupSlots', slotId)
    if (!slot) {
      return { error: { code: 404, body: { error: 'Pickup slot not found' } } }
    }

    const nextCapacity = partial.capacity ?? slot.capacity
    const nextBooked = partial.booked ?? slot.booked

    if (Number(nextCapacity) < Number(nextBooked)) {
      return { error: { code: 400, body: { error: 'Capacity cannot be lower than booked count' } } }
    }

    const nextActive = Object.prototype.hasOwnProperty.call(partial, 'active') ? Boolean(partial.active) : slot.active
    const impactedOrders = repositories.all('orders').filter((order) => order.pickupSlotId === slot.id && !['picked_up', 'cancelled'].includes(order.status))
    const nextOperatorState = partial.operatorState || (nextActive ? (Number(nextCapacity) - Number(nextBooked) <= 0 ? 'full' : 'accepting') : 'paused')
    const nextPauseReason = nextActive ? '' : (partial.pauseReason?.trim() || slot.pauseReason || 'Temporarily paused by operations')

    return {
      slot: repositories.patch('pickupSlots', slot.id, {
        ...partial,
        active: nextActive,
        operatorState: nextOperatorState,
        pauseReason: nextPauseReason,
        capacity: Number(nextCapacity),
        booked: Number(nextBooked),
      }),
      impactedOrderCount: impactedOrders.length,
    }
  }

  function updateOrderOperations(orderId, partial = {}, actor) {
    const order = repositories.findById('orders', orderId)
    if (!order) return { error: { code: 404, body: { error: 'Order not found' } } }

    const nextPatch = {}

    if (Object.prototype.hasOwnProperty.call(partial, 'notes')) {
      nextPatch.notes = partial.notes?.trim() || ''
    }

    if (Object.prototype.hasOwnProperty.call(partial, 'assignedStaffId')) {
      if (partial.assignedStaffId) {
        const staff = repositories.findById('users', partial.assignedStaffId)
        if (!staff || !['owner', 'staff'].includes(staff.role) || staff.shopId !== order.shopId) {
          return { error: { code: 400, body: { error: 'Assigned staff must belong to the same shop' } } }
        }
        nextPatch.assignedStaffId = staff.id
      } else {
        nextPatch.assignedStaffId = null
      }
    }

    if (Object.prototype.hasOwnProperty.call(partial, 'pickupSlotId') && partial.pickupSlotId !== order.pickupSlotId) {
      const nextSlot = findPickupSlotOrThrow(partial.pickupSlotId)
      if (nextSlot.shopId !== order.shopId) {
        return { error: { code: 400, body: { error: 'Pickup slot must belong to the same shop' } } }
      }
      reservePickupSlot(partial.pickupSlotId)
      releasePickupSlot(order.pickupSlotId)
      nextPatch.pickupSlotId = partial.pickupSlotId
      nextPatch.fulfillmentSnapshot = {
        ...(order.fulfillmentSnapshot || buildFulfillmentSnapshot(order)),
        pickupSlotId: partial.pickupSlotId,
        decisionState: order.status === 'picked_up' ? 'pickup_completed' : 'pickup_reassigned',
      }
      queueNotification(order.id, 'pickup_slot_reassigned', 'queued', { previousPickupSlotId: order.pickupSlotId, nextPickupSlotId: partial.pickupSlotId })
    }

    const supportTimeline = order.supportTimeline || []
    nextPatch.supportTimeline = [
      ...supportTimeline,
      buildSupportEvent('owner_ops_updated', actor, {
        notesChanged: Object.prototype.hasOwnProperty.call(partial, 'notes'),
        staffChanged: Object.prototype.hasOwnProperty.call(partial, 'assignedStaffId'),
        pickupSlotChanged: Object.prototype.hasOwnProperty.call(partial, 'pickupSlotId') && partial.pickupSlotId !== order.pickupSlotId,
      }),
    ]

    return { order: repositories.patch('orders', orderId, nextPatch) }
  }

  function reorderDesign(designId, payload) {
    const design = repositories.findById('savedDesigns', designId)
    if (!design) return null
    repositories.patch('savedDesigns', designId, { lastUsedAt: new Date().toISOString() })
    return createOrder({
      shopId: design.shopId,
      customerId: design.customerId,
      customer: payload.customer || 'Returning customer',
      fulfillment: payload.fulfillment || 'pickup',
      pickupSlotId: payload.pickupSlotId,
      total: payload.total || 0,
      fees: payload.fees || null,
      paymentMethodSnapshot: payload.paymentMethodSnapshot || null,
      addressSnapshot: payload.addressSnapshot || null,
      notes: payload.notes || 'Reordered from saved design',
      savedDesignId: design.id,
      designSnapshot: design.config,
    })
  }

  function updateOrderStatus(orderId, status) {
    if (!orderStatuses.includes(status)) {
      return { error: { code: 400, body: { error: 'Invalid status', allowed: orderStatuses } } }
    }
    const existing = repositories.findById('orders', orderId)
    if (!existing) return { error: { code: 404, body: { error: 'Order not found' } } }
    if (existing.status === 'cancelled') {
      return { error: { code: 409, body: { error: 'Cancelled orders cannot re-enter the production queue' } } }
    }
    const allowedTransitions = allowedStatusTransitions[existing.status] || []
    if (status !== existing.status && !allowedTransitions.includes(status)) {
      return { error: { code: 409, body: { error: 'Invalid status transition', from: existing.status, to: status, allowed: allowedTransitions } } }
    }

    const order = repositories.patch('orders', orderId, {
      status,
      fulfillmentSnapshot: {
        ...(existing.fulfillmentSnapshot || buildFulfillmentSnapshot(existing)),
        decisionState: status === 'ready' ? 'ready_for_pickup' : status === 'picked_up' ? 'pickup_completed' : `queue_${status}`,
      },
    })
    if (status === 'ready' && order.fulfillment === 'pickup') queueNotification(order.id, 'ready_for_pickup')
    else if (status !== 'picked_up') queueNotification(order.id, 'status_update', 'queued', { nextStatus: status })
    return { order }
  }

  function cancelOrder(orderId, payload = {}, actor) {
    const order = repositories.findById('orders', orderId)
    if (!order) return { error: { code: 404, body: { error: 'Order not found' } } }
    if (order.status === 'picked_up') return { error: { code: 409, body: { error: 'Picked up orders cannot be cancelled' } } }
    if (order.status === 'cancelled') return { error: { code: 409, body: { error: 'Order already cancelled' } } }

    releasePickupSlot(order.pickupSlotId)

    const cancelledAt = new Date().toISOString()
    const reason = payload.reason?.trim() || 'Owner cancellation'
    const updated = repositories.patch('orders', orderId, {
      status: 'cancelled',
      cancelledAt,
      cancellationReason: reason,
      supportStatus: payload.supportStatus || 'cancelled_pending_follow_up',
      refundStatus: payload.refundStatus || 'pending_review',
      supportTimeline: [
        ...(order.supportTimeline || []),
        buildSupportEvent('order_cancelled', actor, { reason }),
      ],
      fulfillmentSnapshot: {
        ...(order.fulfillmentSnapshot || buildFulfillmentSnapshot(order)),
        decisionState: 'order_cancelled',
      },
    })

    queueNotification(order.id, 'order_cancelled', 'queued', { cancelledAt, actorRole: actor?.role || null })
    return { order: updated }
  }

  function cancelCustomerOrder(orderId, payload = {}, actor) {
    const order = repositories.findById('orders', orderId)
    if (!order) return { error: { code: 404, body: { error: 'Order not found' } } }
    if (order.customerId !== actor?.id) return { error: { code: 403, body: { error: 'Forbidden' } } }
    if (!['new', 'confirmed'].includes(order.status)) {
      return { error: { code: 409, body: { error: 'Customer cancellation is only allowed before baking starts', status: order.status } } }
    }

    return cancelOrder(orderId, {
      ...payload,
      reason: payload.reason?.trim() || 'Customer cancelled before production started',
      supportStatus: payload.supportStatus || 'customer_cancelled_pending_refund',
      refundStatus: payload.refundStatus || 'pending_review',
    }, actor)
  }

  function applyTemplateAcrossLocations(templateKey, shopIds = [], actor) {
    const accessibleShopIds = getAccessibleShopIds(actor)
    const uniqueShopIds = [...new Set(shopIds.filter(Boolean))]

    if (!uniqueShopIds.length) {
      return { error: { code: 400, body: { error: 'Select at least one location' } } }
    }

    const invalidShopId = uniqueShopIds.find((shopId) => !accessibleShopIds.includes(shopId))
    if (invalidShopId) {
      return { error: { code: 403, body: { error: 'Forbidden location scope', shopId: invalidShopId } } }
    }

    const appliedAt = new Date().toISOString()
    const updatesByTemplate = {
      'holiday-menu': (shop) => ({
        catalogSettings: {
          ...(shop.catalogSettings || {}),
          activeMenu: 'holiday',
          pricingProfile: 'seasonal',
        },
      }),
      'pickup-hours': (shop) => ({
        pickupSettings: {
          ...(shop.pickupSettings || {}),
          leadHours: 24,
          reminderLeadHours: 2,
          coordinatedHours: true,
        },
      }),
      'staff-playbook': (shop) => ({
        opsSettings: {
          ...(shop.opsSettings || {}),
          staffPlaybook: 'handoff-v2',
          handoffMode: 'verified_pickup',
        },
      }),
    }

    const applyUpdate = updatesByTemplate[templateKey]
    if (!applyUpdate) {
      return { error: { code: 400, body: { error: 'Unknown bulk template', allowed: Object.keys(updatesByTemplate) } } }
    }

    const updatedShops = uniqueShopIds.map((shopId) => {
      const shop = repositories.findById('shops', shopId)
      const patch = applyUpdate(shop)
      return repositories.patch('shops', shopId, {
        ...patch,
        lastBulkTemplateKey: templateKey,
        lastBulkAppliedAt: appliedAt,
        bulkApplyHistory: [
          {
            templateKey,
            appliedAt,
            actorId: actor?.id || null,
            actorRole: actor?.role || null,
          },
          ...(shop.bulkApplyHistory || []),
        ].slice(0, 10),
      })
    })

    return { appliedAt, updatedShops }
  }

  function completePickup(orderId, actor) {
    const order = repositories.findById('orders', orderId)
    if (!order) return { error: { code: 404, body: { error: 'Order not found' } } }
    if (order.fulfillment !== 'pickup') {
      return { error: { code: 400, body: { error: 'Pickup completion is only valid for pickup fulfillment' } } }
    }
    if (order.status === 'picked_up') {
      return { error: { code: 409, body: { error: 'Pickup already completed' } } }
    }
    if (order.status !== 'ready') {
      return { error: { code: 409, body: { error: 'Pickup can only be completed once the order is ready', status: order.status } } }
    }

    const completedAt = new Date().toISOString()
    const nextSnapshot = {
      ...(order.fulfillmentSnapshot || buildFulfillmentSnapshot(order)),
      pickupCompletedAt: completedAt,
      decisionState: 'pickup_completed',
    }

    const updated = repositories.patch('orders', orderId, {
      status: 'picked_up',
      fulfilledAt: completedAt,
      fulfillmentSnapshot: nextSnapshot,
      supportStatus: order.supportStatus || 'closed',
      pickupCompletion: {
        completedAt,
        actorId: actor?.id || null,
        actorRole: actor?.role || null,
      },
    })

    queueNotification(order.id, 'pickup_completed', 'queued', { completedAt })
    return { order: updated }
  }

  function upsertDisputeForOrder(order, payload = {}, actor) {
    const existing = repositories.all('disputes').find((item) => item.orderId === order.id && item.status !== 'resolved')
    if (existing) return existing

    const createdAt = new Date().toISOString()
    const openingNote = payload.note?.trim() || payload.reason?.trim() || 'Operational support escalation'

    return repositories.save('disputes', {
      id: createId('disp'),
      shopId: order.shopId,
      orderId: order.id,
      status: payload.status || 'open',
      reason: payload.reason?.trim() || 'Operational support escalation',
      resolution: '',
      refundStatus: payload.refundStatus || order.refundStatus || 'not_requested',
      createdAt,
      openedBy: actor?.id || null,
      messages: [
        {
          id: createId('dmsg'),
          authorId: actor?.id || null,
          authorRole: actor?.role || 'system',
          body: openingNote,
          visibility: 'internal',
          createdAt,
          kind: 'opened',
        },
      ],
    })
  }

  function addDisputeMessage(disputeId, payload = {}, actor) {
    const dispute = repositories.findById('disputes', disputeId)
    if (!dispute) return { error: { code: 404, body: { error: 'Dispute not found' } } }

    const body = payload.body?.trim()
    if (!body) return { error: { code: 400, body: { error: 'Message body is required' } } }

    const createdAt = new Date().toISOString()
    const message = {
      id: createId('dmsg'),
      authorId: actor?.id || null,
      authorRole: actor?.role || 'system',
      body,
      visibility: payload.visibility === 'customer' ? 'customer' : 'internal',
      createdAt,
      kind: payload.kind || 'note',
    }

    const updatedDispute = repositories.patch('disputes', disputeId, {
      messages: [...(dispute.messages || []), message],
      updatedAt: createdAt,
      lastMessageAt: createdAt,
      lastMessagePreview: body.slice(0, 140),
      status: dispute.status === 'resolved' ? 'open' : dispute.status,
      resolution: message.visibility === 'customer' && dispute.status === 'resolved' ? '' : dispute.resolution,
    })

    const order = repositories.findById('orders', dispute.orderId)
    if (order) {
      repositories.patch('orders', order.id, {
        supportStatus: message.visibility === 'customer' ? 'customer_reply_pending' : (order.supportStatus || 'escalated'),
        supportTimeline: [
          ...(order.supportTimeline || []),
          buildSupportEvent('dispute_message_added', actor, { disputeId, visibility: message.visibility, body }),
        ],
      })
      queueNotification(order.id, 'support_case_updated', 'queued', { disputeId, messageId: message.id, visibility: message.visibility })
    }

    return { dispute: updatedDispute, message }
  }

  function addCustomerSupportMessage(orderId, payload = {}, actor) {
    const order = repositories.findById('orders', orderId)
    if (!order) return { error: { code: 404, body: { error: 'Order not found' } } }

    const body = payload.body?.trim()
    if (!body) return { error: { code: 400, body: { error: 'Message body is required' } } }
    if (!actor || actor.role !== 'customer' || order.customerId !== actor.id) return { error: { code: 403, body: { error: 'Forbidden' } } }

    const existing = repositories.all('disputes').find((item) => item.orderId === order.id && item.status !== 'resolved')
    if (existing) {
      const result = addDisputeMessage(existing.id, { body, visibility: 'customer', kind: 'customer_reply' }, actor)
      if (result.error) return result
      const updatedOrder = repositories.patch('orders', order.id, {
        supportStatus: 'customer_reply_pending',
        refundStatus: order.refundStatus || 'not_requested',
      })
      return { dispute: result.dispute, order: updatedOrder, message: result.message }
    }

    const dispute = upsertDisputeForOrder(order, {
      reason: payload.reason?.trim() || 'Customer support request',
      note: body,
      refundStatus: order.refundStatus || 'not_requested',
      status: 'open',
    }, actor)

    const createdAt = dispute.messages?.[0]?.createdAt || new Date().toISOString()
    const customerMessage = {
      id: createId('dmsg'),
      authorId: actor.id,
      authorRole: actor.role,
      body,
      visibility: 'customer',
      createdAt,
      kind: 'customer_reply',
    }
    const updatedDispute = repositories.patch('disputes', dispute.id, {
      messages: [...(dispute.messages || []), customerMessage],
      updatedAt: createdAt,
      lastMessageAt: createdAt,
      lastMessagePreview: body.slice(0, 140),
    })
    const updatedOrder = repositories.patch('orders', order.id, {
      supportStatus: 'customer_reply_pending',
      supportTimeline: [
        ...(order.supportTimeline || []),
        buildSupportEvent('customer_support_opened', actor, { disputeId: dispute.id, body }),
      ],
    })
    queueNotification(order.id, 'support_case_opened', 'queued', { disputeId: dispute.id, visibility: 'customer' })
    return { dispute: updatedDispute, order: updatedOrder, message: customerMessage }
  }

  function flagOrderException(orderId, payload = {}, actor) {
    const order = repositories.findById('orders', orderId)
    if (!order) return { error: { code: 404, body: { error: 'Order not found' } } }

    const nextSupportStatus = payload.supportStatus || 'escalated'
    const nextRefundStatus = payload.refundStatus || order.refundStatus || 'pending_review'
    const reason = payload.reason?.trim() || 'Operational exception raised from owner workspace'
    const nextDispute = upsertDisputeForOrder(order, { reason, refundStatus: nextRefundStatus, status: 'open' }, actor)

    const updated = repositories.patch('orders', orderId, {
      supportStatus: nextSupportStatus,
      refundStatus: nextRefundStatus,
      supportTimeline: [
        ...(order.supportTimeline || []),
        buildSupportEvent('owner_exception_flagged', actor, { reason, disputeId: nextDispute.id, supportStatus: nextSupportStatus, refundStatus: nextRefundStatus }),
      ],
    })

    queueNotification(order.id, 'support_case_opened', 'queued', { disputeId: nextDispute.id, supportStatus: nextSupportStatus, refundStatus: nextRefundStatus })
    return { order: updated, dispute: nextDispute }
  }

  function addOwnerExceptionNote(orderId, payload = {}, actor) {
    const order = repositories.findById('orders', orderId)
    if (!order) return { error: { code: 404, body: { error: 'Order not found' } } }
    if (!actor || !['owner', 'staff', 'admin'].includes(actor.role)) return { error: { code: 403, body: { error: 'Forbidden' } } }

    const body = payload.body?.trim() || payload.note?.trim()
    if (!body) return { error: { code: 400, body: { error: 'Exception note body is required' } } }

    const dispute = upsertDisputeForOrder(order, {
      reason: payload.reason?.trim() || 'Operational support escalation',
      refundStatus: payload.refundStatus || order.refundStatus || 'not_requested',
      status: payload.status || 'open',
    }, actor)

    const result = addDisputeMessage(dispute.id, { body, visibility: 'internal', kind: 'owner_follow_up' }, actor)
    if (result.error) return result

    const updatedOrder = repositories.patch('orders', order.id, {
      supportStatus: payload.supportStatus || order.supportStatus || 'escalated',
      supportTimeline: [
        ...(order.supportTimeline || []),
        buildSupportEvent('owner_exception_note_added', actor, { disputeId: dispute.id, body }),
      ],
    })

    return { order: updatedOrder, dispute: result.dispute, message: result.message }
  }

  function resolveDispute(disputeId, payload = {}, actor) {
    const dispute = repositories.findById('disputes', disputeId)
    if (!dispute) return { error: { code: 404, body: { error: 'Dispute not found' } } }

    const nextStatus = payload.status || 'resolved'
    const nextRefundStatus = payload.refundStatus || dispute.refundStatus || 'not_requested'
    const resolution = payload.resolution?.trim() || 'Resolved by admin review'
    const resolvedAt = new Date().toISOString()

    const updatedDispute = repositories.patch('disputes', disputeId, {
      status: nextStatus,
      resolution,
      refundStatus: nextRefundStatus,
      resolvedAt,
      resolvedBy: actor?.id || null,
      updatedAt: resolvedAt,
      lastMessageAt: resolvedAt,
      lastMessagePreview: resolution.slice(0, 140),
      messages: [
        ...(dispute.messages || []),
        {
          id: createId('dmsg'),
          authorId: actor?.id || null,
          authorRole: actor?.role || 'system',
          body: resolution,
          visibility: 'internal',
          createdAt: resolvedAt,
          kind: 'resolution',
        },
      ],
    })

    const order = repositories.findById('orders', dispute.orderId)
    if (order) {
      repositories.patch('orders', order.id, {
        supportStatus: nextStatus === 'resolved' ? 'resolved' : 'escalated',
        refundStatus: nextRefundStatus,
        supportTimeline: [
          ...(order.supportTimeline || []),
          buildSupportEvent('dispute_updated', actor, { disputeId, disputeStatus: nextStatus, refundStatus: nextRefundStatus, resolution }),
        ],
      })
      queueNotification(order.id, 'support_case_updated', 'queued', { disputeId, disputeStatus: nextStatus, refundStatus: nextRefundStatus })
    }

    return { dispute: updatedDispute }
  }

  function assignDispute(disputeId, payload = {}, actor) {
    const dispute = repositories.findById('disputes', disputeId)
    if (!dispute) return { error: { code: 404, body: { error: 'Dispute not found' } } }
    if (!actor || actor.role !== 'admin') return { error: { code: 403, body: { error: 'Forbidden' } } }

    const nextAssignedAdminId = Object.prototype.hasOwnProperty.call(payload, 'assignedAdminId')
      ? payload.assignedAdminId || null
      : dispute.assignedAdminId || null
    const note = payload.note?.trim() || ''
    if (nextAssignedAdminId) {
      const adminUser = repositories.findById('users', nextAssignedAdminId)
      if (!adminUser || adminUser.role !== 'admin') {
        return { error: { code: 400, body: { error: 'Assigned admin must be a valid admin user' } } }
      }
    }

    const assignedAt = new Date().toISOString()
    const assignmentMessage = nextAssignedAdminId
      ? `Assigned to admin ${nextAssignedAdminId}${note ? `, ${note}` : ''}`
      : `Assignment cleared${note ? `, ${note}` : ''}`
    const updatedDispute = repositories.patch('disputes', disputeId, {
      assignedAdminId: nextAssignedAdminId,
      assignedAt,
      assignedBy: actor.id,
      updatedAt: assignedAt,
      lastMessageAt: assignedAt,
      lastMessagePreview: assignmentMessage.slice(0, 140),
      messages: [
        ...(dispute.messages || []),
        {
          id: createId('dmsg'),
          authorId: actor.id,
          authorRole: actor.role,
          body: assignmentMessage,
          visibility: 'internal',
          createdAt: assignedAt,
          kind: nextAssignedAdminId ? 'assignment' : 'unassignment',
        },
      ],
    })

    const order = repositories.findById('orders', dispute.orderId)
    if (order) {
      repositories.patch('orders', order.id, {
        supportTimeline: [
          ...(order.supportTimeline || []),
          buildSupportEvent('dispute_assignment_updated', actor, { disputeId, assignedAdminId: nextAssignedAdminId, note }),
        ],
      })
    }

    return { dispute: updatedDispute }
  }

  function executeRefund(disputeId, payload = {}, actor) {
    const dispute = repositories.findById('disputes', disputeId)
    if (!dispute) return { error: { code: 404, body: { error: 'Dispute not found' } } }

    const order = repositories.findById('orders', dispute.orderId)
    if (!order) return { error: { code: 404, body: { error: 'Order not found for dispute' } } }

    const decision = payload.decision === 'rejected' ? 'rejected' : 'approved'
    const amount = Number(payload.amount ?? order.total ?? 0)
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: { code: 400, body: { error: 'Refund amount must be a valid non-negative number' } } }
    }
    if (amount > Number(order.total || 0)) {
      return { error: { code: 400, body: { error: 'Refund amount cannot exceed order total', total: Number(order.total || 0) } } }
    }

    const processedAt = new Date().toISOString()
    const refundStatus = decision === 'approved' ? 'refunded' : 'rejected'
    const disputeStatus = payload.disputeStatus || 'resolved'
    const resolution = payload.resolution?.trim() || (decision === 'approved' ? 'Refund approved by admin review.' : 'Refund request rejected after admin review.')

    const refundRecord = {
      decision,
      amount,
      currency: payload.currency || 'CAD',
      note: payload.note?.trim() || '',
      processedAt,
      actorId: actor?.id || null,
      actorRole: actor?.role || null,
    }

    const updatedDispute = repositories.patch('disputes', disputeId, {
      status: disputeStatus,
      refundStatus,
      resolution,
      resolvedAt: processedAt,
      resolvedBy: actor?.id || null,
      refundDecision: refundRecord,
      updatedAt: processedAt,
      lastMessageAt: processedAt,
      lastMessagePreview: resolution.slice(0, 140),
      messages: [
        ...(dispute.messages || []),
        {
          id: createId('dmsg'),
          authorId: actor?.id || null,
          authorRole: actor?.role || 'system',
          body: resolution,
          visibility: 'internal',
          createdAt: processedAt,
          kind: decision === 'approved' ? 'refund_approved' : 'refund_rejected',
        },
      ],
    })

    const updatedOrder = repositories.patch('orders', order.id, {
      refundStatus,
      refundedAt: decision === 'approved' ? processedAt : null,
      supportStatus: disputeStatus === 'resolved' ? 'resolved' : 'escalated',
      refundDecision: refundRecord,
      supportTimeline: [
        ...(order.supportTimeline || []),
        buildSupportEvent('refund_executed', actor, { disputeId, refundStatus, amount, resolution, note: refundRecord.note }),
      ],
    })

    queueNotification(order.id, decision === 'approved' ? 'refund_approved' : 'refund_rejected', 'queued', {
      disputeId,
      amount,
      refundStatus,
    })

    return { dispute: updatedDispute, order: updatedOrder }
  }

  return {
    listOrders,
    createOrder,
    createDesign,
    updateDesign,
    reorderDesign,
    updateOrderStatus,
    updatePickupSlot,
    updateOrderOperations,
    cancelOrder,
    cancelCustomerOrder,
    applyTemplateAcrossLocations,
    completePickup,
    flagOrderException,
    addOwnerExceptionNote,
    addDisputeMessage,
    addCustomerSupportMessage,
    assignDispute,
    resolveDispute,
    executeRefund,
  }
}

export { orderStatuses }

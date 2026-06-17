import express from 'express'
import cors from 'cors'
import { createStore } from './store.js'
import { createRepositories } from './repositories.js'
import { createAuth } from './auth.js'
import { createServices, orderStatuses } from './services.js'
import { createAnalyticsSummary, createOrderStatusSummary, createOwnerQueueView, enrichDispute, enrichOrder } from './helpers.js'

export function createApp() {
  const app = express()
  const store = createStore()
  const repositories = createRepositories(store)
  const auth = createAuth({ repositories })
  const services = createServices({ repositories })

  app.use(cors())
  app.use(express.json())
  app.use(auth.attachUser)

  const ownerOnly = auth.requireRoles('owner', 'staff', 'admin')
  const adminOnly = auth.requireRoles('admin')

  const accessibleShopIds = (req) => {
    if (req.user?.role === 'admin') return repositories.all('shops').map((shop) => shop.id)
    if (req.user?.role === 'owner') return req.user.managedShopIds?.length ? req.user.managedShopIds : [req.user.shopId]
    if (req.user?.shopId) return [req.user.shopId]
    return []
  }

  const tenantShopId = (req, fallback) => {
    if (req.user?.role === 'owner') {
      const requestedShopId = req.query.shopId || fallback
      if (!requestedShopId) return req.user.shopId
      return accessibleShopIds(req).includes(requestedShopId) ? requestedShopId : req.user.shopId
    }
    if (req.user?.role === 'staff') return req.user.shopId
    return fallback
  }

  const canAccessOrder = (req, order) => req.user.role === 'admin' || accessibleShopIds(req).includes(order.shopId)
  const canAccessCustomerOrder = (req, order) => req.user?.role === 'customer' && order.customerId === req.user.id
  const canAccessSlot = (req, slot) => req.user.role === 'admin' || accessibleShopIds(req).includes(slot.shopId)
  const canAccessTemplate = (req, template) => req.user.role === 'admin' || accessibleShopIds(req).includes(template.shopId)

  app.get('/', (req, res) => {
    res.json({
      ok: true,
      service: 'cake-platform-backend',
      message: 'Backend is running',
      persistence: store.path,
      routes: [
        '/health',
        '/api/auth/login',
        '/api/auth/me',
        '/api/auth/sessions',
        '/api/auth/logout',
        '/api/auth/sessions/:id/revoke',
        '/api/shops',
        '/api/templates',
        '/api/orders',
        '/api/orders/me',
        '/api/profile',
        '/api/profile/addresses',
        '/api/profile/cards',
        '/api/orders/:id/support',
        '/api/orders/:id/support-messages',
        '/api/pickup-slots',
        '/api/designs',
        '/api/designs/:id',
        '/api/designs/:id/reorder',
        '/api/notifications',
        '/api/owner/orders',
        '/api/owner/orders/summary',
        '/api/owner/queue',
        '/api/owner/locations',
        '/api/owner/location-bulk-apply',
        '/api/owner/orders/:id/ops',
        '/api/owner/orders/:id/cancel',
        '/api/owner/orders/:id/complete-pickup',
        '/api/owner/orders/:id/flag-exception',
        '/api/owner/orders/:id/exception-notes',
        '/api/owner/templates',
        '/api/owner/pickup-slots',
        '/api/admin/shops',
        '/api/admin/subscriptions',
        '/api/admin/disputes',
        '/api/admin/disputes/:id/messages',
        '/api/admin/disputes/:id',
        '/api/admin/disputes/:id/refund',
        '/api/admin/analytics',
        '/api/dev/reset',
      ],
    })
  })

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'cake-platform-backend', persistence: store.path })
  })

  app.post('/api/dev/reset', (req, res) => {
    const state = store.reset()
    res.json({ ok: true, collections: Object.fromEntries(Object.entries(state).map(([key, value]) => [key, Array.isArray(value) ? value.length : 1])) })
  })

  app.get('/api/shops', (req, res) => {
    res.json(repositories.all('shops'))
  })

  app.get('/api/templates', (req, res) => {
    const { shopId } = req.query
    const templates = repositories.all('templates')
    res.json(shopId ? templates.filter((item) => item.shopId === shopId) : templates)
  })

  app.get('/api/owner/templates', ownerOnly, (req, res) => {
    const requestedShopId = req.query.shopId
    const shopIds = accessibleShopIds(req)
    const templates = repositories.all('templates').filter((item) => shopIds.includes(item.shopId))
    res.json(requestedShopId ? templates.filter((item) => item.shopId === requestedShopId) : templates)
  })

  app.get('/api/owner/locations', ownerOnly, (req, res) => {
    const shops = repositories.all('shops').filter((shop) => accessibleShopIds(req).includes(shop.id))
    res.json(shops)
  })

  app.post('/api/owner/location-bulk-apply', ownerOnly, (req, res) => {
    const result = services.applyTemplateAcrossLocations(req.body.templateKey, req.body.shopIds, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(result)
  })

  app.patch('/api/owner/templates/:id', ownerOnly, (req, res) => {
    const template = repositories.findById('templates', req.params.id)
    if (!template) return res.status(404).json({ error: 'Template not found' })
    if (!canAccessTemplate(req, template)) return res.status(403).json({ error: 'Forbidden' })
    return res.json(repositories.patch('templates', template.id, req.body))
  })

  app.get('/api/orders', (req, res) => {
    const filtered = services.listOrders({ shopId: req.query.shopId })
    res.json(filtered.map((order) => enrichOrder(order, repositories)))
  })

  app.get('/api/orders/me', (req, res) => {
    const customerId = req.user?.role === 'customer' ? req.user.id : req.query.customerId
    const filtered = services.listOrders({ customerId })
    res.json(filtered.map((order) => enrichOrder(order, repositories, req.user)))
  })

  app.get('/api/profile', (req, res) => {
    if (!req.user || req.user.role !== 'customer') return res.status(401).json({ error: 'Customer authentication required' })
    const profile = repositories.all('customerProfiles').find((item) => item.customerId === req.user.id)
    if (!profile) {
      const createdAt = new Date().toISOString()
      const nextProfile = repositories.save('customerProfiles', {
        id: `profile-${req.user.id}`,
        customerId: req.user.id,
        fullName: req.user.name || 'Customer',
        email: req.user.email || '',
        phone: '',
        addresses: [],
        cards: [],
        preferredAddressId: null,
        createdAt,
        updatedAt: createdAt,
      })
      return res.json(nextProfile)
    }
    return res.json(profile)
  })

  app.patch('/api/profile', (req, res) => {
    if (!req.user || req.user.role !== 'customer') return res.status(401).json({ error: 'Customer authentication required' })
    const profile = repositories.all('customerProfiles').find((item) => item.customerId === req.user.id)
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    return res.json(repositories.patch('customerProfiles', profile.id, { ...req.body, updatedAt: new Date().toISOString() }))
  })

  app.post('/api/profile/addresses', (req, res) => {
    if (!req.user || req.user.role !== 'customer') return res.status(401).json({ error: 'Customer authentication required' })
    const profile = repositories.all('customerProfiles').find((item) => item.customerId === req.user.id)
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    const address = {
      id: `addr-${Date.now()}`,
      label: req.body.label || 'Address',
      line1: req.body.line1 || '',
      instructions: req.body.instructions || '',
    }
    const addresses = [...(profile.addresses || []), address]
    const updated = repositories.patch('customerProfiles', profile.id, {
      addresses,
      preferredAddressId: profile.preferredAddressId || address.id,
      updatedAt: new Date().toISOString(),
    })
    return res.status(201).json(updated)
  })

  app.post('/api/profile/cards', (req, res) => {
    if (!req.user || req.user.role !== 'customer') return res.status(401).json({ error: 'Customer authentication required' })
    const profile = repositories.all('customerProfiles').find((item) => item.customerId === req.user.id)
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    const card = {
      id: `card-${Date.now()}`,
      brand: req.body.brand || 'Card',
      last4: String(req.body.last4 || '').slice(-4),
      name: req.body.name || req.user.name || 'Customer',
    }
    const cards = [...(profile.cards || []), card]
    const updated = repositories.patch('customerProfiles', profile.id, {
      cards,
      updatedAt: new Date().toISOString(),
    })
    return res.status(201).json(updated)
  })

  app.get('/api/orders/:id/support', (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessCustomerOrder(req, order) && !canAccessOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const enrichedOrder = enrichOrder(order, repositories, req.user)
    return res.json({ order: enrichedOrder, disputes: enrichedOrder.disputes })
  })

  app.post('/api/orders/:id/support-messages', (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessCustomerOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.addCustomerSupportMessage(order.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json({ order: enrichOrder(result.order, repositories, req.user), dispute: result.dispute, message: result.message })
  })

  app.post('/api/orders/:id/cancel', (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessCustomerOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.cancelCustomerOrder(order.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(enrichOrder(result.order, repositories, req.user))
  })

  app.get('/api/pickup-slots', (req, res) => {
    const { shopId } = req.query
    const pickupSlots = repositories.all('pickupSlots')
    res.json(shopId ? pickupSlots.filter((item) => item.shopId === shopId) : pickupSlots)
  })

  app.get('/api/owner/pickup-slots', ownerOnly, (req, res) => {
    const shopId = tenantShopId(req, req.query.shopId)
    const pickupSlots = repositories.all('pickupSlots')
    res.json(shopId ? pickupSlots.filter((item) => item.shopId === shopId) : pickupSlots)
  })

  app.patch('/api/owner/pickup-slots/:id', ownerOnly, (req, res) => {
    const slot = repositories.findById('pickupSlots', req.params.id)
    if (!slot) return res.status(404).json({ error: 'Pickup slot not found' })
    if (!canAccessSlot(req, slot)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.updatePickupSlot(slot.id, req.body)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json({ ...result.slot, impactedOrderCount: result.impactedOrderCount })
  })

  app.get('/api/designs', (req, res) => {
    if (req.user && !['customer', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
    const customerId = req.user?.role === 'customer' ? req.user.id : req.query.customerId
    const shopId = req.query.shopId
    let results = repositories.all('savedDesigns')
    if (customerId) results = results.filter((item) => item.customerId === customerId)
    if (shopId) results = results.filter((item) => item.shopId === shopId)
    res.json(results)
  })

  app.get('/api/designs/:id', (req, res) => {
    const design = repositories.findById('savedDesigns', req.params.id)
    if (!design) return res.status(404).json({ error: 'Design not found' })
    if (req.user?.role === 'customer' && design.customerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    return res.json(design)
  })

  app.post('/api/designs', (req, res) => {
    if (!req.user || req.user.role !== 'customer') return res.status(401).json({ error: 'Customer authentication required' })
    const design = services.createDesign({
      ...req.body,
      customerId: req.user.id,
    })
    res.status(201).json(design)
  })

  app.patch('/api/designs/:id', (req, res) => {
    if (!req.user || req.user.role !== 'customer') return res.status(401).json({ error: 'Customer authentication required' })
    const design = repositories.findById('savedDesigns', req.params.id)
    if (!design) return res.status(404).json({ error: 'Design not found' })
    if (design.customerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    const result = services.updateDesign(design.id, req.body)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(result.design)
  })

  app.post('/api/designs/:id/reorder', (req, res) => {
    try {
      if (!req.user || req.user.role !== 'customer') return res.status(401).json({ error: 'Customer authentication required' })
      const design = repositories.findById('savedDesigns', req.params.id)
      if (!design) return res.status(404).json({ error: 'Design not found' })
      if (design.customerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
      const order = services.reorderDesign(req.params.id, req.body)
      return res.status(201).json(enrichOrder(order, repositories, req.user))
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }
  })

  app.get('/api/notifications', (req, res) => {
    const { orderId } = req.query
    const events = repositories.all('notificationEvents')
    res.json(orderId ? events.filter((item) => item.orderId === orderId) : events)
  })

  app.post('/api/orders', (req, res) => {
    try {
      const payload = {
        ...req.body,
        customerId: req.user?.role === 'customer' ? req.user.id : req.body.customerId,
      }
      const order = services.createOrder(payload)
      return res.status(201).json(enrichOrder(order, repositories, req.user))
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }
  })

  app.get('/api/owner/orders', ownerOnly, (req, res) => {
    const filtered = services.listOrders({ shopId: tenantShopId(req, req.query.shopId), status: req.query.status })
    res.json(filtered.map((order) => enrichOrder(order, repositories, req.user)))
  })

  app.get('/api/owner/orders/summary', ownerOnly, (req, res) => {
    res.json(createOrderStatusSummary(repositories, tenantShopId(req, req.query.shopId)))
  })

  app.get('/api/owner/queue', ownerOnly, (req, res) => {
    res.json(createOwnerQueueView(repositories, tenantShopId(req, req.query.shopId)))
  })

  app.get('/api/owner/orders/:id', ownerOnly, (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    return res.json(enrichOrder(order, repositories, req.user))
  })

  app.patch('/api/owner/orders/:id/status', ownerOnly, (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.updateOrderStatus(order.id, req.body.status)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(result.order)
  })

  app.patch('/api/owner/orders/:id/ops', ownerOnly, (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.updateOrderOperations(order.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(enrichOrder(result.order, repositories, req.user))
  })

  app.post('/api/owner/orders/:id/cancel', ownerOnly, (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.cancelOrder(order.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(enrichOrder(result.order, repositories, req.user))
  })

  app.post('/api/owner/orders/:id/complete-pickup', ownerOnly, (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.completePickup(order.id, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(result.order)
  })

  app.post('/api/owner/orders/:id/flag-exception', ownerOnly, (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.flagOrderException(order.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json({ order: enrichOrder(result.order, repositories, req.user), dispute: result.dispute })
  })

  app.post('/api/owner/orders/:id/exception-notes', ownerOnly, (req, res) => {
    const order = repositories.findById('orders', req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: 'Forbidden' })
    const result = services.addOwnerExceptionNote(order.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json({ order: enrichOrder(result.order, repositories, req.user), dispute: result.dispute, message: result.message })
  })

  app.get('/api/admin/shops', adminOnly, (req, res) => {
    const shops = repositories.all('shops')
    const orders = repositories.all('orders')
    res.json(shops.map((shop) => ({ ...shop, orderCount: orders.filter((order) => order.shopId === shop.id).length })))
  })

  app.get('/api/admin/subscriptions', adminOnly, (req, res) => {
    res.json(repositories.all('shops').map((shop) => ({ shopId: shop.id, shopName: shop.name, plan: shop.plan, status: 'active' })))
  })

  app.get('/api/admin/disputes', adminOnly, (req, res) => {
    res.json(repositories.all('disputes').map((dispute) => enrichDispute(dispute, repositories, req.user)))
  })

  app.get('/api/admin/team', adminOnly, (req, res) => {
    res.json(repositories.all('users').filter((user) => user.role === 'admin'))
  })

  app.post('/api/admin/disputes/:id/messages', adminOnly, (req, res) => {
    const result = services.addDisputeMessage(req.params.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(result)
  })

  app.post('/api/admin/disputes/:id/assign', adminOnly, (req, res) => {
    const result = services.assignDispute(req.params.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(enrichDispute(result.dispute, repositories, req.user))
  })

  app.patch('/api/admin/disputes/:id', adminOnly, (req, res) => {
    const result = services.resolveDispute(req.params.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json(result.dispute)
  })

  app.post('/api/admin/disputes/:id/refund', adminOnly, (req, res) => {
    const result = services.executeRefund(req.params.id, req.body, req.user)
    if (result.error) return res.status(result.error.code).json(result.error.body)
    return res.json({ dispute: result.dispute, order: enrichOrder(result.order, repositories, req.user) })
  })

  app.get('/api/admin/analytics', adminOnly, (req, res) => {
    res.json(createAnalyticsSummary(repositories))
  })

  app.post('/api/auth/login', (req, res) => {
    const { email, role = 'owner' } = req.body
    const matchedUser = repositories.all('users').find((user) => user.email === email) || repositories.save('users', {
      id: `${role}-${Date.now()}`,
      email,
      role,
      shopId: role === 'admin' ? null : 'shop-1',
      name: email?.split('@')[0] || role,
    })

    const session = auth.issueToken(matchedUser)

    res.json({ token: session.token, session, user: matchedUser })
  })

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    res.json({ user: req.user })
  })

  app.get('/api/auth/sessions', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    const sessions = auth.listSessionsForUser(req.user).map((session) => ({
      ...session,
      isCurrent: session.id === req.user.sessionId,
    }))
    res.json({ sessions })
  })

  app.post('/api/auth/logout', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    const result = auth.revokeSession({ actor: req.user, sessionId: req.user.sessionId })
    if (result.error) return res.status(result.error.code).json(result.error.body)
    res.json({ ok: true, ...result })
  })

  app.post('/api/auth/sessions/:id/revoke', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    const result = auth.revokeSession({ actor: req.user, sessionId: req.params.id, scope: req.body?.scope === 'others' ? 'others' : 'single' })
    if (result.error) return res.status(result.error.code).json(result.error.body)
    res.json({ ok: true, ...result })
  })

  app.get('/api/meta/order-statuses', (req, res) => {
    res.json(orderStatuses)
  })

  return app
}

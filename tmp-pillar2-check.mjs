import { createStore } from './src/store.js'
import { createRepositories } from './src/repositories.js'
import { createServices } from './src/services.js'

const store = createStore()
store.reset()
const repositories = createRepositories(store)
const services = createServices({ repositories })

const created = services.createOrder({
  shopId: 'shop-1',
  customerId: 'cust-1',
  customer: 'Test',
  pickupSlotId: 'slot-2',
})

console.log(JSON.stringify({
  createdStatus: created.status,
  prematurePickup: services.completePickup(created.id, { id: 'owner-1', role: 'owner' }),
  invalidJump: services.updateOrderStatus(created.id, 'ready'),
  confirmed: services.updateOrderStatus(created.id, 'confirmed'),
  baking: services.updateOrderStatus(created.id, 'baking'),
  decorating: services.updateOrderStatus(created.id, 'decorating'),
  ready: services.updateOrderStatus(created.id, 'ready'),
  pickupReady: services.completePickup(created.id, { id: 'owner-1', role: 'owner' }),
  flagged: services.flagOrderException('ord-1', { reason: 'manual check', supportStatus: 'escalated', refundStatus: 'pending_review' }, { id: 'owner-1', role: 'owner' }),
}, null, 2))

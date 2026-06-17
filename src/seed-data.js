function addDays(baseDate, days) {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + days)
  return next
}

function addHours(baseDate, hours) {
  const next = new Date(baseDate)
  next.setHours(next.getHours() + hours)
  return next
}

function atLocalTime(baseDate, hour, minute = 0, durationMinutes = 30) {
  const start = new Date(baseDate)
  start.setHours(hour, minute, 0, 0)
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + durationMinutes)
  return { startTime: start.toISOString(), endTime: end.toISOString() }
}

function buildSeedPickupSlots() {
  const today = new Date()
  const sameDay = today.getHours() < 14 ? today : addDays(today, 1)
  const nextDay = addDays(sameDay, 1)
  const dayAfter = addDays(sameDay, 2)

  return [
    {
      id: 'slot-1',
      shopId: 'shop-1',
      label: 'Next pickup · 3:30 PM',
      ...atLocalTime(sameDay, 15, 30),
      capacity: 6,
      booked: 2,
      active: true,
    },
    {
      id: 'slot-2',
      shopId: 'shop-1',
      label: 'Following pickup · 10:00 AM',
      ...atLocalTime(nextDay, 10, 0),
      capacity: 6,
      booked: 1,
      active: true,
    },
    {
      id: 'slot-3',
      shopId: 'shop-1',
      label: 'Flex pickup · 1:00 PM',
      ...atLocalTime(dayAfter, 13, 0),
      capacity: 8,
      booked: 0,
      active: true,
    },
    {
      id: 'slot-4',
      shopId: 'shop-2',
      label: 'Burnaby pickup · 4:00 PM',
      ...atLocalTime(sameDay, 16, 0),
      capacity: 5,
      booked: 1,
      active: true,
    },
    {
      id: 'slot-5',
      shopId: 'shop-2',
      label: 'Burnaby next day · 11:00 AM',
      ...atLocalTime(nextDay, 11, 0),
      capacity: 6,
      booked: 0,
      active: true,
    },
    {
      id: 'slot-6',
      shopId: 'shop-3',
      label: 'Richmond express · 2:00 PM',
      ...atLocalTime(sameDay, 14, 0),
      capacity: 8,
      booked: 2,
      active: true,
    },
    {
      id: 'slot-7',
      shopId: 'shop-3',
      label: 'Richmond morning · 9:30 AM',
      ...atLocalTime(nextDay, 9, 30),
      capacity: 8,
      booked: 1,
      active: true,
    },
  ]
}

const seedPickupSlots = buildSeedPickupSlots()
const seedDesignLastUsedAt = addDays(new Date(), -1).toISOString()
const seedOrderCreatedAt = new Date().toISOString()

export const seedData = {
  shops: [
    {
      id: 'shop-1',
      name: 'Demo Cake Studio',
      plan: 'Growth',
      location: 'Downtown Vancouver',
      teamSize: 8,
      pickupSettings: { leadHours: 24, slotCapacity: 6 },
      catalogSettings: { activeMenu: 'core', pricingProfile: 'standard' },
      opsSettings: { staffPlaybook: 'core', handoffMode: 'standard' },
      bulkApplyHistory: [],
    },
    {
      id: 'shop-2',
      name: 'Demo Cake Studio - Burnaby Heights',
      plan: 'Growth',
      location: 'Burnaby Heights',
      teamSize: 5,
      pickupSettings: { leadHours: 24, slotCapacity: 6 },
      catalogSettings: { activeMenu: 'core', pricingProfile: 'growth' },
      opsSettings: { staffPlaybook: 'core', handoffMode: 'standard' },
      bulkApplyHistory: [],
    },
    {
      id: 'shop-3',
      name: 'Demo Cake Studio - Richmond Pickup Hub',
      plan: 'Starter',
      location: 'Richmond Pickup Hub',
      teamSize: 3,
      pickupSettings: { leadHours: 18, slotCapacity: 8 },
      catalogSettings: { activeMenu: 'core', pricingProfile: 'pickup' },
      opsSettings: { staffPlaybook: 'pickup', handoffMode: 'express' },
      bulkApplyHistory: [],
    },
  ],
  templates: [
    {
      id: 'tpl-1',
      shopId: 'shop-1',
      name: 'Wedding Premium',
      maxLayers: 10,
      occasion: 'Wedding',
      defaultMode: 'advanced',
      allowedCakeTypes: ['round', 'heart', 'tall', 'premium'],
    },
    {
      id: 'tpl-2',
      shopId: 'shop-1',
      name: 'Birthday Classic',
      maxLayers: 6,
      occasion: 'Birthday',
      defaultMode: 'simple',
      allowedCakeTypes: ['round', 'heart'],
    },
    {
      id: 'tpl-3',
      shopId: 'shop-2',
      name: 'Burnaby Celebration',
      maxLayers: 7,
      occasion: 'Anniversary',
      defaultMode: 'advanced',
      allowedCakeTypes: ['round', 'heart', 'tall'],
    },
    {
      id: 'tpl-4',
      shopId: 'shop-3',
      name: 'Richmond Express Pickup',
      maxLayers: 5,
      occasion: 'Birthday',
      defaultMode: 'simple',
      allowedCakeTypes: ['round', 'heart'],
    },
  ],
  pickupSlots: seedPickupSlots,
  customerProfiles: [
    {
      id: 'profile-cust-1',
      customerId: 'cust-1',
      fullName: 'Demo Customer',
      email: 'customer@demo.com',
      phone: '',
      addresses: [
        { id: 'addr-home', label: 'Home', line1: '1234 Main St, Vancouver, BC', instructions: '' },
        { id: 'addr-work', label: 'Work', line1: '880 West Pender St, Vancouver, BC', instructions: 'Lobby pickup if needed' },
      ],
      cards: [
        { id: 'card-1', brand: 'Visa', last4: '4242', name: 'Demo Customer' },
      ],
      preferredAddressId: 'addr-home',
      createdAt: seedOrderCreatedAt,
      updatedAt: seedOrderCreatedAt,
    },
  ],
  savedDesigns: [
    {
      id: 'design-1',
      shopId: 'shop-1',
      customerId: 'cust-1',
      title: 'Birthday · Round',
      summary: 'Chocolate fudge with whipped cream',
      config: { occasion: 'Birthday', mode: 'simple', cakeType: 'round', layerCount: 3 },
      lastUsedAt: seedDesignLastUsedAt,
    },
  ],
  notificationEvents: [
    { id: 'notif-1', orderId: 'ord-1', type: 'order_confirmation', status: 'sent' },
  ],
  orders: [
    {
      id: 'ord-1',
      shopId: 'shop-1',
      customerId: 'cust-1',
      customer: 'Rohit',
      status: 'new',
      assignedStaffId: 'staff-1',
      supportStatus: 'monitoring',
      refundStatus: 'not_requested',
      total: 145,
      fulfillment: 'pickup',
      pickupSlotId: seedPickupSlots[0].id,
      fees: { subtotal: 145, serviceFee: 2.49, deliveryFee: 0, tax: 7.37, total: 154.86 },
      paymentMethodSnapshot: { brand: 'Visa', last4: '4242', name: 'Demo Customer' },
      addressSnapshot: { id: 'addr-home', label: 'Home', line1: '1234 Main St, Vancouver, BC', instructions: '' },
      notes: 'Blue writing on top',
      designSnapshot: { occasion: 'Birthday', cakeType: 'round', layerCount: 3 },
      createdAt: seedOrderCreatedAt,
    },
    {
      id: 'ord-2',
      shopId: 'shop-2',
      customerId: 'cust-1',
      customer: 'Avery',
      status: 'ready',
      assignedStaffId: 'staff-2',
      supportStatus: 'resolved',
      refundStatus: 'not_requested',
      total: 210,
      fulfillment: 'delivery',
      pickupSlotId: null,
      fees: { subtotal: 210, serviceFee: 2.49, deliveryFee: 7.99, tax: 11.02, total: 231.5 },
      paymentMethodSnapshot: { brand: 'Visa', last4: '4242', name: 'Demo Customer' },
      addressSnapshot: { id: 'addr-work', label: 'Work', line1: '880 West Pender St, Vancouver, BC', instructions: 'Lobby pickup if needed' },
      notes: 'Add extra berries to the topper',
      designSnapshot: { occasion: 'Anniversary', cakeType: 'heart', layerCount: 2 },
      createdAt: addDays(new Date(), -1).toISOString(),
    },
    {
      id: 'ord-3',
      shopId: 'shop-3',
      customerId: 'cust-1',
      customer: 'Jordan',
      status: 'baking',
      assignedStaffId: 'staff-3',
      supportStatus: 'monitoring',
      refundStatus: 'not_requested',
      total: 132,
      fulfillment: 'pickup',
      pickupSlotId: 'slot-6',
      fees: { subtotal: 132, serviceFee: 2.49, deliveryFee: 0, tax: 6.72, total: 141.21 },
      paymentMethodSnapshot: { brand: 'Visa', last4: '4242', name: 'Demo Customer' },
      addressSnapshot: { id: 'addr-home', label: 'Home', line1: '1234 Main St, Vancouver, BC', instructions: '' },
      notes: 'Keep packaging extra secure for courier handoff',
      designSnapshot: { occasion: 'Birthday', cakeType: 'round', layerCount: 2 },
      createdAt: addDays(new Date(), -2).toISOString(),
    },
  ],
  users: [
    { id: 'owner-1', email: 'owner@demo.com', role: 'owner', shopId: 'shop-1', managedShopIds: ['shop-1', 'shop-2', 'shop-3'], name: 'Demo Owner' },
    { id: 'staff-1', email: 'staff@demo.com', role: 'staff', shopId: 'shop-1', name: 'Demo Staff' },
    { id: 'staff-2', email: 'burnaby-staff@demo.com', role: 'staff', shopId: 'shop-2', name: 'Burnaby Lead' },
    { id: 'staff-3', email: 'richmond-staff@demo.com', role: 'staff', shopId: 'shop-3', name: 'Richmond Lead' },
    { id: 'cust-1', email: 'customer@demo.com', role: 'customer', shopId: 'shop-1', name: 'Demo Customer' },
    { id: 'admin-1', email: 'admin@platform.com', role: 'admin', shopId: null, name: 'Platform Admin' },
    { id: 'admin-2', email: 'ops@platform.com', role: 'admin', shopId: null, name: 'Ops Escalations Lead' },
  ],
  disputes: [
    {
      id: 'disp-1',
      shopId: 'shop-1',
      orderId: 'ord-1',
      status: 'open',
      reason: 'Pickup time clarification',
      resolution: '',
      refundStatus: 'not_requested',
      assignedAdminId: 'admin-1',
      assignedAt: addHours(new Date(), -19).toISOString(),
      assignedBy: 'admin-1',
      createdAt: seedOrderCreatedAt,
      lastMessageAt: addHours(new Date(), -20).toISOString(),
      lastMessagePreview: 'Customer asked whether pickup can slide by 30 minutes.',
      messages: [
        {
          id: 'dmsg-1',
          authorId: 'cust-1',
          authorRole: 'customer',
          body: 'Customer asked whether pickup can slide by 30 minutes.',
          visibility: 'customer',
          createdAt: addHours(new Date(), -20).toISOString(),
          kind: 'opened',
        },
        {
          id: 'dmsg-2',
          authorId: 'admin-1',
          authorRole: 'admin',
          body: 'Ops note: hold the slot and confirm decorator availability before replying.',
          visibility: 'internal',
          createdAt: addHours(new Date(), -19).toISOString(),
          kind: 'note',
        },
      ],
    },
  ],
  sessions: [],
}

export const orderStatuses = ['new', 'confirmed', 'baking', 'decorating', 'ready', 'picked_up', 'cancelled']

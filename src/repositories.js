function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function createRepositories(store) {
  function all(collection) {
    return clone(store.read()[collection] || [])
  }

  function findById(collection, id) {
    return all(collection).find((item) => item.id === id) || null
  }

  function save(collection, entity) {
    const state = store.read()
    const items = state[collection] || []
    const index = items.findIndex((item) => item.id === entity.id)
    if (index >= 0) items[index] = entity
    else items.push(entity)
    state[collection] = items
    store.write(state)
    return clone(entity)
  }

  function patch(collection, id, partial) {
    const state = store.read()
    const items = state[collection] || []
    const index = items.findIndex((item) => item.id === id)
    if (index < 0) return null
    items[index] = { ...items[index], ...partial }
    state[collection] = items
    store.write(state)
    return clone(items[index])
  }

  function remove(collection, id) {
    const state = store.read()
    const items = state[collection] || []
    const nextItems = items.filter((item) => item.id !== id)
    state[collection] = nextItems
    store.write(state)
    return items.length !== nextItems.length
  }

  function replaceAll(collection, nextItems) {
    const state = store.read()
    state[collection] = clone(nextItems)
    store.write(state)
    return clone(state[collection])
  }

  return {
    all,
    findById,
    save,
    patch,
    remove,
    replaceAll,
  }
}

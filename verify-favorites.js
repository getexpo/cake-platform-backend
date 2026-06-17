const base = 'http://localhost:4124'

async function json(response) {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`)
  }
  return data
}

async function run() {
  await json(await fetch(`${base}/api/dev/reset`, { method: 'POST' }))

  const login = await json(await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@demo.com', role: 'customer', name: 'Emma Johnson' }),
  }))

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${login.token}`,
  }

  const created = await json(await fetch(`${base}/api/designs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      shopId: 'shop-1',
      title: 'Favorite Test',
      summary: 'Round test',
      estimatedTotal: 88,
      config: { occasion: 'Birthday', mode: 'simple', cakeType: 'round', layerCount: 2, layers: [] },
    }),
  }))

  const favorited = await json(await fetch(`${base}/api/designs/${created.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ isFavorite: true }),
  }))

  const listed = await json(await fetch(`${base}/api/designs?shopId=shop-1`, {
    headers: { Authorization: `Bearer ${login.token}` },
  }))

  console.log(JSON.stringify({
    createdId: created.id,
    favorited: favorited.isFavorite,
    favoritesInList: listed.filter((item) => item.isFavorite).map((item) => item.id),
  }, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

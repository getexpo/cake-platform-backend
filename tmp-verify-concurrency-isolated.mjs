const ports = [4160, 4162]
const base = (port) => `http://localhost:${port}`

async function parse(res) {
  const text = await res.text()
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) }
  } catch {
    return { ok: res.ok, status: res.status, data: text }
  }
}

async function login(port, email, password) {
  const res = await fetch(`${base(port)}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const out = await parse(res)
  if (!out.ok) throw new Error(`login ${port}: ${out.status} ${JSON.stringify(out.data)}`)
  return out.data.token
}

async function createDesign(port, token, index) {
  const res = await fetch(`${base(port)}/api/designs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      shopId: 'shop-1',
      occasion: 'stress',
      size: '6-inch',
      style: 'modern',
      notes: `isolated-${port}-${index}`,
    }),
  })
  const out = await parse(res)
  if (!out.ok) throw new Error(`create ${port}/${index}: ${res.status} ${JSON.stringify(out.data)}`)
  return out.data.id
}

async function main() {
  for (const port of ports) {
    const reset = await fetch(`${base(port)}/api/dev/reset`, { method: 'POST' })
    const resetOut = await parse(reset)
    if (!resetOut.ok) throw new Error(`reset ${port} failed: ${reset.status} ${JSON.stringify(resetOut.data)}`)
  }

  const tasks = []
  for (let i = 0; i < 20; i += 1) {
    for (const port of ports) {
      tasks.push((async () => {
        const token = await login(port, 'customer@demo.com', 'demo123')
        return createDesign(port, token, i)
      })())
    }
  }

  const results = await Promise.allSettled(tasks)
  const failures = results.filter((result) => result.status === 'rejected')
  if (failures.length) {
    console.error(JSON.stringify(failures.map((failure) => String(failure.reason)), null, 2))
    process.exit(1)
  }

  console.log(`isolated parallel writes passed: ${results.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

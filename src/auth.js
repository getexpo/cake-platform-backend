function parseBearerToken(header = '') {
  const [type, token] = header.split(' ')
  return type === 'Bearer' ? token : null
}

export function createAuth({ repositories }) {
  function issueToken(user) {
    const token = `demo-${user.id}-${Date.now()}`
    const session = repositories.save('sessions', {
      id: `session-${Date.now()}`,
      token,
      userId: user.id,
      shopId: user.shopId || null,
      role: user.role,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    })
    return session
  }

  function resolveRequestUser(req) {
    const token = parseBearerToken(req.headers.authorization)
    if (!token) return null
    const session = repositories.all('sessions').find((item) => item.token === token)
    if (!session) return null
    repositories.patch('sessions', session.id, { lastSeenAt: new Date().toISOString() })
    const user = repositories.findById('users', session.userId)
    return user ? { ...user, sessionToken: token, sessionId: session.id } : null
  }

  function listSessionsForUser(user) {
    if (!user) return []
    return repositories.all('sessions')
      .filter((session) => session.userId === user.id)
      .sort((left, right) => new Date(right.lastSeenAt || right.createdAt || 0) - new Date(left.lastSeenAt || left.createdAt || 0))
  }

  function revokeSession({ actor, sessionId, scope = 'single' }) {
    if (!actor) return { error: { code: 401, body: { error: 'Authentication required' } } }

    const sessions = repositories.all('sessions')
    const target = sessions.find((session) => session.id === sessionId)
    if (!target) return { error: { code: 404, body: { error: 'Session not found' } } }
    if (actor.role !== 'admin' && target.userId !== actor.id) return { error: { code: 403, body: { error: 'Forbidden' } } }

    if (scope === 'others') {
      const remaining = sessions.filter((session) => !(session.userId === target.userId && session.id !== sessionId))
      repositories.replaceAll('sessions', remaining)
      return { revokedCount: sessions.length - remaining.length }
    }

    const removed = repositories.remove('sessions', sessionId)
    return { revokedCount: removed ? 1 : 0 }
  }

  function attachUser(req, _res, next) {
    req.user = resolveRequestUser(req)
    next()
  }

  function requireRoles(...roles) {
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' })
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden', allowedRoles: roles })
      }
      next()
    }
  }

  return {
    issueToken,
    attachUser,
    requireRoles,
    listSessionsForUser,
    revokeSession,
  }
}

import crypto from 'crypto'

const SECRET = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'agora-dev-secret'
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function issueToken() {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = String(exp)
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false
  const [exp, sig] = token.split('.')
  if (sign(exp) !== sig) return false
  return Number(exp) > Date.now()
}

export function requireAuth(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  return verifyToken(token)
}

import { ok, err, preflight } from './_shared.mjs'
import { issueToken } from './_auth.mjs'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405)

  let password
  try { ({ password } = JSON.parse(event.body || '{}')) } catch { return err('Invalid JSON', 400) }

  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return err('Admin login is not configured on the server', 500)
  if (!password || password !== expected) return err('Incorrect password', 401)

  return ok({ token: issueToken() })
}

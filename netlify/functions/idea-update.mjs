import { ideaStore, ok, err, preflight } from './_shared.mjs'
import { requireAuth } from './_auth.mjs'

const VALID_STATUSES = ['new', 'reviewing', 'in_progress', 'done']

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405)
  if (!requireAuth(event)) return err('Unauthorized', 401)

  let id, status, statusNote
  try { ({ id, status, statusNote } = JSON.parse(event.body || '{}')) } catch { return err('Invalid JSON', 400) }
  if (!id) return err('Missing id', 400)
  if (status && !VALID_STATUSES.includes(status)) return err('Invalid status', 400)

  try {
    const store = ideaStore()
    const record = await store.get(id, { type: 'json' })
    if (!record) return err('Idea not found', 404)

    if (status) record.status = status
    if (statusNote !== undefined) record.statusNote = statusNote
    record.updatedAt = new Date().toISOString()

    await store.setJSON(id, record)
    return ok({ idea: record })
  } catch (e) {
    return err(e.message)
  }
}

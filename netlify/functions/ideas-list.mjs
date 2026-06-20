import { ideaStore, ok, err, preflight } from './_shared.mjs'
import { requireAuth } from './_auth.mjs'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  if (!requireAuth(event)) return err('Unauthorized', 401)

  try {
    const store = ideaStore()
    const { blobs } = await store.list()
    const ideas = await Promise.all(blobs.map(b => store.get(b.key, { type: 'json' })))
    ideas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return ok({ ideas })
  } catch (e) {
    return err(e.message)
  }
}

import { tavilySearch, ok, err, preflight } from './_shared.mjs'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()

  const q = event.queryStringParameters?.q || ''
  if (!q || q.trim().length < 8) return ok({ hints: [] })

  try {
    const results = await tavilySearch(q.replace(/^Claim:\s*/i, '').trim(), { depth: 'basic', max: 3 })
    return ok({
      hints: results.slice(0, 3).map(r => ({
        title: r.title,
        snippet: (r.content || '').slice(0, 140) + '…',
      })),
    })
  } catch {
    return ok({ hints: [] })
  }
}

import { groq, ideaStore, ok, err, preflight } from './_shared.mjs'
import { requireAuth } from './_auth.mjs'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  if (!requireAuth(event)) return err('Unauthorized', 401)

  try {
    const store = ideaStore()
    const { blobs } = await store.list()
    const ideas = await Promise.all(blobs.map(b => store.get(b.key, { type: 'json' })))

    if (ideas.length === 0) return ok({ report: null, ideaCount: 0 })

    const byTheme = {}
    ideas.forEach(i => {
      byTheme[i.theme] = byTheme[i.theme] || []
      byTheme[i.theme].push(i)
    })

    const themeSummaries = Object.entries(byTheme).map(([theme, list]) => {
      const lines = list.map(i =>
        `- "${i.claimText}" (status: ${i.status}${i.citizenName ? `, submitted by ${i.citizenName}` : ''})`
      ).join('\n')
      return `### ${theme} (${list.length} ideas)\n${lines}`
    }).join('\n\n')

    const prompt = `You are a civic analyst preparing a monthly municipal report from citizen-submitted ideas collected on Agora, a civic platform.

ALL SUBMITTED IDEAS, GROUPED BY THEME:
${themeSummaries}

Write a concise executive synthesis for municipal staff. Identify recurring concerns, group similar ideas together even across themes if they relate, and suggest priorities.

Respond ONLY with valid JSON (no markdown):
{
  "executiveSummary": "3-4 sentences summarizing the month's citizen input overall",
  "topThemes": [
    {"theme": "Urban", "count": 4, "insight": "One sentence on what citizens are asking for in this theme"},
    {"theme": "Energy", "count": 2, "insight": "..."}
  ],
  "recurringConcerns": ["Concern appearing across multiple submissions", "Second recurring concern"],
  "recommendedPriorities": ["Priority action 1 for the council", "Priority action 2", "Priority action 3"],
  "clusters": [
    {"title": "Short label for a group of related ideas", "relatedClaims": ["exact claim text 1", "exact claim text 2"]}
  ]
}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const rawText = completion.choices[0]?.message?.content?.trim() || ''
    let report
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      report = JSON.parse(m ? m[0] : rawText)
    } catch {
      report = null
    }

    const statusCounts = ideas.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1
      return acc
    }, {})

    return ok({
      report,
      ideaCount: ideas.length,
      statusCounts,
      themeCounts: Object.fromEntries(Object.entries(byTheme).map(([k, v]) => [k, v.length])),
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return err(e.message)
  }
}

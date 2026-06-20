import { groq, ideaStore, ok, err, preflight } from './_shared.mjs'

const THEMES = ['Urban', 'Energy', 'Climate', 'Health', 'Education', 'Safety', 'Transport', 'Economy', 'Other']

async function tagTheme(claim) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Classify this citizen idea into exactly one theme from this list: ${THEMES.join(', ')}.\nIdea: "${claim}"\nRespond with only the theme word, nothing else.`,
      }],
      temperature: 0,
      max_tokens: 10,
    })
    const word = completion.choices[0]?.message?.content?.trim()
    return THEMES.includes(word) ? word : 'Other'
  } catch {
    return 'Other'
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405)

  let claimText, citizenName, result, detectedLanguage
  try {
    ({ claimText, citizenName, result, detectedLanguage } = JSON.parse(event.body || '{}'))
  } catch { return err('Invalid JSON', 400) }
  if (!claimText?.trim() || !result) return err('Missing claimText or result', 400)

  const theme = await tagTheme(claimText)
  const id = `idea_${Date.now()}_${Math.floor(Math.random() * 10000)}`

  const record = {
    id,
    claimText,
    citizenName: citizenName?.trim() || null,
    detectedLanguage: detectedLanguage || 'en',
    theme,
    status: 'new', // new | reviewing | in_progress | done
    statusNote: '',
    createdAt: new Date().toISOString(),
    result,
  }

  try {
    const store = ideaStore()
    await store.setJSON(id, record)
    return ok({ id, theme })
  } catch (e) {
    return err(e.message)
  }
}

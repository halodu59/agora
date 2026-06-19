import { groq, ok, err, preflight } from './_shared.mjs'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405)

  let claim, message, history, detectedLanguage
  try {
    ({ claim, message, history = [], detectedLanguage = 'en' } = JSON.parse(event.body || '{}'))
  } catch { return err('Invalid JSON', 400) }
  if (!message?.trim()) return err('No message', 400)

  const messages = [
    {
      role: 'system',
      content: `You are a warm, supportive civic companion. The user is a regular citizen who submitted this idea: "${claim}". Help them refine it, understand it better, and feel empowered to act. Respond in "${detectedLanguage}". Be concise, friendly, and practical. Give specific talking points or concrete next steps.`,
    },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ]

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.5,
      max_tokens: 600,
    })
    const reply = completion.choices[0]?.message?.content?.trim() || 'I could not generate a response.'
    return ok({ reply })
  } catch (e) {
    return err(e.message)
  }
}

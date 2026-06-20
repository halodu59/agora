import { groq, ok, err, preflight } from './_shared.mjs'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405)

  let claim, previousResult, instruction, detectedLanguage
  try {
    ({ claim, previousResult, instruction, detectedLanguage = 'en' } = JSON.parse(event.body || '{}'))
  } catch { return err('Invalid JSON', 400) }
  if (!instruction?.trim()) return err('No instruction', 400)
  if (!previousResult) return err('No previousResult', 400)

  const prompt = `You are refining an existing civic dossier based on the user's feedback. Keep everything anchored to the ORIGINAL CLAIM and stay consistent with the previous version unless the requested change implies otherwise.

ORIGINAL CLAIM:
"${claim}"

PREVIOUS VERSION (JSON):
${JSON.stringify({
    verdict: previousResult.verdict, verdictStyle: previousResult.verdictStyle,
    verdictSimple: previousResult.verdictSimple, confidence: previousResult.confidence,
    simpleSummary: previousResult.simpleSummary, synthesisText: previousResult.synthesisText,
    proArguments: previousResult.proArguments, conArguments: previousResult.conArguments,
    civicDossier: previousResult.civicDossier,
  })}

USER'S REQUESTED CHANGE:
"${instruction}"

RULES:
1. Respond ENTIRELY in this language: "${detectedLanguage}"
2. Apply the requested change precisely. Keep unrelated fields the same as the previous version unless the change naturally affects them.
3. Stay anchored to the user's original claim — never drift to generic content.
4. changeSummary must be ONE short sentence (max 14 words) describing what you changed, in the user's language.

Respond ONLY with valid JSON (no markdown), same shape as the previous version, plus changeSummary:
{
  "changeSummary": "Shortened the letter and added a cost estimate.",
  "detectedLanguage": "${detectedLanguage}",
  "verdict": "...", "verdictStyle": "...", "verdictSimple": "...", "confidence": 72,
  "simpleSummary": "...", "synthesisText": "...",
  "proArguments": ["..."], "conArguments": ["..."],
  "civicDossier": {
    "proposalTitle": "...", "executiveSummary": "...",
    "keyEvidence": [{"stat":"45","unit":"%","label":"...","source":"..."}],
    "scientificConsensus": "...", "actionSteps": ["..."], "stakeholders": ["..."],
    "petitionText": "...", "expectedImpact": "..."
  }
}`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2800,
    })
    const rawText = completion.choices[0]?.message?.content?.trim() || ''
    let updated
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      updated = JSON.parse(m ? m[0] : rawText)
    } catch {
      return err('Could not parse refinement', 500)
    }
    return ok({
      ...updated,
      sources: previousResult.sources || [],
      eduResources: previousResult.eduResources || [],
    })
  } catch (e) {
    return err(e.message)
  }
}

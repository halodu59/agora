import { groq, tavilySearch, categorizeSource, extractKeyTerms, ok, err, preflight } from './_shared.mjs'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight()
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405)

  let claim
  try { ({ claim } = JSON.parse(event.body || '{}')) } catch { return err('Invalid JSON', 400) }
  if (!claim?.trim()) return err('No claim provided', 400)

  const cleanClaim = claim.replace(/^Claim:\s*/i, '').trim()
  const keyTerms   = extractKeyTerms(cleanClaim)

  try {
    const [factResults, eduResults] = await Promise.allSettled([
      tavilySearch(cleanClaim, {
        depth: 'advanced', max: 8,
        domains: [
          'scholar.google.com','pubmed.ncbi.nlm.nih.gov','nature.com','science.org',
          'who.int','un.org','worldbank.org','oecd.org','europa.eu','ipcc.ch','iea.org',
          'gov.uk','gouv.fr','reuters.com','bbc.co.uk','theguardian.com','economist.com',
          'wikipedia.org','cepal.org','lemonde.fr','ft.com','apnews.com',
        ],
      }),
      tavilySearch(`${keyTerms} explained simply guide video`, {
        depth: 'basic', max: 5,
        domains: [
          'ted.com','youtube.com','vox.com','bbc.co.uk','theconversation.com',
          'khanacademy.org','nationalgeographic.com','smithsonianmag.com','wired.com',
        ],
      }),
    ])

    const rawFact = factResults.status === 'fulfilled' ? factResults.value : []
    const rawEdu  = eduResults.status  === 'fulfilled' ? eduResults.value  : []

    const allSources = rawFact
      .filter(r => r.content?.length > 80)
      .map((r, i) => ({
        id: `TAV-${i}`, title: r.title || 'Untitled',
        category: categorizeSource(r.url),
        snippet: r.content.slice(0, 450),
        url: r.url || null,
        matchConfidence: `${Math.min(99, Math.round((r.score || 0.7) * 100))}%`,
      }))

    const eduResources = rawEdu
      .filter(r => r.url && r.title)
      .slice(0, 4)
      .map(r => ({
        title: r.title,
        url: r.url,
        snippet: (r.content || '').slice(0, 180),
        host: (() => { try { return new URL(r.url).hostname.replace('www.', '') } catch { return r.url } })(),
      }))

    const sourceSummaries = allSources.length > 0
      ? allSources.map(s => `[${s.title}] (${s.category}): ${s.snippet.slice(0, 300)}`).join('\n\n')
      : 'No sources found. Use your general knowledge but stay very close to what the user said.'

    const prompt = `You are a warm, knowledgeable civic companion helping ordinary citizens understand issues and make their voice heard by decision-makers.

THE USER'S EXACT WORDS (stay anchored to THIS — do not drift to generic topics):
"${cleanClaim}"

EVIDENCE FOUND ONLINE:
${sourceSummaries}

RULES:
1. Detect the language of the user's message → respond ENTIRELY in that language
2. ALWAYS reference the user's exact words — never go generic
3. Write clearly, no jargon
4. For keyEvidence: extract REAL numbers from sources. stat = the number only (e.g. "45"), unit = the unit (e.g. "%"), label = what it measures, source = citation.
5. simpleSummary must be ONE sentence directly about THEIR claim

Respond ONLY with valid JSON (no markdown):
{
  "detectedLanguage": "en",
  "verdict": "NUANCED / CONFLICTING DATA",
  "verdictStyle": "nuance",
  "verdictSimple": "One plain sentence verdict (in user's language)",
  "confidence": 72,
  "simpleSummary": "One sentence referencing their specific idea (in user's language)",
  "synthesisText": "2-3 sentences of evidence tied to their claim (in user's language)",
  "proArguments": ["Specific argument FOR their idea (in user's language)", "Second", "Third"],
  "conArguments": ["Specific concern ABOUT their idea (in user's language)", "Second", "Third"],
  "civicDossier": {
    "proposalTitle": "Formal proposal title (in user's language)",
    "executiveSummary": "3-4 sentences for decision-makers (in user's language)",
    "keyEvidence": [
      {"stat": "45", "unit": "%", "label": "What this number measures", "source": "Source name · year"},
      {"stat": "12", "unit": "km²", "label": "Second data point", "source": "Source · year"},
      {"stat": "2.4", "unit": "°C", "label": "Third data point", "source": "Source · year"}
    ],
    "scientificConsensus": "2-3 sentences on what experts say (in user's language)",
    "actionSteps": ["Step 1", "Step 2", "Step 3", "Step 4"],
    "stakeholders": ["Decision-maker 1", "Stakeholder 2", "Stakeholder 3"],
    "petitionText": "Ready-to-send letter in first person with 1-2 data points and a specific ask (in user's language)",
    "expectedImpact": "2 sentences on what could realistically change (in user's language)"
  }
}

verdictStyle options: "verified" | "nuance" | "alert" | "muted"`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2800,
    })

    const rawText = completion.choices[0]?.message?.content?.trim() || ''
    let analysis
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(m ? m[0] : rawText)
    } catch {
      analysis = {
        detectedLanguage: 'en', verdict: 'UNRESOLVED', verdictStyle: 'muted',
        verdictSimple: 'Analysis encountered an error.', confidence: 40,
        simpleSummary: 'Please try again.',
        synthesisText: '', proArguments: [], conArguments: [],
        civicDossier: null,
      }
    }

    return ok({ ...analysis, sources: allSources, eduResources })
  } catch (e) {
    console.error('factcheck error:', e)
    return err(e.message)
  }
}

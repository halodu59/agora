import express from 'express'
import cors from 'cors'
import Groq from 'groq-sdk'

const app = express()
app.use(cors())
app.use(express.json())

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const TAVILY_KEY = process.env.TAVILY_API_KEY

function extractKeyTerms(text) {
  const stopwords = new Set([
    'the','a','an','is','are','was','were','will','would','could','should',
    'that','this','these','those','it','its','of','in','on','at','to','for',
    'and','or','but','not','be','by','with','from','as','have','has','had',
    'do','does','did','can','may','might','within','about','more','than',
    'their','they','there','when','where','how','what','which','who','all',
    'el','la','los','las','un','una','de','en','es','por','para','con','que',
    'le','les','du','des','est','sont','une','pour','dans','sur','avec','qui',
    'claim','says','said','percent','year','years','creo','pense','necesita','besoin'
  ])
  return text.toLowerCase().replace(/[^a-z0-9\sàáâãäèéêëìíîïòóôõöùúûüñç]/g,' ')
    .split(/\s+/).filter(w => w.length > 3 && !stopwords.has(w)).slice(0, 5).join(' ')
}

async function tavilySearch(query, opts = {}) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      search_depth: opts.depth || 'advanced',
      max_results: opts.max || 7,
      include_domains: opts.domains || [],
      exclude_domains: opts.exclude || [],
    })
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.results || []
}

function categorizeSource(url = '') {
  if (/pubmed|ncbi|nature\.com|science\.org|thelancet|nejm|bmj|arxiv|jstor|researchgate|semanticscholar/.test(url)) return 'Peer-Reviewed'
  if (/who\.int|un\.org|worldbank|oecd\.org|europa\.eu|ipcc|iea\.org|cepal|eclac/.test(url)) return 'International Institution'
  if (/\.gov|gouv\.fr|gouvernement|legifrance|insee|eurostat/.test(url)) return 'Government'
  if (/wikipedia\.org/.test(url)) return 'Wikipedia'
  if (/reuters|bbc|lemonde|guardian|economist|ft\.com|apnews/.test(url)) return 'Verified Press'
  if (/ted\.com|youtube\.com|vox\.com|kurzgesagt|explainer|khanacademy/.test(url)) return 'Educational'
  return 'Web Source'
}

// ── MAIN FACTCHECK ──────────────────────────────────────────────
app.post('/api/factcheck', async (req, res) => {
  const { claim } = req.body
  if (!claim?.trim()) return res.status(400).json({ error: 'No claim provided' })

  const cleanClaim = claim.replace(/^Claim:\s*/i, '').trim()
  const keyTerms = extractKeyTerms(cleanClaim)

  try {
    // Parallel: fact sources + educational resources
    const [factResults, eduResults] = await Promise.allSettled([
      tavilySearch(cleanClaim, {
        depth: 'advanced', max: 8,
        domains: [
          'scholar.google.com','pubmed.ncbi.nlm.nih.gov','nature.com','science.org',
          'who.int','un.org','worldbank.org','oecd.org','europa.eu','ipcc.ch','iea.org',
          'gov.uk','gouv.fr','reuters.com','bbc.co.uk','theguardian.com','economist.com',
          'wikipedia.org','cepal.org','lemonde.fr','ft.com','apnews.com'
        ]
      }),
      tavilySearch(`${keyTerms} explained simply beginner guide video`, {
        depth: 'basic', max: 5,
        domains: ['ted.com','youtube.com','vox.com','bbc.co.uk','theconversation.com',
                  'khanacademy.org','scienceforlife.net','explainer','howstuffworks.com',
                  'nationalgeographic.com','smithsonianmag.com','wired.com']
      })
    ])

    const rawFact = factResults.status === 'fulfilled' ? factResults.value : []
    const rawEdu  = eduResults.status  === 'fulfilled' ? eduResults.value  : []

    const allSources = rawFact
      .filter(r => r.content?.length > 80)
      .map((r, i) => ({
        id: `TAV-${i}`, title: r.title || 'Untitled',
        category: categorizeSource(r.url),
        snippet: r.content.slice(0, 450), fullText: r.content,
        url: r.url || null,
        matchConfidence: `${Math.min(99, Math.round((r.score||0.7)*100))}%`,
        author: (() => { try { return new URL(r.url).hostname.replace('www.','') } catch { return '' } })(),
        date: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        vectorCoords: { x: Math.round(15+Math.random()*65), y: Math.round(15+Math.random()*65) }
      }))

    // Educational resources: pass directly to frontend (real URLs, no AI hallucination)
    const eduResources = rawEdu
      .filter(r => r.url && r.title)
      .slice(0, 4)
      .map(r => ({
        title: r.title,
        url: r.url,
        snippet: (r.content || '').slice(0, 180),
        host: (() => { try { return new URL(r.url).hostname.replace('www.','') } catch { return r.url } })()
      }))

    const sourceSummaries = allSources.length > 0
      ? allSources.map(s => `[${s.title}] (${s.category}): ${s.snippet.slice(0,300)}`).join('\n\n')
      : 'No sources found. Use your general knowledge but stay very close to what the user said.'

    const prompt = `You are a warm, knowledgeable civic companion helping ordinary citizens — regardless of education — understand issues and make their voice heard by decision-makers.

THE USER'S EXACT WORDS (stay anchored to THIS throughout — do not drift to generic topics):
"${cleanClaim}"

EVIDENCE FOUND ONLINE:
${sourceSummaries}

RULES:
1. Detect the language of the user's message → respond ENTIRELY in that language (same language as their input)
2. ALWAYS reference the user's exact words or specific situation — never become generic
3. Write like a warm, knowledgeable neighbor — clear, no jargon, no academic tone
4. For the civic dossier (reformulation): extract REAL statistics and data from the sources above — quote specific numbers, dates, institutions. If sources have none, use well-known global statistics on the topic.
5. simpleSummary must be ONE sentence directly about THEIR specific claim

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "detectedLanguage": "es",
  "verdict": "NUANCED / CONFLICTING DATA",
  "verdictStyle": "nuance",
  "verdictSimple": "One plain sentence verdict about their specific claim (in user's language)",
  "confidence": 72,
  "simpleSummary": "One sentence in plain language referencing their specific idea (in user's language)",
  "synthesisText": "2-3 sentences of evidence directly tied to their claim — not generic (in user's language)",
  "highlights": ["key phrase from synthesisText"],
  "proArguments": [
    "Specific argument FOR their exact idea with a concrete fact or example (in user's language)",
    "Second argument with data if possible",
    "Third argument"
  ],
  "conArguments": [
    "Specific concern ABOUT their idea with nuance (in user's language)",
    "Second concern",
    "Third concern"
  ],
  "civicDossier": {
    "proposalTitle": "Formal, compelling title for their proposal (in user's language)",
    "executiveSummary": "3-4 sentences presenting their idea as a formal civic proposal, speaking to decision-makers (in user's language)",
    "keyEvidence": [
      {"stat": "45", "unit": "%", "label": "One-line description of what this number measures", "source": "Source name · year"},
      {"stat": "12", "unit": "km²", "label": "Second data point description", "source": "Source · year"},
      {"stat": "2.4", "unit": "°C", "label": "Third data point description", "source": "Source · year"}
    ],
    "scientificConsensus": "2-3 sentences on what science/research says about this specific topic (in user's language)",
    "actionSteps": [
      "Concrete step 1 the user can take to advance this proposal",
      "Step 2 — who to contact and how",
      "Step 3 — what document to write or sign",
      "Step 4 — how to build local support"
    ],
    "stakeholders": [
      "Decision-maker or institution 1 most relevant to their claim",
      "Stakeholder 2",
      "Stakeholder 3"
    ],
    "petitionText": "Ready-to-send paragraph the user can copy and paste into a letter or petition to local authorities. It should clearly state their demand, cite 1-2 data points, and ask for a specific action. Written in first person. (in user's language)",
    "expectedImpact": "2 sentences on what realistically could change if this proposal is adopted (in user's language)"
  }
}

Verdict options: "VERIFIED / ACCURATE"+"verified" | "NUANCED / CONFLICTING DATA"+"nuance" | "MISLEADING / FALSE"+"alert" | "UNRESOLVED / INSUFFICIENT DATA"+"muted"`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, max_tokens: 2800,
    })
    const rawText = completion.choices[0]?.message?.content?.trim() || ''

    let analysis
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(m ? m[0] : rawText)
    } catch {
      analysis = {
        detectedLanguage: 'en', verdict: 'UNRESOLVED / INSUFFICIENT DATA', verdictStyle: 'muted',
        verdictSimple: 'We could not fully analyze this.', confidence: 40,
        simpleSummary: 'Analysis encountered an error. Please try again.',
        synthesisText: '', highlights: [], proArguments: [], conArguments: [],
        reformulation: null, learningResources: []
      }
    }

    res.json({ ...analysis, sources: allSources, eduResources })
  } catch (err) {
    console.error('Factcheck error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── CHAT / ITERATION ─────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { claim, message, history = [], detectedLanguage = 'en' } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'No message' })

  const messages = [
    {
      role: 'system',
      content: `You are a warm, supportive civic companion. The user is a regular citizen (not an expert) who submitted this original idea: "${claim}". Help them refine it, understand it better, and feel empowered to act. Always respond in "${detectedLanguage}". Be concise, friendly, and practical. Never be condescending. When they ask to strengthen their argument, give them specific talking points. When they ask what to do, give concrete next steps.`
    },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ]

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.5, max_tokens: 600,
    })
    const reply = completion.choices[0]?.message?.content?.trim() || 'I could not generate a response.'
    res.json({ reply })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── QUICK HINTS ──────────────────────────────────────────────────
app.get('/api/quickhints', async (req, res) => {
  const { q } = req.query
  if (!q || q.trim().length < 8) return res.json({ hints: [] })
  try {
    const results = await tavilySearch(q.replace(/^Claim:\s*/i,'').trim(), { depth: 'basic', max: 3 })
    res.json({ hints: results.slice(0,3).map(r => ({ title: r.title, snippet: (r.content||'').slice(0,140)+'...' })) })
  } catch { res.json({ hints: [] }) }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n🏛  Agora Civic Companion — http://localhost:${PORT}`)
  console.log(`   ✅ Tavily web search (facts + educational resources)`)
  console.log(`   ✅ Chat / iteration endpoint`)
  console.log(`   ✅ Multilingual auto-detect\n`)
})

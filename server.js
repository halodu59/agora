import express from 'express'
import cors from 'cors'
import Groq from 'groq-sdk'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const app = express()
app.use(cors())
app.use(express.json())

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const TAVILY_KEY = process.env.TAVILY_API_KEY

// ── Local idea store (JSON file) — mirrors Netlify Blobs in production ──
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const IDEAS_FILE = path.join(DATA_DIR, 'ideas.json')

function readIdeas() {
  if (!fs.existsSync(IDEAS_FILE)) return []
  try { return JSON.parse(fs.readFileSync(IDEAS_FILE, 'utf-8')) } catch { return [] }
}
function writeIdeas(ideas) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(IDEAS_FILE, JSON.stringify(ideas, null, 2))
}

// ── Admin auth (stateless HMAC token, mirrors netlify/functions/_auth.mjs) ──
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'agora-dev-secret'
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
function signToken(payload) { return crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex') }
function issueToken() { const exp = Date.now() + TOKEN_TTL_MS; const p = String(exp); return `${p}.${signToken(p)}` }
function verifyToken(token) {
  if (!token || !token.includes('.')) return false
  const [exp, sig] = token.split('.')
  return signToken(exp) === sig && Number(exp) > Date.now()
}
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

const THEMES = ['Urban', 'Energy', 'Climate', 'Health', 'Education', 'Safety', 'Transport', 'Economy', 'Other']
async function tagTheme(claim) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: `Classify this citizen idea into exactly one theme from this list: ${THEMES.join(', ')}.\nIdea: "${claim}"\nRespond with only the theme word, nothing else.` }],
      temperature: 0, max_tokens: 10,
    })
    const word = completion.choices[0]?.message?.content?.trim()
    return THEMES.includes(word) ? word : 'Other'
  } catch { return 'Other' }
}

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

// ── REFINE (structured re-analysis, keeps version history) ───────
app.post('/api/refine', async (req, res) => {
  const { claim, previousResult, instruction, detectedLanguage = 'en' } = req.body
  if (!instruction?.trim()) return res.status(400).json({ error: 'No instruction' })
  if (!previousResult) return res.status(400).json({ error: 'No previousResult' })

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
      temperature: 0.3, max_tokens: 2800,
    })
    const rawText = completion.choices[0]?.message?.content?.trim() || ''
    let updated
    try {
      const m = rawText.match(/\{[\s\S]*\}/)
      updated = JSON.parse(m ? m[0] : rawText)
    } catch {
      return res.status(500).json({ error: 'Could not parse refinement' })
    }
    res.json({
      ...updated,
      sources: previousResult.sources || [],
      eduResources: previousResult.eduResources || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── ADMIN LOGIN ─────────────────────────────────────────────────────
app.post('/api/admin-login', (req, res) => {
  const { password } = req.body
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return res.status(500).json({ error: 'Admin login is not configured on the server' })
  if (!password || password !== expected) return res.status(401).json({ error: 'Incorrect password' })
  res.json({ token: issueToken() })
})

// ── SUBMIT IDEA (citizen → mairie) ────────────────────────────────
app.post('/api/submit-idea', async (req, res) => {
  const { claimText, citizenName, result, detectedLanguage } = req.body
  if (!claimText?.trim() || !result) return res.status(400).json({ error: 'Missing claimText or result' })

  const theme = await tagTheme(claimText)
  const id = `idea_${Date.now()}_${Math.floor(Math.random() * 10000)}`
  const record = {
    id, claimText, citizenName: citizenName?.trim() || null,
    detectedLanguage: detectedLanguage || 'en', theme,
    status: 'new', statusNote: '',
    createdAt: new Date().toISOString(), result,
  }
  const ideas = readIdeas()
  ideas.push(record)
  writeIdeas(ideas)
  res.json({ id, theme })
})

// ── LIST IDEAS (mairie dashboard) ─────────────────────────────────
app.get('/api/ideas-list', requireAuth, (req, res) => {
  const ideas = readIdeas().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ ideas })
})

// ── UPDATE IDEA STATUS ─────────────────────────────────────────────
app.post('/api/idea-update', requireAuth, (req, res) => {
  const { id, status, statusNote } = req.body
  if (!id) return res.status(400).json({ error: 'Missing id' })
  const ideas = readIdeas()
  const idx = ideas.findIndex(i => i.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Idea not found' })
  if (status) ideas[idx].status = status
  if (statusNote !== undefined) ideas[idx].statusNote = statusNote
  ideas[idx].updatedAt = new Date().toISOString()
  writeIdeas(ideas)
  res.json({ idea: ideas[idx] })
})

// ── SYNTHESIZE MONTHLY REPORT ──────────────────────────────────────
app.get('/api/synthesize-report', requireAuth, async (req, res) => {
  const ideas = readIdeas()
  if (ideas.length === 0) return res.json({ report: null, ideaCount: 0 })

  const byTheme = {}
  ideas.forEach(i => { byTheme[i.theme] = byTheme[i.theme] || []; byTheme[i.theme].push(i) })
  const themeSummaries = Object.entries(byTheme).map(([theme, list]) => {
    const lines = list.map(i => `- "${i.claimText}" (status: ${i.status}${i.citizenName ? `, submitted by ${i.citizenName}` : ''})`).join('\n')
    return `### ${theme} (${list.length} ideas)\n${lines}`
  }).join('\n\n')

  const prompt = `You are a civic analyst preparing a monthly municipal report from citizen-submitted ideas collected on Agora, a civic platform.

ALL SUBMITTED IDEAS, GROUPED BY THEME:
${themeSummaries}

Write a concise executive synthesis for municipal staff. Identify recurring concerns, group similar ideas together even across themes if they relate, and suggest priorities.

Respond ONLY with valid JSON (no markdown):
{
  "executiveSummary": "3-4 sentences summarizing the month's citizen input overall",
  "topThemes": [{"theme": "Urban", "count": 4, "insight": "One sentence on what citizens are asking for"}],
  "recurringConcerns": ["Concern appearing across multiple submissions"],
  "recommendedPriorities": ["Priority action 1 for the council", "Priority action 2"],
  "clusters": [{"title": "Short label for related ideas", "relatedClaims": ["exact claim text 1", "exact claim text 2"]}]
}`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, max_tokens: 2000,
    })
    const rawText = completion.choices[0]?.message?.content?.trim() || ''
    let report
    try { const m = rawText.match(/\{[\s\S]*\}/); report = JSON.parse(m ? m[0] : rawText) } catch { report = null }

    const statusCounts = ideas.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc }, {})
    res.json({
      report, ideaCount: ideas.length, statusCounts,
      themeCounts: Object.fromEntries(Object.entries(byTheme).map(([k, v]) => [k, v.length])),
      generatedAt: new Date().toISOString(),
    })
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

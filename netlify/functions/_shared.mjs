import Groq from 'groq-sdk'
import { getStore } from '@netlify/blobs'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export function ideaStore() {
  return getStore('agora-ideas')
}

export const TAVILY_KEY = process.env.TAVILY_API_KEY

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export function ok(body) {
  return { statusCode: 200, headers: CORS, body: JSON.stringify(body) }
}

export function err(msg, code = 500) {
  return { statusCode: code, headers: CORS, body: JSON.stringify({ error: msg }) }
}

export function preflight() {
  return { statusCode: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS' }, body: '' }
}

export function extractKeyTerms(text) {
  const stopwords = new Set([
    'the','a','an','is','are','was','were','will','would','could','should',
    'that','this','these','those','it','its','of','in','on','at','to','for',
    'and','or','but','not','be','by','with','from','as','have','has','had',
    'do','does','did','can','may','might','within','about','more','than',
    'their','they','there','when','where','how','what','which','who','all',
    'el','la','los','las','un','una','de','en','es','por','para','con','que',
    'le','les','du','des','est','sont','une','pour','dans','sur','avec','qui',
    'claim','says','said','percent','year','years','creo','pense','necesita','besoin',
  ])
  return text.toLowerCase()
    .replace(/[^a-z0-9\sàáâãäèéêëìíîïòóôõöùúûüñç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w))
    .slice(0, 5).join(' ')
}

export async function tavilySearch(query, opts = {}) {
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
    }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.results || []
}

export function categorizeSource(url = '') {
  if (/pubmed|ncbi|nature\.com|science\.org|thelancet|nejm|bmj|arxiv|jstor|researchgate|semanticscholar/.test(url)) return 'Peer-Reviewed'
  if (/who\.int|un\.org|worldbank|oecd\.org|europa\.eu|ipcc|iea\.org|cepal|eclac/.test(url)) return 'International Institution'
  if (/\.gov|gouv\.fr|gouvernement|legifrance|insee|eurostat/.test(url)) return 'Government'
  if (/wikipedia\.org/.test(url)) return 'Wikipedia'
  if (/reuters|bbc|lemonde|guardian|economist|ft\.com|apnews/.test(url)) return 'Verified Press'
  if (/ted\.com|youtube\.com|vox\.com|kurzgesagt|khanacademy/.test(url)) return 'Educational'
  return 'Web Source'
}

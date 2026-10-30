# Current GitHub implementation — source inspection

**Repository:** `halodu59/agora` (public); inspected on 2026-10-30. This is a *code inspection only*, not a deployed-system audit or successful test run.

## Observed sources

| Location | Evidence in repository |
| --- | --- |
| `package.json` | React 19, Vite 5, Express 5; scripts: dev, server, lint, build, preview |
| `src/App.jsx` | Civic-facing interface including fact-check workflow, revisions, PDF and idea submission state |
| `src/AdminDashboard.jsx` | Municipal administration interface |
| `server.js` | Express local API, AI requests, local JSON data persistence and administrative authentication |
| `netlify.toml` | Netlify build, functions, API routes and SPA fallback |
| `vite.config.js` | Local development proxy `/api` to `http://localhost:3001` |
| `package-lock.json` | npm dependency lockfile |

## Findings / limitations

- The current app is not by itself a SUMO/JuPedSim urban simulation or a full Resilient Agora governance loop.
- No `.env.example` was found at the root when checked; exact environment requirements need documenting.
- `server.js` contains a fallback development HMAC signing secret (`agora-dev-secret`). Check the deployment configuration and remove this unsafe fallback before relying on authentication in production.
- External AI model behaviour is not reproducible solely from `package-lock.json`; record each model ID, prompt, input version, API parameters and output.
- No test results, performance, user research or ethics status are claimed here.

## Next checks

1. Inventory all live AI and search endpoints and server-side environment variables.
2. Pin Node version and verify `npm ci`, `npm run build` and `npm run lint`.
3. Design a separate simulation service / documented data boundary; do not equate fact-checking with transport simulation.
4. Identify existing AI-generated code artefacts and map them to accessible source prompts.
5. Keep sensitive participant records outside this public repository.

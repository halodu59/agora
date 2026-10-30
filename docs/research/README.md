# Research documentation — Agora / Resilient Agora

**Status: research-documentation scaffold, 30 October 2026.**

This directory documents a potential research extension of the existing Agora civic fact-checking and participation prototype. It must not be read as evidence that the Oxford dissertation's urban simulations, human-subject evaluation or governance experiment have been completed.

## Distinguish existing software from proposed dissertation work

**Existing code (inspected, not independently executed):**
- Front end: React 19 + Vite 5, civic-facing interface and administrative dashboard.
- Local backend: Express 5 (`server.js`).
- Hosting configuration: Netlify functions and redirects (`netlify.toml`).
- Dependencies include multiple hosted AI SDKs. A dependency is not evidence that a model was used in a particular experiment.

**Research plan (not implemented by this documentation):**
- Neighbourhood-scale mobility scenarios using SUMO / JuPedSim.
- Comparison of a conventional simulation + AI recommendation workflow with a bounded civic deliberation / constraint-validation workflow.
- Human review, contestability, decision traceability and explicit public responses.
- Evaluation of urban performance, computing frugality, transparency, governance capacity and perceived legitimacy.

These are distinct development tracks. Any integration requires an architecture decision and an actual reproducible implementation.

## Documentation
- [AI usage and disclosure](AI_USAGE.md)
- [Prompt log template](PROMPT_LOG_TEMPLATE.csv)
- [Generated content register](GENERATED_CONTENT_REGISTER_TEMPLATE.csv)
- [Source register](SOURCE_REGISTER.md)
- [Reproducibility protocol](REPRODUCIBILITY.md)
- [Current application audit](CURRENT_IMPLEMENTATION.md)
- [Experiment template](EXPERIMENT_TEMPLATE.md)

Do not commit participant data, interview transcripts, chat exports, keys or unsanitised prompts to this public repository.

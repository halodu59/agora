# AI usage: academic audit protocol

Maintained from 2026-10-30 as a disclosure and audit scaffold. It is not a complete historical log.

## Required recording procedure

For every AI interaction used to research, generate, transform, debug, translate, evaluate or revise dissertation material:
1. Capture the **exact prompt and complete response**, including relevant attachments, tool inputs and configuration where available.
2. Record timestamp, provider, precise model/version (or `unknown`), purpose, artefact, response location, output hash and prompt ID.
3. Record human selection, edits, fact checks, tests, literature/source verification and final disposition, including rejected outputs.
4. Link every AI-assisted dissertation passage, code change, diagram, image or analysis to prompt IDs and an explicit attribution/declaration.
5. Cross-reference experiment IDs when AI influenced scenarios, code, assumptions, transformations or interpretation.

Keep complete raw logs in a **restricted-access archive**, not in the public Git repository. Public CSV templates contain metadata only. Do not publish personally identifiable contributions, unpublished third-party works, system prompts or API secrets.

## Integrity rules

- Never invent missing prompts, model names, response content or timestamps.
- Clearly separate proposed methods, simulated examples, observed results and validated outcomes.
- Record discrepancies and failed runs; do not cherry-pick only successful outputs.
- Verify the final form of attribution against Oxford's current rules and supervisor guidance.

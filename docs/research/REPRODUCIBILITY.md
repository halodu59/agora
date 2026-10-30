# Technical reproducibility protocol

Each experiment must have an immutable ID and a documented `experiments/<id>/README.md` (or equivalent in a future dedicated dissertation repository).

Record:
1. Research objective, hypotheses, status: planned / executed / verified / rejected.
2. Original input data, source, collection date, licence, spatial/temporal extent and checksums.
3. Full environment: OS, CPU/GPU, Python/Node versions, package lockfiles, SUMO/JuPedSim versions, commit SHA and any containers.
4. Network/demand model, scenario specification, boundaries, assumptions, random seeds and calibration.
5. Commands that run from a clean checkout, plus validated inputs/outputs.
6. Execution logs, timing, model/API calls, cost, errors, numerical results and tolerance thresholds.
7. AI prompt and output IDs; model version and dates for remote API calls.
8. Human review, deviations from protocol, uncertainty and limitations.
9. Data protection: no identifiable study data or credentials in the public repository.
10. Re-execution outcome by a second person where feasible.

## Current application — untested quick start

The current repository has `package-lock.json` and package scripts:
```bash
npm ci
npm run lint
npm run build
npm run dev
```

These commands are drawn from repository configuration and **have not been executed or validated by this documentation task**.

The local Express server is configured for:
```bash
npm run server
```

This requires a local `.env` file and appropriate credentials. The exact Node.js version and required environment variables must be inventoried and pinned before reproducibility can be claimed. Avoid committing secrets.

## Research simulation stack

SUMO and JuPedSim are **planned**, not part of the verified current application code. Their environments, scenarios, datasets and commands must be committed and tested separately when they exist.

**Replication target:** independent researchers can regenerate outcomes within documented tolerances, rather than expecting identical results across every machine and external AI API version.

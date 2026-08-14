# Concord frontend

The first institutional frontend checkpoint is implemented in React,
TypeScript, and Vite. It translates the supplied visual reference into
Concord's actual product semantics: a public landing page, facility register,
Root Accord workspace, funding formation, activity, FCC evidence, explicit
lineage, child dossiers, and draw-leg detail.

The rendered data comes directly from
`config/coston2/concord-deployment.json` and uses the canonical TypeScript SDK
types. It does not invent a second facility model or fake institutional data.
The recorded proof facility contains 9 USDT0 of funded capacity, three active
children, a repaid two-leg draw, and restored capacity.

## Run locally

```bash
cd frontend
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Use `npm run build` for the TypeScript and production-bundle gate and
`npm test` for semantic/invariant tests. The root-context production image is:

```bash
docker build -f frontend/Dockerfile -t concord-frontend .
docker run --rm -p 8080:8080 concord-frontend
```

The GitHub workflow in `.github/workflows/frontend.yml` reproduces dependency
installation, build, tests, and the container build.

The semantic map remains in `docs/frontend-map.md`. Visual decisions are in
`docs/frontend-design-system.md` and `docs/frontend-art-direction.md`.
Heroicons is the single interface icon family. Inter Variable is self-hosted
through the npm package; no runtime font CDN is required.

## Current interaction boundary

Read views use recorded Coston2 evidence. The “Prepare draw” review explains
the unsigned intent flow but does not fabricate calldata or transaction
success: a live intent service and wallet approval path are still required.
The FCC label is intentionally “simulated development TEE”; token settlement
and public EVM state are not represented as private.

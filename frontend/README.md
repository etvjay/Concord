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

The public landing page now leads with the user outcome—one accountable
facility composed from independent providers—before progressively disclosing
Accord, Makkari, CoFill, FCC, and Lineage. Its relationship composition,
prismatic facility object, pointer response, and ambient motion all respect the
user's reduced-motion preference.

## Wallet connection

The app supports injected EVM wallets through Wagmi and Viem. A user can:

- connect an injected wallet such as MetaMask or Rabby;
- add or switch to Flare Testnet Coston2 through the wallet;
- see the connected address and live C2FLR balance;
- open the official Coston2 faucet for C2FLR, FXRP, and USDT0; and
- disconnect without Concord retaining a private key.

No WalletConnect project credential is bundled, so the UI does not claim
WalletConnect support. Public evidence remains browsable without connecting.

## Current interaction boundary

Read views use recorded Coston2 evidence. Wallet connection establishes live
network identity and balance only. The “Prepare draw” review explains the
unsigned intent flow but does not fabricate calldata or transaction success: a
live intent service and transaction-action boundary are still required.
The FCC label is intentionally “simulated development TEE”; token settlement
and public EVM state are not represented as private.

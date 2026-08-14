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

For the fastest team walkthrough, open `http://localhost:5173/demo`. The
Guided Demo replays the six-stage facility lifecycle using deterministic local
state only; it does not connect a wallet or write to Coston2. The optional
`/borrower` sandbox can prepare a fresh wallet-bound Root Accord on Coston2
after explicit wallet approval. See [`docs/TEAM_DEMO.md`](../docs/TEAM_DEMO.md)
for the complete boundary and runbook.

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

The public landing page leads with the user outcome—one facility funded by
multiple accountable providers—before progressively disclosing Accord,
Makkari, CoFill, FCC, and Lineage. Its restrained facility object and ambient
motion respect the user's reduced-motion preference. The visual system uses a
flat neutral canvas, crisp container edges, and cobalt only for proof and
action emphasis; it does not rely on card gradients or glass effects.

The application shell has one global product destination, a plain parent trail,
and stable facility tabs for Overview, Funding, Activity, Evidence, and
Lineage. Canonical terms remain visible beside human-first titles and have
in-place definitions. A dismissible first-use primer, optional five-step tour,
and persistent Help/glossary menu teach the model without blocking experienced
users. Detail routes return to their owning section instead of creating a
navigation loop.

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

Read views remain anchored to the recorded Coston2 evidence. The “Prepare draw”
review now reads live capacity from the canonical CapitalFacility, validates the
connected wallet against the recorded treasury borrower, and builds canonical
`draw(bytes32,bytes32,uint256)` calldata locally. It presents the network,
contract, Root Accord, amount, generated Draw ID, zero native value,
preconditions, warnings, and full calldata before a separate “Approve in
wallet” action. Submission is fixed to Coston2 and confirmation is read from the
public receipt; Concord never receives a private key.

Only the recorded treasury borrower can pass the client-side authority gate,
and the contract independently enforces that authority and available capacity.
The recorded snapshot is not silently rewritten after a new transaction; the
review reports live post-confirmation capacity separately. The FCC label remains
“simulated development TEE”; token settlement and public EVM state are not
represented as private.

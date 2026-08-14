# Concord team demo and borrower sandbox

This is the repeatable team path before deployment.

## Fastest path: local guided demo

From a clean checkout:

```bash
cd frontend
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Open `http://localhost:5173/demo` and select **Next step** through the six
stages:

1. Root Accord formation
2. Private Makkari coordination
3. CoFill allocation
4. Child Accord funding
5. Two-leg draw
6. Repayment and restored capacity

This route is a deterministic local scenario replay. It does not connect a
wallet, call an RPC, create IDs onchain, or write to Coston2. It is the safest
path for judges and for a teammate who needs to rehearse the story.

## Optional path: borrower sandbox

Open `/borrower` and connect a disposable Coston2 wallet. The sandbox can
prepare and submit a bounded borrower-owned sequence:

- target: 9 USDT0;
- validity: seven days from creation;
- policy: the sandbox policy commitment;
- borrower: the connected wallet, because the contract binds `msg.sender`.

After the Root Accord confirms, continue in the same page:

1. Prepare and approve an explicit 1 FXRP ERC-20 allowance for the
   `CapitalFacility`.
2. Prepare and approve `lockCollateral` for the same 1 FXRP.
3. Prepare and approve `openSyndication` for a deterministic round ID, a
   bounded expiry, and the three recorded fixture provider addresses.

The UI shows the calldata and preconditions before the wallet approval. It
never embeds or requests a private key. Each write is a separate public
Coston2 transaction. The connected wallet must have C2FLR for gas and 1 FXRP;
the faucet link is available from the page.

The recorded facility is not reused for this test. A new borrower needs a new
Root Accord because the existing borrower is fixed onchain.

## Coordinator boundary

After `openSyndication` confirms, the intended fixture runner watches the new
Root Accord ID, validates the borrower and bounded parameters, and computes a
deterministic provider allocation. It may prepare a proposal and provider-side
actions. It must not silently broadcast borrower actions. The public sandbox
stops here: signed quotes, FCC/CoFill evidence, allocation verification,
Child Accord materialization, provider funding, draw, and repayment are not
fabricated by the frontend.

The current frontend exposes this boundary honestly. Provider fixture funding
and verifier credentials remain team-operated; no automatic live lifecycle is
claimed by the public UI.

## Evidence boundary

The historical proof remains available at the recorded facility route and in
the [judge quickstart](JUDGES.md). It is the source of truth for observed
Coston2 transactions. The local guided demo explains the lifecycle but is not
additional chain evidence.

Run the credential-free checks from the repository root:

```bash
./scripts/judge-check.sh
```

For frontend validation:

```bash
cd frontend
npm run build
npm test
```

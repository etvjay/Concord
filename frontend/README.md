# Concord frontend

The frontend is intentionally mapped before full implementation. The
implementation must use the shared product contract and the TypeScript SDK;
it must not create a parallel facility state model.

Planned stack from the build handoff: React, TypeScript, Vite, Wagmi, Viem,
and TanStack Query. The first implementation checkpoint is the Root Accord
workspace described in [`docs/frontend-map.md`](../docs/frontend-map.md).

Full frontend work begins after the contract/FCC semantics are demonstrated
with authoritative Coston2 evidence. Until then, this directory contains the
product-facing route and component boundary only.

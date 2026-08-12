# Concord frontend

The frontend is currently in the design phase. The semantic route/component
map is in [`docs/frontend-map.md`](../docs/frontend-map.md); the visual,
interaction, icon, responsive, and accessibility specification is in
[`docs/frontend-design-system.md`](../docs/frontend-design-system.md).
The complete art direction, navigation, page architecture, typography, motion,
imagery, and usability gate is in
[`docs/frontend-art-direction.md`](../docs/frontend-art-direction.md).

The implementation must use the shared product contract and the TypeScript
SDK; it must not create a parallel facility state model. Heroicons is the
single icon family for the first frontend.

Planned stack from the build handoff: React, TypeScript, Vite, Wagmi, Viem,
and TanStack Query. The first implementation checkpoint remains the Root
Accord workspace, but implementation begins only after the design review gate
in the design-system document is satisfied and contract/FCC semantics are
demonstrated with authoritative Coston2 evidence.

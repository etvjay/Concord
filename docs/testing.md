# Testing

Concord's tests are organized around the causal chain, including failure
behaviour.

## Solidity

~~~bash
PATH=/workspace/tooling/foundry:/workspace/tooling/go/bin:$PATH \
FOUNDRY_SOLC=/workspace/tooling/solc-0.8.27 \
forge test -vv
~~~

contracts/test/ConcordFlow.t.sol covers:

- root Accord creation and FXRP collateral locking;
- verifier-gated, root/round/extension-bound allocation materialization;
- duplicate-provider and overfunding constraints;
- selected versus funded child capacity;
- root activation only after actual USDT0 transfers;
- deterministic draw allocation across at least two children;
- explicit DrawLeg and settlement lineage;
- exposure reduction after repayment and restored availability;
- provider capital return and collateral return after exposure is clear.

## FCC extension

~~~bash
(cd go && GOTOOLCHAIN=local go test ./...)
~~~

The Go tests cover strict payload decoding, the encrypted-action boundary,
EIP-191 provider signature recovery, expired and invalid quotes, deterministic
fee/address/nonce ordering, partial final allocation, and explicit insufficient
capacity failure.

## Deployment tooling

~~~bash
(cd tools && GOTOOLCHAIN=local go test ./...)
~~~

This validates deployment support, result parsing, diagnostics and the
generated ConcordInstructionSender binding. A live Coston2 run additionally
requires a funded account, registered extension, reachable official FCC
scaffold, provider accounts, and an independently verified allocation result.

## Evidence rule

Passing local tests do not equal a Coston2 deployment. Record contract
addresses, instruction IDs, transaction hashes, result digests and explorer
links in the status record before making a live-flow claim.

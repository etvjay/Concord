# Concord Go FCC implementation

This is Concord's selected FCE implementation. It embeds tee-node as a
library, so the image runs as a single static binary on a distroless base. The
runtime remains the official Flare FCE scaffold; Concord-specific quote
handling and CoFill live in internal/extension.

## Layout

~~~text
cmd/
├── main.go             Standalone extension server for local development
├── docker/main.go      Combined tee-node plus extension image entry point
└── start-tee/main.go   Host-process runner for local services
internal/
├── config/config.go    Concord operation constants and version
└── extension/
    ├── extension.go    Decryption boundary, routing, quote and CoFill handlers
    └── utils.go        Shared extension helpers
pkg/
├── server/server.go    Extension server lifecycle
└── types/types.go      Quote, allocation and state types
~~~

## Develop

~~~bash
cd go
GOTOOLCHAIN=local go build ./...
GOTOOLCHAIN=local go test ./...
~~~

## Concord operations

SUBMIT_QUOTE accepts one signed provider offer after the payload has been
decrypted inside the TEE. FINALIZE_ROUND validates the eligible quote set and
returns the deterministic CoFill allocation. The result digest is later
checked by the explicit onchain allocation-verifier boundary before child
Accords are materialized.

The handler never treats the encrypted instruction message as plaintext. Unit
tests inject a decrypt function only to exercise the handler without starting
the TEE.

For the complete contract and tooling checks, see ../docs/testing.md.

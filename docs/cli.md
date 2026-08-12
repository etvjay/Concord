# Concord CLI

The unified CLI is available through `scripts/concord`:

```bash
./scripts/concord version
./scripts/concord doctor --offline
./scripts/concord doctor
./scripts/concord api -facility 0x... -registry 0x...
./scripts/concord mcp -api-url http://127.0.0.1:8080
```

If Go is not on the normal path, set `CONCORD_GO_BIN`. The live doctor check
requires the configured RPC to be reachable; `--offline` validates local
configuration and tools without making a network request.

## What is ready

- one command namespace for configuration checks, API startup, and MCP startup;
- Coston2 network configuration is read from `config/networks/coston2.json`;
- `doctor` validates the configured chain ID and optionally checks bytecode at
  supplied facility/registry addresses;
- the API uses read-only chain calls and returns unsigned transaction intents;
- MCP exposes facility, round, draw, and lineage resources plus the same safe
  read/prepare operations.

## What is not ready

The CLI is not a complete live-facility operator yet. It does not replace the
existing bounded FCC/deployment commands, does not hold a signer, and does not
claim that Concord contracts or an FCC extension are deployed on Coston2. The
live operator path still requires deployed addresses, funded accounts, a
configured FCC proxy/TEE flow, provider offers, and recorded receipts.

## Coston2 preflight

Run the read-only preflight before any credentialed operator session:

~~~bash
./scripts/coston2-preflight.sh --offline
./scripts/coston2-preflight.sh --proxy "$EXT_PROXY_URL" --extension-id "$CONCORD_EXTENSION_ID"
~~~

The live form confirms chain ID 114, re-runs the centralized FXRP/USDT0 asset
resolver, and can check public bytecode and the official FCC proxy `/info`
binding when addresses are supplied. It never signs, broadcasts, or stores
credentials. The transaction-intent vocabulary shared by the API, SDK, MCP,
and CLI includes round opening plus child/root close and expiry actions; FCC
allocation materialization remains verifier-gated.
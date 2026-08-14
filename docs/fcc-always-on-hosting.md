# Always-on Concord FCC development hosting

This runbook moves Concord's current Coston2 FCC development runtime from the
disposable Codespace relay to a stable, long-running host. It does not alter
Accord, Makkari, CoFill, Lineage, or the completed facility evidence.

## Recommended topology: Railway

Railway is the primary target because it supports Dockerfile builds,
configuration-as-code, private service DNS, stable public domains, and an
`ALWAYS` restart policy. `ALWAYS` requires a paid plan; free/trial deployments
must not be described as continuously available.

Create one Railway project with three services:

1. `concord-fcc-proxy` from this repository, using
   `infra/railway/proxy.railway.toml`. Give port `6664` a stable public HTTPS
   domain and set `PORT=6664`.
2. `concord-fcc-tee` from this repository, using
   `infra/railway/tee.railway.toml`. Keep it private.
3. A private Redis service. Persistence is not required for the current
   ephemeral development queue; do not expose Redis publicly.

The provider-facing path is direct:

```text
Flare providers
  -> https://stable-proxy-host/instruction :6664
  -> tee-proxy
  -> private Railway DNS :6663
  -> Concord Go extension TEE
```

### Proxy variables

Store these as Railway secrets/variables. Never commit their values.

```text
PROXY_PRIVATE_KEY
REDIS_ENDPOINT=concord-redis.railway.internal:6379
INDEXER_DB_HOST
INDEXER_DB_PORT=3306
INDEXER_DB_NAME
INDEXER_DB_USER
INDEXER_DB_PASSWORD
PORT=6664
```

The runtime renderer writes the proxy TOML inside the container. Current
Coston2 system addresses are defaults in that renderer and are recorded in the
fresh source snapshot. Override `FLARE_SYSTEMS_MANAGER`, `FLARE_RELAY`, and
`VOTER_REGISTRY` if a newer official scaffold changes them.

### TEE variables

```text
CHAIN_ID=114
CHAIN_URL=https://coston2-api.flare.network/ext/C/rpc
MODE=1
SIMULATED_TEE=true
EXTENSION_ID=0x000000000000000000000000000000000000000000000000000000000001028c
INITIAL_OWNER=<authorized Coston2 owner address>
GOVERNANCE_SIGNERS=<authorized Coston2 signer address>
GOVERNANCE_THRESHOLD=1
PROXY_URL=http://concord-fcc-proxy.railway.internal:6663
CONFIG_PORT=5501
SIGN_PORT=7701
EXTENSION_PORT=7702
LOG_LEVEL=INFO
```

Service names determine Railway private DNS. If the proxy service has another
name, update `PROXY_URL` accordingly.

## Identity and cutover rule

The stable hostname survives a restart; the simulated TEE identity does not.
Restarting `concord-fcc-tee` creates a new `teeId`. The safe cutover is:

1. Deploy all three services and verify the public `/info` response reports
   extension `66188`.
2. Read the new TEE identity from `/info` and register it through the current
   official scaffold tooling.
3. Wait for status `2` (`PRODUCTION`) and a fresh availability check.
4. Pause the stale identity. Maintain exactly one active machine for extension
   `66188` and one machine per endpoint.
5. Run `./scripts/check-hosted-fcc.sh https://your-stable-domain 66188`.
6. Dispatch a new development-path instruction and retain the transaction,
   proxy status, and result evidence before updating deployment records.

Do not automate registration on every restart: that can accumulate stale active
machines and make provider selection appear random. Registration and stale
identity pause remain deliberate operator actions.

The currently recorded machine is
`0xeE39d5e7d1C5043232282e3CC884B41a9Db22c85`, proxy identity
`0x801470C95f78D0cA444e589aF8Ea0858Ce6d613e`, status `2`, using the
Workers.dev-to-Codespace development relay. It remains historical evidence; it
is not evidence that the old upstream is continuously available.

## Northflank fallback

Northflank can run the same two Dockerfiles as long-running combined services.
Expose only proxy port `6664` with TLS, keep proxy port `6663`, the TEE ports,
and Redis private, configure an HTTP `/info` health check, and keep the service
scale at one or greater. Scale zero is unavailable and is not always-on.

Use the same variables and the same identity cutover. Northflank changes the
service DNS name only; it does not change Concord or FCC semantics.

## Reproducibility and operations

- `frontend.yml` reproduces the frontend typecheck, semantic tests, bundle, and
  production container.
- `hosted-fcc-smoke.yml` performs a manual, read-only `/info` and active-machine
  registry check against any stable deployment.
- `proxy.Dockerfile` pins `tee-proxy` to the same `v0.0.18` line as the current
  Concord extension and does not mix Flare dependency versions.
- Railway configuration declares `ALWAYS` restart. Use a paid plan and alerts;
  restart policy alone is not a service-level guarantee.

## Truth boundary

This setup can improve development availability. It does not prove production
hardware-backed TEE security, private token transfers, private EVM execution,
or institutional production readiness. Coston2 USDT0/FXRP transfers and public
contract state remain public.

Official platform references used for this decision:

- Flare FCE scaffold: https://github.com/flare-foundation/fce-extension-scaffold
- Flare FCC getting started: https://dev.flare.network/fcc/guides/getting-started
- Railway config-as-code: https://docs.railway.com/config-as-code/reference
- Railway private networking: https://docs.railway.com/networking/private-networking
- Railway restart policy: https://docs.railway.com/deployments/restart-policy
- Northflank services: https://northflank.com/features/application-layer
- Northflank health checks: https://northflank.com/docs/v1/application/observe/configure-health-checks

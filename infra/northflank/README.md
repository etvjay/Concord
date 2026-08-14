# Concord FCC on Northflank

This directory is the reproducible Northflank deployment contract for the
current Coston2 FCC development path. Northflank keeps one proxy service, one
TEE service, and one private Redis addon running continuously. It does not make
the simulated TEE identity persistent across a process restart.

Deployment checkpoint: the contract is prepared, but no Northflank project,
proxy URL, or new machine identity is claimed in this checkout. The first
operator with Northflank access must create the project, provision the private
dependencies, and attach live evidence before updating the Coston2 deployment
records.

## Topology

```text
Flare providers
  -> https://<stable-proxy-domain>/instruction (public HTTP, container 6664)
  -> concord-fcc-proxy (private HTTP, container 6663)
  -> concord-fcc-tee (private ports 5501, 7701, 7702)

concord-fcc-proxy -> concord-redis (private addon)
```

Use one Northflank project in `europe-west`, keep every workload at exactly one
instance, and disable autoscaling. Only proxy port `6664` is public. Northflank
private DNS uses `<service-name>:<port>`, so the TEE reaches the proxy at
`http://concord-fcc-proxy:6663`.

## 1. Redis addon

Create a private Redis addon named `concord-redis` using a currently supported
7.x release. TLS may remain disabled because traffic stays inside the project.
Do not enable public access. Copy the addon host and port into the proxy's
`REDIS_ENDPOINT` secret in `host:port` form.

## 2. Proxy combined service

- Repository: `https://github.com/etvjay/Concord`
- Branch: `agent/concord-rebuild` until merged
- Dockerfile: `/infra/railway/proxy.Dockerfile`
- Context: `/`
- Instances: `1`
- Public port: `6664`, protocol `HTTP`
- Private port: `6663`, protocol `HTTP`
- Readiness and liveness: `GET /healthy` on private port `6663`
- Startup delay: readiness `15s`, liveness `30s`; interval: `30s`; failure threshold: `5`

The proxy cannot use public `/info` as its Northflank readiness probe: the
external server opens only after the TEE has fetched its initial info through
private `/queue`. Probing private `/healthy` avoids that startup dependency
cycle; verify public `/info` separately after both services are ready.

Copy the keys from `proxy.variables.example` into Northflank runtime variables.
Put all credential values in a Northflank secret group; do not commit them.
`REDIS_ENDPOINT` and `REDIS_PASSWORD` come from the addon's private connection
details. The checked-in proxy image applies a small patch to the pinned
`tee-proxy` release so go-redis uses that password without exposing Redis
publicly. Redis is only the proxy queue/state store. The proxy also requires
the separate MySQL-compatible `INDEXER_DB_HOST`, `INDEXER_DB_NAME`,
`INDEXER_DB_USER`, and `INDEXER_DB_PASSWORD`; never substitute Redis for that
indexer database.

## 3. TEE combined service

- Repository and branch: same as proxy
- Dockerfile: `/go/Dockerfile`
- Context: `/`
- Instances: `1`
- Private ports: `5501`, `7701`, `7702`
- Startup/readiness probe: TCP port `5501`
- Startup delay: `30s`; interval: `30s`; failure threshold: `5`

Copy `tee.variables.example` into runtime variables and replace the two owner
placeholders. `SIMULATED_TEE=true` and `MODE=1` are the supported Coston2
development path, not hardware-backed production execution.

## 4. Stable endpoint and cutover

Assign a permanent Northflank DNS name or verified custom domain to proxy port
`6664`. Do not place basic authentication, SSO, or an IP allowlist in front of
`/instruction`; independent Flare providers must be able to POST to it.

After the first TEE deployment, or after any TEE restart:

1. Read the new `teeId` and extension binding from the proxy `/info` and TEE
   logs.
2. Register the new identity through the current official scaffold tooling.
3. Wait for machine status `2` and a fresh availability check.
4. Pause the stale identity; keep one active machine per endpoint.
5. Run:

   ```bash
   ./scripts/check-hosted-fcc.sh https://<stable-proxy-domain> 66188
   ```

6. Dispatch one new Coston2 development instruction and retain the dispatch,
   status, result, and registry evidence.

When preparing the official `rRap` run, pass a temporary state file outside the
checkout (for example `/tmp/concord-register-tee.state`). Never commit or
reuse a state file as a substitute for checking the live machine and
availability evidence.

The proxy domain survives restarts. The simulated TEE key and `teeId` do not.
Automatic onchain re-registration is intentionally excluded because a restart
loop could accumulate stale active machines and cause random provider routing.

## 5. Availability operations

- Alert when `/info` fails twice or the latest availability proof is no longer
  fresh according to the current registration tooling.
- Retain the availability proof timestamp from the current official scaffold;
  do not hardcode a freshness ceiling from an old note.
- Redeploy the proxy independently when possible; restarting the proxy does not
  intentionally rotate the TEE identity.
- Treat any TEE restart as an identity-rotation incident and run the cutover
  checklist before accepting new public test sessions.
- The Northflank sandbox is suitable for a continuously available hackathon
  development service, but Northflank documents it as non-production.

Official Northflank references checked 2026-08-14:

- https://northflank.com/docs/v1/application/network/configure-ports
- https://northflank.com/docs/v1/application/observe/configure-health-checks
- https://northflank.com/docs/v1/application/infrastructure-as-code/infrastructure-as-code
- https://northflank.com/docs/v1/application/databases-and-persistence/deploy-databases-on-northflank/deploy-redis-on-northflank

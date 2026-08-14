# Concord FCC development ingress

This Worker is a narrow HTTPS relay for the Concord FCC development path when
the account cannot use Cloudflare Workers VPC because the required
Connectivity Directory Admin membership cannot be assigned to the current
user.

It does not replace the official Flare FCE scaffold, tee-node, tee-proxy,
registry, machine registration, signature checks, or Concord economic
semantics. It only forwards the proxy endpoints that the FCC setup needs:

- GET /info
- GET /health
- POST /instruction
- GET /metrics
- GET /action/status...
- GET /action/result...

The upstream URL is intentionally a secret so it is not committed. The current
development deployment points it at the public HTTPS URL for the Northflank
proxy's `6664` port. Keep the proxy's `6663` port private; the worker should
only relay the public FCC routes listed above.

## Deploy

From this directory, with a current Cloudflare API token and account ID:

    npx wrangler deploy
    printf '%s' 'https://<northflank-6664-hostname>.code.run' | npx wrangler secret put CONCORD_UPSTREAM_URL

The stable Worker URL is:

    https://concord-fcc-ingress.microcosm.workers.dev

Verify the relay before using it for any FCC operation:

    curl -fsS https://concord-fcc-ingress.microcosm.workers.dev/info

This is a development/demo ingress boundary. The generated Northflank
`code.run` hostname can change if the service is recreated; update the secret
before cutover if that happens. Do not describe this fallback as a production
FCC deployment.

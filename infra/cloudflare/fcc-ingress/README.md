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

The upstream URL is intentionally a secret so it is not committed. For this
hackathon fallback it points at the public HTTPS URL for the persistent
Codespaces port that maps to host port 6674.

## Deploy

From this directory, with a current Cloudflare API token and account ID:

    npx wrangler deploy
    printf '%s' 'https://<codespace-name>-6674.app.github.dev' | npx wrangler secret put CONCORD_UPSTREAM_URL

The stable Worker URL is:

    https://concord-fcc-ingress.microcosm.workers.dev

Verify the relay before using it for any FCC operation:

    curl -fsS https://concord-fcc-ingress.microcosm.workers.dev/info

This is a development/demo ingress boundary. A Codespaces public port is
anonymous internet access and becomes private again when the Codespace is
restarted, so the port must be re-forwarded and re-publicized after every
restart. Do not describe this fallback as a production FCC deployment.

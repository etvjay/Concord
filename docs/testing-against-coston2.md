# Testing against a Coston2 deployment

For exercising an extension that is already deployed and registered on Coston2 —
either on a Confidential Space VM, or locally with a public tunnel. To deploy one
first, see [deployment-steps.md](deployment-steps.md).

## What you need

| Need | Note |
|---|---|
| `.env.coston2` | filled in; `use-chain.sh coston2` activates it |
| A funded Coston2 key | sends the test instructions; get C2FLR from the [faucet](https://faucet.flare.network/coston2) |
| `config/coston2/deployed-addresses.json` | the `FlareTeeManager` diamond and friends |
| `config/proxy/extension_proxy.coston2.docker.toml` | gitignored — copy the `.example` and fill in `[db]` |
| A reachable `EXT_PROXY_URL` | the VM's URL, or a tunnel if the proxy runs locally |

## Confirm the deployment is live

```bash
curl -s "$EXT_PROXY_URL/info" | jq '{extensionId, codeHash, platform}'
```

| Field | Expect |
|---|---|
| `extensionId` | matches `EXTENSION_ID` in `config/extension.env` |
| `codeHash` | the hash registered on-chain — `0x194844cf…` means simulated, not real hardware |
| `platform` | `GCP_AMD_SEV` on real hardware, `TEST_PLATFORM` when simulated |

Then check the on-chain side:

```bash
cd tools
go run ./cmd/query-tee -ext <extensionId> -rpc "$CHAIN_URL"
go run ./cmd/verify-deploy -a ../config/coston2/deployed-addresses.json -c "$CHAIN_URL"
```

`query-tee` lists the TEE machines registered for the extension. **More than one
active machine is a problem** — instructions are load-balanced across them, so a
stale one swallows roughly half your requests. See
[deployment-steps.md](deployment-steps.md).

## Run the Concord flow

```bash
./scripts/use-chain.sh coston2
CONCORD_QUOTES=fixtures/quote-a.json,fixtures/quote-b.json,fixtures/quote-c.json \
CONCORD_FINALIZE=fixtures/finalize-round.json \
CONCORD_EVIDENCE_OUT=evidence/fcc-action.json \
./scripts/test.sh
```

The quote files must contain signed Concord `QuoteRequest` payloads. The
finalization file must contain a `FinalizeRoundRequest` bound to the live
extension, root Accord, Makkari round, target, expiry, and eligible providers.
The runner submits each quote through encrypted `SUBMIT_QUOTE` instructions,
then submits `FINALIZE_ROUND` and writes the complete signed FCC evidence
envelope to `CONCORD_EVIDENCE_OUT`.

For the disposable live operator path, build those files from the current
onchain round without placing them in the repository:

```bash
mkdir -p "$RUNNER_TEMP/concord-quotes"
(cd go && go run ./cmd/build-quotes \
  -rpc "$CHAIN_URL" \
  -facility "$CAPITAL_FACILITY" \
  -extension-id "$EXTENSION_ID" \
  -round-id "$ROUND_ID" \
  -root-accord-id "$ROOT_ACCORD_ID" \
  -out-dir "$RUNNER_TEMP/concord-quotes" \
  -provider-a "$PROVIDER_A" \
  -provider-b "$PROVIDER_B" \
  -provider-c "$PROVIDER_C")
```

`build-quotes` reads the three provider private keys from the environment,
checks the live round and eligibility onchain, and writes mode-0600 quote
payloads plus the finalization payload. It never writes a provider key.

Verify that envelope against the deployed CapitalFacility before materializing
children:

```bash
cd tools
go run ./cmd/verify-allocation \
  -c "$CHAIN_URL" \
  -facility "$CAPITAL_FACILITY" \
  -teeRegistry "$TEE_REGISTRY" \
  -result ../evidence/fcc-action.json \
  -extensionId "$EXTENSION_ID" \
  -roundId "$ROUND_ID" \
  -rootAccordId "$ROOT_ACCORD_ID" \
  -out ../evidence/allocation-verification.json
```

The verifier is read-only by default. Use `-mark` only after the signed
action, active-machine, facility-binding, and digest checks pass; the caller
must be the facility's configured `allocationVerifier`.

After that verification, the treasury borrower can materialize the selected
Child Accords in the same bounded step:

```bash
go run ./cmd/verify-allocation \
  ...same verification flags... \
  -mark -materialize
```

`-materialize` requires `-mark`; it first authorizes the verified digest and
then calls `materializeAllocation`. A selected child is still not funded until
its provider's USDT0 transfer succeeds.

Counters are in memory, so the numbers restart at 1 after any TEE relaunch.

## Testing a local proxy against Coston2

The proxy must be publicly reachable for FTDC data providers to answer it. Start
the tunnel and let the scripts wire the URL in:

```bash
./scripts/full-setup.sh --chain coston2 --tunnel --test
```

That writes the tunnel URL into `.env` as `EXT_PROXY_URL`, so `post-build.sh` and
`test.sh` pick it up. Details in [cloudflared.md](cloudflared.md).

## If something's blocked

| Symptom | Cause |
|---|---|
| `pollAction` timeout, `/action/result` 404 | multiple active TEE machines; pause the stale ones |
| `Verification.ChallengeExpired` | re-registration without `-command rRap` |
| `no round` / 404 from the FTDC proxy | proxy signing policy out of sync with the on-chain reward epoch; `register-tee` pre-flights this |
| `signature must be 65 bytes, got 0` | `CHAIN_ID` unset on the node |
| `InvalidTeePublicKeyOrSignature` | node `CHAIN_ID`, proxy `chain_id` and the registry disagree — all three must say 114 |
| Instructions never arrive | `EXT_PROXY_URL` not reachable from outside, or a rotated tunnel URL left stale in `.env` |
| `Extension ID already set.` | `setExtensionId()` is one-shot; a redeploy is the only reset |

import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { keccak256, parseUnits, stringToHex, type Hex } from "viem";
import {
  useConnection,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Link } from "react-router-dom";
import { explorerTx, facility, shortId } from "../data/concord";
import { coston2, coston2FaucetUrl } from "../web3";
import {
  buildCreateRootIntent,
  capitalFacilityAddress,
  createBorrowerSessionId,
  type CreateRootIntent,
} from "../transaction-intents";
import { WalletControl } from "./WalletControl";

const targetCapacity = parseUnits("9", 6);
const sandboxPolicyHash = keccak256(stringToHex("concord:borrower-sandbox:v1"));

function errorMessage(error: Error | null) {
  return error?.message.split("\n")[0] ?? "";
}

type SandboxPhase = "idle" | "prepared" | "submitted";

export function BorrowerSandbox() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<SandboxPhase>("idle");
  const [intent, setIntent] = useState<CreateRootIntent>();
  const [hash, setHash] = useState<Hex>();
  const [copied, setCopied] = useState(false);
  const connection = useConnection();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();
  const {
    mutate: sendTransaction,
    error: sendError,
    isPending: isSending,
    reset: resetSend,
  } = useSendTransaction();
  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: coston2.id,
    confirmations: 1,
    query: { enabled: Boolean(hash) },
  });

  const connected = connection.status === "connected";
  const address = connected ? connection.address : undefined;
  const onCoston2 = connected && connection.chainId === coston2.id;
  const created = receipt.isSuccess;

  const reset = useCallback(() => {
    setPhase("idle");
    setIntent(undefined);
    setHash(undefined);
    setCopied(false);
    resetSend();
  }, [resetSend]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const prepare = () => {
    if (!address || !onCoston2) return;
    const nonce = `${Date.now()}:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    const rootAccordId = createBorrowerSessionId(address, nonce, "root");
    const nextIntent = buildCreateRootIntent({
      rootAccordId,
      targetCapacity,
      validUntil: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
      policyHash: sandboxPolicyHash,
    });
    setIntent(nextIntent);
    setPhase("prepared");
    setHash(undefined);
    resetSend();
  };

  const submit = () => {
    if (!intent || !onCoston2 || isSending) return;
    sendTransaction(
      { to: intent.to, data: intent.data, value: intent.value },
      { onSuccess: (transactionHash) => { setHash(transactionHash); setPhase("submitted"); } },
    );
  };

  const copyRoot = async () => {
    if (!intent) return;
    try {
      await navigator.clipboard.writeText(intent.rootAccordId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="borrower-sandbox" data-testid="borrower-sandbox" ref={dialogRef} tabIndex={-1}>
      <div className="borrower-boundary" role="note">
        <div className="borrower-boundary__icon"><ShieldCheckIcon aria-hidden="true" /></div>
        <div><strong>LIVE BORROWER SANDBOX · COSTON2</strong><p>This creates a fresh Root Accord whose borrower is the connected wallet. Every write requires explicit wallet approval.</p></div>
        <span className="status status--warning">Testnet writes</span>
      </div>

      <div className="page-heading borrower-heading">
        <div>
          <div className="canonical-line"><span className="canonical-label">BORROWER SANDBOX</span><span className="demo-step-count">Fresh facility · chain 114</span></div>
          <h1>Become the borrower of a new facility.</h1>
          <p>Concord binds borrower authority when your wallet creates the Root Accord. This sandbox never reassigns the recorded facility and never embeds a private key.</p>
        </div>
        <Link className="button button--secondary" to="/demo"><ArrowRightIcon aria-hidden="true" />Use guided demo</Link>
      </div>

      <div className="borrower-layout">
        <section className="borrower-session-card">
          <div className="section-header"><div><span className="eyebrow">SESSION PLAN</span><h2>Bounded borrower fixture</h2></div><span className="status status--neutral">9 USDT0 target</span></div>
          <dl className="borrower-facts">
            <div><dt>Network</dt><dd>Coston2 · chain 114</dd></div>
            <div><dt>Facility contract</dt><dd><code>{shortId(capitalFacilityAddress)}</code></dd></div>
            <div><dt>Target</dt><dd>9 USDT0</dd></div>
            <div><dt>Collateral required next</dt><dd>1 FXRP</dd></div>
            <div><dt>Session expiry</dt><dd>7 days from creation</dd></div>
            <div><dt>Coordinator</dt><dd>Not connected in public build</dd></div>
          </dl>
          <div className="borrower-steps" aria-label="Borrower sandbox lifecycle">
            <SandboxStep number="1" title="Create Root Accord" detail="Your connected wallet becomes the borrower." state={created ? "complete" : phase === "prepared" ? "ready" : "next"} />
            <SandboxStep number="2" title="Lock 1 FXRP" detail="Requires a separate token approval and wallet transaction." state="blocked" />
            <SandboxStep number="3" title="Open provider session" detail="The configured coordinator prepares fixture offers." state="waiting" />
            <SandboxStep number="4" title="Fund Child Accords" detail="Provider fixture accounts fund the selected commitments." state="waiting" />
            <SandboxStep number="5" title="Draw and repay" detail="Borrower actions remain wallet-approved." state="waiting" />
          </div>
        </section>

        <section className="borrower-action-card" aria-labelledby="borrower-action-title">
          <div className="borrower-action-card__icon"><LockClosedIcon aria-hidden="true" /></div>
          <span className="canonical-label">AUTHORITY BOUNDARY</span>
          <h2 id="borrower-action-title">{created ? "Borrower authority is now bound." : "Start with your wallet."}</h2>
          <p>{created ? "The chain recorded your wallet as the borrower of this new Root Accord. The existing public proof facility remains untouched." : "Connect a wallet, switch to Coston2, and review the exact Root Accord creation intent before signing."}</p>

          {!connected && <div className="action-gate"><WalletIcon aria-hidden="true" /><span><strong>Connect a Coston2 wallet.</strong><small>Concord checks only the public address. The private key stays in the wallet.</small></span><WalletControl /></div>}
          {connected && !onCoston2 && <div className="action-gate action-gate--warning"><ExclamationTriangleIcon aria-hidden="true" /><span><strong>Switch to Coston2.</strong><small>This sandbox is fixed to Flare Testnet chain 114.</small></span><button className="button button--secondary button--compact" onClick={() => switchChain({ chainId: coston2.id })} disabled={isSwitching} type="button">{isSwitching ? "Switching…" : "Switch network"}</button></div>}
          {connected && onCoston2 && !created && <div className="action-gate"><CheckCircleIcon aria-hidden="true" /><span><strong>Wallet ready.</strong><small>{address}</small></span><span className="status status--success">Borrower candidate</span></div>}

          {intent && !created && <section className="intent-review" aria-label="Prepared borrower Root Accord intent">
            <div className="intent-review__title"><div><span className="eyebrow">READY FOR WALLET REVIEW</span><strong>Create 9 USDT0 Root Accord</strong></div><span>Unsigned</span></div>
            <dl>
              <div><dt>Root ID</dt><dd><code>{shortId(intent.rootAccordId, 10, 8)}</code></dd></div>
              <div><dt>Expiry</dt><dd>{new Date(Number(intent.validUntil) * 1000).toLocaleDateString()}</dd></div>
              <div><dt>Native value</dt><dd>0 C2FLR</dd></div>
            </dl>
            <details><summary>Inspect calldata and preconditions</summary><code className="intent-calldata">{intent.data}</code><ul>{intent.preconditions.map((item) => <li key={item}>{item}</li>)}</ul><p>{intent.warnings.join(" ")}</p></details>
          </section>}

          {created && intent && <div className="borrower-created" role="status" aria-live="polite">
            <CheckCircleIcon aria-hidden="true" />
            <div><strong>You are the borrower of this Root Accord.</strong><p><code>{intent.rootAccordId}</code></p><button className="copy-root" onClick={copyRoot} type="button"><ClipboardDocumentIcon aria-hidden="true" />{copied ? "Copied" : "Copy Root ID"}</button></div>
          </div>}

          {(sendError || receipt.isError) && <p className="transaction-error" role="alert">{errorMessage(sendError ?? receipt.error)}</p>}
          {hash && <div className={created ? "transaction-state transaction-state--success" : "transaction-state"} aria-live="polite"><CheckCircleIcon aria-hidden="true" /><span><strong>{created ? "Root Accord confirmed on Coston2." : "Root Accord submitted; waiting for confirmation."}</strong><small>{created ? "Borrower authority is bound to the connected wallet." : "The wallet returned a public transaction hash."}</small></span><a href={explorerTx(hash)} target="_blank" rel="noreferrer">Explorer <ArrowTopRightOnSquareIcon /></a></div>}

          <div className="borrower-action-card__actions">
            {created ? <><a className="button button--secondary" href={coston2FaucetUrl} target="_blank" rel="noreferrer">Get test assets <ArrowTopRightOnSquareIcon aria-hidden="true" /></a><button className="button button--primary" onClick={reset} type="button">Start another sandbox <ArrowRightIcon aria-hidden="true" /></button></> : <><button className="button button--quiet" onClick={reset} disabled={isSending} type="button">Reset</button>{!intent && <button className="button button--primary" onClick={prepare} disabled={!connected || !onCoston2} type="button">Prepare Root Accord <ArrowRightIcon aria-hidden="true" /></button>}{intent && <button className="button button--primary" onClick={submit} disabled={!onCoston2 || isSending} type="button">{isSending ? "Open wallet…" : "Approve in wallet"}</button>}</>}
          </div>
        </section>
      </div>

      <div className="borrower-runner-note"><ArrowRightIcon aria-hidden="true" /><div><strong>What happens after creation?</strong><p>The coordinator watches this exact Root ID, validates the borrower and bounded parameters, then prepares the provider allocation. It must not silently broadcast borrower actions. In this build, provider funding and verifier credentials remain team-operated; the recorded facility is not reused.</p></div></div>
      <div className="borrower-truth-links"><Link className="text-link" to={`/facilities/${facility.id}`}>Open recorded Coston2 facility <ArrowRightIcon aria-hidden="true" /></Link><Link className="text-link" to="/settings">Review network disclosure <ArrowRightIcon aria-hidden="true" /></Link></div>
    </div>
  );
}

function SandboxStep({ number, title, detail, state }: { number: string; title: string; detail: string; state: "complete" | "ready" | "next" | "blocked" | "waiting" }) {
  const stateLabel = { complete: "Complete", ready: "Ready", next: "Next", blocked: "Needs wallet", waiting: "Runner" }[state];
  return <div className={`borrower-step borrower-step--${state}`}><span>{state === "complete" ? <CheckCircleIcon aria-hidden="true" /> : number}</span><div><strong>{title}</strong><small>{detail}</small></div><em>{stateLabel}</em></div>;
}

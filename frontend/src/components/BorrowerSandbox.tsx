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
import { formatUnits, keccak256, parseUnits, stringToHex, type Address, type Hex } from "viem";
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
  buildApproveAssetIntent,
  buildCreateRootIntent,
  buildLockCollateralIntent,
  buildOpenSyndicationIntent,
  capitalFacilityAddress,
  collateralAssetAddress,
  collateralAssetDecimals,
  createBorrowerSessionId,
  sandboxProviderAddresses,
  type AssetApprovalIntent,
  type CreateRootIntent,
  type LockCollateralIntent,
  type OpenSyndicationIntent,
} from "../transaction-intents";
import { WalletControl } from "./WalletControl";

const targetCapacity = parseUnits("9", 6);
const collateralAmount = parseUnits("1", collateralAssetDecimals);
const sandboxPolicyHash = keccak256(stringToHex("concord:borrower-sandbox:v1"));
const maxFeeBps = 700;

function errorMessage(error: Error | null | undefined) {
  return error?.message.split("\n")[0] ?? "";
}

type SandboxPhase = "idle" | "prepared" | "submitted";
type LifecycleIntent = AssetApprovalIntent | LockCollateralIntent | OpenSyndicationIntent;

export function BorrowerSandbox() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<SandboxPhase>("idle");
  const [intent, setIntent] = useState<CreateRootIntent>();
  const [borrowerAddress, setBorrowerAddress] = useState<Address>();
  const [hash, setHash] = useState<Hex>();
  const [approvalIntent, setApprovalIntent] = useState<AssetApprovalIntent>();
  const [lockIntent, setLockIntent] = useState<LockCollateralIntent>();
  const [openIntent, setOpenIntent] = useState<OpenSyndicationIntent>();
  const [approvalHash, setApprovalHash] = useState<Hex>();
  const [lockHash, setLockHash] = useState<Hex>();
  const [syndicationHash, setSyndicationHash] = useState<Hex>();
  const [copied, setCopied] = useState(false);
  const connection = useConnection();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();
  const {
    mutate: sendTransaction,
    error: sendError,
    isPending: isSending,
    reset: resetSend,
  } = useSendTransaction();
  const {
    mutate: sendLifecycleTransaction,
    error: lifecycleSendError,
    isPending: isLifecycleSending,
    reset: resetLifecycleSend,
  } = useSendTransaction();
  const rootReceipt = useWaitForTransactionReceipt({
    hash,
    chainId: coston2.id,
    confirmations: 1,
    query: { enabled: Boolean(hash) },
  });
  const approvalReceipt = useWaitForTransactionReceipt({
    hash: approvalHash,
    chainId: coston2.id,
    confirmations: 1,
    query: { enabled: Boolean(approvalHash) },
  });
  const lockReceipt = useWaitForTransactionReceipt({
    hash: lockHash,
    chainId: coston2.id,
    confirmations: 1,
    query: { enabled: Boolean(lockHash) },
  });
  const syndicationReceipt = useWaitForTransactionReceipt({
    hash: syndicationHash,
    chainId: coston2.id,
    confirmations: 1,
    query: { enabled: Boolean(syndicationHash) },
  });

  const connected = connection.status === "connected";
  const address = connected ? connection.address : undefined;
  const onCoston2 = connected && connection.chainId === coston2.id;
  const created = rootReceipt.isSuccess;
  const walletMatchesRoot = Boolean(
    address && borrowerAddress && address.toLowerCase() === borrowerAddress.toLowerCase(),
  );
  const canContinue = created && onCoston2 && walletMatchesRoot;
  const collateralApproved = approvalReceipt.isSuccess;
  const collateralLocked = lockReceipt.isSuccess;
  const syndicationOpened = syndicationReceipt.isSuccess;
  const collateralDisplay = formatUnits(collateralAmount, collateralAssetDecimals);

  const reset = useCallback(() => {
    setPhase("idle");
    setIntent(undefined);
    setBorrowerAddress(undefined);
    setHash(undefined);
    setApprovalIntent(undefined);
    setLockIntent(undefined);
    setOpenIntent(undefined);
    setApprovalHash(undefined);
    setLockHash(undefined);
    setSyndicationHash(undefined);
    setCopied(false);
    resetSend();
    resetLifecycleSend();
  }, [resetLifecycleSend, resetSend]);

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
    setBorrowerAddress(address);
    setPhase("prepared");
    setHash(undefined);
    resetSend();
  };

  const submit = () => {
    if (!intent || !onCoston2 || isSending) return;
    sendTransaction(
      { to: intent.to, data: intent.data, value: intent.value },
      {
        onSuccess: (transactionHash) => {
          setHash(transactionHash);
          setPhase("submitted");
        },
      },
    );
  };

  const submitLifecycle = (nextIntent: LifecycleIntent, onSuccess: (transactionHash: Hex) => void) => {
    if (!canContinue || isLifecycleSending) return;
    resetLifecycleSend();
    sendLifecycleTransaction(
      { to: nextIntent.to, data: nextIntent.data, value: nextIntent.value },
      { onSuccess },
    );
  };

  const prepareApproval = () => {
    if (!intent || !canContinue) return;
    setApprovalIntent(
      buildApproveAssetIntent({
        assetAddress: collateralAssetAddress,
        spender: capitalFacilityAddress,
        amount: collateralAmount,
        assetSymbol: "FXRP",
      }),
    );
    resetLifecycleSend();
  };

  const submitApproval = () => {
    if (!approvalIntent) return;
    submitLifecycle(approvalIntent, setApprovalHash);
  };

  const prepareCollateralLock = () => {
    if (!intent || !canContinue || !collateralApproved) return;
    setLockIntent(
      buildLockCollateralIntent({
        rootAccordId: intent.rootAccordId,
        amount: collateralAmount,
      }),
    );
    resetLifecycleSend();
  };

  const submitCollateralLock = () => {
    if (!lockIntent) return;
    submitLifecycle(lockIntent, setLockHash);
  };

  const prepareProviderSession = () => {
    if (!intent || !borrowerAddress || !canContinue || !collateralLocked) return;
    const roundExpiry = BigInt(
      Math.min(Number(intent.validUntil), Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60),
    );
    setOpenIntent(
      buildOpenSyndicationIntent({
        rootAccordId: intent.rootAccordId,
        roundId: createBorrowerSessionId(borrowerAddress, intent.rootAccordId, "round"),
        maxFeeBps,
        roundExpiry,
        rootValidUntil: intent.validUntil,
        providerAddresses: sandboxProviderAddresses,
      }),
    );
    resetLifecycleSend();
  };

  const submitProviderSession = () => {
    if (!openIntent) return;
    submitLifecycle(openIntent, setSyndicationHash);
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

  const rootError = sendError ?? rootReceipt.error;
  const lifecycleError = lifecycleSendError ?? approvalReceipt.error ?? lockReceipt.error ?? syndicationReceipt.error;

  return (
    <div className="borrower-sandbox" data-testid="borrower-sandbox" ref={dialogRef} tabIndex={-1}>
      <div className="borrower-boundary" role="note">
        <div className="borrower-boundary__icon"><ShieldCheckIcon aria-hidden="true" /></div>
        <div><strong>LIVE BORROWER SANDBOX · COSTON2</strong><p>This creates a fresh Root Accord and continues through borrower-owned collateral and session actions. Every write requires explicit wallet approval.</p></div>
        <span className="status status--warning">Testnet writes</span>
      </div>

      <div className="page-heading borrower-heading">
        <div>
          <div className="canonical-line"><span className="canonical-label">BORROWER SANDBOX</span><span className="demo-step-count">Fresh facility · chain 114</span></div>
          <h1>Become the borrower of a new facility.</h1>
          <p>Concord binds borrower authority when your wallet creates the Root Accord, then lets that same wallet approve collateral, lock it, and open a bounded provider session. The recorded facility is not reused, and this sandbox never embeds a private key.</p>
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
            <div><dt>Collateral</dt><dd>1 FXRP · {collateralAssetDecimals} decimals</dd></div>
            <div><dt>Session expiry</dt><dd>7 days from creation</dd></div>
            <div><dt>Coordinator</dt><dd>{syndicationOpened ? "Session opened · runner boundary next" : "Borrower action only in public build"}</dd></div>
          </dl>
          <div className="borrower-steps" aria-label="Borrower sandbox lifecycle">
            <SandboxStep number="1" title="Create Root Accord" detail="Your connected wallet becomes the borrower." state={created ? "complete" : phase === "prepared" ? "ready" : "next"} />
            <SandboxStep number="2" title="Approve and lock 1 FXRP" detail={!created ? "Create the Root Accord first." : collateralLocked ? "Collateral is locked against this Root Accord." : "Approve FXRP, then lock it in a separate wallet transaction."} state={!created ? "waiting" : collateralLocked ? "complete" : "ready"} />
            <SandboxStep number="3" title="Open provider session" detail={!collateralLocked ? "Requires the borrower-owned collateral lock." : syndicationOpened ? "A bounded round is open for fixture providers." : "The borrower opens a bounded round with fixture eligibility inputs."} state={!collateralLocked ? "waiting" : syndicationOpened ? "complete" : "ready"} />
            <SandboxStep number="4" title="Fund Child Accords" detail="Requires signed provider quotes, FCC output, verifier evidence, and provider funding." state="waiting" />
            <SandboxStep number="5" title="Draw and repay" detail="Borrower actions remain wallet-approved after capacity is funded." state="waiting" />
          </div>
        </section>

        <section className="borrower-action-card" aria-labelledby="borrower-action-title">
          <div className="borrower-action-card__icon"><LockClosedIcon aria-hidden="true" /></div>
          <span className="canonical-label">AUTHORITY BOUNDARY</span>
          <h2 id="borrower-action-title">{syndicationOpened ? "Provider session opened." : created ? "Continue the borrower lifecycle." : "Start with your wallet."}</h2>
          <p>{syndicationOpened ? "The borrower-owned portion is complete. The next state depends on confidential coordination evidence and provider-side commitments; the public build will not invent those actions." : created ? "The chain recorded your wallet as the borrower of this new Root Accord. Continue with FXRP approval, collateral lock, and a bounded provider-session opening." : "Connect a wallet, switch to Coston2, and review the exact Root Accord creation intent before signing."}</p>

          {!connected && <div className="action-gate"><WalletIcon aria-hidden="true" /><span><strong>Connect a Coston2 wallet.</strong><small>Concord checks only the public address. The private key stays in the wallet.</small></span><WalletControl /></div>}
          {connected && !onCoston2 && <div className="action-gate action-gate--warning"><ExclamationTriangleIcon aria-hidden="true" /><span><strong>Switch to Coston2.</strong><small>This sandbox is fixed to Flare Testnet chain 114.</small></span><button className="button button--secondary button--compact" onClick={() => switchChain({ chainId: coston2.id })} disabled={isSwitching} type="button">{isSwitching ? "Switching…" : "Switch network"}</button></div>}
          {connected && onCoston2 && !created && <div className="action-gate"><CheckCircleIcon aria-hidden="true" /><span><strong>Wallet ready.</strong><small>{address}</small></span><span className="status status--success">Borrower candidate</span></div>}
          {connected && onCoston2 && created && !walletMatchesRoot && <div className="action-gate action-gate--warning"><ExclamationTriangleIcon aria-hidden="true" /><span><strong>Reconnect the borrower wallet.</strong><small>This Root Accord was created by {shortId(borrowerAddress ?? "0x0000000000000000000000000000000000000000")}.</small></span><span className="status status--warning">Signer mismatch</span></div>}
          {connected && onCoston2 && created && walletMatchesRoot && <div className="action-gate"><CheckCircleIcon aria-hidden="true" /><span><strong>Borrower wallet matches.</strong><small>{address}</small></span><span className="status status--success">Authority verified</span></div>}

          {intent && !created && <section className="intent-review" aria-label="Prepared borrower Root Accord intent">
            <IntentReviewHeader label="READY FOR WALLET REVIEW" title="Create 9 USDT0 Root Accord" status="Unsigned" />
            <dl>
              <div><dt>Root ID</dt><dd><code>{shortId(intent.rootAccordId, 10, 8)}</code></dd></div>
              <div><dt>Expiry</dt><dd>{new Date(Number(intent.validUntil) * 1000).toLocaleDateString()}</dd></div>
              <div><dt>Native value</dt><dd>0 C2FLR</dd></div>
            </dl>
            <IntentDetails intent={intent} />
          </section>}

          {created && intent && <div className="borrower-created" role="status" aria-live="polite">
            <CheckCircleIcon aria-hidden="true" />
            <div><strong>You are the borrower of this Root Accord.</strong><p>The recorded facility is not reused. <code>{intent.rootAccordId}</code></p><button className="copy-root" onClick={copyRoot} type="button"><ClipboardDocumentIcon aria-hidden="true" />{copied ? "Copied" : "Copy Root ID"}</button></div>
          </div>}

          {created && intent && <section className="borrower-lifecycle" aria-label="Continue borrower lifecycle">
            <div className="section-header"><div><span className="eyebrow">BORROWER-OWNED ACTIONS</span><h3>Continue from this Root Accord</h3></div><span className="status status--neutral">{syndicationOpened ? "Coordinator boundary" : "Wallet reviewed"}</span></div>
            {!walletMatchesRoot && <p className="lifecycle-warning"><ExclamationTriangleIcon aria-hidden="true" />Reconnect the wallet that created this Root Accord before preparing the next intent.</p>}

            <div className={`lifecycle-stage ${collateralApproved ? "lifecycle-stage--complete" : ""}`}>
              <div className="lifecycle-stage__heading"><div><span className="eyebrow">STEP 2 · TOKEN ALLOWANCE</span><strong>Approve {collateralDisplay} FXRP</strong></div><span className={`status status--${collateralApproved ? "success" : "neutral"}`}>{collateralApproved ? "Confirmed" : approvalHash ? "Submitted" : "Not prepared"}</span></div>
              {!collateralApproved && !approvalIntent && <button className="button button--secondary button--compact" onClick={prepareApproval} disabled={!canContinue} type="button">Prepare FXRP approval <ArrowRightIcon aria-hidden="true" /></button>}
              {!collateralApproved && approvalIntent && <>
                <dl className="lifecycle-facts"><div><dt>Token</dt><dd>{approvalIntent.assetSymbol} · {collateralDisplay}</dd></div><div><dt>Spender</dt><dd><code>{shortId(approvalIntent.spender)}</code></dd></div><div><dt>Native value</dt><dd>0 C2FLR</dd></div></dl>
                <IntentDetails intent={approvalIntent} />
                <button className="button button--primary button--compact" onClick={submitApproval} disabled={!canContinue || isLifecycleSending || Boolean(approvalHash && !approvalReceipt.isError)} type="button">{isLifecycleSending ? "Open wallet…" : approvalHash && !approvalReceipt.isError ? "Waiting for confirmation…" : "Approve FXRP in wallet"}</button>
              </>}
              {approvalHash && <LifecycleTransaction hash={approvalHash} isSuccess={approvalReceipt.isSuccess} isError={approvalReceipt.isError} label="FXRP approval" />}
            </div>

            <div className={`lifecycle-stage ${collateralLocked ? "lifecycle-stage--complete" : ""}`}>
              <div className="lifecycle-stage__heading"><div><span className="eyebrow">STEP 2 · COLLATERAL</span><strong>Lock {collateralDisplay} FXRP</strong></div><span className={`status status--${collateralLocked ? "success" : "neutral"}`}>{collateralLocked ? "Confirmed" : lockHash ? "Submitted" : "Needs approval"}</span></div>
              {!collateralLocked && !lockIntent && <button className="button button--secondary button--compact" onClick={prepareCollateralLock} disabled={!canContinue || !collateralApproved} type="button">Prepare collateral lock <ArrowRightIcon aria-hidden="true" /></button>}
              {!collateralLocked && lockIntent && <>
                <dl className="lifecycle-facts"><div><dt>Root Accord</dt><dd><code>{shortId(lockIntent.rootAccordId)}</code></dd></div><div><dt>Collateral</dt><dd>{collateralDisplay} FXRP</dd></div><div><dt>Native value</dt><dd>0 C2FLR</dd></div></dl>
                <IntentDetails intent={lockIntent} />
                <button className="button button--primary button--compact" onClick={submitCollateralLock} disabled={!canContinue || isLifecycleSending || Boolean(lockHash && !lockReceipt.isError)} type="button">{isLifecycleSending ? "Open wallet…" : lockHash && !lockReceipt.isError ? "Waiting for confirmation…" : "Lock FXRP in wallet"}</button>
              </>}
              {lockHash && <LifecycleTransaction hash={lockHash} isSuccess={lockReceipt.isSuccess} isError={lockReceipt.isError} label="Collateral lock" />}
            </div>

            <div className={`lifecycle-stage ${syndicationOpened ? "lifecycle-stage--complete" : ""}`}>
              <div className="lifecycle-stage__heading"><div><span className="eyebrow">STEP 3 · COORDINATION</span><strong>Open provider session</strong></div><span className={`status status--${syndicationOpened ? "success" : "neutral"}`}>{syndicationOpened ? "Confirmed" : syndicationHash ? "Submitted" : "Needs collateral"}</span></div>
              {!syndicationOpened && !openIntent && <button className="button button--secondary button--compact" onClick={prepareProviderSession} disabled={!canContinue || !collateralLocked} type="button">Prepare provider session <ArrowRightIcon aria-hidden="true" /></button>}
              {!syndicationOpened && openIntent && <>
                <dl className="lifecycle-facts"><div><dt>Round ID</dt><dd><code>{shortId(openIntent.roundId)}</code></dd></div><div><dt>Eligible fixtures</dt><dd>{openIntent.providerAddresses.length} providers · {openIntent.maxFeeBps} bps cap</dd></div><div><dt>Round expiry</dt><dd>{new Date(Number(openIntent.roundExpiry) * 1000).toLocaleDateString()}</dd></div></dl>
                <div className="provider-addresses">{openIntent.providerAddresses.map((provider) => <code key={provider}>{shortId(provider, 8, 6)}</code>)}</div>
                <IntentDetails intent={openIntent} />
                <button className="button button--primary button--compact" onClick={submitProviderSession} disabled={!canContinue || isLifecycleSending || Boolean(syndicationHash && !syndicationReceipt.isError)} type="button">{isLifecycleSending ? "Open wallet…" : syndicationHash && !syndicationReceipt.isError ? "Waiting for confirmation…" : "Open session in wallet"}</button>
              </>}
              {syndicationHash && <LifecycleTransaction hash={syndicationHash} isSuccess={syndicationReceipt.isSuccess} isError={syndicationReceipt.isError} label="Provider session" />}
              {syndicationOpened && <div className="lifecycle-boundary"><ShieldCheckIcon aria-hidden="true" /><div><strong>Coordinator boundary reached.</strong><p>The round is open. Signed provider quotes, FCC/CoFill evidence, allocation verification, Child Accord materialization, and provider funding are not fabricated or silently broadcast by this frontend.</p></div></div>}
            </div>
          </section>}

          {rootError && <p className="transaction-error" role="alert">{errorMessage(rootError)}</p>}
          {lifecycleError && <p className="transaction-error" role="alert">{errorMessage(lifecycleError)}</p>}
          {hash && <LifecycleTransaction hash={hash} isSuccess={rootReceipt.isSuccess} isError={rootReceipt.isError} label="Root Accord" />}

          <div className="borrower-action-card__actions">
            {created ? <><a className="button button--secondary" href={coston2FaucetUrl} target="_blank" rel="noreferrer">Get test assets <ArrowTopRightOnSquareIcon aria-hidden="true" /></a><button className="button button--primary" onClick={reset} type="button">Start another sandbox <ArrowRightIcon aria-hidden="true" /></button></> : <><button className="button button--quiet" onClick={reset} disabled={isSending || isLifecycleSending} type="button">Reset</button>{!intent && <button className="button button--primary" onClick={prepare} disabled={!connected || !onCoston2} type="button">Prepare Root Accord <ArrowRightIcon aria-hidden="true" /></button>}{intent && <button className="button button--primary" onClick={submit} disabled={!onCoston2 || isSending} type="button">{isSending ? "Open wallet…" : "Approve in wallet"}</button>}</>}
          </div>
        </section>
      </div>

      <div className="borrower-runner-note"><ArrowRightIcon aria-hidden="true" /><div><strong>Where the public sandbox stops</strong><p>After the borrower opens the session, the coordinator watches this exact Root ID and prepares the private provider-allocation path. The UI does not invent provider quotes, FCC evidence, verifier credentials, Child Accords, provider funding, draw capacity, or repayment success. Use the guided demo for the recorded end-to-end lifecycle.</p></div></div>
      <div className="borrower-truth-links"><Link className="text-link" to="/demo">Continue full recorded lifecycle demo <ArrowRightIcon aria-hidden="true" /></Link><Link className="text-link" to={`/facilities/${facility.id}`}>Open recorded Coston2 facility <ArrowRightIcon aria-hidden="true" /></Link><Link className="text-link" to="/settings">Review network disclosure <ArrowRightIcon aria-hidden="true" /></Link></div>
    </div>
  );
}

function IntentReviewHeader({ label, title, status }: { label: string; title: string; status: string }) {
  return <div className="intent-review__title"><div><span className="eyebrow">{label}</span><strong>{title}</strong></div><span>{status}</span></div>;
}

function IntentDetails({ intent }: { intent: { data: Hex; preconditions: readonly string[]; warnings: readonly string[] } }) {
  return <details><summary>Inspect calldata and preconditions</summary><code className="intent-calldata">{intent.data}</code><ul>{intent.preconditions.map((item) => <li key={item}>{item}</li>)}</ul><p>{intent.warnings.join(" ")}</p></details>;
}

function LifecycleTransaction({ hash, isSuccess, isError, label }: { hash: Hex; isSuccess: boolean; isError: boolean; label: string }) {
  return <div className={isSuccess ? "transaction-state transaction-state--success" : "transaction-state"} aria-live="polite"><CheckCircleIcon aria-hidden="true" /><span><strong>{isSuccess ? `${label} confirmed on Coston2.` : isError ? `${label} reverted or was rejected.` : `${label} submitted; waiting for confirmation.`}</strong><small>{isSuccess ? "The public receipt is available." : isError ? "Review the wallet or RPC error and prepare the intent again if needed." : "The wallet returned a public transaction hash."}</small></span><a href={explorerTx(hash)} target="_blank" rel="noreferrer">Explorer <ArrowTopRightOnSquareIcon /></a></div>;
}

function SandboxStep({ number, title, detail, state }: { number: string; title: string; detail: string; state: "complete" | "ready" | "next" | "blocked" | "waiting" }) {
  const stateLabel = { complete: "Complete", ready: "Ready", next: "Next", blocked: "Needs wallet", waiting: "Runner" }[state];
  return <div className={`borrower-step borrower-step--${state}`}><span>{state === "complete" ? <CheckCircleIcon aria-hidden="true" /> : number}</span><div><strong>{title}</strong><small>{detail}</small></div><em>{stateLabel}</em></div>;
}

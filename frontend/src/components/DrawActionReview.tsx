import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatUnits, parseUnits, type Hex } from "viem";
import {
  useConnection,
  useReadContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { explorerTx, facility, formatToken, shortId } from "../data/concord";
import { coston2 } from "../web3";
import {
  buildDrawIntent,
  capitalFacilityAbi,
  capitalFacilityAddress,
  createDrawId,
  type DrawIntent,
} from "../transaction-intents";
import { WalletControl } from "./WalletControl";

function message(error: Error | null) {
  return error?.message.split("\n")[0] ?? "";
}

export function DrawActionReview({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState("1");
  const [intent, setIntent] = useState<DrawIntent>();
  const [hash, setHash] = useState<Hex>();
  const connection = useConnection();
  const {
    mutate: sendTransaction,
    error: sendError,
    isPending: isSending,
    reset: resetSend,
  } = useSendTransaction();
  const connected = connection.status === "connected";
  const address = connected ? connection.address : undefined;
  const onCoston2 = connected && connection.chainId === coston2.id;
  const isBorrower = Boolean(
    address && address.toLowerCase() === facility.borrower.toLowerCase(),
  );

  const liveCapacity = useReadContract({
    address: capitalFacilityAddress,
    abi: capitalFacilityAbi,
    functionName: "availableCapacity",
    args: [facility.id as Hex],
    chainId: coston2.id,
    query: { enabled: open },
  });
  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: coston2.id,
    confirmations: 1,
    query: { enabled: Boolean(hash) },
  });

  let amountBaseUnits = 0n;
  let amountError = "";
  try {
    amountBaseUnits = parseUnits(amount || "0", facility.liquidityAsset.decimals);
    if (amountBaseUnits <= 0n) amountError = "Enter an amount greater than zero.";
    else if (
      liveCapacity.data !== undefined &&
      amountBaseUnits > liveCapacity.data
    ) {
      amountError = "Amount exceeds live available capacity.";
    }
  } catch {
    amountError = "Enter a valid USDT0 amount.";
  }

  const reset = useCallback(() => {
    setAmount("1");
    setIntent(undefined);
    setHash(undefined);
    resetSend();
  }, [resetSend]);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSending) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, isSending, open]);

  useEffect(() => {
    if (receipt.isSuccess) void liveCapacity.refetch();
  }, [liveCapacity.refetch, receipt.isSuccess]);

  if (!open) return null;

  const canPrepare =
    Boolean(address) &&
    onCoston2 &&
    isBorrower &&
    liveCapacity.isSuccess &&
    !amountError &&
    !hash;
  const capacityLabel =
    liveCapacity.data === undefined
      ? "Reading Coston2…"
      : `${formatToken(liveCapacity.data.toString())} USDT0`;

  const prepare = () => {
    if (!address || !canPrepare) return;
    const random =
      globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2);
    const drawId = createDrawId(
      facility.id as Hex,
      address,
      `${Date.now()}:${random}`,
    );
    setIntent(
      buildDrawIntent({
        rootAccordId: facility.id as Hex,
        drawId,
        amount: amountBaseUnits,
      }),
    );
  };

  const submit = () => {
    if (!intent || !canPrepare) return;
    sendTransaction(
      {
        to: intent.to,
        data: intent.data,
        value: intent.value,
      },
      { onSuccess: (transactionHash) => setHash(transactionHash) },
    );
  };

  return (
    <div className="modal-layer">
      <button
        className="modal-scrim"
        aria-label="Close action review"
        onClick={close}
        disabled={isSending}
      />
      <div
        className="action-review"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-review-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="action-review__header">
          <div className="action-review__icon">
            <ArrowDownTrayIcon aria-hidden="true" />
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close action review"
            disabled={isSending}
          >
            <XMarkIcon />
          </button>
        </div>
        <span className="eyebrow">COSTON2 · UNSIGNED INTENT</span>
        <h2 id="action-review-title">Prepare a facility draw</h2>
        <p>
          Concord creates the exact calldata in this browser. Nothing is sent
          until the treasury approves the transaction in its wallet.
        </p>

        <div className="draw-form">
          <label htmlFor="draw-amount">
            <span>Draw amount</span>
            <small>Live capacity: {capacityLabel}</small>
          </label>
          <div className="token-input">
            <input
              id="draw-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setIntent(undefined);
                setHash(undefined);
                resetSend();
              }}
              disabled={Boolean(hash) || isSending}
              aria-describedby={amountError ? "draw-amount-error" : undefined}
            />
            <span>USDT0</span>
          </div>
          {amountError && (
            <small id="draw-amount-error" className="form-error">
              {amountError}
            </small>
          )}
        </div>

        <dl className="intent-facts">
          <div><dt>Network</dt><dd>Coston2 · 114</dd></div>
          <div><dt>Facility</dt><dd><code>{shortId(capitalFacilityAddress)}</code></dd></div>
          <div><dt>Root Accord</dt><dd><code>{shortId(facility.id)}</code></dd></div>
          <div><dt>Authority</dt><dd>Treasury borrower only</dd></div>
        </dl>

        {!connected && (
          <div className="action-gate">
            <WalletIcon aria-hidden="true" />
            <span><strong>Connect the treasury wallet.</strong><small>A public wallet address is required to check authority; Concord never receives the private key.</small></span>
            <WalletControl compact />
          </div>
        )}
        {connected && !onCoston2 && (
          <div className="action-gate action-gate--warning">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span><strong>Switch to Coston2.</strong><small>The action is fixed to Flare Testnet chain 114.</small></span>
            <WalletControl compact />
          </div>
        )}
        {connected && onCoston2 && !isBorrower && (
          <div className="action-gate action-gate--warning">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span><strong>This wallet is not the borrower.</strong><small>Only {shortId(facility.borrower)} can draw from this Root Accord.</small></span>
          </div>
        )}
        {liveCapacity.isError && (
          <div className="action-gate action-gate--warning" role="status">
            <ExclamationTriangleIcon aria-hidden="true" />
            <span><strong>Live capacity could not be read.</strong><small>No transaction can be prepared until the Coston2 RPC responds.</small></span>
          </div>
        )}

        {intent && (
          <section className="intent-review" aria-label="Prepared unsigned intent">
            <div className="intent-review__title">
              <div><span className="eyebrow">READY FOR WALLET REVIEW</span><strong>{formatUnits(intent.amount, facility.liquidityAsset.decimals)} USDT0 draw</strong></div>
              <span>Unsigned</span>
            </div>
            <dl>
              <div><dt>Draw ID</dt><dd><code>{shortId(intent.drawId, 10, 8)}</code></dd></div>
              <div><dt>Contract</dt><dd><code>{shortId(intent.to)}</code></dd></div>
              <div><dt>Native value</dt><dd>0 C2FLR</dd></div>
            </dl>
            <details>
              <summary>Inspect calldata and preconditions</summary>
              <code className="intent-calldata">{intent.data}</code>
              <ul>{intent.preconditions.map((item) => <li key={item}>{item}</li>)}</ul>
              <p>{intent.warnings.join(" ")}</p>
            </details>
          </section>
        )}

        {hash && (
          <div className={receipt.isSuccess ? "transaction-state transaction-state--success" : "transaction-state"} aria-live="polite">
            {receipt.isSuccess ? <CheckCircleIcon aria-hidden="true" /> : <WalletIcon aria-hidden="true" />}
            <span>
              <strong>{receipt.isSuccess ? "Draw confirmed on Coston2." : "Transaction submitted; waiting for confirmation."}</strong>
              <small>{receipt.isSuccess && liveCapacity.data !== undefined ? `Live available capacity: ${formatToken(liveCapacity.data.toString())} USDT0.` : "The wallet returned a public transaction hash."}</small>
            </span>
            <a href={explorerTx(hash)} target="_blank" rel="noreferrer">Explorer <ArrowTopRightOnSquareIcon /></a>
          </div>
        )}

        {(sendError || receipt.isError) && (
          <p className="transaction-error" role="alert">
            {message(sendError ?? receipt.error)}
          </p>
        )}

        <div className="review-boundary">
          <WalletIcon aria-hidden="true" />
          <span>
            <strong>{intent ? "Unsigned calldata prepared locally." : "No transaction has been prepared or submitted."}</strong>
            <small>Wallet approval is explicit. USDT0 settlement and EVM state are public on Coston2.</small>
          </span>
        </div>
        <div className="action-review__actions">
          <button className="button button--secondary" onClick={close} disabled={isSending}>
            {receipt.isSuccess ? "Done" : "Close"}
          </button>
          {!intent && !hash && (
            <button className="button button--primary" onClick={prepare} disabled={!canPrepare}>
              Prepare unsigned intent
            </button>
          )}
          {intent && !hash && (
            <button className="button button--primary" onClick={submit} disabled={!canPrepare || isSending}>
              {isSending ? "Open wallet…" : "Approve in wallet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

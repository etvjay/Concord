import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { formatUnits } from "viem";
import {
  useBalance,
  useConnect,
  useConnection,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { coston2, coston2FaucetUrl } from "../web3";

function compactAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletControl({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const connection = useConnection();
  const { connectors, mutate: connect, isPending: isConnecting, error: connectError } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutate: switchChain, isPending: isSwitching } = useSwitchChain();
  const connected = connection.status === "connected";
  const address = connected ? connection.address : undefined;
  const chainId = connected ? connection.chainId : undefined;
  const onCoston2 = chainId === coston2.id;
  const balance = useBalance({
    address,
    chainId: coston2.id,
    query: { enabled: Boolean(address && onCoston2) },
  });

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const browserHasWallet = typeof window !== "undefined" && "ethereum" in window;

  if (!connected) {
    if (!browserHasWallet) {
      return (
        <a className="wallet-control wallet-control--install" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
          <WalletIcon aria-hidden="true" />
          <span>{compact ? "Wallet" : "Install wallet"}</span>
          <ArrowTopRightOnSquareIcon aria-hidden="true" />
        </a>
      );
    }

    return (
      <div className="wallet-control-wrap" ref={rootRef}>
        <button
          className="wallet-control wallet-control--connect"
          disabled={isConnecting || connectors.length === 0}
          onClick={() => connectors[0] && connect({ connector: connectors[0] })}
          type="button"
        >
          <WalletIcon aria-hidden="true" />
          <span>{isConnecting ? "Connecting…" : compact ? "Connect" : "Connect wallet"}</span>
        </button>
        {connectError && <span className="wallet-control__error" role="status">Connection was not approved.</span>}
      </div>
    );
  }

  if (!onCoston2) {
    return (
      <button
        className="wallet-control wallet-control--warning"
        disabled={isSwitching}
        onClick={() => switchChain({ chainId: coston2.id })}
        type="button"
      >
        <ExclamationTriangleIcon aria-hidden="true" />
        <span>{isSwitching ? "Switching…" : "Switch to Coston2"}</span>
      </button>
    );
  }

  const connectedAddress = address!;
  const formattedBalance = balance.data
    ? formatUnits(balance.data.value, balance.data.decimals)
    : undefined;

  return (
    <div className="wallet-control-wrap" ref={rootRef}>
      <button className="wallet-control wallet-control--connected" aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button">
        <span className="wallet-control__live" aria-hidden="true" />
        <span>{compact ? compactAddress(connectedAddress) : `${compactAddress(connectedAddress)} · Coston2`}</span>
        <ChevronDownIcon aria-hidden="true" />
      </button>
      {open && (
        <div className="wallet-popover" role="dialog" aria-label="Connected wallet">
          <span className="eyebrow">CONNECTED IDENTITY</span>
          <strong>{compactAddress(connectedAddress)}</strong>
          <p>{formattedBalance ? `${Number(formattedBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${balance.data?.symbol}` : "Reading Coston2 balance…"}</p>
          <div className="wallet-popover__network"><span aria-hidden="true" />Flare Testnet Coston2 · 114</div>
          <p className="wallet-popover__note">Concord never stores your private key. Every transaction requires approval in your wallet.</p>
          <div className="wallet-popover__actions">
            <a href={coston2FaucetUrl} target="_blank" rel="noreferrer">Get test assets <ArrowTopRightOnSquareIcon /></a>
            <button type="button" onClick={() => { disconnect(); setOpen(false); }}>Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );
}

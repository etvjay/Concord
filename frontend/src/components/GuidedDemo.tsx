import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  EyeSlashIcon,
  LockClosedIcon,
  PauseCircleIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";
import { children, evidence, facility } from "../data/concord";

const rootHref = `/facilities/${facility.id}`;

type DemoStage = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  event: string;
  committed: string;
  drawn: string;
  available: string;
  selected: string;
  providerState: string;
  providerAmounts: string[];
};

export const guidedDemoStages: DemoStage[] = [
  {
    id: "formation",
    eyebrow: "01 · ROOT ACCORD",
    title: "Start one facility",
    copy: "A treasury defines one FXRP-backed relationship with a 9 USDT0 target. The borrower, policy, and expiry belong to this facility.",
    event: "Facility formed locally",
    committed: "0",
    drawn: "0",
    available: "0",
    selected: "0",
    providerState: "Invited",
    providerAmounts: ["—", "—", "—"],
  },
  {
    id: "coordination",
    eyebrow: "02 · MAKKARI SESSION",
    title: "Coordinate providers privately",
    copy: "Three providers submit offers inside a bounded session. The demo shows that offers exist without exposing losing quotes or private constraints.",
    event: "Private offers received",
    committed: "0",
    drawn: "0",
    available: "0",
    selected: "0",
    providerState: "Offer withheld",
    providerAmounts: ["Withheld", "Withheld", "Withheld"],
  },
  {
    id: "allocation",
    eyebrow: "03 · COFILL ALLOCATION",
    title: "Select the executable allocation",
    copy: "CoFill deterministically selects 3 USDT0 from each provider toward the 9 USDT0 target. Accepted terms become attributable; losing quotes remain withheld.",
    event: "Allocation verified",
    committed: "0",
    drawn: "0",
    available: "0",
    selected: "9",
    providerState: "Selected",
    providerAmounts: ["3", "3", "3"],
  },
  {
    id: "funding",
    eyebrow: "04 · CHILD ACCORDS",
    title: "Fund independent commitments",
    copy: "Each selected provider funds its own Child Accord. Once all three commitments are funded, the Root Accord becomes active with reusable capacity.",
    event: "9 USDT0 capacity funded",
    committed: "9",
    drawn: "0",
    available: "9",
    selected: "9",
    providerState: "Funded",
    providerAmounts: ["3", "3", "3"],
  },
  {
    id: "draw",
    eyebrow: "05 · DRAW LEGS",
    title: "Draw across the facility",
    copy: "The borrower draws 4 USDT0. The protocol keeps the provider composition explicit: 3 USDT0 from Provider 1 and 1 USDT0 from Provider 2.",
    event: "4 USDT0 drawn across 2 legs",
    committed: "9",
    drawn: "4",
    available: "5",
    selected: "9",
    providerState: "Draw leg",
    providerAmounts: ["3", "1", "0"],
  },
  {
    id: "repayment",
    eyebrow: "06 · REPAYMENT",
    title: "Repay and reuse the relationship",
    copy: "The borrower repays the 4 USDT0 outstanding. Exposure returns to zero and the same 9 USDT0 capacity becomes available again.",
    event: "4 USDT0 repaid · capacity restored",
    committed: "9",
    drawn: "0",
    available: "9",
    selected: "9",
    providerState: "Available",
    providerAmounts: ["3", "3", "3"],
  },
];

function DemoMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`demo-metric${accent ? " demo-metric--accent" : ""}`}>
      <span>{label}</span>
      <strong>{value} <small>USDT0</small></strong>
    </div>
  );
}

export function GuidedDemo() {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = guidedDemoStages[stageIndex];
  const first = stageIndex === 0;
  const last = stageIndex === guidedDemoStages.length - 1;

  const move = (direction: number) => {
    setStageIndex((current) => Math.min(guidedDemoStages.length - 1, Math.max(0, current + direction)));
  };

  return (
    <div className="guided-demo" data-testid="guided-demo">
      <div className="demo-boundary" role="note">
        <div className="demo-boundary__icon"><SparklesIcon aria-hidden="true" /></div>
        <div><strong>LOCAL DEMO · NO TRANSACTIONS</strong><p>A deterministic scenario replay for teammates and judges. It uses local state only and never writes to Coston2.</p></div>
        <span className="status status--neutral"><PauseCircleIcon aria-hidden="true" />Simulated</span>
      </div>

      <div className="page-heading demo-heading">
        <div>
          <div className="canonical-line"><span className="canonical-label">TEAM DEMO</span><span className="demo-step-count">Step {stageIndex + 1} of {guidedDemoStages.length}</span></div>
          <h1>Run the full Concord story.</h1>
          <p>Move from facility formation to restored capacity in under two minutes. Canonical terms stay visible, with plain-language explanations beside them.</p>
        </div>
        <Link className="button button--secondary" to="/borrower"><UserGroupIcon aria-hidden="true" />Try borrower sandbox</Link>
      </div>

      <div className="demo-layout">
        <nav className="demo-stepper" aria-label="Guided demo steps">
          {guidedDemoStages.map((item, index) => (
            <button
              className={index === stageIndex ? "active" : index < stageIndex ? "complete" : ""}
              key={item.id}
              onClick={() => setStageIndex(index)}
              type="button"
              aria-current={index === stageIndex ? "step" : undefined}
              aria-label={`Go to step ${index + 1}: ${item.title}`}
            >
              <span>{index < stageIndex ? <CheckCircleIcon aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
              <small>{item.eyebrow.split(" · ")[1]}</small>
            </button>
          ))}
        </nav>

        <section className="demo-stage" aria-labelledby="demo-stage-title">
          <div className="demo-stage__top">
            <div className="demo-stage__icon"><StageIcon stage={stage.id} /></div>
            <div><span className="canonical-label">{stage.eyebrow}</span><h2 id="demo-stage-title">{stage.title}</h2></div>
            <span className="status status--success"><CheckCircleIcon aria-hidden="true" />{stage.event}</span>
          </div>
          <p className="demo-stage__copy" aria-live="polite">{stage.copy}</p>

          <div className="demo-metrics" aria-label="Scenario facility position">
            <DemoMetric label="Selected" value={stage.selected} />
            <DemoMetric label="Committed" value={stage.committed} />
            <DemoMetric label="Drawn now" value={stage.drawn} />
            <DemoMetric label="Available" value={stage.available} accent />
          </div>

          <div className="demo-providers">
            <div className="section-header"><div><span className="eyebrow">CHILD ACCORDS</span><h3>Provider relationships</h3></div><span className="section-meta">3 independent providers</span></div>
            <div className="demo-provider-table" role="table" aria-label="Simulated provider relationships">
              <div className="demo-provider-table__head" role="row"><span role="columnheader">Provider</span><span role="columnheader">State</span><span role="columnheader">Position</span></div>
              {children.map((child, index) => (
                <div className="demo-provider-row" role="row" key={child.id}>
                  <span role="cell" className="provider-cell"><span className="provider-avatar">P{index + 1}</span><span><strong>Provider {index + 1}</strong><small>Child Accord relationship</small></span></span>
                  <span role="cell"><span className="demo-provider-state">{stage.providerState}</span>{stage.id === "allocation" || stage.id === "funding" || stage.id === "repayment" ? <small>{child.feeBps} bps accepted</small> : <small>Private input boundary</small>}</span>
                  <span role="cell" className="demo-provider-amount">{stage.providerAmounts[index] === "Withheld" ? <><EyeSlashIcon aria-hidden="true" />Withheld</> : stage.providerAmounts[index] === "—" ? "—" : `${stage.providerAmounts[index]} USDT0`}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="demo-stage__footer">
            <span className="demo-stage__event"><ReceiptPercentIcon aria-hidden="true" /><span><small>LOCAL EVENT</small><strong>{stage.event}</strong></span></span>
            <div className="demo-controls">
              <button className="button button--quiet" onClick={() => setStageIndex(0)} type="button" disabled={first}>Reset</button>
              <button className="button button--secondary" onClick={() => move(-1)} type="button" disabled={first}><ArrowLeftIcon aria-hidden="true" />Back</button>
              <button className="button button--primary" onClick={() => last ? setStageIndex(0) : move(1)} type="button">{last ? "Replay demo" : "Next step"}<ArrowRightIcon aria-hidden="true" /></button>
            </div>
          </div>
        </section>
      </div>

      <div className="demo-truth-grid">
        <div><ShieldCheckIcon aria-hidden="true" /><div><strong>Recorded proof stays separate</strong><p>This walkthrough explains the product. The completed Coston2 lifecycle remains the source of truth for observed transactions.</p><Link className="text-link" to={rootHref}>Open recorded facility <ArrowRightIcon aria-hidden="true" /></Link></div></div>
        <div><LockClosedIcon aria-hidden="true" /><div><strong>Privacy boundary stays honest</strong><p>Offers may be coordinated privately; accepted commitments, draws, repayments, and public settlement are not private.</p><Link className="text-link" to={`/evidence/${evidence.resultDigest}`}>Inspect evidence <ArrowRightIcon aria-hidden="true" /></Link></div></div>
      </div>
    </div>
  );
}

function StageIcon({ stage }: { stage: string }) {
  if (stage === "coordination") return <LockClosedIcon aria-hidden="true" />;
  if (stage === "allocation") return <SparklesIcon aria-hidden="true" />;
  if (stage === "funding") return <UserGroupIcon aria-hidden="true" />;
  if (stage === "draw") return <ArrowRightIcon aria-hidden="true" />;
  if (stage === "repayment") return <CheckCircleIcon aria-hidden="true" />;
  return <ShieldCheckIcon aria-hidden="true" />;
}

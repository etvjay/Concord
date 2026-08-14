import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  Bars3Icon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EyeSlashIcon,
  FunnelIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  RectangleGroupIcon,
  ServerStackIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/20/solid";
import {
  type CSSProperties,
  type ComponentType,
  type PropsWithChildren,
  type SVGProps,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { DrawActionReview } from "./components/DrawActionReview";
import { WalletControl } from "./components/WalletControl";
import {
  activity,
  children,
  draw,
  evidence,
  explorerAddress,
  explorerTx,
  facility,
  formatDate,
  formatToken,
  providerLabels,
  round,
  shortId,
  snapshot,
} from "./data/concord";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const rootHref = `/facilities/${facility.id}`;

function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link className={`brand${inverted ? " brand--inverted" : ""}`} to="/" aria-label="Concord home">
      <span className="brand__mark" aria-hidden="true"><span /></span>
      <span>CONCORD</span>
    </Link>
  );
}

function Status({ label = "Observed", tone = "success" }: { label?: string; tone?: "success" | "warning" | "neutral" }) {
  return (
    <span className={`status status--${tone}`}>
      {tone === "success" ? <CheckCircleSolid aria-hidden="true" /> : <span className="status__dot" aria-hidden="true" />}
      {label}
    </span>
  );
}

function NetworkMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="network-mark" title={`Recorded from ${snapshot.deployment.network}, chain ${snapshot.deployment.chainId}`}>
      <span className="network-mark__dot" aria-hidden="true" />
      {!compact && <span>Coston2</span>}
      <span className="sr-only">Coston2 network, recorded evidence</span>
    </span>
  );
}

function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <nav className="public-header__nav" aria-label="Public navigation">
        <a href="#product">Product</a>
        <a href="#journey">How it works</a>
        <a href="#privacy">Privacy</a>
        <a href="https://github.com/etvjay/Concord/tree/main/docs" target="_blank" rel="noreferrer">Docs</a>
      </nav>
      <div className="public-header__actions">
        <WalletControl compact />
        <Link className="button button--primary button--compact" to={rootHref}>Open app</Link>
      </div>
    </header>
  );
}

function FacilityArtifact() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const style = {
    "--pointer-x": `${tilt.x}deg`,
    "--pointer-y": `${tilt.y}deg`,
  } as CSSProperties;

  return (
    <div
      className="artifact-stage"
      aria-label="A Root Accord represented as one persistent facility object"
      onPointerMove={(event) => {
        if (event.pointerType === "touch") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        setTilt({
          x: ((event.clientY - bounds.top) / bounds.height - 0.5) * -5,
          y: ((event.clientX - bounds.left) / bounds.width - 0.5) * 7,
        });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      style={style}
    >
      <span className="artifact-glow artifact-glow--blue" aria-hidden="true" />
      <span className="artifact-glow artifact-glow--prism" aria-hidden="true" />
      <div className="orbit orbit--one" aria-hidden="true"><i /><i /><i /></div>
      <div className="orbit orbit--two" aria-hidden="true"><i /><i /></div>
      <div className="facility-artifact-frame">
        <div className="facility-artifact">
          <div className="facility-artifact__face">
            <div className="facility-artifact__topline">
              <span>CONCORD</span>
              <ShieldCheckIcon aria-hidden="true" />
            </div>
            <div>
              <span className="eyebrow">ROOT ACCORD</span>
              <h2>Coston2 syndicated facility</h2>
              <strong>{formatToken(facility.targetCapacity)} USDT0</strong>
            </div>
            <div className="facility-artifact__rule" />
            <dl>
              <div><dt>Collateral</dt><dd>{formatToken(facility.collateralLocked)} FXRP</dd></div>
              <div><dt>Providers</dt><dd>{children.length} independent</dd></div>
              <div><dt>State</dt><dd>Active · observed</dd></div>
            </dl>
            <div className="facility-artifact__signature" aria-hidden="true">C</div>
          </div>
        </div>
      </div>
      <div className="artifact-shadow" aria-hidden="true" />
    </div>
  );
}

function LandingPage() {
  const audiences = [
    {
      icon: RectangleGroupIcon,
      label: "ROOT ACCORD",
      title: "Create one facility.",
      copy: "The treasury defines one collateral-backed relationship with a clear target, policy, participants, and expiry.",
    },
    {
      icon: LockClosedIcon,
      label: "MAKKARI · COFILL",
      title: "Coordinate providers privately.",
      copy: "Independent providers offer capacity and terms. Concord composes an eligible allocation without publishing losing offers.",
    },
    {
      icon: ArrowsRightLeftIcon,
      label: "CHILD ACCORDS · LINEAGE",
      title: "Draw, repay, and reuse.",
      copy: "Every provider portion remains explicit. Repayment reduces the same obligations and restores available capacity.",
    },
  ];

  return (
    <main className="landing">
      <section className="landing-hero shell-frame">
        <PublicHeader />
        <div className="landing-hero__grid">
          <div className="hero-copy">
            <p className="eyebrow">PRIVATE SYNDICATED CAPITAL</p>
            <h1>One facility.<br /><span>Capital from many providers.</span></h1>
            <p className="hero-copy__body">
              Concord lets a treasury coordinate funding privately, draw from the combined facility, and see exactly which provider funded every amount.
            </p>
            <div className="hero-actions">
              <Link className="button button--primary" to={rootHref}>Explore the facility record <ArrowRightIcon aria-hidden="true" /></Link>
              <Link className="button button--secondary" to={`/draws/${draw.id}`}>Follow one draw</Link>
            </div>
            <div className="proof-line" aria-label="Current implementation evidence">
              <span>Recorded on Coston2</span>
              <span>3 funded provider relationships</span>
              <span>Capacity restored after repayment</span>
            </div>
          </div>
          <FacilityArtifact />
        </div>
        <div className="hero-evidence">
          <span>RECORDED C2 PROOF</span>
          <div><ShieldCheckIcon aria-hidden="true" /> One Root Accord</div>
          <div><UserGroupIcon aria-hidden="true" /> Three funded children</div>
          <div><ArrowsRightLeftIcon aria-hidden="true" /> Drawn, repaid, restored</div>
          <Link to={`/evidence/${evidence.resultDigest}`}>Technical evidence <ArrowRightIcon aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="landing-section" id="product">
        <div className="section-intro">
          <p className="eyebrow">HOW CONCORD WORKS</p>
          <h2>From capital need to reusable capacity.</h2>
          <p>Three understandable steps describe the full facility. Concord’s canonical primitives remain visible when you need the exact technical meaning.</p>
        </div>
        <div className="audience-grid">
          {audiences.map(({ icon: Icon, label, title, copy }, index) => (
            <article className="audience-card" key={label}>
              <div className="audience-card__top"><span>0{index + 1}</span><Icon aria-hidden="true" /></div>
              <p className="eyebrow">{label}</p>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section composition-section" id="journey" aria-labelledby="composition-title">
        <div className="composition-story">
          <p className="eyebrow">ROOT ACCORD · CHILD ACCORDS</p>
          <h2 id="composition-title">One facility for the treasury. One clear commitment for every provider.</h2>
          <p>The Root Accord is the facility. Each accepted provider forms a Child Accord, keeping its capital, exposure, terms, and lifecycle independently attributable.</p>
          <Link className="text-link" to={`${rootHref}/funding`}>See how this facility was funded <ArrowRightIcon aria-hidden="true" /></Link>
        </div>
        <div className="accord-composition" aria-label="One root facility composed from three child provider relationships">
          <div className="composition-root">
            <span className="composition-root__mark"><RectangleGroupIcon aria-hidden="true" /></span>
            <div><small>ROOT ACCORD</small><strong>9 USDT0 committed</strong><span>One facility · active</span></div>
            <Status label="Available" />
          </div>
          <div className="composition-trunk" aria-hidden="true"><span /><span /><span /></div>
          <div className="composition-children">
            {children.map((child, index) => (
              <div className="composition-child" key={child.id}>
                <span>P{index + 1}</span>
                <div><small>CHILD ACCORD</small><strong>{formatToken(child.committedCapacity)} USDT0</strong><em>{child.feeBps} bps · funded</em></div>
              </div>
            ))}
          </div>
          <div className="composition-pulse" aria-hidden="true" />
        </div>
      </section>

      <section className="landing-section privacy-section" id="privacy">
        <div className="privacy-section__copy">
          <p className="eyebrow">PRIVACY WITH AN HONEST BOUNDARY</p>
          <h2>Private offers. Public settlement. No misleading claims.</h2>
          <p>Provider offers and losing terms may remain inside the Makkari session. Accepted commitments, token transfers, draws, repayments, and Lineage remain visible where Coston2 requires them.</p>
          <Link className="text-link" to={`${rootHref}/evidence`}>Review the disclosure boundary <ArrowRightIcon aria-hidden="true" /></Link>
        </div>
        <div className="privacy-planes">
          <article className="privacy-plane privacy-plane--confidential"><EyeSlashIcon aria-hidden="true" /><span>CONFIDENTIAL COORDINATION</span><strong>Offers · constraints · losing quotes</strong><small>Makkari session over Flare FCC</small></article>
          <div className="privacy-bridge"><LockClosedIcon aria-hidden="true" /><span>Verified allocation</span></div>
          <article className="privacy-plane privacy-plane--public"><GlobeAltIcon aria-hidden="true" /><span>PUBLIC SETTLEMENT</span><strong>Commitments · draws · repayments</strong><small>Coston2 state and token transfers</small></article>
        </div>
      </section>

      <section className="landing-section proof-section">
        <div className="proof-object">
          <div className="proof-object__halo" aria-hidden="true" />
          <SparklesIcon aria-hidden="true" />
          <span>RESULT DIGEST</span>
          <code>{shortId(evidence.resultDigest, 14, 12)}</code>
        </div>
        <div className="proof-section__copy">
          <p className="eyebrow">A WORKING COSTON2 RELATIONSHIP</p>
          <h2>The entire story is inspectable.</h2>
          <p>The live proof created one root, formed three child relationships, funded 9 USDT0, drew 4 USDT0 across two providers, repaid it, and restored all available capacity.</p>
          <div className="proof-facts">
            <div><strong>9</strong><span>USDT0 funded</span></div>
            <div><strong>2</strong><span>draw legs</span></div>
            <div><strong>9</strong><span>USDT0 available</span></div>
          </div>
          <p className="disclosure"><EyeSlashIcon aria-hidden="true" /> Provider coordination inputs may be confidential. FXRP and USDT0 transfers and public EVM state are not private.</p>
        </div>
      </section>

      <section className="landing-cta shell-frame">
        <span className="eyebrow">SEE CONCORD IN CONTEXT</span>
        <h2>One facility. Every participant. Every movement explained.</h2>
        <p>Connect a Coston2 wallet for network identity, or explore the completed public facility without connecting.</p>
        <div className="landing-cta__actions"><WalletControl /><Link className="button button--primary" to={rootHref}>Explore facility <ArrowRightIcon aria-hidden="true" /></Link></div>
      </section>

      <footer className="public-footer">
        <Brand />
        <p>Private syndication and persistent capital relationships on Flare.</p>
        <div><a href="https://github.com/etvjay/Concord" target="_blank" rel="noreferrer">Source</a><a href="https://dev.flare.network/fcc" target="_blank" rel="noreferrer">Flare FCC</a></div>
      </footer>
    </main>
  );
}

type RouteLink = { label: string; to: string };
type RouteGuide = {
  section: string;
  current: string;
  crumbs: RouteLink[];
  back?: RouteLink;
};

const globalRoutes: Array<{ label: string; to: string; icon: IconType; matches: (pathname: string) => boolean }> = [
  { label: "Facilities", to: "/facilities", icon: DocumentTextIcon, matches: (pathname) => pathname !== "/settings" },
];

function routeGuide(pathname: string): RouteGuide {
  const facilityCrumb = { label: "Coston2 facility", to: rootHref };
  const workspaceCrumb = { label: "Facilities", to: "/facilities" };

  if (pathname === "/facilities") return {
    section: "Workspace",
    current: "Facilities",
    crumbs: [],
    back: { label: "Public site", to: "/" },
  };
  if (pathname === rootHref) return {
    section: "Root Accord",
    current: "Overview",
    crumbs: [workspaceCrumb],
    back: workspaceCrumb,
  };
  if (pathname === `${rootHref}/funding`) return {
    section: "Root Accord",
    current: "Funding",
    crumbs: [workspaceCrumb, facilityCrumb],
    back: { label: "Facility overview", to: rootHref },
  };
  if (pathname === `${rootHref}/activity`) return {
    section: "Root Accord",
    current: "Activity",
    crumbs: [workspaceCrumb, facilityCrumb],
    back: { label: "Facility overview", to: rootHref },
  };
  if (pathname === `${rootHref}/evidence`) return {
    section: "Root Accord",
    current: "Evidence",
    crumbs: [workspaceCrumb, facilityCrumb],
    back: { label: "Facility overview", to: rootHref },
  };
  if (pathname === `${rootHref}/lineage`) return {
    section: "Root Accord",
    current: "Lineage",
    crumbs: [workspaceCrumb, facilityCrumb],
    back: { label: "Facility overview", to: rootHref },
  };
  if (pathname.startsWith("/draws/")) return {
    section: "Activity detail",
    current: "Repaid draw",
    crumbs: [workspaceCrumb, facilityCrumb, { label: "Activity", to: `${rootHref}/activity` }],
    back: { label: "Activity", to: `${rootHref}/activity` },
  };
  if (pathname.startsWith("/children/")) {
    const childId = pathname.slice("/children/".length);
    const child = children.find((candidate) => candidate.id === childId);
    const provider = child ? providerLabels.get(child.provider.toLowerCase()) ?? "Provider relationship" : "Provider relationship";
    return {
      section: "Funding detail",
      current: provider,
      crumbs: [workspaceCrumb, facilityCrumb, { label: "Funding", to: `${rootHref}/funding` }],
      back: { label: "Funding", to: `${rootHref}/funding` },
    };
  }
  if (pathname.startsWith("/rounds/")) return {
    section: "Funding detail",
    current: "Syndication round",
    crumbs: [workspaceCrumb, facilityCrumb, { label: "Funding", to: `${rootHref}/funding` }],
    back: { label: "Funding", to: `${rootHref}/funding` },
  };
  if (pathname.startsWith("/evidence/")) return {
    section: "Evidence detail",
    current: "Allocation result",
    crumbs: [workspaceCrumb, facilityCrumb, { label: "Evidence", to: `${rootHref}/evidence` }],
    back: { label: "Evidence", to: `${rootHref}/evidence` },
  };
  if (pathname === "/settings") return {
    section: "System context",
    current: "Network & assets",
    crumbs: [workspaceCrumb],
    back: workspaceCrumb,
  };
  return {
    section: "Workspace",
    current: "Not observed",
    crumbs: [],
    back: workspaceCrumb,
  };
}

function GlobalNavLink({ route, pathname, onClick }: { route: typeof globalRoutes[number]; pathname: string; onClick?: () => void }) {
  const active = route.matches(pathname);
  const Icon = route.icon;
  return <Link className={active ? "active" : ""} aria-current={active ? "page" : undefined} to={route.to} onClick={onClick}><Icon aria-hidden="true" /><span>{route.label}</span></Link>;
}

function ContextNavigation({ guide }: { guide: RouteGuide }) {
  return (
    <div className="context-navigation">
      {guide.back && <Link className="context-navigation__back" to={guide.back.to}><ArrowLeftIcon aria-hidden="true" /><span>Back to {guide.back.label}</span></Link>}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        {guide.crumbs.map((crumb) => <span key={`${crumb.to}-${crumb.label}`}><Link to={crumb.to}>{crumb.label}</Link><ChevronRightIcon aria-hidden="true" /></span>)}
        <span aria-current="page">{guide.current}</span>
      </nav>
    </div>
  );
}

const glossary = [
  ["Root Accord", "The persistent facility relationship containing participants, assets, authority, capacity, policy, and lifecycle state."],
  ["Makkari Session", "A bounded private funding session in which permitted providers submit signed offers for one facility."],
  ["CoFill Allocation", "The deterministic result that composes eligible provider offers toward the facility target."],
  ["Child Accord", "One provider's independently governed commitment beneath the Root Accord."],
  ["Draw Leg", "The exact portion of a draw supplied by one Child Accord."],
  ["Lineage", "The traceable path connecting the facility, funding session, allocation, commitments, draw, settlement, and repayment."],
] as const;

const tourSteps: Array<{ title: string; canonical: string; copy: string; icon: IconType }> = [
  { title: "Your facility", canonical: "Root Accord", copy: "One persistent relationship holds the collateral, funded capacity, participants, and lifecycle.", icon: RectangleGroupIcon },
  { title: "Your current position", canonical: "Capacity and exposure", copy: "Available tells you what can be drawn now. Outstanding tells you what still needs to be repaid.", icon: BanknotesIcon },
  { title: "Provider commitments", canonical: "Child Accords", copy: "Every funded provider remains independently visible, governed, and attributable beneath the facility.", icon: UserGroupIcon },
  { title: "Your next action", canonical: "Relationship authority", copy: "Concord explains what can happen next and why the current facility state permits it.", icon: ArrowRightIcon },
  { title: "How everything connects", canonical: "Lineage", copy: "Funding, draws, repayments, and evidence remain connected to the relationship that authorized them.", icon: ShareIcon },
];

function ConceptHelp({ term, children }: PropsWithChildren<{ term: string }>) {
  return (
    <details className="concept-help">
      <summary aria-label={`What is ${term}?`}><InformationCircleIcon aria-hidden="true" /></summary>
      <div><strong>{term}</strong><p>{children}</p></div>
    </details>
  );
}

function ProductTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setStep(0);
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const current = tourSteps[step];
  const Icon = current.icon;
  const last = step === tourSteps.length - 1;
  return (
    <div className="modal-layer tour-layer">
      <button className="modal-scrim" aria-label="Close product tour" onClick={onClose} />
      <div className="product-tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" ref={dialogRef} tabIndex={-1}>
        <div className="product-tour__top"><span>CONCORD IN 60 SECONDS</span><button className="icon-button" onClick={onClose} aria-label="Close product tour"><XMarkIcon /></button></div>
        <div className="product-tour__progress" aria-label={`Step ${step + 1} of ${tourSteps.length}`}>{tourSteps.map((_, index) => <span className={index <= step ? "active" : ""} key={index} />)}</div>
        <div className="product-tour__icon"><Icon aria-hidden="true" /></div>
        <span className="canonical-label">{current.canonical}</span>
        <h2 id="tour-title">{current.title}</h2>
        <p aria-live="polite">{current.copy}</p>
        <div className="product-tour__actions">
          <button className="button button--quiet" onClick={onClose}>Skip tour</button>
          <div>
            {step > 0 && <button className="button button--secondary" onClick={() => setStep((value) => value - 1)}>Back</button>}
            <button className="button button--primary" onClick={() => last ? onClose() : setStep((value) => value + 1)}>{last ? "Explore facility" : "Next"}<ArrowRightIcon aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpCenter({ onStartTour }: { onStartTour: () => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "glossary">("menu");
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div className="help-center" ref={wrapRef}>
      <button className="help-trigger" aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((value) => !value); setView("menu"); }}><QuestionMarkCircleIcon aria-hidden="true" /><span>Help</span></button>
      {open && <div className="help-popover" role="dialog" aria-label="Help and learning">
        {view === "menu" ? <>
          <span className="help-popover__label">HELP & LEARNING</span>
          <h2>Understand Concord</h2>
          <p>Learn the product at your own pace. Nothing here blocks the facility.</p>
          <button onClick={() => { setOpen(false); onStartTour(); }}><SparklesIcon /><span><strong>Take the product tour</strong><small>A five-step introduction</small></span><ChevronRightIcon /></button>
          <button onClick={() => setView("glossary")}><DocumentTextIcon /><span><strong>Concord glossary</strong><small>Plain language and canonical terms</small></span><ChevronRightIcon /></button>
          <Link to={`${rootHref}/evidence`} onClick={() => setOpen(false)}><ShieldCheckIcon /><span><strong>Privacy and evidence</strong><small>What is private, public, and verified</small></span><ChevronRightIcon /></Link>
          <Link to="/settings" onClick={() => setOpen(false)}><ServerStackIcon /><span><strong>Network and assets</strong><small>Coston2 environment details</small></span><ChevronRightIcon /></Link>
        </> : <>
          <button className="help-popover__back" onClick={() => setView("menu")}><ArrowLeftIcon />Help</button>
          <span className="help-popover__label">CONCORD GLOSSARY</span>
          <h2>Canonical vocabulary</h2>
          <div className="glossary-list">{glossary.map(([term, definition]) => <div key={term}><strong>{term}</strong><p>{definition}</p></div>)}</div>
        </>}
      </div>}
    </div>
  );
}

function OnboardingPrimer({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  return (
    <aside className="onboarding-primer" aria-label="Optional Concord introduction">
      <div className="onboarding-primer__icon"><QuestionMarkCircleIcon aria-hidden="true" /></div>
      <div><strong>New to Concord?</strong><p>See how one facility is funded by multiple providers and how every movement remains traceable.</p></div>
      <div className="onboarding-primer__actions"><button className="button button--secondary button--compact" onClick={onDismiss}>Explore myself</button><button className="button button--primary button--compact" onClick={onStart}>Take the 60-second tour</button></div>
    </aside>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("drawer-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("drawer-open");
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-scrim" aria-label="Close navigation" onClick={onClose} />
      <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
        <div className="mobile-drawer__header"><Brand /><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close navigation"><XMarkIcon /></button></div>
        <p className="drawer-label">WORKSPACE</p>
        <nav aria-label="Mobile workspace navigation">
          {globalRoutes.map((route) => <GlobalNavLink key={route.to} route={route} pathname={location.pathname} onClick={onClose} />)}
        </nav>
        <p className="drawer-label">CONTEXT</p>
        <nav aria-label="Mobile secondary navigation">
          <NavLink to="/settings" onClick={onClose}><ServerStackIcon aria-hidden="true" />Network & assets</NavLink>
          <a href="https://github.com/etvjay/Concord/tree/main/docs" target="_blank" rel="noreferrer"><DocumentTextIcon aria-hidden="true" />Documentation</a>
        </nav>
        <div className="drawer-disclosure"><InformationCircleIcon aria-hidden="true" /><p><strong>Development evidence</strong><span>Coston2 · simulated TEE · public settlement</span></p></div>
      </aside>
    </div>
  );
}

function AppShell({ children }: PropsWithChildren) {
  const [drawer, setDrawer] = useState(false);
  const [tour, setTour] = useState(false);
  const [showPrimer, setShowPrimer] = useState(() => {
    try { return window.localStorage.getItem("concord-tour-prompt") !== "dismissed"; }
    catch { return true; }
  });
  const location = useLocation();
  const guide = routeGuide(location.pathname);
  useEffect(() => setDrawer(false), [location.pathname]);
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);
  const dismissPrimer = () => {
    setShowPrimer(false);
    try { window.localStorage.setItem("concord-tour-prompt", "dismissed"); } catch { /* storage is optional */ }
  };
  const startTour = () => {
    dismissPrimer();
    setTour(true);
  };
  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="icon-button app-header__menu" aria-label="Open navigation" aria-expanded={drawer} onClick={() => setDrawer(true)}><Bars3Icon /></button>
        <Brand />
        <nav className="app-header__nav" aria-label="Application navigation">
          {globalRoutes.map((route) => <GlobalNavLink key={route.to} route={route} pathname={location.pathname} />)}
          <a href="https://github.com/etvjay/Concord/tree/main/docs" target="_blank" rel="noreferrer"><DocumentTextIcon aria-hidden="true" /><span>Docs</span></a>
        </nav>
        <div className="app-header__context">
          <HelpCenter onStartTour={startTour} />
          <NetworkMark />
          <WalletControl compact />
        </div>
      </header>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
      <div className="app-content">
        <ContextNavigation guide={guide} />
        {location.pathname === rootHref && showPrimer && <OnboardingPrimer onStart={startTour} onDismiss={dismissPrimer} />}
        {children}
      </div>
      <footer className="app-footer"><Brand /><span>Coston2 · chain 114 · recorded {formatDate(snapshot.deployment.observedAt)}</span><div><a href="https://github.com/etvjay/Concord" target="_blank" rel="noreferrer">Source</a><Link to="/settings">Disclosure</Link></div></footer>
      <ProductTour open={tour} onClose={() => setTour(false)} />
    </div>
  );
}

function PageHeading({ eyebrow, title, description, help, action }: { eyebrow: string; title: string; description: string; help?: string; action?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div><div className="canonical-line"><span className="canonical-label">{eyebrow}</span>{help && <ConceptHelp term={eyebrow}>{help}</ConceptHelp>}</div><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function FacilitiesPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="ROOT ACCORD REGISTER"
        title="Facilities"
        description="Your persistent capital facilities and their current financial position."
        help="A Root Accord is Concord's canonical facility relationship, containing participants, assets, authority, capacity, policy, and lifecycle state."
        action={<button className="button button--secondary" disabled title="Root creation requires a connected intent service">Create Root Accord</button>}
      />
      <div className="view-tabs"><button className="active">Active facilities</button><button>Archive</button></div>
      <div className="register-toolbar">
        <label className="search-control"><MagnifyingGlassIcon aria-hidden="true" /><span className="sr-only">Search facilities</span><input placeholder="Search facilities" /></label>
        <button className="button button--secondary button--compact"><FunnelIcon aria-hidden="true" />Filters</button>
      </div>
      <section className="master-detail">
        <div className="facility-register">
          <div className="register-head"><span>Facility</span><span>Committed</span><span>Drawn</span><span>Available</span><span>Status</span></div>
          <Link className="facility-row selected" to={rootHref}>
            <span className="facility-row__title"><strong>Coston2 syndicated facility</strong><small>FXRP-backed · 3 providers</small></span>
            <span><small>Committed</small>{formatToken(facility.committedCapacity)} USDT0</span>
            <span><small>Drawn</small>{formatToken(facility.drawnPrincipal)} USDT0</span>
            <span><small>Available</small>{formatToken(facility.availableCapacity)} USDT0</span>
            <Status label="Active" />
          </Link>
          <div className="register-empty-line"><span>1 observed relationship</span><span>Recorded from Coston2 at {formatDate(snapshot.deployment.observedAt)}</span></div>
        </div>
        <aside className="object-inspector">
          <div className="object-inspector__header"><div><span className="eyebrow">ROOT ACCORD</span><h2>Coston2 syndicated facility</h2></div><Status label="Active" /></div>
          <div className="local-tabs"><span className="active">Overview</span><span>Terms</span><span>Parties</span><span>Evidence</span></div>
          <dl className="inspector-metrics">
            <div><dt>Target</dt><dd>{formatToken(facility.targetCapacity)} USDT0</dd></div>
            <div><dt>Committed</dt><dd>{formatToken(facility.committedCapacity)} USDT0</dd></div>
            <div><dt>Drawn now</dt><dd>{formatToken(facility.drawnPrincipal)} USDT0</dd></div>
            <div><dt>Available</dt><dd>{formatToken(facility.availableCapacity)} USDT0</dd></div>
          </dl>
          <div className="inspector-section"><span>Collateral</span><strong>{formatToken(facility.collateralLocked)} FXRP locked</strong></div>
          <div className="inspector-section"><span>Participants</span><strong>1 treasury · 3 providers</strong></div>
          <div className="inspector-section"><span>Validity</span><strong>Until {formatDate(facility.validUntil)}</strong></div>
          <div className="inspector-actions"><Link className="button button--primary" to={rootHref}>Open facility</Link><Link className="button button--secondary" to={`${rootHref}/evidence`}>View evidence</Link></div>
        </aside>
      </section>
    </AppShell>
  );
}

const localTabs = [
  ["Overview", rootHref],
  ["Funding", `${rootHref}/funding`],
  ["Activity", `${rootHref}/activity`],
  ["Evidence", `${rootHref}/evidence`],
  ["Lineage", `${rootHref}/lineage`],
];

function FacilityTabs({ standalone = false }: { standalone?: boolean }) {
  return (
    <nav className={`facility-tabs${standalone ? " facility-tabs--standalone" : ""}`} aria-label="Facility sections">
      {localTabs.map(([label, to]) => <NavLink key={to} end={to === rootHref} to={to}>{label}</NavLink>)}
    </nav>
  );
}

function AccordHeader() {
  return (
    <>
      <div className="accord-header">
        <div>
          <div className="accord-header__eyebrow"><div className="canonical-line"><span className="canonical-label">ROOT ACCORD</span><ConceptHelp term="Root Accord">The persistent facility relationship containing participants, assets, authority, capacity, policy, and lifecycle state.</ConceptHelp></div><Status label="Active · observed" /></div>
          <h1>Coston2 syndicated facility</h1>
          <p>One FXRP-backed facility funded by three independent USDT0 providers.</p>
        </div>
        <details className="technical-summary"><summary>Technical details</summary><div><span>Root Accord ID</span><code>{shortId(facility.id, 12, 9)}</code><button className="copy-button" aria-label="Copy Root Accord ID" onClick={() => navigator.clipboard?.writeText(facility.id)}><DocumentDuplicateIcon /></button><span>Expires {formatDate(facility.validUntil)}</span></div></details>
      </div>
      <FacilityTabs />
    </>
  );
}

function MetricsBand() {
  const metrics = [
    ["Available now", `${formatToken(facility.availableCapacity)} USDT0`, "Ready to draw"],
    ["Outstanding", `${formatToken(facility.drawnPrincipal)} USDT0`, "Nothing currently owed"],
    ["Capital providers", String(children.length), "Independent commitments"],
  ];
  return (
    <section className="metrics-band metrics-band--three facility-position" aria-label="Facility position">
      {metrics.map(([label, value, note], index) => <div key={label} className={index === 0 ? "metric metric--accent" : "metric"}><span>{label}</span><strong>{value}</strong><p>{note}</p></div>)}
    </section>
  );
}

const relationshipSteps: Array<{ label: string; detail: string; state: string; icon: IconType; href: string }> = [
  { label: "Root Accord", detail: "1 facility", state: "Active", icon: RectangleGroupIcon, href: rootHref },
  { label: "Makkari", detail: "3 offers", state: "Finalized", icon: LockClosedIcon, href: `/rounds/${round.id}` },
  { label: "CoFill", detail: "9 USDT0", state: "Verified", icon: Squares2X2Icon, href: `/evidence/${evidence.resultDigest}` },
  { label: "Child Accords", detail: "3 funded", state: "Active", icon: UserGroupIcon, href: `${rootHref}/funding` },
  { label: "Draw", detail: "2 legs", state: "Repaid", icon: ArrowDownTrayIcon, href: `/draws/${draw.id}` },
  { label: "Repayment", detail: "4 USDT0", state: "Restored", icon: ArrowUpTrayIcon, href: `${rootHref}/activity` },
];

function ChildRegister({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`section-block${compact ? " section-block--compact" : ""}`}>
      <div className="section-header"><div><div className="canonical-line"><span className="canonical-label">CHILD ACCORDS</span><ConceptHelp term="Child Accord">One provider's independently governed commitment beneath the Root Accord.</ConceptHelp></div><h2>Provider commitments</h2><p>Each provider remains independently attributable beneath the facility.</p></div><span className="section-meta">3 providers · 9 USDT0 funded</span></div>
      <div className="child-table" role="table" aria-label="Funded Child Accords">
        <div className="child-table__head" role="row"><span role="columnheader">Provider</span><span role="columnheader">Committed</span><span role="columnheader">Available</span><span role="columnheader">State</span><span /></div>
        {children.map((child, index) => (
          <Link role="row" className="child-row" to={`/children/${child.id}`} key={child.id}>
            <span role="cell" className="provider-cell"><span className="provider-avatar">P{index + 1}</span><span><strong>{providerLabels.get(child.provider.toLowerCase())}</strong><small>{shortId(child.provider)}</small></span></span>
            <span role="cell"><small>Committed</small>{formatToken(child.committedCapacity)} USDT0</span>
            <span role="cell"><small>Available</small>{formatToken(child.availableCapacity)} USDT0</span>
            <span role="cell"><Status label="Funded · active" /></span>
            <span role="cell"><ChevronRightIcon aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StateExplanation({ onPrepare }: { onPrepare: () => void }) {
  return (
    <div className="state-explanation">
      <div className="state-explanation__icon"><CheckCircleIcon aria-hidden="true" /></div>
      <div><span className="eyebrow">WHAT THIS MEANS</span><h2>All 9 USDT0 is available. Nothing is currently owed.</h2><p>The previous 4 USDT0 draw was fully repaid, so the facility can be used again without creating a new relationship.</p></div>
      <div className="next-action"><span>Next available action</span><button className="button button--primary" onClick={onPrepare}>Prepare a draw <ArrowDownTrayIcon aria-hidden="true" /></button><small>Requires treasury wallet review</small></div>
    </div>
  );
}

function LineageInvitation() {
  return (
    <section className="lineage-invitation">
      <div className="lineage-invitation__icon"><ShareIcon aria-hidden="true" /></div>
      <div><div className="canonical-line"><span className="canonical-label">LINEAGE</span><ConceptHelp term="Lineage">The traceable path connecting the facility, funding session, allocation, commitments, draw, settlement, and repayment.</ConceptHelp></div><h2>See why every movement was allowed.</h2><p>Follow the facility from private funding through provider commitments, draw legs, settlement, repayment, and restored capacity.</p></div>
      <Link className="button button--secondary" to={`${rootHref}/lineage`}>View relationship history <ArrowRightIcon /></Link>
    </section>
  );
}

function ActivityList({ limit }: { limit?: number }) {
  return (
    <ol className="activity-list">
      {activity.slice(0, limit).map((item) => (
        <li key={item.id}>
          <span className={`activity-marker activity-marker--${item.tone}`} aria-hidden="true" />
          <div><strong>{item.title}</strong><p>{item.description}</p>{item.tx && <a href={explorerTx(item.tx)} target="_blank" rel="noreferrer">View Coston2 transaction <ArrowTopRightOnSquareIcon aria-hidden="true" /></a>}</div>
        </li>
      ))}
    </ol>
  );
}

function EvidenceSummary() {
  return (
    <div className="evidence-summary">
      <div className="evidence-summary__status"><ShieldCheckIcon aria-hidden="true" /><div><span className="eyebrow">FCC RESULT</span><strong>Allocation verified</strong></div><Status label="Observed" /></div>
      <dl><div><dt>Result digest</dt><dd><code>{shortId(evidence.resultDigest, 10, 8)}</code></dd></div><div><dt>Extension</dt><dd>66188</dd></div><div><dt>TEE mode</dt><dd>Simulated development</dd></div><div><dt>Disclosure</dt><dd>Metadata only</dd></div></dl>
      <Link className="button button--secondary" to={`/evidence/${evidence.resultDigest}`}>Inspect disclosure boundary</Link>
    </div>
  );
}

function OverviewPage() {
  const [review, setReview] = useState(false);
  return (
    <AppShell>
      <AccordHeader />
      <MetricsBand />
      <StateExplanation onPrepare={() => setReview(true)} />
      <ChildRegister />
      <section className="split-section">
        <div className="section-block"><div className="section-header"><div><span className="eyebrow">ACTIVITY</span><h2>Recent activity</h2></div><Link className="text-link" to={`${rootHref}/activity`}>All activity <ArrowRightIcon /></Link></div><ActivityList limit={3} /></div>
        <LineageInvitation />
      </section>
      <DrawActionReview open={review} onClose={() => setReview(false)} />
    </AppShell>
  );
}

function FundingPage() {
  return (
    <AppShell>
      <FacilityTabs standalone />
      <PageHeading eyebrow="MAKKARI SESSION · COFILL ALLOCATION" title="Funding" description="How private provider offers became three funded commitments." help="Makkari is the bounded private funding session. CoFill is the deterministic allocation that composes eligible offers toward the facility target." />
      <section className="round-summary">
        <div><span className="eyebrow">PRIVATE FUNDING ROUND · MAKKARI</span><h2>Provider allocation completed</h2><p>CoFill selected eligible offers and filled the 9 USDT0 target deterministically.</p></div>
        <dl><div><dt>Target</dt><dd>9 USDT0</dd></div><div><dt>Eligible providers</dt><dd>3</dd></div><div><dt>Maximum fee</dt><dd>{round.maxFeeBps} bps</dd></div><div><dt>Round expiry</dt><dd>{formatDate(round.roundExpiry)}</dd></div></dl>
        <Link className="button button--secondary" to={`/rounds/${round.id}`}>Open round dossier</Link>
      </section>
      <div className="privacy-boundary"><LockClosedIcon aria-hidden="true" /><div><strong>Private inputs remain withheld.</strong><p>The interface exposes accepted providers, executable capacity, fee terms, commitments, and verification metadata. Losing quotes and provider constraints are not displayed.</p></div></div>
      <ChildRegister />
    </AppShell>
  );
}

function ActivityPage() {
  return (
    <AppShell>
      <FacilityTabs standalone />
      <PageHeading eyebrow="ACCORD LIFECYCLE" title="Activity" description="What happened to this facility, ordered by financial progression." help="The Accord lifecycle keeps each action connected to the relationship and authority that permitted it." />
      <section className="section-block activity-page"><ActivityList /></section>
    </AppShell>
  );
}

function EvidencePage() {
  return (
    <AppShell>
      <FacilityTabs standalone />
      <PageHeading eyebrow="FCC EVIDENCE" title="Evidence" description="What Concord verified, what remains private, and what this implementation does not claim." help="Flare Confidential Compute coordinates permitted private inputs. Accepted commitments and public-chain settlement remain visible where required." />
      <section className="evidence-grid">
        <EvidenceSummary />
        <div className="evidence-dossier">
          <h2>Public and observed</h2>
          <ul><li><CheckCircleIcon />Root and child Accord state</li><li><CheckCircleIcon />USDT0 commitments and current exposure</li><li><CheckCircleIcon />Draw, draw-leg, and repayment receipts</li><li><CheckCircleIcon />Result, round, root, and extension binding</li></ul>
        </div>
        <div className="evidence-dossier">
          <h2>Withheld or not claimed</h2>
          <ul><li><EyeSlashIcon />Losing quotes and provider constraints</li><li><EyeSlashIcon />Private FXRP or USDT0 transfers</li><li><EyeSlashIcon />Private EVM settlement</li><li><EyeSlashIcon />Production hardware-backed TEE security</li></ul>
        </div>
      </section>
    </AppShell>
  );
}

function LineagePage() {
  return (
    <AppShell>
      <FacilityTabs standalone />
      <PageHeading eyebrow="LINEAGE" title="Relationship history" description="See how the facility, provider commitments, draw, settlement, and repayment connect." help="Lineage is the traceable path linking every action to the relationship that authorized it." />
      <section className="lineage-map">
        {relationshipSteps.map(({ label, detail, state, icon: Icon, href }, index) => <div className="lineage-node" key={label}><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" /><div><strong>{label}</strong><small>{detail}</small></div><Status label={state} /><Link to={href} aria-label={`Open ${label}`}><ChevronRightIcon /></Link></div>)}
      </section>
      <section className="section-block"><div className="section-header"><div><span className="eyebrow">DRAW LEGS</span><h2>Explicit provider supply</h2></div></div><DrawLegs /></section>
    </AppShell>
  );
}

function DrawLegs() {
  return <div className="draw-legs">{draw.legs.map((leg, index) => <Link to={`/children/${leg.childAccordId}`} key={leg.id}><span className="provider-avatar">P{index + 1}</span><div><strong>{providerLabels.get(leg.provider.toLowerCase())}</strong><small>Child Accord {shortId(leg.childAccordId)}</small></div><span>{formatToken(leg.principal)} USDT0<small>fully repaid</small></span><CheckCircleIcon aria-hidden="true" /></Link>)}</div>;
}

function DrawPage() {
  const { drawId } = useParams();
  if (drawId !== draw.id) return <NotFound />;
  return (
    <AppShell>
      <PageHeading eyebrow="DRAW · DRAW LEGS" title="4 USDT0 draw" description="Two provider commitments supplied this draw. It was settled to the treasury and fully repaid." help="A Draw Leg records the exact portion supplied by one Child Accord." action={<Status label="Fully repaid" />} />
      <div className="dossier-id"><code>{draw.id}</code><a href={explorerTx(snapshot.deployment.rootRound.facilityLifecycle.drawTransaction)} target="_blank" rel="noreferrer">Settlement receipt <ArrowTopRightOnSquareIcon /></a></div>
      <section className="metrics-band metrics-band--three"><div className="metric"><span>Principal</span><strong>4 <small>USDT0</small></strong><p>Settled to treasury</p></div><div className="metric"><span>Repaid</span><strong>4 <small>USDT0</small></strong><p>Observed on Coston2</p></div><div className="metric metric--accent"><span>Outstanding</span><strong>0 <small>USDT0</small></strong><p>Capacity restored</p></div></section>
      <section className="section-block"><div className="section-header"><div><span className="eyebrow">DRAW LEGS</span><h2>Provider composition</h2></div><span className="section-meta">2 explicit obligations</span></div><DrawLegs /></section>
      <section className="state-explanation state-explanation--compact"><div className="state-explanation__icon"><ArrowUpTrayIcon /></div><div><span className="eyebrow">REPAYMENT</span><h2>Principal returned to the same obligations.</h2><p>Each draw-leg principal fell to zero, child exposure fell to zero, root exposure fell to zero, and available capacity returned to 9 USDT0.</p></div></section>
    </AppShell>
  );
}

function ChildPage() {
  const { childId } = useParams();
  const child = children.find((candidate) => candidate.id === childId);
  if (!child) return <NotFound />;
  const providerNumber = children.indexOf(child) + 1;
  return (
    <AppShell>
      <PageHeading eyebrow="CHILD ACCORD" title={`${providerLabels.get(child.provider.toLowerCase())} commitment`} description="This provider's independently governed commitment beneath the facility." help="A Child Accord keeps one provider's commitment, exposure, terms, and lifecycle attributable beneath the Root Accord." action={<Status label="Funded · active" />} />
      <div className="dossier-id"><code>{child.id}</code><Link to={rootHref}>Parent Root Accord <ArrowRightIcon /></Link></div>
      <section className="metrics-band metrics-band--four"><div className="metric"><span>Selected</span><strong>3 <small>USDT0</small></strong><p>CoFill allocation</p></div><div className="metric"><span>Committed</span><strong>3 <small>USDT0</small></strong><p>Funding observed</p></div><div className="metric"><span>Drawn now</span><strong>0 <small>USDT0</small></strong><p>Exposure repaid</p></div><div className="metric metric--accent"><span>Available</span><strong>3 <small>USDT0</small></strong><p>Capacity restored</p></div></section>
      <section className="dossier-grid"><div className="dossier-section"><h2>Provider</h2><dl><div><dt>Participant</dt><dd>Provider {providerNumber}</dd></div><div><dt>Address</dt><dd><code>{shortId(child.provider, 12, 10)}</code></dd></div><div><dt>Accepted fee</dt><dd>{child.feeBps} bps</dd></div><div><dt>Valid until</dt><dd>{formatDate(child.validUntil)}</dd></div></dl></div><div className="dossier-section"><h2>Terms and binding</h2><dl><div><dt>Allocation</dt><dd><code>{shortId(child.allocationId, 12, 10)}</code></dd></div><div><dt>Terms commitment</dt><dd><code>{shortId(child.termsCommitment, 12, 10)}</code></dd></div><div><dt>Root</dt><dd><code>{shortId(child.rootAccordId, 12, 10)}</code></dd></div></dl></div></section>
    </AppShell>
  );
}

function RoundPage() {
  const { roundId } = useParams();
  if (roundId !== round.id) return <NotFound />;
  return (
    <AppShell>
      <PageHeading eyebrow="MAKKARI SESSION" title="Private funding round" description="A bounded confidential session for this facility and its 9 USDT0 target." help="Makkari defines who may participate, which private inputs and computation are permitted, and when the session expires." action={<Status label="Finalized" />} />
      <div className="dossier-id"><code>{round.id}</code><Link to={`${rootHref}/funding`}>Funding formation <ArrowRightIcon /></Link></div>
      <section className="dossier-grid"><div className="dossier-section"><h2>Session objective</h2><dl><div><dt>Root Accord</dt><dd><code>{shortId(round.rootAccordId)}</code></dd></div><div><dt>Target</dt><dd>9 USDT0</dd></div><div><dt>Maximum fee</dt><dd>{round.maxFeeBps} bps</dd></div><div><dt>Eligible providers</dt><dd>{round.eligibleProviderCount}</dd></div><div><dt>Expiry</dt><dd>{formatDate(round.roundExpiry)}</dd></div></dl></div><div className="dossier-section"><h2>Confidentiality boundary</h2><p>Provider capacity, rates, constraints, expiry, and losing quotes may remain confidential inside the session. Accepted executable capacity, provider addresses, commitments, funding, and settlement are public where the chain requires them.</p><div className="privacy-boundary privacy-boundary--inline"><EyeSlashIcon /><div><strong>Private quote data: withheld</strong><p>No zero values are inferred for unavailable quote fields.</p></div></div></div></section>
    </AppShell>
  );
}

function EvidenceDetailPage() {
  const { digest } = useParams();
  if (digest !== evidence.resultDigest) return <NotFound />;
  return (
    <AppShell>
      <PageHeading eyebrow="COFILL ALLOCATION" title="Verified provider allocation" description="The deterministic result bound to the intended extension, funding round, Root Accord, and digest." help="CoFill deterministically allocates eligible provider offers toward the facility target while preserving the subsequent independent relationships." action={<Status label="Verified" />} />
      <div className="proof-detail"><ShieldCheckIcon /><code>{evidence.resultDigest}</code></div>
      <section className="dossier-grid"><div className="dossier-section"><h2>Binding</h2><dl><div><dt>Extension</dt><dd>66188</dd></div><div><dt>Root Accord</dt><dd><code>{shortId(evidence.rootAccordId!)}</code></dd></div><div><dt>Round</dt><dd><code>{shortId(evidence.roundId!)}</code></dd></div><div><dt>Selected</dt><dd>3 providers · 9 USDT0</dd></div></dl></div><div className="dossier-section"><h2>Execution truth</h2><dl><div><dt>Network</dt><dd>Coston2 · chain 114</dd></div><div><dt>Recorded TEE state</dt><dd>Status 2 · one machine at verification</dd></div><div><dt>TEE mode</dt><dd>Simulated development</dd></div><div><dt>Disclosure</dt><dd>Metadata only</dd></div></dl></div></section>
      <div className="privacy-boundary"><InformationCircleIcon /><div><strong>This is real Coston2 FCC development-path evidence.</strong><p>It is not a claim of private token transfers, private EVM state, production hardware-backed TEE execution, or production institutional readiness.</p></div></div>
    </AppShell>
  );
}

function SettingsPage() {
  return (
    <AppShell>
      <PageHeading eyebrow="ENVIRONMENT DISCLOSURE" title="Network and assets" description="The exact network, contracts, assets, observation source, and security boundary used by this interface." />
      <section className="settings-list">
        {[
          [ServerStackIcon, "Network", "Coston2 · chain 114", snapshot.deployment.rpcUrl],
          [RectangleGroupIcon, "Capital facility", shortId(snapshot.deployment.canonicalFacility.capitalFacility, 12, 10), explorerAddress(snapshot.deployment.canonicalFacility.capitalFacility)],
          [BuildingLibraryIcon, "Accord registry", shortId(snapshot.deployment.canonicalFacility.accordRegistry, 12, 10), explorerAddress(snapshot.deployment.canonicalFacility.accordRegistry)],
          [BanknotesIcon, "Liquidity asset", `USDT0 · ${snapshot.deployment.assets.usdt0Decimals} decimals`, explorerAddress(snapshot.deployment.assets.usdt0)],
          [ShieldCheckIcon, "FCC extension", "66188 · recorded simulated TEE run", "https://coston2-systems-explorer.flare.network/tee/objects?tab=machines&machine_extensionId=66188"],
        ].map(([Icon, label, value, href]) => <a className="settings-row" href={href as string} target="_blank" rel="noreferrer" key={label as string}><Icon aria-hidden="true" /><div><span>{label as string}</span><strong>{value as string}</strong></div><ArrowTopRightOnSquareIcon aria-hidden="true" /></a>)}
      </section>
    </AppShell>
  );
}

function NotFound() {
  return <AppShell><div className="not-found"><DocumentTextIcon /><span className="eyebrow">NOT OBSERVED</span><h1>This relationship is not in the recorded evidence.</h1><p>Concord is not asserting an empty or zero state for this identifier.</p><Link className="button button--primary" to="/facilities">Return to facilities</Link></div></AppShell>;
}

function ObservedFacilityRoute({ children: route }: PropsWithChildren) {
  const { rootId } = useParams();
  return rootId === facility.id ? route : <NotFound />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/facilities" element={<FacilitiesPage />} />
      <Route path="/facilities/:rootId" element={<ObservedFacilityRoute><OverviewPage /></ObservedFacilityRoute>} />
      <Route path="/facilities/:rootId/funding" element={<ObservedFacilityRoute><FundingPage /></ObservedFacilityRoute>} />
      <Route path="/facilities/:rootId/activity" element={<ObservedFacilityRoute><ActivityPage /></ObservedFacilityRoute>} />
      <Route path="/facilities/:rootId/evidence" element={<ObservedFacilityRoute><EvidencePage /></ObservedFacilityRoute>} />
      <Route path="/facilities/:rootId/lineage" element={<ObservedFacilityRoute><LineagePage /></ObservedFacilityRoute>} />
      <Route path="/draws/:drawId" element={<DrawPage />} />
      <Route path="/children/:childId" element={<ChildPage />} />
      <Route path="/rounds/:roundId" element={<RoundPage />} />
      <Route path="/evidence/:digest" element={<EvidenceDetailPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

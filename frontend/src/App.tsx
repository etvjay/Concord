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
  ClockIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EyeSlashIcon,
  FunnelIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  RectangleGroupIcon,
  ServerStackIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
  WalletIcon,
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
        <a href="https://github.com/etvjay/Concord/tree/agent/concord-rebuild/docs" target="_blank" rel="noreferrer">Docs</a>
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
      icon: BuildingLibraryIcon,
      label: "For treasuries",
      title: "Access one facility, not a maze of disconnected deals.",
      copy: "Create one collateral-backed capital relationship, draw from composed capacity, and see exactly what remains available.",
    },
    {
      icon: BanknotesIcon,
      label: "For capital providers",
      title: "Supply capital on terms that remain independently governed.",
      copy: "Offer capacity privately, fund only an accepted allocation, and keep your commitment and exposure attributable to you.",
    },
    {
      icon: GlobeAltIcon,
      label: "For every participant",
      title: "Understand why capital moved and which relationship allowed it.",
      copy: "From formation through repayment, every action stays connected to its root, child relationship, and settlement evidence.",
    },
  ];

  return (
    <main className="landing">
      <section className="landing-hero shell-frame">
        <PublicHeader />
        <div className="landing-hero__grid">
          <div className="hero-copy">
            <p className="eyebrow">SYNDICATED CAPITAL INFRASTRUCTURE</p>
            <h1>One facility.<br />Many providers.<br /><span>Always accountable.</span></h1>
            <p className="hero-copy__body">
              Concord helps a treasury secure capital from independent providers without losing clarity or control. Offers coordinate confidentially; commitments, draws, repayments, and ownership stay explicit.
            </p>
            <div className="hero-actions">
              <Link className="button button--primary" to={rootHref}>Explore the live facility <ArrowRightIcon aria-hidden="true" /></Link>
              <Link className="button button--secondary" to={`/draws/${draw.id}`}>Follow one draw</Link>
            </div>
            <div className="proof-line" aria-label="Current implementation evidence">
              <span>Live on Coston2</span>
              <span>3 funded provider relationships</span>
              <span>Capacity restored after repayment</span>
            </div>
          </div>
          <FacilityArtifact />
        </div>
        <div className="hero-evidence">
          <span>LIVE PRODUCT PROOF</span>
          <div><ShieldCheckIcon aria-hidden="true" /> One Root Accord</div>
          <div><UserGroupIcon aria-hidden="true" /> Three funded children</div>
          <div><ArrowsRightLeftIcon aria-hidden="true" /> Drawn, repaid, restored</div>
          <Link to={`/evidence/${evidence.resultDigest}`}>Technical evidence <ArrowRightIcon aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="landing-section" id="product">
        <div className="section-intro">
          <p className="eyebrow">BUILT AROUND THE RELATIONSHIP</p>
          <h2>Private capital that makes sense to everyone involved.</h2>
          <p>Concord keeps the facility, its participants, and its changing capacity in one understandable structure—without flattening independent providers into an anonymous pool.</p>
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

      <section className="landing-section composition-section" aria-labelledby="composition-title">
        <div className="composition-story">
          <p className="eyebrow">ONE FACILITY · INDEPENDENT RELATIONSHIPS</p>
          <h2 id="composition-title">Capacity composes.<br />Accountability does not disappear.</h2>
          <p>A Root Accord gives the treasury one coherent facility. Each accepted provider forms a Child Accord with its own commitment, exposure, terms commitment, and lifecycle.</p>
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

      <section className="landing-section process-section" id="journey">
        <div className="process-section__copy">
          <p className="eyebrow">FROM NEED TO REUSABLE CAPACITY</p>
          <h2>A complete capital journey, not a one-off transaction.</h2>
          <p>The experience starts with familiar outcomes. Concord’s primitives remain available when a participant needs to inspect authority, privacy, allocation, or settlement in depth.</p>
          <Link className="text-link" to={`${rootHref}/lineage`}>Follow the full relationship <ArrowRightIcon aria-hidden="true" /></Link>
        </div>
        <ol className="process-ledger">
          {[
            ["Create the facility", "The treasury defines one FXRP-backed capital requirement.", "Root Accord"],
            ["Coordinate offers privately", "Eligible providers submit signed capacity and fee terms.", "Makkari · FCC"],
            ["Compose the right capacity", "A deterministic allocation selects providers toward the target.", "CoFill"],
            ["Fund independent commitments", "Selected providers transfer USDT0 before capacity becomes committed.", "Child Accords"],
            ["Draw, repay, reuse", "A multi-provider draw is repaid to its obligations and capacity returns.", "Lineage"],
          ].map(([title, copy, state], index) => (
            <li key={title}>
              <span>{index + 1}</span>
              <div><strong>{title}</strong><small>{copy}</small></div>
              <span className="process-ledger__primitive">{state}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section privacy-section" id="privacy">
        <div className="privacy-section__copy">
          <p className="eyebrow">PRIVACY WITH AN HONEST BOUNDARY</p>
          <h2>Confidential where coordination needs it. Visible where settlement requires it.</h2>
          <p>Provider capacity, fee terms, constraints, quote expiry, and losing offers may remain inside the bounded Makkari session. Accepted commitments, token transfers, draw state, repayment, and lineage remain public where Coston2 requires them.</p>
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
  previous?: RouteLink;
  next?: RouteLink;
};

const globalRoutes: Array<{ label: string; to: string; icon: IconType; matches: (pathname: string) => boolean }> = [
  { label: "Facilities", to: "/facilities", icon: DocumentTextIcon, matches: (pathname) => pathname === "/facilities" },
  {
    label: "Facility",
    to: rootHref,
    icon: RectangleGroupIcon,
    matches: (pathname) => pathname === rootHref
      || pathname.startsWith(`${rootHref}/funding`)
      || pathname.startsWith(`${rootHref}/lineage`)
      || pathname.startsWith("/children/")
      || pathname.startsWith("/rounds/"),
  },
  { label: "Activity", to: `${rootHref}/activity`, icon: ClockIcon, matches: (pathname) => pathname.startsWith(`${rootHref}/activity`) || pathname.startsWith("/draws/") },
  { label: "Evidence", to: `${rootHref}/evidence`, icon: ShieldCheckIcon, matches: (pathname) => pathname.startsWith(`${rootHref}/evidence`) || pathname.startsWith("/evidence/") },
];

function routeGuide(pathname: string): RouteGuide {
  const facilityCrumb = { label: "Coston2 facility", to: rootHref };
  const workspaceCrumb = { label: "Facilities", to: "/facilities" };

  if (pathname === "/facilities") return {
    section: "Workspace",
    current: "Facilities",
    crumbs: [],
    back: { label: "Public site", to: "/" },
    next: { label: "Open facility", to: rootHref },
  };
  if (pathname === rootHref) return {
    section: "Root Accord",
    current: "Overview",
    crumbs: [workspaceCrumb],
    back: workspaceCrumb,
    next: { label: "Funding formation", to: `${rootHref}/funding` },
  };
  if (pathname === `${rootHref}/funding`) return {
    section: "Root Accord",
    current: "Funding",
    crumbs: [workspaceCrumb, facilityCrumb],
    back: { label: "Facility overview", to: rootHref },
    previous: { label: "Overview", to: rootHref },
    next: { label: "Activity", to: `${rootHref}/activity` },
  };
  if (pathname === `${rootHref}/activity`) return {
    section: "Root Accord",
    current: "Activity",
    crumbs: [workspaceCrumb, facilityCrumb],
    back: { label: "Facility overview", to: rootHref },
    previous: { label: "Funding", to: `${rootHref}/funding` },
    next: { label: "Evidence", to: `${rootHref}/evidence` },
  };
  if (pathname === `${rootHref}/evidence`) return {
    section: "Root Accord",
    current: "Evidence",
    crumbs: [workspaceCrumb, facilityCrumb],
    back: { label: "Facility overview", to: rootHref },
    previous: { label: "Activity", to: `${rootHref}/activity` },
    next: { label: "Lineage", to: `${rootHref}/lineage` },
  };
  if (pathname === `${rootHref}/lineage`) return {
    section: "Root Accord",
    current: "Lineage",
    crumbs: [workspaceCrumb, facilityCrumb],
    back: { label: "Facility overview", to: rootHref },
    previous: { label: "Evidence", to: `${rootHref}/evidence` },
  };
  if (pathname.startsWith("/draws/")) return {
    section: "Activity detail",
    current: "Repaid draw",
    crumbs: [workspaceCrumb, facilityCrumb, { label: "Activity", to: `${rootHref}/activity` }],
    back: { label: "Activity", to: `${rootHref}/activity` },
    previous: { label: "Activity", to: `${rootHref}/activity` },
    next: { label: "View lineage", to: `${rootHref}/lineage` },
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
      previous: { label: "Funding", to: `${rootHref}/funding` },
      next: { label: "View lineage", to: `${rootHref}/lineage` },
    };
  }
  if (pathname.startsWith("/rounds/")) return {
    section: "Funding detail",
    current: "Syndication round",
    crumbs: [workspaceCrumb, facilityCrumb, { label: "Funding", to: `${rootHref}/funding` }],
    back: { label: "Funding", to: `${rootHref}/funding` },
    previous: { label: "Funding", to: `${rootHref}/funding` },
    next: { label: "Allocation evidence", to: `/evidence/${evidence.resultDigest}` },
  };
  if (pathname.startsWith("/evidence/")) return {
    section: "Evidence detail",
    current: "Allocation result",
    crumbs: [workspaceCrumb, facilityCrumb, { label: "Evidence", to: `${rootHref}/evidence` }],
    back: { label: "Evidence", to: `${rootHref}/evidence` },
    previous: { label: "Evidence", to: `${rootHref}/evidence` },
    next: { label: "View lineage", to: `${rootHref}/lineage` },
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
      <div className="context-navigation__identity"><small>{guide.section}</small><strong>{guide.current}</strong></div>
      {guide.next && <Link className="context-navigation__next" to={guide.next.to}><span><small>Next</small><strong>{guide.next.label}</strong></span><ArrowRightIcon aria-hidden="true" /></Link>}
    </div>
  );
}

function JourneyFooter({ guide }: { guide: RouteGuide }) {
  if (!guide.previous && !guide.next) return null;
  return (
    <nav className="journey-footer" aria-label="Page sequence">
      {guide.previous
        ? <Link to={guide.previous.to}><ArrowLeftIcon aria-hidden="true" /><span><small>Previous</small><strong>{guide.previous.label}</strong></span></Link>
        : <span />}
      {guide.next
        ? <Link className="journey-footer__next" to={guide.next.to}><span><small>Continue to</small><strong>{guide.next.label}</strong></span><ArrowRightIcon aria-hidden="true" /></Link>
        : <div className="journey-footer__complete"><CheckCircleSolid aria-hidden="true" /><span><small>End of this path</small><strong>Relationship trail complete</strong></span></div>}
    </nav>
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
          <a href="https://github.com/etvjay/Concord/tree/agent/concord-rebuild/docs" target="_blank" rel="noreferrer"><DocumentTextIcon aria-hidden="true" />Documentation</a>
        </nav>
        <div className="drawer-disclosure"><InformationCircleIcon aria-hidden="true" /><p><strong>Development evidence</strong><span>Coston2 · simulated TEE · public settlement</span></p></div>
      </aside>
    </div>
  );
}

function AppShell({ children }: PropsWithChildren) {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const guide = routeGuide(location.pathname);
  useEffect(() => setDrawer(false), [location.pathname]);
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="icon-button app-header__menu" aria-label="Open navigation" aria-expanded={drawer} onClick={() => setDrawer(true)}><Bars3Icon /></button>
        <Brand />
        <nav className="app-header__nav" aria-label="Application navigation">
          {globalRoutes.map((route) => <GlobalNavLink key={route.to} route={route} pathname={location.pathname} />)}
        </nav>
        <div className="app-header__context">
          <NetworkMark />
          <WalletControl compact />
        </div>
      </header>
      <ContextNavigation guide={guide} />
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
      <div className="app-content">{children}<JourneyFooter guide={guide} /></div>
      <footer className="app-footer"><Brand /><span>Coston2 · chain 114 · recorded {formatDate(snapshot.deployment.observedAt)}</span><div><a href="https://github.com/etvjay/Concord" target="_blank" rel="noreferrer">Source</a><Link to="/settings">Disclosure</Link></div></footer>
      <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
        {globalRoutes.map((route) => <GlobalNavLink key={route.to} route={route} pathname={location.pathname} />)}
      </nav>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function FacilitiesPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="RELATIONSHIP REGISTER"
        title="Facilities"
        description="Persistent capital relationships available to this treasury on Coston2."
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

function AccordHeader({ onPrepare }: { onPrepare?: () => void }) {
  return (
    <>
      <div className="accord-header">
        <div>
          <div className="accord-header__eyebrow"><span>ROOT ACCORD</span><Status label="Active · observed" /></div>
          <h1>Coston2 syndicated facility</h1>
          <p>One FXRP-backed relationship composed from three independently funded USDT0 commitments.</p>
          <div className="id-line"><code>{shortId(facility.id, 12, 9)}</code><button className="copy-button" aria-label="Copy Root Accord ID" onClick={() => navigator.clipboard?.writeText(facility.id)}><DocumentDuplicateIcon /></button><span>Expires {formatDate(facility.validUntil)}</span></div>
        </div>
        <div className="accord-header__action">
          <span>Next permitted action</span>
          <button className="button button--primary" onClick={onPrepare}>Prepare draw <ArrowDownTrayIcon aria-hidden="true" /></button>
          <small>Requires treasury wallet review</small>
        </div>
      </div>
      <FacilityTabs />
    </>
  );
}

function MetricsBand() {
  const metrics = [
    ["Target", facility.targetCapacity, "Facility requirement"],
    ["Committed", facility.committedCapacity, "Funded by 3 providers"],
    ["Drawn", facility.drawnPrincipal, "Current principal"],
    ["Available", facility.availableCapacity, "Capacity restored"],
  ];
  return (
    <section className="metrics-band" aria-label="Facility metrics">
      {metrics.map(([label, raw, note], index) => <div key={label} className={index === 3 ? "metric metric--accent" : "metric"}><span>{label}</span><strong>{formatToken(raw)} <small>USDT0</small></strong><p>{note}</p></div>)}
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

function RelationshipSpine() {
  return (
    <section className="section-block">
      <div className="section-header"><div><span className="eyebrow">CAUSAL RELATIONSHIP</span><h2>Why the capital could move</h2></div><Link className="text-link" to={`${rootHref}/lineage`}>Full lineage <ArrowRightIcon aria-hidden="true" /></Link></div>
      <ol className="relationship-spine">
        {relationshipSteps.map(({ label, detail, state, icon: Icon, href }, index) => (
          <li key={label}>
            <Link to={href}>
              <span className="relationship-spine__number">{String(index + 1).padStart(2, "0")}</span>
              <Icon aria-hidden="true" />
              <strong>{label}</strong>
              <small>{detail}</small>
              <Status label={state} />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ChildRegister({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`section-block${compact ? " section-block--compact" : ""}`}>
      <div className="section-header"><div><span className="eyebrow">CHILD ACCORDS</span><h2>Independent provider relationships</h2></div><span className="section-meta">Selected 9 · funded 9 USDT0</span></div>
      <div className="child-table" role="table" aria-label="Funded Child Accords">
        <div className="child-table__head" role="row"><span role="columnheader">Provider</span><span role="columnheader">State</span><span role="columnheader">Committed</span><span role="columnheader">Drawn</span><span role="columnheader">Available</span><span /></div>
        {children.map((child, index) => (
          <Link role="row" className="child-row" to={`/children/${child.id}`} key={child.id}>
            <span role="cell" className="provider-cell"><span className="provider-avatar">P{index + 1}</span><span><strong>{providerLabels.get(child.provider.toLowerCase())}</strong><small>{shortId(child.provider)}</small></span></span>
            <span role="cell"><Status label="Funded · active" /></span>
            <span role="cell"><small>Committed</small>{formatToken(child.committedCapacity)} USDT0</span>
            <span role="cell"><small>Drawn</small>{formatToken(child.drawnPrincipal)} USDT0</span>
            <span role="cell"><small>Available</small>{formatToken(child.availableCapacity)} USDT0</span>
            <span role="cell"><ChevronRightIcon aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StateExplanation() {
  return (
    <div className="state-explanation">
      <div className="state-explanation__icon"><CheckCircleIcon aria-hidden="true" /></div>
      <div><span className="eyebrow">CURRENT STATE</span><h2>Funded, repaid, and ready for another draw.</h2><p>Three child relationships funded 9 USDT0. The recorded 4 USDT0 draw was fully repaid, so root and child exposure are zero and the complete 9 USDT0 capacity is available again.</p></div>
      <div className="invariant-list"><span><CheckCircleSolid aria-hidden="true" />Root exposure matches child exposure</span><span><CheckCircleSolid aria-hidden="true" />Committed capacity matches funded children</span></div>
    </div>
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

function ActionReview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-layer">
      <button className="modal-scrim" aria-label="Close action review" onClick={onClose} />
      <div className="action-review" role="dialog" aria-modal="true" aria-labelledby="action-review-title" ref={dialogRef} tabIndex={-1}>
        <div className="action-review__header"><div className="action-review__icon"><ArrowDownTrayIcon aria-hidden="true" /></div><button className="icon-button" onClick={onClose} aria-label="Close action review"><XMarkIcon /></button></div>
        <span className="eyebrow">UNSIGNED INTENT REVIEW</span>
        <h2 id="action-review-title">Prepare a facility draw</h2>
        <p>This interface is rendering recorded Coston2 evidence. A live intent service and treasury wallet must be connected before Concord can prepare calldata.</p>
        <ol className="review-steps">
          <li><span>1</span><div><strong>What would happen?</strong><p>A new root draw would allocate principal across eligible child capacity.</p></div></li>
          <li><span>2</span><div><strong>Why is it allowed?</strong><p>The root is active, exposure is zero, and 9 USDT0 is available.</p></div></li>
          <li><span>3</span><div><strong>What remains required?</strong><p>Amount entry, unsigned intent generation, explicit wallet approval, receipt confirmation, and an observed state update.</p></div></li>
        </ol>
        <div className="review-boundary"><WalletIcon aria-hidden="true" /><span><strong>No transaction has been prepared or submitted.</strong><small>The frontend does not hold private keys or broadcast on behalf of the treasury.</small></span></div>
        <div className="action-review__actions"><button className="button button--secondary" onClick={onClose}>Close</button><button className="button button--primary" disabled>Intent service not connected</button></div>
      </div>
    </div>
  );
}

function OverviewPage() {
  const [review, setReview] = useState(false);
  return (
    <AppShell>
      <AccordHeader onPrepare={() => setReview(true)} />
      <MetricsBand />
      <StateExplanation />
      <RelationshipSpine />
      <ChildRegister />
      <section className="split-section">
        <div className="section-block"><div className="section-header"><div><span className="eyebrow">ACTIVITY</span><h2>Recorded lifecycle</h2></div><Link className="text-link" to={`${rootHref}/activity`}>All activity <ArrowRightIcon /></Link></div><ActivityList limit={3} /></div>
        <div className="section-block"><div className="section-header"><div><span className="eyebrow">EVIDENCE</span><h2>Verification boundary</h2></div></div><EvidenceSummary /></div>
      </section>
      <ActionReview open={review} onClose={() => setReview(false)} />
    </AppShell>
  );
}

function FundingPage() {
  return (
    <AppShell>
      <FacilityTabs standalone />
      <PageHeading eyebrow="MAKKARI · COFILL" title="Funding formation" description="How confidential offers became three funded child relationships." />
      <section className="round-summary">
        <div><span className="eyebrow">SYNDICATION ROUND</span><h2>Allocation finalized</h2><p>CoFill selected the lowest eligible fees and filled the 9 USDT0 target deterministically.</p></div>
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
      <PageHeading eyebrow="PUBLIC LIFECYCLE" title="Activity" description="Observed relationship events, ordered by causal progression rather than wallet recency." />
      <section className="section-block activity-page"><ActivityList /></section>
    </AppShell>
  );
}

function EvidencePage() {
  return (
    <AppShell>
      <FacilityTabs standalone />
      <PageHeading eyebrow="VERIFICATION & DISCLOSURE" title="Evidence" description="What Concord observed, what remains withheld, and what the implementation does not claim." />
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
      <PageHeading eyebrow="RELATIONSHIP LINEAGE" title="One traceable causal path" description="Each movement links to the relationship, allocation, or draw leg that authorized it." />
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
      <PageHeading eyebrow="DRAW · REPAID" title="4 USDT0 supplied by two child relationships" description="The draw was settled to the treasury and fully mapped back through its originating obligations." action={<Status label="Fully repaid" />} />
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
      <PageHeading eyebrow="CHILD ACCORD" title={`${providerLabels.get(child.provider.toLowerCase())} relationship`} description="An independently governed provider commitment under the parent Root Accord." action={<Status label="Funded · active" />} />
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
      <PageHeading eyebrow="MAKKARI SESSION" title="Private syndication round" description="A bounded confidential execution session for one Root Accord and one facility target." action={<Status label="Finalized" />} />
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
      <PageHeading eyebrow="COFILL EVIDENCE" title="Verified allocation result" description="The deterministic allocation bound to the intended extension, round, Root Accord, and result digest." action={<Status label="Verified" />} />
      <div className="proof-detail"><ShieldCheckIcon /><code>{evidence.resultDigest}</code></div>
      <section className="dossier-grid"><div className="dossier-section"><h2>Binding</h2><dl><div><dt>Extension</dt><dd>66188</dd></div><div><dt>Root Accord</dt><dd><code>{shortId(evidence.rootAccordId!)}</code></dd></div><div><dt>Round</dt><dd><code>{shortId(evidence.roundId!)}</code></dd></div><div><dt>Selected</dt><dd>3 providers · 9 USDT0</dd></div></dl></div><div className="dossier-section"><h2>Execution truth</h2><dl><div><dt>Network</dt><dd>Coston2 · chain 114</dd></div><div><dt>TEE registry state</dt><dd>Status 2 · one active machine</dd></div><div><dt>TEE mode</dt><dd>Simulated development</dd></div><div><dt>Disclosure</dt><dd>Metadata only</dd></div></dl></div></section>
      <div className="privacy-boundary"><InformationCircleIcon /><div><strong>This is real Coston2 FCC development-path evidence.</strong><p>It is not a claim of private token transfers, private EVM state, production hardware-backed TEE execution, or production institutional readiness.</p></div></div>
    </AppShell>
  );
}

function SettingsPage() {
  return (
    <AppShell>
      <PageHeading eyebrow="NETWORK & DISCLOSURE" title="Environment" description="The exact network, contracts, assets, observation source, and security boundary used by this interface." />
      <section className="settings-list">
        {[
          [ServerStackIcon, "Network", "Coston2 · chain 114", snapshot.deployment.rpcUrl],
          [RectangleGroupIcon, "Capital facility", shortId(snapshot.deployment.canonicalFacility.capitalFacility, 12, 10), explorerAddress(snapshot.deployment.canonicalFacility.capitalFacility)],
          [BuildingLibraryIcon, "Accord registry", shortId(snapshot.deployment.canonicalFacility.accordRegistry, 12, 10), explorerAddress(snapshot.deployment.canonicalFacility.accordRegistry)],
          [BanknotesIcon, "Liquidity asset", `USDT0 · ${snapshot.deployment.assets.usdt0Decimals} decimals`, explorerAddress(snapshot.deployment.assets.usdt0)],
          [ShieldCheckIcon, "FCC extension", "66188 · simulated development TEE", snapshot.deployment.extension.activeTeeUrls[0]],
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

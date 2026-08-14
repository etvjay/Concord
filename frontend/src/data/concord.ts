import type {
  ChildAccord,
  Draw,
  Evidence,
  Facility,
  Lineage,
  Round,
} from "@concord-protocol/sdk";
import deployment from "../../../config/coston2/concord-deployment.json";

const root = deployment.rootRound;
const lifecycle = root.facilityLifecycle;

export const providerLabels = new Map(
  root.children.map((child, index) => [child.provider.toLowerCase(), `Provider ${index + 1}`]),
);

export function formatToken(raw: string, decimals = 6, maximumFractionDigits = 2) {
  const divisor = 10n ** BigInt(decimals);
  const value = BigInt(raw);
  const whole = value / divisor;
  const fraction = value % divisor;
  const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const wholeText = formatter.format(whole);
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, maximumFractionDigits)
    .replace(/0+$/, "");
  if (!fractionText) return wholeText;
  const decimal = new Intl.NumberFormat(undefined).formatToParts(1.1)
    .find((part) => part.type === "decimal")?.value ?? ".";
  return `${wholeText}${decimal}${fractionText}`;
}

export function shortId(value: string, start = 7, end = 5) {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

const childStateCopy = {
  state: "ACTIVE",
  label: "Active",
  explanation: "The provider funded its selected allocation and participates in the active facility.",
};

export const children: ChildAccord[] = root.children.map((child) => ({
  id: child.id,
  rootAccordId: root.rootAccordId,
  allocationId: child.allocationId,
  provider: child.provider,
  selectedCapacity: child.selectedCapacity,
  committedCapacity: child.committedCapacity,
  drawnPrincipal: child.drawnPrincipal,
  availableCapacity: (BigInt(child.committedCapacity) - BigInt(child.drawnPrincipal)).toString(),
  feeBps: child.feeBps,
  validUntil: new Date(Number(child.validUntilUnix) * 1000).toISOString(),
  validUntilUnix: child.validUntilUnix,
  termsCommitment: child.termsCommitment,
  state: "ACTIVE",
  stateCopy: childStateCopy,
}));

export const round: Round = {
  id: root.roundId,
  rootAccordId: root.rootAccordId,
  targetCapacity: root.targetCapacity,
  maxFeeBps: root.maxFeeBps,
  roundExpiry: root.roundExpiry,
  roundExpiryUnix: root.roundExpiryUnix,
  status: "FINALIZED",
  stateCopy: {
    state: "FINALIZED",
    label: "Allocation verified",
    explanation: "CoFill finalized a deterministic allocation from three confidential provider offers.",
  },
  eligibleProviderCount: root.eligibleProviders.length,
  privateQuoteData: "withheld",
};

export const facility: Facility = {
  id: root.rootAccordId,
  borrower: root.borrower,
  collateralAsset: {
    address: deployment.assets.fxrp,
    symbol: "FXRP",
    decimals: deployment.assets.fxrpDecimals,
  },
  liquidityAsset: {
    address: deployment.assets.usdt0,
    symbol: "USDT0",
    decimals: deployment.assets.usdt0Decimals,
  },
  targetCapacity: root.targetCapacity,
  committedCapacity: root.verifiedOnchain.committedCapacity,
  drawnPrincipal: root.verifiedOnchain.drawnPrincipal,
  collateralLocked: root.collateralLocked,
  availableCapacity: lifecycle.finalAvailableCapacity,
  validUntil: root.validUntil,
  validUntilUnix: root.validUntilUnix,
  policyHash: root.policyHash,
  syndicationRoundId: root.roundId,
  state: "ACTIVE",
  stateCopy: {
    state: "ACTIVE",
    label: "Active",
    explanation: "All three selected providers funded their allocations. The recorded draw was repaid and capacity returned.",
  },
  round,
  children,
  invariants: {
    rootDrawWithinCommitment: true,
    childDrawWithinCommitment: true,
    rootExposureMatchesChildren: true,
    committedMatchesFundedChildren: true,
  },
};

export const draw: Draw = {
  id: lifecycle.drawId,
  rootAccordId: root.rootAccordId,
  principal: lifecycle.drawAmount,
  repaidPrincipal: lifecycle.drawAmount,
  outstandingPrincipal: "0",
  createdAt: lifecycle.drawCreatedAt,
  legs: lifecycle.drawLegs.map((leg) => {
    const child = children.find((candidate) => candidate.id === leg.childAccordId)!;
    return {
      id: leg.id,
      drawId: lifecycle.drawId,
      childAccordId: leg.childAccordId,
      provider: child.provider,
      principal: leg.principal,
      repaidPrincipal: leg.repaidPrincipal,
      outstandingPrincipal: (BigInt(leg.principal) - BigInt(leg.repaidPrincipal)).toString(),
    };
  }),
};

export const evidence: Evidence = {
  resultDigest: root.allocation.resultDigest,
  status: "verified",
  disclosure: "metadata_only",
  extensionId: deployment.extension.id,
  roundId: root.roundId,
  rootAccordId: root.rootAccordId,
  source: "coston2_fcc",
  warning: "Coston2 execution used the supported simulated development TEE path; public token transfers remain public.",
};

export const lineage: Lineage = {
  rootAccordId: root.rootAccordId,
  nodes: [
    {
      id: root.rootAccordId,
      parentId: "",
      kind: "ROOT_ACCORD",
      createdAt: deployment.observedAt,
      children: [root.roundId],
    },
    {
      id: root.roundId,
      parentId: root.rootAccordId,
      kind: "MAKKARI_SESSION",
      createdAt: deployment.observedAt,
      children: [root.allocation.resultDigest],
    },
    {
      id: root.allocation.resultDigest,
      parentId: root.roundId,
      kind: "COFILL_ALLOCATION",
      createdAt: deployment.observedAt,
      children: children.map((child) => child.id),
    },
    ...children.map((child) => ({
      id: child.id,
      parentId: root.allocation.resultDigest,
      kind: "CHILD_ACCORD" as const,
      createdAt: deployment.observedAt,
      children: draw.legs.filter((leg) => leg.childAccordId === child.id).map((leg) => leg.id),
    })),
    {
      id: draw.id,
      parentId: root.rootAccordId,
      kind: "DRAW" as const,
      createdAt: draw.createdAt,
      children: draw.legs.map((leg) => leg.id),
    },
    ...draw.legs.map((leg) => ({
      id: leg.id,
      parentId: draw.id,
      kind: "DRAW_LEG" as const,
      createdAt: draw.createdAt,
      children: [],
    })),
  ],
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  tx?: string;
  tone: "observed" | "private" | "restored";
};

export const activity: ActivityItem[] = [
  {
    id: "root",
    title: "Root Accord created and collateralized",
    description: "The treasury created one 9 USDT0 facility and locked 1 FXRP.",
    tx: root.transactions.createRoot,
    tone: "observed",
  },
  {
    id: "round",
    title: "Makkari syndication opened",
    description: "Three eligible providers entered the confidential coordination round.",
    tx: root.transactions.openSyndication,
    tone: "private",
  },
  {
    id: "allocation",
    title: "CoFill allocation verified",
    description: "Three 3 USDT0 child allocations were materialized at 610, 640, and 680 bps.",
    tx: root.allocation.materializeTransaction,
    tone: "observed",
  },
  {
    id: "funding",
    title: "Selected providers funded",
    description: "Three successful USDT0 transfers moved the child relationships from selected to active.",
    tx: lifecycle.fundingTransactions[2],
    tone: "observed",
  },
  {
    id: "draw",
    title: "4 USDT0 drawn across two children",
    description: "Provider 1 supplied 3 USDT0 and Provider 2 supplied 1 USDT0 through explicit draw legs.",
    tx: lifecycle.drawTransaction,
    tone: "observed",
  },
  {
    id: "repayment",
    title: "Principal repaid; capacity restored",
    description: "The 4 USDT0 principal was repaid, child exposure returned to zero, and 9 USDT0 became available again.",
    tx: lifecycle.repaymentTransaction,
    tone: "restored",
  },
];

export const snapshot = {
  deployment,
  facility,
  round,
  children,
  draw,
  evidence,
  lineage,
  activity,
};

export function explorerTx(hash: string) {
  return `${deployment.explorerUrl}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${deployment.explorerUrl}/address/${address}`;
}

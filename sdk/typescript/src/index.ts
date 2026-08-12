export type ObservationStatus = "observed" | "partial" | "not_observed";
export type ObservationSource = "onchain" | "fcc_evidence" | "derived";

export interface Observation {
  status: ObservationStatus;
  source: ObservationSource;
  network: string;
  chainId: number;
  blockNumber?: string;
  observedAt: string;
  warning?: string;
}

export interface Meta {
  observation: Observation;
  apiVersion: string;
}

export interface Envelope<T> {
  data: T;
  meta: Meta;
}

export type RootState =
  | "NONE"
  | "PROPOSED"
  | "SYNDICATING"
  | "FUNDING"
  | "ACTIVE"
  | "CLOSED"
  | "FROZEN"
  | "EXPIRED";

export type ChildState =
  | "NONE"
  | "SELECTED"
  | "FUNDED"
  | "ACTIVE"
  | "CLOSED"
  | "EXPIRED"
  | "DEFAULTED";

export type RoundStatus = "NONE" | "OPEN" | "FINALIZED" | "EXPIRED";

export interface StateCopy {
  state: string;
  label: string;
  explanation: string;
}

export interface Asset {
  address: string;
  symbol: string;
  decimals: number;
}

export interface ChildAccord {
  id: string;
  rootAccordId: string;
  allocationId: string;
  provider: string;
  selectedCapacity: string;
  committedCapacity: string;
  drawnPrincipal: string;
  availableCapacity: string;
  feeBps: number;
  validUntil: string;
  validUntilUnix: string;
  termsCommitment: string;
  state: ChildState;
  stateCopy: StateCopy;
}

export interface Round {
  id: string;
  rootAccordId: string;
  targetCapacity: string;
  maxFeeBps: number;
  roundExpiry: string;
  roundExpiryUnix: string;
  status: RoundStatus;
  stateCopy: StateCopy;
  eligibleProviderCount: number;
  privateQuoteData: "withheld" | "authorized";
}

export interface Facility {
  id: string;
  borrower: string;
  collateralAsset: Asset;
  liquidityAsset: Asset;
  targetCapacity: string;
  committedCapacity: string;
  drawnPrincipal: string;
  collateralLocked: string;
  availableCapacity: string;
  validUntil: string;
  validUntilUnix: string;
  policyHash: string;
  syndicationRoundId: string;
  state: RootState;
  stateCopy: StateCopy;
  round?: Round;
  children: ChildAccord[];
  invariants: {
    rootDrawWithinCommitment: boolean;
    childDrawWithinCommitment: boolean;
    rootExposureMatchesChildren: boolean;
    committedMatchesFundedChildren: boolean;
  };
}

export interface LineageNode {
  id: string;
  parentId: string;
  kind:
    | "ROOT_ACCORD"
    | "MAKKARI_SESSION"
    | "COFILL_ALLOCATION"
    | "CHILD_ACCORD"
    | "DRAW"
    | "DRAW_LEG"
    | "SETTLEMENT"
    | "REPAYMENT";
  createdAt: string;
  children: string[];
}

export interface Lineage {
  rootAccordId: string;
  nodes: LineageNode[];
}

export interface DrawLeg {
  id: string;
  drawId: string;
  childAccordId: string;
  provider: string;
  principal: string;
  repaidPrincipal: string;
  outstandingPrincipal: string;
}

export interface Draw {
  id: string;
  rootAccordId: string;
  principal: string;
  repaidPrincipal: string;
  outstandingPrincipal: string;
  createdAt: string;
  legs: DrawLeg[];
}

export type PreparedAction =
  | "create_root"
  | "lock_collateral"
  | "approve_asset"
  | "fund_child"
  | "draw"
  | "repay";

export interface PrepareTransactionRequest {
  action: PreparedAction;
  rootAccordId?: string;
  childAccordId?: string;
  drawId?: string;
  targetCapacity?: string;
  amount?: string;
  validUntilUnix?: string;
  policyHash?: string;
  asset?: string;
  spender?: string;
  actor?: "treasury" | "provider" | "institution" | "agent";
}

export interface TransactionIntent {
  action: PreparedAction;
  chainId: number;
  to: string;
  data: string;
  value: string;
  summary: string;
  requiresExplicitApproval: true;
  preconditions: string[];
  warnings?: string[];
}

export class ConcordAPIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ConcordAPIError";
  }
}

export interface ConcordClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
  headers?: Record<string, string>;
}

export class ConcordClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly headers: Record<string, string>;

  constructor(options: ConcordClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetcher ?? fetch;
    this.headers = { Accept: "application/json", ...options.headers };
  }

  getFacility(rootAccordId: string): Promise<Envelope<Facility>> {
    return this.get(`/v1/facilities/${rootAccordId}`);
  }

  getLineage(rootAccordId: string): Promise<Envelope<Lineage>> {
    return this.get(`/v1/facilities/${rootAccordId}/lineage`);
  }

  getRound(roundId: string): Promise<Envelope<Round>> {
    return this.get(`/v1/rounds/${roundId}`);
  }

  getDraw(drawId: string): Promise<Envelope<Draw>> {
    return this.get(`/v1/draws/${drawId}`);
  }

  prepareTransaction(
    request: PrepareTransactionRequest,
  ): Promise<Envelope<TransactionIntent>> {
    return this.request<Envelope<TransactionIntent>>("/v1/transactions/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...(init.headers ?? {}) },
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      const error = body as { error?: { code?: string; message?: string } };
      throw new ConcordAPIError(
        error.error?.message ?? `Concord API request failed (${response.status})`,
        response.status,
        error.error?.code,
      );
    }
    return body as T;
  }
}

export function formatUnits(value: string, decimals: number, maximumFractionDigits = 6): string {
  const integer = BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = integer / base;
  const fraction = integer % base;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${fractionText.slice(0, maximumFractionDigits)}`;
}

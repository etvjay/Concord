import {
  encodeFunctionData,
  getAddress,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import deployment from "../../config/coston2/concord-deployment.json";

export const capitalFacilityAddress = getAddress(
  deployment.canonicalFacility.capitalFacility,
);

export const collateralAssetAddress = getAddress(deployment.assets.fxrp);
export const collateralAssetDecimals = deployment.assets.fxrpDecimals;
export const sandboxProviderAddresses = deployment.rootRound.eligibleProviders.map(
  (provider) => getAddress(provider),
);

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const capitalFacilityAbi = [
  {
    type: "function",
    name: "createRootAccord",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rootId", type: "bytes32" },
      { name: "targetCapacity", type: "uint256" },
      { name: "validUntil", type: "uint64" },
      { name: "policyHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "availableCapacity",
    stateMutability: "view",
    inputs: [{ name: "rootId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lockCollateral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rootId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "openSyndication",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rootId", type: "bytes32" },
      { name: "roundId", type: "bytes32" },
      { name: "maxFeeBps", type: "uint32" },
      { name: "roundExpiry", type: "uint64" },
      { name: "eligibleProviders", type: "address[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "draw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "drawId", type: "bytes32" },
      { name: "rootId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export type CreateRootIntent = {
  action: "create_root";
  chainId: 114;
  to: Address;
  data: Hex;
  value: 0n;
  rootAccordId: Hex;
  targetCapacity: bigint;
  validUntil: bigint;
  policyHash: Hex;
  summary: string;
  requiresExplicitApproval: true;
  preconditions: readonly string[];
  warnings: readonly string[];
};

export type DrawIntent = {
  action: "draw";
  chainId: 114;
  to: Address;
  data: Hex;
  value: 0n;
  drawId: Hex;
  rootAccordId: Hex;
  amount: bigint;
  summary: string;
  requiresExplicitApproval: true;
  preconditions: readonly string[];
  warnings: readonly string[];
};

export type AssetApprovalIntent = {
  action: "approve_asset";
  chainId: 114;
  to: Address;
  data: Hex;
  value: 0n;
  assetAddress: Address;
  assetSymbol: string;
  spender: Address;
  amount: bigint;
  summary: string;
  requiresExplicitApproval: true;
  preconditions: readonly string[];
  warnings: readonly string[];
};

export type LockCollateralIntent = {
  action: "lock_collateral";
  chainId: 114;
  to: Address;
  data: Hex;
  value: 0n;
  rootAccordId: Hex;
  amount: bigint;
  summary: string;
  requiresExplicitApproval: true;
  preconditions: readonly string[];
  warnings: readonly string[];
};

export type OpenSyndicationIntent = {
  action: "open_syndication";
  chainId: 114;
  to: Address;
  data: Hex;
  value: 0n;
  rootAccordId: Hex;
  roundId: Hex;
  maxFeeBps: number;
  roundExpiry: bigint;
  providerAddresses: readonly Address[];
  summary: string;
  requiresExplicitApproval: true;
  preconditions: readonly string[];
  warnings: readonly string[];
};

function assertBytes32(value: Hex, label: string) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${label} must be a 32-byte hex value`);
  }
}

function assertNonZeroBytes32(value: Hex, label: string) {
  assertBytes32(value, label);
  if (value.toLowerCase() === `0x${"0".repeat(64)}`) {
    throw new Error(`${label} must not be zero`);
  }
}

export function createDrawId(
  rootAccordId: Hex,
  actor: Address,
  nonce: string,
): Hex {
  assertBytes32(rootAccordId, "rootAccordId");
  if (!nonce) throw new Error("nonce is required");
  return keccak256(stringToHex(`concord:draw:${rootAccordId}:${actor.toLowerCase()}:${nonce}`));
}

export function createBorrowerSessionId(actor: Address, nonce: string, kind: "root" | "round"): Hex {
  if (!nonce) throw new Error("nonce is required");
  return keccak256(stringToHex(`concord:borrower-sandbox:${kind}:${actor.toLowerCase()}:${nonce}`));
}

export function buildCreateRootIntent(input: {
  rootAccordId: Hex;
  targetCapacity: bigint;
  validUntil: bigint;
  policyHash: Hex;
}): CreateRootIntent {
  assertNonZeroBytes32(input.rootAccordId, "rootAccordId");
  assertBytes32(input.policyHash, "policyHash");
  if (input.targetCapacity <= 0n) throw new Error("targetCapacity must be greater than zero");
  if (input.validUntil <= BigInt(Math.floor(Date.now() / 1000))) throw new Error("validUntil must be in the future");

  return {
    action: "create_root",
    chainId: 114,
    to: capitalFacilityAddress,
    data: encodeFunctionData({
      abi: capitalFacilityAbi,
      functionName: "createRootAccord",
      args: [input.rootAccordId, input.targetCapacity, input.validUntil, input.policyHash],
    }),
    value: 0n,
    rootAccordId: input.rootAccordId,
    targetCapacity: input.targetCapacity,
    validUntil: input.validUntil,
    policyHash: input.policyHash,
    summary: "Create a new Root Accord bound to the connected borrower wallet.",
    requiresExplicitApproval: true,
    preconditions: [
      "The connected wallet becomes the borrower through msg.sender.",
      "The Root Accord ID must not already exist.",
      "The expiry must be in the future.",
      "Further lifecycle steps require FXRP collateral and a configured provider coordinator.",
    ],
    warnings: [
      "This is a Coston2 testnet transaction.",
      "Creating a Root Accord does not fund Child Accords or create borrowing capacity by itself.",
    ],
  };
}

export function buildApproveAssetIntent(input: {
  assetAddress: Address;
  spender: Address;
  amount: bigint;
  assetSymbol: string;
}): AssetApprovalIntent {
  if (input.amount <= 0n) throw new Error("approval amount must be greater than zero");
  if (!input.assetSymbol.trim()) throw new Error("assetSymbol is required");
  const assetAddress = getAddress(input.assetAddress);
  const spender = getAddress(input.spender);

  return {
    action: "approve_asset",
    chainId: 114,
    to: assetAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, input.amount],
    }),
    value: 0n,
    assetAddress,
    assetSymbol: input.assetSymbol,
    spender,
    amount: input.amount,
    summary: `Approve ${input.assetSymbol} collateral for the Concord facility.`,
    requiresExplicitApproval: true,
    preconditions: [
      "The connected wallet must own enough collateral for the requested amount.",
      "The spender is the canonical CapitalFacility contract.",
      "This approval does not transfer funds by itself.",
    ],
    warnings: [
      "This is a Coston2 testnet transaction.",
      "Token allowances are public ERC-20 state and can be reviewed or revoked in the wallet.",
    ],
  };
}

export function buildLockCollateralIntent(input: {
  rootAccordId: Hex;
  amount: bigint;
}): LockCollateralIntent {
  assertNonZeroBytes32(input.rootAccordId, "rootAccordId");
  if (input.amount <= 0n) throw new Error("collateral amount must be greater than zero");

  return {
    action: "lock_collateral",
    chainId: 114,
    to: capitalFacilityAddress,
    data: encodeFunctionData({
      abi: capitalFacilityAbi,
      functionName: "lockCollateral",
      args: [input.rootAccordId, input.amount],
    }),
    value: 0n,
    rootAccordId: input.rootAccordId,
    amount: input.amount,
    summary: "Lock FXRP collateral against the new Root Accord.",
    requiresExplicitApproval: true,
    preconditions: [
      "The connected wallet must be the Root Accord borrower.",
      "The Root Accord must be in PROPOSED state.",
      "The collateral token approval must cover this amount.",
    ],
    warnings: [
      "This is a Coston2 testnet transaction.",
      "The FXRP is held by the CapitalFacility until the contract's recovery rules permit return.",
    ],
  };
}

export function buildOpenSyndicationIntent(input: {
  rootAccordId: Hex;
  roundId: Hex;
  maxFeeBps: number;
  roundExpiry: bigint;
  rootValidUntil: bigint;
  providerAddresses: readonly Address[];
}): OpenSyndicationIntent {
  assertNonZeroBytes32(input.rootAccordId, "rootAccordId");
  assertNonZeroBytes32(input.roundId, "roundId");
  if (input.maxFeeBps < 0 || input.maxFeeBps > 10_000 || !Number.isInteger(input.maxFeeBps)) {
    throw new Error("maxFeeBps must be an integer between 0 and 10000");
  }
  if (input.roundExpiry <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error("roundExpiry must be in the future");
  }
  if (input.roundExpiry > input.rootValidUntil) {
    throw new Error("roundExpiry must not exceed rootValidUntil");
  }
  if (input.providerAddresses.length === 0) throw new Error("at least one provider is required");
  const providerAddresses = input.providerAddresses.map((provider) => getAddress(provider));

  return {
    action: "open_syndication",
    chainId: 114,
    to: capitalFacilityAddress,
    data: encodeFunctionData({
      abi: capitalFacilityAbi,
      functionName: "openSyndication",
      args: [
        input.rootAccordId,
        input.roundId,
        input.maxFeeBps,
        input.roundExpiry,
        providerAddresses,
      ],
    }),
    value: 0n,
    rootAccordId: input.rootAccordId,
    roundId: input.roundId,
    maxFeeBps: input.maxFeeBps,
    roundExpiry: input.roundExpiry,
    providerAddresses,
    summary: "Open a bounded provider syndication session for the Root Accord.",
    requiresExplicitApproval: true,
    preconditions: [
      "The connected wallet must be the Root Accord borrower.",
      "The Root Accord must have locked collateral.",
      "The round expiry must be within the Root Accord expiry.",
      "The listed provider addresses are fixture eligibility inputs, not provider quotes or funding.",
    ],
    warnings: [
      "This is a Coston2 testnet transaction.",
      "Opening the session does not verify FCC output, materialize Child Accords, or fund commitments.",
    ],
  };
}

export function buildDrawIntent(input: {
  rootAccordId: Hex;
  drawId: Hex;
  amount: bigint;
}): DrawIntent {
  assertNonZeroBytes32(input.rootAccordId, "rootAccordId");
  assertNonZeroBytes32(input.drawId, "drawId");
  if (input.amount <= 0n) throw new Error("amount must be greater than zero");

  return {
    action: "draw",
    chainId: 114,
    to: capitalFacilityAddress,
    data: encodeFunctionData({
      abi: capitalFacilityAbi,
      functionName: "draw",
      args: [input.drawId, input.rootAccordId, input.amount],
    }),
    value: 0n,
    drawId: input.drawId,
    rootAccordId: input.rootAccordId,
    amount: input.amount,
    summary: "Draw USDT0 from the active Root Accord.",
    requiresExplicitApproval: true,
    preconditions: [
      "The connected signer must be the Root Accord borrower.",
      "The Root Accord must be ACTIVE.",
      "The amount must not exceed live available capacity.",
      "The draw consumes explicit Child Accord Draw Legs onchain.",
    ],
    warnings: [
      "This is a Coston2 testnet transaction.",
      "USDT0 settlement and EVM state are public.",
    ],
  };
}

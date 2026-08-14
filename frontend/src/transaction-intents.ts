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

function assertBytes32(value: Hex, label: string) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${label} must be a 32-byte hex value`);
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
  assertBytes32(input.rootAccordId, "rootAccordId");
  assertBytes32(input.policyHash, "policyHash");
  if (input.rootAccordId === `0x${"0".repeat(64)}`) throw new Error("rootAccordId must not be zero");
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

export function buildDrawIntent(input: {
  rootAccordId: Hex;
  drawId: Hex;
  amount: bigint;
}): DrawIntent {
  assertBytes32(input.rootAccordId, "rootAccordId");
  assertBytes32(input.drawId, "drawId");
  if (input.drawId === `0x${"0".repeat(64)}`) {
    throw new Error("drawId must not be zero");
  }
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

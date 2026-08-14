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

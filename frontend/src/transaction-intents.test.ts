import { decodeFunctionData, getAddress, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import {
  buildDrawIntent,
  capitalFacilityAbi,
  capitalFacilityAddress,
  createDrawId,
} from "./transaction-intents";

const root = `0x${"11".repeat(32)}` as Hex;
const actor = getAddress("0x1111111111111111111111111111111111111111");

describe("draw transaction intents", () => {
  it("builds deterministic canonical draw calldata without submitting it", () => {
    const drawId = createDrawId(root, actor, "test-nonce");
    const intent = buildDrawIntent({
      rootAccordId: root,
      drawId,
      amount: 1_250_000n,
    });
    const decoded = decodeFunctionData({
      abi: capitalFacilityAbi,
      data: intent.data,
    });

    expect(intent).toMatchObject({
      action: "draw",
      chainId: 114,
      to: capitalFacilityAddress,
      value: 0n,
      requiresExplicitApproval: true,
    });
    expect(decoded.functionName).toBe("draw");
    expect(decoded.args).toEqual([drawId, root, 1_250_000n]);
  });

  it("rejects zero amounts and malformed identifiers", () => {
    const drawId = createDrawId(root, actor, "test-nonce");
    expect(() =>
      buildDrawIntent({ rootAccordId: root, drawId, amount: 0n }),
    ).toThrow(/greater than zero/i);
    expect(() =>
      buildDrawIntent({
        rootAccordId: "0x1234" as Hex,
        drawId,
        amount: 1n,
      }),
    ).toThrow(/32-byte/i);
  });
});

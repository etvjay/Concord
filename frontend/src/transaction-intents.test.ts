import { decodeFunctionData, getAddress, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import {
  buildApproveAssetIntent,
  buildCreateRootIntent,
  buildDrawIntent,
  buildLockCollateralIntent,
  buildOpenSyndicationIntent,
  capitalFacilityAbi,
  capitalFacilityAddress,
  collateralAssetAddress,
  createBorrowerSessionId,
  createDrawId,
  erc20Abi,
  sandboxProviderAddresses,
} from "./transaction-intents";

const root = `0x${"11".repeat(32)}` as Hex;
const actor = getAddress("0x1111111111111111111111111111111111111111");

describe("draw transaction intents", () => {
  it("binds a fresh Root Accord intent to the connected borrower without submitting it", () => {
    const actor = getAddress("0x1aF42c70837f08c6C89a6FA274EB9eeF040820B3");
    const rootAccordId = createBorrowerSessionId(actor, "test-session", "root");
    const intent = buildCreateRootIntent({
      rootAccordId,
      targetCapacity: 9_000_000n,
      validUntil: BigInt(Math.floor(Date.now() / 1000) + 3600),
      policyHash: "0xcb41179c81b6d45a22487986ae6ca4faa1c025ff4492c02ce3d26c5b0de8443e",
    });

    expect(intent.action).toBe("create_root");
    expect(intent.to).toBe(capitalFacilityAddress);
    expect(intent.data).toMatch(/^0x[0-9a-f]+$/);
    expect(intent.requiresExplicitApproval).toBe(true);
    expect(intent.preconditions.join(" ")).toMatch(/connected wallet becomes the borrower/i);
  });

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

  it("builds an explicit FXRP approval intent for the canonical facility", () => {
    const intent = buildApproveAssetIntent({
      assetAddress: collateralAssetAddress,
      spender: capitalFacilityAddress,
      amount: 1_000_000n,
      assetSymbol: "FXRP",
    });
    const decoded = decodeFunctionData({ abi: erc20Abi, data: intent.data });

    expect(intent).toMatchObject({
      action: "approve_asset",
      chainId: 114,
      to: collateralAssetAddress,
      spender: capitalFacilityAddress,
      amount: 1_000_000n,
      requiresExplicitApproval: true,
    });
    expect(decoded.functionName).toBe("approve");
    expect(decoded.args).toEqual([capitalFacilityAddress, 1_000_000n]);
  });

  it("builds the collateral lock intent without submitting it", () => {
    const intent = buildLockCollateralIntent({ rootAccordId: root, amount: 1_000_000n });
    const decoded = decodeFunctionData({ abi: capitalFacilityAbi, data: intent.data });

    expect(decoded.functionName).toBe("lockCollateral");
    expect(decoded.args).toEqual([root, 1_000_000n]);
    expect(intent.preconditions.join(" ")).toMatch(/token approval/i);
  });

  it("builds a bounded provider-session intent from fixture eligibility inputs", () => {
    const round = createBorrowerSessionId(actor, root, "round");
    const rootValidUntil = BigInt(Math.floor(Date.now() / 1000) + 7200);
    const roundExpiry = rootValidUntil - 60n;
    const intent = buildOpenSyndicationIntent({
      rootAccordId: root,
      roundId: round,
      maxFeeBps: 700,
      roundExpiry,
      rootValidUntil,
      providerAddresses: sandboxProviderAddresses,
    });
    const decoded = decodeFunctionData({ abi: capitalFacilityAbi, data: intent.data });

    expect(decoded.functionName).toBe("openSyndication");
    expect(decoded.args).toEqual([
      root,
      round,
      700,
      roundExpiry,
      sandboxProviderAddresses,
    ]);
    expect(intent.warnings.join(" ")).toMatch(/does not verify FCC output/i);
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { children, draw, facility, formatToken } from "./data/concord";

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("Concord frontend product semantics", () => {
  it("presents the relationship as the product on the landing page", () => {
    renderRoute("/");
    expect(screen.getByRole("heading", { name: /private capital,\s*coordinated/i })).toBeInTheDocument();
    expect(screen.getByText(/the relationship is the product/i)).toBeInTheDocument();
    expect(screen.getByText(/simulated development tee/i)).toBeInTheDocument();
  });

  it("renders the observed Root Accord and distinguishes current exposure from restored capacity", () => {
    renderRoute(`/facilities/${facility.id}`);
    expect(screen.getByRole("heading", { level: 1, name: "Coston2 syndicated facility" })).toBeInTheDocument();
    expect(screen.getByText(/funded, repaid, and ready for another draw/i)).toBeInTheDocument();
    expect(screen.getAllByText(/9 USDT0/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0 USDT0/i).length).toBeGreaterThan(0);
  });

  it("keeps child commitments and draw legs explicit", () => {
    renderRoute(`/draws/${draw.id}`);
    expect(screen.getByRole("heading", { name: /supplied by two child relationships/i })).toBeInTheDocument();
    expect(screen.getByText("Provider 1")).toBeInTheDocument();
    expect(screen.getByText("Provider 2")).toBeInTheDocument();
    expect(draw.legs).toHaveLength(2);
    expect(children).toHaveLength(3);
  });

  it("does not convert an unknown Root Accord into the observed facility", () => {
    renderRoute("/facilities/0xnot-observed");
    expect(screen.getByRole("heading", { name: /not in the recorded evidence/i })).toBeInTheDocument();
    expect(screen.queryByText(/funded, repaid, and ready for another draw/i)).not.toBeInTheDocument();
  });
});

describe("recorded Coston2 invariants", () => {
  it("derives root commitment and exposure from funded children", () => {
    const childCommitment = children.reduce((sum, child) => sum + BigInt(child.committedCapacity), 0n);
    const childExposure = children.reduce((sum, child) => sum + BigInt(child.drawnPrincipal), 0n);
    expect(childCommitment).toBe(BigInt(facility.committedCapacity));
    expect(childExposure).toBe(BigInt(facility.drawnPrincipal));
    expect(BigInt(facility.availableCapacity)).toBe(
      BigInt(facility.committedCapacity) - BigInt(facility.drawnPrincipal),
    );
  });

  it("formats large base-unit amounts without converting through unsafe JavaScript numbers", () => {
    expect(formatToken("9007199254740993000000").replace(/\D/g, "")).toBe("9007199254740993");
  });
});

import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { WagmiProvider } from "wagmi";
import { App } from "./App";
import { children, draw, facility, formatToken } from "./data/concord";
import { wagmiConfig } from "./web3";

function renderRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </WagmiProvider>,
  );
}

describe("Concord frontend product semantics", () => {
  it("presents the relationship as the product on the landing page", () => {
    renderRoute("/");
    expect(screen.getByRole("heading", { name: /one facility\.\s*many providers\.\s*always accountable/i })).toBeInTheDocument();
    expect(screen.getByText(/built around the relationship/i)).toBeInTheDocument();
    expect(screen.getByText(/confidential where coordination needs it/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /install wallet/i }).length).toBeGreaterThan(0);
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

  it("keeps a draw detail anchored to its parent activity and onward lineage", () => {
    renderRoute(`/draws/${draw.id}`);
    expect(screen.getByRole("link", { name: /back to activity/i })).toHaveAttribute("href", `/facilities/${facility.id}/activity`);
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("Activity")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /view lineage/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Activity" }).some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });

  it("presents facility sections as a directed sequence without repeating the overview header", () => {
    document.documentElement.scrollTop = 480;
    renderRoute(`/facilities/${facility.id}/funding`);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(screen.getByRole("heading", { level: 1, name: "Funding formation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Coston2 syndicated facility" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to facility overview/i })).toHaveAttribute("href", `/facilities/${facility.id}`);
    expect(screen.getAllByRole("link", { name: /activity/i }).some((link) => link.getAttribute("href") === `/facilities/${facility.id}/activity`)).toBe(true);
  });

  it("marks lineage as the end of the guided relationship trail", () => {
    renderRoute(`/facilities/${facility.id}/lineage`);
    expect(screen.getByText("Relationship trail complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to facility overview/i })).toBeInTheDocument();
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

import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
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
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("presents the relationship as the product on the landing page", () => {
    renderRoute("/");
    expect(screen.getByRole("heading", { name: /one facility\.\s*capital from many providers/i })).toBeInTheDocument();
    expect(screen.getByText(/from capital need to reusable capacity/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /private offers\. public settlement\. no misleading claims/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /install wallet/i }).length).toBeGreaterThan(0);
  });

  it("renders the observed Root Accord and distinguishes current exposure from restored capacity", () => {
    renderRoute(`/facilities/${facility.id}`);
    expect(screen.getByRole("heading", { level: 1, name: "Coston2 syndicated facility" })).toBeInTheDocument();
    expect(screen.getByText(/all 9 usdt0 is available\. nothing is currently owed/i)).toBeInTheDocument();
    expect(screen.getAllByText("ROOT ACCORD").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("What is Root Accord?")).toBeInTheDocument();
    expect(screen.getAllByText(/9 USDT0/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0 USDT0/i).length).toBeGreaterThan(0);
  });

  it("keeps child commitments and draw legs explicit", () => {
    renderRoute(`/draws/${draw.id}`);
    expect(screen.getByRole("heading", { name: /4 usdt0 draw/i })).toBeInTheDocument();
    expect(screen.getAllByText("DRAW · DRAW LEGS").length).toBeGreaterThan(0);
    expect(screen.getByText("Provider 1")).toBeInTheDocument();
    expect(screen.getByText("Provider 2")).toBeInTheDocument();
    expect(draw.legs).toHaveLength(2);
    expect(children).toHaveLength(3);
  });

  it("keeps a draw detail anchored to its parent without duplicating global navigation", () => {
    renderRoute(`/draws/${draw.id}`);
    expect(screen.getByRole("link", { name: /back to activity/i })).toHaveAttribute("href", `/facilities/${facility.id}/activity`);
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("Activity")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Application navigation" })).getByRole("link", { name: "Facilities" })).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("navigation", { name: "Application navigation" })).queryByRole("link", { name: "Activity" })).not.toBeInTheDocument();
  });

  it("presents facility sections as stable tabs without repeating the overview header", () => {
    document.documentElement.scrollTop = 480;
    renderRoute(`/facilities/${facility.id}/funding`);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(screen.getByRole("heading", { level: 1, name: "Funding" })).toBeInTheDocument();
    expect(screen.getAllByText("MAKKARI SESSION · COFILL ALLOCATION").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { level: 1, name: "Coston2 syndicated facility" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to facility overview/i })).toHaveAttribute("href", `/facilities/${facility.id}`);
    expect(screen.getAllByRole("link", { name: /activity/i }).some((link) => link.getAttribute("href") === `/facilities/${facility.id}/activity`)).toBe(true);
  });

  it("presents lineage as relationship history, not a forced journey endpoint", () => {
    renderRoute(`/facilities/${facility.id}/lineage`);
    expect(screen.getByRole("heading", { level: 1, name: "Relationship history" })).toBeInTheDocument();
    expect(screen.getAllByText("LINEAGE").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /back to facility overview/i })).toBeInTheDocument();
  });

  it("offers an optional tour and glossary without blocking the facility", () => {
    renderRoute(`/facilities/${facility.id}`);
    expect(screen.getByText("New to Concord?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /take the 60-second tour/i }));
    expect(screen.getByRole("dialog", { name: /your facility/i })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog", { name: /your facility/i })).getByText("Root Accord")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Your current position")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /skip tour/i }));

    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    const help = screen.getByRole("dialog", { name: /help and learning/i });
    expect(help).toBeInTheDocument();
    fireEvent.click(screen.getByText("Concord glossary"));
    expect(within(help).getByText(/the persistent facility relationship/i)).toBeInTheDocument();
  });

  it("does not convert an unknown Root Accord into the observed facility", () => {
    renderRoute("/facilities/0xnot-observed");
    expect(screen.getByRole("heading", { name: /not in the recorded evidence/i })).toBeInTheDocument();
    expect(screen.queryByText(/all 9 usdt0 is available/i)).not.toBeInTheDocument();
  });

  it("provides a complete local demo without mounting wallet actions", () => {
    renderRoute("/demo");
    expect(screen.getByTestId("guided-demo")).toBeInTheDocument();
    expect(screen.getByText(/local demo · no transactions/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /run the full concord story/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve in wallet/i })).not.toBeInTheDocument();

    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));
    }

    expect(screen.getByRole("heading", { name: /repay and reuse the relationship/i })).toBeInTheDocument();
    expect(screen.getAllByText(/4 usdt0 repaid · capacity restored/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Scenario facility position").querySelector(".demo-metric--accent strong")).toHaveTextContent("9");
    fireEvent.click(screen.getByRole("button", { name: /replay demo/i }));
    expect(screen.getByRole("heading", { name: /start one facility/i })).toBeInTheDocument();
  });

  it("separates the wallet-bound borrower sandbox from the recorded facility", () => {
    renderRoute("/borrower");
    expect(screen.getByTestId("borrower-sandbox")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /become the borrower of a new facility/i })).toBeInTheDocument();
    expect(screen.getByText(/fresh facility · chain 114/i)).toBeInTheDocument();
    expect(screen.getByText(/the recorded facility is not reused/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /install wallet/i })).toBeInTheDocument();
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

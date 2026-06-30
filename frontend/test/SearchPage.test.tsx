import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SearchPage from "../src/pages/SearchPage";

describe("SearchPage", () => {
  it("renders no results empty state with echoed query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "nonexistent",
        contracts: [],
        events: [],
        wallets: [],
        suggestions: [],
      }),
    });

    (global as any).fetch = fetchMock;
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/search?q=nonexistent"]}>
          <Routes>
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const resultMessage = await screen.findByText(/No results for .*nonexistent/i);
    expect(resultMessage).toBeDefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/search?q=nonexistent&limit=50");
  });
});

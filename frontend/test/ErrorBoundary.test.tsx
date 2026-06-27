import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../src/components/ErrorBoundary";

function Bomb() {
  throw new Error("💥");
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <p>Hello</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("catches errors and shows fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("💥")).toBeDefined();
    expect(screen.getByText("Reload page")).toBeDefined();
    vi.restoreAllMocks();
  });

  it("accepts custom fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p>Custom error</p>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error")).toBeDefined();
    vi.restoreAllMocks();
  });
});

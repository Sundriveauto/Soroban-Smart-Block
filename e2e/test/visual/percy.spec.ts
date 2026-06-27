import { test, expect } from "@playwright/test";
import { percySnapshot } from "@percy/playwright";

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Visual Regression Testing with Percy
 * Captures and compares pixel-perfect snapshots across browsers
 * Fails CI on visual regressions > 0.1% threshold
 */

test.describe("Visual Regression - Percy Snapshots", () => {
  const breakpoints = [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 800 },
    { name: "widescreen", width: 1920, height: 1080 },
  ];

  test.describe("Homepage Snapshots", () => {
    breakpoints.forEach(({ name, width, height }) => {
      test(`homepage - ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(BASE_URL);

        // Wait for contracts to load
        await page.waitForSelector('[data-testid="contract-list"]', {
          timeout: 5000,
        });

        // Capture snapshot
        await percySnapshot(page, `homepage-${name}`, {
          widths: [width],
          minHeight: height,
        });
      });
    });
  });

  test.describe("Contract Detail Snapshots", () => {
    test("contract details page - desktop", async ({ page }) => {
      await page.goto(BASE_URL);

      // Navigate to first contract
      const firstContract = page
        .locator('[data-testid="contract-item"]')
        .first();
      await firstContract.click();

      // Wait for details to load
      await page.waitForSelector('[data-testid="event-table"]', {
        timeout: 5000,
      });

      // Capture snapshot
      await percySnapshot(page, "contract-details-desktop", {
        widths: [1280],
        minHeight: 800,
      });
    });

    test("contract details page - mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);

      const firstContract = page
        .locator('[data-testid="contract-item"]')
        .first();
      await firstContract.click();

      await page.waitForSelector('[data-testid="event-table"]', {
        timeout: 5000,
      });

      await percySnapshot(page, "contract-details-mobile", {
        widths: [375],
        minHeight: 667,
      });
    });
  });

  test.describe("Component Snapshots", () => {
    test("circuit breaker status component", async ({ page }) => {
      await page.goto(BASE_URL);

      // Navigate to contract
      const firstContract = page
        .locator('[data-testid="contract-item"]')
        .first();
      await firstContract.click();

      // Wait for circuit breaker banner if it exists
      const cbBanner = page.locator('[data-testid="circuit-breaker-banner"]');
      if (await cbBanner.isVisible().catch(() => false)) {
        // Isolate and snapshot just the banner
        const boundingBox = await cbBanner.boundingBox();
        if (boundingBox) {
          await percySnapshot(page, "circuit-breaker-status", {
            widths: [boundingBox.width],
            minHeight: boundingBox.height,
          });
        }
      }
    });

    test("event table component", async ({ page }) => {
      await page.goto(BASE_URL);

      const firstContract = page
        .locator('[data-testid="contract-item"]')
        .first();
      await firstContract.click();

      const eventTable = page.locator('[data-testid="event-table"]');
      await expect(eventTable).toBeVisible({ timeout: 5000 });

      await percySnapshot(page, "event-table", {
        widths: [1280],
        minHeight: 400,
      });
    });

    test("pagination controls", async ({ page }) => {
      await page.goto(BASE_URL);

      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible().catch(() => false)) {
        await percySnapshot(page, "pagination", {
          widths: [1280],
          minHeight: 60,
        });
      }
    });
  });

  test.describe("Error States", () => {
    test("error page - 404", async ({ page }) => {
      await page.goto(`${BASE_URL}/contracts/INVALID_ID`);

      // Wait for error message
      await page.waitForSelector('[role="alert"], text=not found', {
        timeout: 5000,
      });

      await percySnapshot(page, "error-page-404");
    });

    test("loading state", async ({ page }) => {
      await page.goto(BASE_URL);

      // Capture loading spinner if visible
      const spinner = page.locator('[data-testid="loading"]');
      if (await spinner.isVisible().catch(() => false)) {
        await percySnapshot(page, "loading-state", {
          widths: [1280],
          minHeight: 300,
        });
      }
    });
  });

  test.describe("Dark Mode Snapshots", () => {
    test("homepage - dark mode", async ({ page }) => {
      await page.goto(BASE_URL);

      // Activate dark mode
      const themeSwitcher = page.locator('[data-testid="theme-toggle"]');
      if (await themeSwitcher.isVisible().catch(() => false)) {
        await themeSwitcher.click();
      }

      // Fallback: set via local storage or data attribute
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
      });

      await page.waitForSelector('[data-testid="contract-list"]', {
        timeout: 5000,
      });

      await percySnapshot(page, "homepage-dark-mode", {
        widths: [1280],
        minHeight: 800,
      });
    });
  });

  test.describe("Responsive Design Grid", () => {
    const sizes = [320, 375, 768, 1024, 1280, 1920];

    sizes.forEach((width) => {
      test(`responsive grid - ${width}px width`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(BASE_URL);

        await page.waitForSelector('[data-testid="contract-list"]', {
          timeout: 5000,
        });

        await percySnapshot(page, `responsive-${width}px`, {
          widths: [width],
          minHeight: 800,
        });
      });
    });
  });
});

test.describe("Visual Regression - Interaction States", () => {
  test("button hover states", async ({ page }) => {
    await page.goto(BASE_URL);

    // Hover over buttons and capture
    const buttons = page.locator("button").first();
    await buttons.hover();

    await percySnapshot(page, "button-hover-state", {
      widths: [1280],
      minHeight: 100,
    });
  });

  test("form focus states", async ({ page }) => {
    await page.goto(BASE_URL);

    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.focus();

      await percySnapshot(page, "form-focus-state", {
        widths: [1280],
        minHeight: 80,
      });
    }
  });

  test("modal/dialog open", async ({ page }) => {
    await page.goto(BASE_URL);

    // Try to open a modal
    const firstContract = page.locator('[data-testid="contract-item"]').first();
    await firstContract.click();

    const eventItem = page.locator('[data-testid="event-item"]').first();
    if (await eventItem.isVisible().catch(() => false)) {
      await eventItem.click();

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible().catch(() => false)) {
        await percySnapshot(page, "modal-open", {
          widths: [1280],
          minHeight: 600,
        });
      }
    }
  });
});

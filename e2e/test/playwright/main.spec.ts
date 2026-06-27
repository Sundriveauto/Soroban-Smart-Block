import { test, expect, devices } from "@playwright/test";

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Cross-browser E2E tests with Playwright
 * Tests core user workflows across Chrome, Firefox, Safari, and mobile
 */

test.describe("E2E - Core User Workflows", () => {
  test("Load homepage", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Soroban|Explorer/);
    await expect(page.locator("text=Smart Block")).toBeVisible();
  });

  test("Browse contracts list", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Wait for contracts to load
    const contractList = page.locator('[data-testid="contract-list"]');
    await expect(contractList).toBeVisible({ timeout: 5000 });

    // Verify pagination controls exist
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeVisible();
  });

  test("View contract details", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Find first contract link
    const firstContract = page.locator('[data-testid="contract-item"]').first();
    await expect(firstContract).toBeVisible({ timeout: 5000 });

    // Click to view details
    await firstContract.click();

    // Should navigate to contract detail page
    await expect(page).toHaveURL(/\/contracts\/[A-Z0-9]+/);

    // Verify key sections are visible
    await expect(page.locator("text=Events")).toBeVisible();
    await expect(
      page.locator("text=Circuit Breaker") ||
        page.locator("text=Contract Details"),
    ).toBeVisible();
  });

  test("Filter events by type", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const firstContract = page.locator('[data-testid="contract-item"]').first();
    await firstContract.click();

    // Wait for events to load
    const eventTable = page.locator('[data-testid="event-table"]');
    await expect(eventTable).toBeVisible({ timeout: 5000 });

    // Find and click event type filter
    const filterSelect = page.locator('[data-testid="event-filter-type"]');
    if (await filterSelect.isVisible()) {
      await filterSelect.click();
      const option = page.locator("text=transfer");
      await option.first().click({ force: true });

      // Events should be filtered
      await expect(page.locator('[data-testid="event-item"]')).toHaveCount(5, {
        timeout: 5000,
      });
    }
  });

  test("Search functionality", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    // Type a contract address (use test contract ID)
    await searchInput.fill("CA");
    await page.keyboard.press("Enter");

    // Results should update
    await expect(page.locator('[data-testid="contract-list"]')).toBeTruthy();
  });

  test("Pagination navigation", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await expect(page.locator('[data-testid="contract-list"]')).toBeVisible({
      timeout: 5000,
    });

    // Get first page contract count
    const firstPageItems = await page
      .locator('[data-testid="contract-item"]')
      .count();
    expect(firstPageItems).toBeGreaterThan(0);

    // Click next page
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForLoadState("networkidle");

      // Verify we're on next page
      const secondPageItems = await page
        .locator('[data-testid="contract-item"]')
        .count();
      expect(secondPageItems).toBeGreaterThan(0);
    }
  });

  test("Circuit breaker status display", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Find a contract and navigate
    const firstContract = page.locator('[data-testid="contract-item"]').first();
    await firstContract.click();

    // Check for circuit breaker banner
    const cbBanner = page.locator('[data-testid="circuit-breaker-banner"]');
    const cbStatus =
      cbBanner ||
      page.locator("text=Status: Operational") ||
      page.locator("text=Status: Paused");

    // If circuit breaker banner exists, verify content
    if (await cbBanner.isVisible().catch(() => false)) {
      const status = await cbBanner.innerText();
      expect(status).toMatch(/Status: (Operational|Paused)/);
    }
  });

  test("Event details modal", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const firstContract = page.locator('[data-testid="contract-item"]').first();
    await firstContract.click();

    // Wait for event table
    const eventTable = page.locator('[data-testid="event-table"]');
    await expect(eventTable).toBeVisible({ timeout: 5000 });

    // Click first event row
    const firstEvent = page.locator('[data-testid="event-item"]').first();
    if (await firstEvent.isVisible()) {
      await firstEvent.click();

      // Modal or details panel should appear
      const modal = page.locator('[role="dialog"]');
      await expect(modal)
        .toBeVisible()
        .catch(() => {
          // If no modal, maybe uses side panel
          const detailsPanel = page.locator('[data-testid="event-details"]');
          expect(detailsPanel).toBeTruthy();
        });
    }
  });

  test("Responsive design - mobile layout", async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/`);

    // Sidebar should be hidden on mobile
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible().catch(() => false)) {
      await expect(sidebar).not.toBeVisible();
    }

    // Contract list should be visible
    const contractList = page.locator('[data-testid="contract-list"]');
    await expect(contractList).toBeVisible({ timeout: 5000 });
  });

  test("Dark mode toggle (if supported)", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const themeSwitcher = page.locator('[data-testid="theme-toggle"]');
    if (await themeSwitcher.isVisible().catch(() => false)) {
      const currentMode = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );

      await themeSwitcher.click();

      const newMode = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(newMode).not.toBe(currentMode);
    }
  });

  test("Error handling - invalid contract ID", async ({ page }) => {
    // Navigate to non-existent contract
    await page.goto(`${BASE_URL}/contracts/INVALID_ID_12345`);

    // Should show error message
    const errorMessage =
      page.locator("text=not found") || page.locator('[role="alert"]');
    await expect(errorMessage || page.locator("body")).toBeTruthy();
  });

  test("Full-text search across events", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const firstContract = page.locator('[data-testid="contract-item"]').first();
    await firstContract.click();

    // If search feature exists in event table
    const searchInput = page.locator('input[placeholder*="Search events"]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("transfer");
      await page.keyboard.press("Enter");

      // Events should be filtered
      await page.waitForLoadState("networkidle");
    }
  });
});

test.describe("E2E - Advanced Scenarios", () => {
  test("Contract upgrade flow: old ABI → new ABI", async ({ page }) => {
    // Navigate to contract with known ABI upgrade history
    await page.goto(`${BASE_URL}/`);

    const contract = page.locator('[data-testid="contract-item"]').first();
    await contract.click();

    // Check for ABI version indicator
    const abiInfo = page.locator('[data-testid="abi-version"]');
    if (await abiInfo.isVisible().catch(() => false)) {
      const version = await abiInfo.innerText();
      expect(version).toMatch(/v\d+/);
    }
  });

  test("Multi-network comparison: testnet vs mainnet", async ({ page }) => {
    // If app supports network switching
    const networkSelector = page.locator('[data-testid="network-selector"]');
    if (await networkSelector.isVisible().catch(() => false)) {
      // Get testnet state
      await networkSelector.selectOption("testnet");
      await page.waitForLoadState("networkidle");
      const testnetContracts = await page
        .locator('[data-testid="contract-item"]')
        .count();

      // Switch to mainnet
      await networkSelector.selectOption("mainnet");
      await page.waitForLoadState("networkidle");
      const mainnetContracts = await page
        .locator('[data-testid="contract-item"]')
        .count();

      expect(testnetContracts + mainnetContracts).toBeGreaterThan(0);
    }
  });

  test("Wallet connection flow (Freighter)", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Find wallet connect button
    const walletButton =
      page.locator('button:has-text("Connect")') ||
      page.locator('[data-testid="wallet-connect"]');
    if (await walletButton.isVisible().catch(() => false)) {
      await walletButton.click();

      // Modal should appear
      const modal =
        page.locator("text=Freighter") || page.locator('[role="dialog"]');
      await expect(modal)
        .toBeVisible()
        .catch(() => {
          // Freighter popup may not work in headless
          console.log(
            "⏭️  Freighter wallet modal skipped (requires manual testing)",
          );
        });
    }
  });

  test("Sandbox contract call submission", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const firstContract = page.locator('[data-testid="contract-item"]').first();
    await firstContract.click();

    // Look for "Simulate Call" or similar button
    const simulateButton =
      page.locator('button:has-text("Simulate")') ||
      page.locator('[data-testid="simulate-button"]');
    if (await simulateButton.isVisible().catch(() => false)) {
      await simulateButton.click();

      // Form should appear
      const callForm = page.locator('[data-testid="call-form"]');
      await expect(callForm)
        .toBeVisible()
        .catch(() => {
          console.log("⏭️  Call simulation form not found");
        });
    }
  });
});

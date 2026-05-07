import { test, expect } from "@playwright/test";

const API = "http://localhost:3100/api/v1";

test.describe("Amrut Bhet", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Bhet|Amrut|Meeting/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("signup page loads and has form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[type="text"], input[name="name"], input[placeholder*="name" i]').first()).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("login page loads and has form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("full auth + room flow via API", async ({ page }) => {
    const timestamp = Date.now();
    const email = `e2e-${timestamp}@bhet.dev`;

    // Register via API
    const regRes = await page.request.post(`${API}/auth/register`, {
      data: { email, password: "e2etest123", name: `E2E User ${timestamp}` },
    });
    expect(regRes.ok()).toBeTruthy();

    // Login via API
    const loginRes = await page.request.post(`${API}/auth/auth/login`, {
      data: { email, password: "e2etest123" },
    });

    // Try the standard login endpoint
    const loginRes2 = await page.request.post(`${API}/auth/login`, {
      data: { email, password: "e2etest123" },
    });
    expect(loginRes2.ok() || loginRes.ok()).toBeTruthy();

    const loginData = loginRes2.ok() ? await loginRes2.json() : await loginRes.json();
    const token = loginData.token;
    expect(token).toBeTruthy();

    // Create room
    const roomRes = await page.request.post(`${API}/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `E2E Test Room ${timestamp}` },
    });
    expect(roomRes.ok()).toBeTruthy();
    const room = await roomRes.json();
    expect(room.slug).toBeTruthy();
    expect(room.name).toContain("E2E Test Room");

    // Get room details
    const detailRes = await page.request.get(`${API}/rooms/${room.slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detailRes.ok()).toBeTruthy();

    // List rooms
    const listRes = await page.request.get(`${API}/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();

    // Health check
    const healthRes = await page.request.get(`${API}/health`);
    expect(healthRes.ok()).toBeTruthy();
    const health = await healthRes.json();
    expect(health.status).toBe("ok");
  });

  test("redirects unauthenticated user from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
  });

  test("redirects unauthenticated user from recordings", async ({ page }) => {
    await page.goto("/recordings");
    await page.waitForURL(/\/login/);
  });
});

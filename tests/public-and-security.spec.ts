import { expect, test } from "@playwright/test";

test("home exposes the menu and student voting entry points", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  await expect(page.getByRole("heading", { name: "See what's on the menu." })).toBeVisible();
  await expect(page.getByRole("link", { name: /View this week's menu/ })).toHaveAttribute("href", "/menu");
  await expect(page.getByRole("link", { name: /Preview student voting/ })).toHaveAttribute("href", "/site/rate/tag14");
});

test("the public weekly menu loads real cafeteria data", async ({ page }) => {
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "What's cooking this week?" })).toBeVisible();
  await expect(page.getByText("Kingsway College").first()).toBeVisible();
  await expect(page.getByLabel("Back to home")).toHaveAttribute("href", "/");
});

test("an active table tag opens the rating experience", async ({ page }) => {
  const response = await page.goto("/site/rate/tag14");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Rate your meal/);
  await expect(page.getByText("Kingsway College").first()).toBeVisible();
});

test("retired routes and protected pages redirect safely", async ({ page }) => {
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/reviews");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Freviews$/);
});

test("admin APIs reject anonymous access", async ({ request }) => {
  for (const route of ["/api/admin/tables", "/api/admin/dishes", "/api/admin/schedule?start=2026-10-05&end=2026-10-11", "/api/admin/settings"]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(401);
  }
});

test("mutation APIs reject cross-origin requests", async ({ request }) => {
  const reviewResponse = await request.post("/api/reviews", {
    headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
    data: {},
  });
  expect(reviewResponse.status()).toBe(403);

  const tableResponse = await request.post("/api/admin/tables", {
    headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
    data: {},
  });
  expect(tableResponse.status()).toBe(403);
});

test("public feedback rejects malformed data without writing", async ({ request }) => {
  const response = await request.post("/api/reviews", { data: { overallRating: 9 } });
  expect(response.status()).toBe(400);
});

test("valid feedback shape reaches database validation without writing", async ({ request }) => {
  const response = await request.post("/api/reviews", {
    data: {
      tagCode: "nonexistent-test-tag",
      menuId: "00000000-0000-4000-8000-000000000000",
      overallRating: 5,
      itemRatings: [{ foodItemId: "00000000-0000-4000-8000-000000000002", rating: 5 }],
      tags: [],
      comment: "",
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
    },
  });
  expect(response.status()).toBe(409);
  await expect(response.json()).resolves.toMatchObject({ code: "stale_menu" });
});

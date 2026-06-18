import { chromium } from "playwright-core";

const EXEC =
  process.env.HOME +
  "/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: 1320, height: 980 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:5179/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);

// --- Onboarding screen ---
await page.screenshot({ path: "shots/01-onboarding.png" });

// Fill the affidavit and enter.
await page.fill('input[placeholder="What should people call you?"]', "Bruno");
await page.fill('input[placeholder="pick-a-name"]', "bruno");
await page.fill('input[placeholder="Verified carbon-based lifeform."]', "Building statement.dot. Verified human.");
await page.screenshot({ path: "shots/02-affidavit-filled.png" });

await page.click('button[type="submit"]');
// Wait for the staged flow (pop -> handle -> record) to complete into the feed.
await page.waitForSelector(".composer", { timeout: 8000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/03-feed.png" });

// Make a statement.
await page.fill(".composer textarea", "Just signed onto a social network where every single account is a verified human. No bots. The timeline feels completely different.");
await page.click(".composer .btn");
await page.waitForTimeout(900);
await page.screenshot({ path: "shots/04-posted.png" });

// Profile view.
await page.click('.nav__item:has-text("Profile")');
await page.waitForTimeout(700);
await page.screenshot({ path: "shots/05-profile.png" });

// Messages (encrypted DM) view.
await page.click('.nav__item:has-text("Messages")');
await page.waitForTimeout(700);
await page.click('button:has-text("Show ciphertext")');
await page.waitForTimeout(400);
await page.screenshot({ path: "shots/06-messages-cipher.png" });

await browser.close();
console.log("shots captured");

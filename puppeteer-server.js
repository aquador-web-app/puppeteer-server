import express from "express";
import bodyParser from "body-parser";

import puppeteer from "puppeteer-core";
import { executablePath } from "puppeteer";

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));

// -----------------------
//  LAUNCH BROWSER (ONE TIME ONLY)
// -----------------------
let browserPromise = null;

async function launchBrowser() {
  if (browserPromise) return browserPromise;

  const chromePath = executablePath();
  console.log("Launching Chromium at:", chromePath);

  browserPromise = puppeteer.launch({
    headless: "new",
    executablePath: chromePath,
    protocolTimeout: 120000, // 2 minutes
    pipe: true, // more stable than websocket
    ignoreHTTPSErrors: true,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--mute-audio",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-breakpad",
      "--disable-client-side-phishing-detection",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-domain-reliability",
      "--disable-features=AudioServiceOutOfProcess",
      "--disable-hang-monitor",
      "--disable-ipc-flooding-protection",
      "--disable-popup-blocking",
      "--disable-prompt-on-repost",
      "--disable-renderer-backgrounding",
      "--force-color-profile=srgb",
      "--metrics-recording-only",
      "--no-sandbox",
      "--password-store=basic",
      "--use-mock-keychain"
    ],
  });

  return browserPromise;
}

// -----------------------
//  HEALTH CHECK
// -----------------------
app.get("/", (req, res) => {
  res.send("Puppeteer server is running 🚀");
});

// -----------------------
//  PDF ROUTE
// -----------------------
app.post("/pdf", async (req, res) => {
  try {
    const { url, html, options = {} } = req.body;

    const browser = await launchBrowser();
    const page = await browser.newPage();

    // Extra stability: prevent Chrome crash
    await page.setBypassCSP(true);

    if (html) {
      await page.setContent(html, { waitUntil: "networkidle0" });
    } else if (url) {
      await page.goto(url, { waitUntil: "networkidle0" });
    } else {
      return res.status(400).send("Missing url or html");
    }

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      ...options,
    });

    await page.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
    });
    return res.send(pdfBuffer);

  } catch (err) {
    console.error("🔥 Puppeteer error:", err);
    return res.status(500).send("Puppeteer failed: " + err.message);
  }
});

// -----------------------
//  START SERVER
// -----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Puppeteer server (Render-safe) running on port ${PORT}`)
);

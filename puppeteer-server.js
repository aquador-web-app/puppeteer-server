import express from "express";
import bodyParser from "body-parser";
import puppeteer from "puppeteer-core";
import { executablePath } from "puppeteer";

process.env.PUPPETEER_CACHE_DIR = "/opt/render/.cache/puppeteer";
process.env.PUPPETEER_CACHE_PATH = "/opt/render/.cache/puppeteer";
process.env.PUPPETEER_CHROMIUM_REVISION = "latest";

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));

// -------------------------------
// 🔥 MEMORY-SAFE BROWSER LOGIC
// -------------------------------
let browser = null;
let pdfCount = 0;

async function launchBrowser() {
  if (browser) return browser;

  const chromePath = executablePath();

  console.log("Launching Chromium at:", chromePath);

  browser = await puppeteer.launch({
    headless: "new",
    executablePath: chromePath,
    protocolTimeout: 120000,
    cacheDirectory: "/opt/render/.cache/puppeteer",
    args: [
      "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--single-process",
    "--no-zygote",
    "--no-first-run",
    "--disable-extensions",
    "--disable-background-networking",
    "--allow-running-insecure-content",
    ],
  });

  return browser;
}

// Restart browser every 25 PDFs to prevent RAM leak
async function maybeRestartBrowser() {
  pdfCount++;
  if (pdfCount >= 25) {
    console.log("♻️ Restarting Chrome to free memory...");
    try {
      await browser.close();
    } catch (_) {}
    browser = null;
    pdfCount = 0;
  }
}

// -------------------------------
// HEALTH CHECK
// -------------------------------
app.get("/", (req, res) =>
  res.send("Puppeteer server running 🚀 (memory-safe)")
);

// -------------------------------
// /pdf ROUTE
// -------------------------------
app.post("/pdf", async (req, res) => {
  const timeoutMs = 90000; // hard kill after 90s

  const timer = setTimeout(() => {
    console.error("⏳ HARD TIMEOUT — killing request");
    return res.status(504).send("Timeout when generating PDF");
  }, timeoutMs);

  try {
    const { url, html, options = {} } = req.body;

    const browser = await launchBrowser();
    const page = await browser.newPage();

    // Prevent memory leaks from large console logs
    page.on("console", () => {});

    if (html) {
      await page.setContent(html, { waitUntil: "networkidle0" });
    } else if (url) {
      await page.goto(url, { waitUntil: "networkidle0" });
    } else {
      clearTimeout(timer);
      return res.status(400).send("Missing url or html");
    }

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      ...options,
    });

    await page.close().catch(() => {}); // avoid zombie pages

    clearTimeout(timer);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
    });

    await maybeRestartBrowser(); // <-- MEMORY SAVER

    return res.send(pdfBuffer);
  } catch (err) {
    clearTimeout(timer);
    console.error("🔥 Puppeteer error:", err);
    return res.status(500).send("Puppeteer failed: " + err.message);
  }
});

// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Puppeteer server (memory-safe) on port ${PORT}`)
);

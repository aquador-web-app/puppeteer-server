import express from "express";
import bodyParser from "body-parser";

import puppeteer from "puppeteer"; // ✅ ONLY puppeteer, not puppeteer-core
import fs from "fs";
import path from "path";

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));

// -----------------------
//  FIND CHROME IN RENDER
// -----------------------
function findChrome() {
  const base = "/opt/render/.cache/puppeteer/chrome";
  if (!fs.existsSync(base)) return null;

  for (const folder of fs.readdirSync(base)) {
    const chromePath = path.join(base, folder, "chrome-linux64", "chrome");
    if (fs.existsSync(chromePath)) return chromePath;
  }
  return null;
}

// -----------------------
//  LAUNCH BROWSER (ONCE)
// -----------------------
let browserPromise = null;

async function launchBrowser() {
  if (browserPromise) return browserPromise;

  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("Chrome NOT FOUND on Render. Did postinstall run?");
  }

  console.log("🔥 Chrome path:", chromePath);

  browserPromise = puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    protocolTimeout: 120000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--no-zygote",
      "--no-first-run",
      "--mute-audio",
      "--disable-breakpad",
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

    await page.setBypassCSP(true);
    await page.setJavaScriptEnabled(false); // 🔑 TEST: disable JS

    if (html) {
      await page.setContent(html, { waitUntil: "load" });
    } else if (url) {
      await page.goto(url, { waitUntil: "load" }); // 🔑 CHANGE HERE
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
  console.log(`🚀 Puppeteer server running on port ${PORT}`)
);

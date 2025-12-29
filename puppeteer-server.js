import express from "express";
import bodyParser from "body-parser";

import puppeteer from "puppeteer"; // ✅ ONLY puppeteer, not puppeteer-core

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));


// -----------------------
//  LAUNCH BROWSER (ONCE)
// -----------------------

async function launchBrowser() {
  const wsEndpoint = process.env.BROWSERLESS_WS;

  if (!wsEndpoint) {
    throw new Error("BROWSERLESS_WS is not set");
  }

  console.log("🌐 Connecting to Browserless…");

  return await puppeteer.connect({
    browserWSEndpoint: wsEndpoint,
    protocolTimeout: 120000,
  });
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
  let browser;
  let page;

  try {
    const { url, html, options = {} } = req.body;

    browser = await launchBrowser();
    page = await browser.newPage();

    await page.setBypassCSP(true);
    await page.setJavaScriptEnabled(false);

    if (html) {
      await page.setContent(html, { waitUntil: "load" });
    } else if (url) {
      await page.goto(url, { waitUntil: "load" });
    } else {
      return res.status(400).send("Missing url or html");
    }

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      ...options,
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
    });

    return res.send(pdfBuffer);

  } catch (err) {
    console.error("🔥 Puppeteer error:", err);
    return res.status(500).send("Puppeteer failed: " + err.message);
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});



// -----------------------
//  START SERVER
// -----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Puppeteer server running on port ${PORT}`)
);

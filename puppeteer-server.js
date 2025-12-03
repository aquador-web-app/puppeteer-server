import express from "express";
import bodyParser from "body-parser";
import puppeteer from "puppeteer-core";
import { executablePath } from "puppeteer";

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));

// ------- Launch Browser Once -------
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    const chromePath = executablePath(); // 👈 Puppeteer’s downloaded Chromium

    console.log("Using Chromium at:", chromePath);

    browserPromise = puppeteer.launch({
      headless: "new",
      executablePath: chromePath,   // 👈 critical
      protocolTimeout: 120000, 
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
      ],
    });
  }
  return browserPromise;
}

// ------- HEALTH CHECK -------
app.get("/", (req, res) => {
  res.send("Puppeteer server is running 🚀");
});

// ------- /pdf ROUTE -------
app.post("/pdf", async (req, res) => {
  try {
    const { url, html, options = {} } = req.body;

    const browser = await getBrowser();
    const page = await browser.newPage();

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

// ------- START SERVER -------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Puppeteer server running on port ${PORT}`)
);

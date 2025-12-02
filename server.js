// puppeteer-server.js
import express from "express";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const app = express();
app.use(express.json());

// Allow HTTPS fetches to self-signed Supabase URLs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Required for Render
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

app.post("/pdf", async (req, res) => {
  const { url, options = {} } = req.body;
  if (!url) return res.status(400).send("Missing URL");

  try {
    console.log("📥 Rendering invoice from URL:", url);

    // ==========================================
    // 🚀 LAUNCH BROWSER USING CHROMIUM ON RENDER
    // ==========================================
    const browser = await puppeteer.launch({
      headless: chromium.headless,
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();

    // Fetch raw HTML
    console.log("📡 Fetching HTML from Supabase...");
    const response = await fetch(url);
    const html = await response.text();

    await page.setContent(html, { waitUntil: "load", timeout: 0 });

    // Merge PDF options
    const pdfOptions = {
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    };

    console.log("🖨️ Generating PDF...");
    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    console.log("✅ PDF generated successfully!");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");
    res.end(pdfBuffer);

  } catch (err) {
    console.error("❌ Puppeteer render error:", err);
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Puppeteer PDF server running on port ${PORT}`)
);

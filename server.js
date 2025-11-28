// puppeteer-server.js
import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

// Allow HTTPS fetches to self-signed Supabase URLs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.post("/pdf", async (req, res) => {
  const { url, options = {} } = req.body;
  if (!url) return res.status(400).send("Missing URL");

  try {
    console.log("📥 Rendering invoice from URL:", url);

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // ✅ Fetch raw HTML manually to avoid CORS & sandbox limits
    console.log("📡 Fetching HTML directly from Supabase...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err) {
      console.error("❌ Fetch to Supabase timed out:", err);
      throw new Error("Could not download HTML from Supabase");
    } finally {
      clearTimeout(timeout);
    }

    const html = await response.text();
    console.log("✅ HTML fetched successfully, rendering page...");

    await page.setContent(html, { waitUntil: "load", timeout: 0 });

    // ✅ Default full-bleed PDF options (merged with any custom ones)
    const pdfOptions = {
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    };

    // Generate PDF
    console.log("🖨️ Generating PDF with options:", pdfOptions);
    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    console.log("✅ PDF generated successfully, sending back to Supabase...");

    // Return PDF binary
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

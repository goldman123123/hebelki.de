/**
 * Shared PDF Generation Utility
 *
 * Generates PDFs from HTML using Puppeteer.
 * Used by both invoice and Lieferschein generation.
 */

/**
 * Generate PDF from HTML using Puppeteer
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  // Dynamic import for Puppeteer (not needed at module load time)
  try {
    // Try @sparticuz/chromium for Vercel serverless
    const chromium = await import('@sparticuz/chromium')
    const puppeteerCore = await import('puppeteer-core')

    const browser = await puppeteerCore.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1200, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    })

    await browser.close()
    return Buffer.from(pdfBuffer)
  } catch {
    // Fallback to regular puppeteer for local development
    const puppeteer = await import('puppeteer')

    const browser = await puppeteer.default.launch({
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    })

    await browser.close()
    return Buffer.from(pdfBuffer)
  }
}

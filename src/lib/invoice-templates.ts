/**
 * Invoice HTML Templates
 *
 * German-compliant invoice template following § 14 UStG requirements.
 * Includes all 10 mandatory fields (Pflichtangaben) for valid German invoices.
 */

import type {
  invoices,
  businesses,
  customers,
  BusinessTaxSettings,
} from './db/schema'

interface InvoiceTemplateData {
  invoice: typeof invoices.$inferSelect
  business: typeof businesses.$inferSelect
  customer: typeof customers.$inferSelect
  taxSettings: BusinessTaxSettings
  serviceName: string
  serviceDate: string
  showLogo?: boolean
  invoiceType?: string                // 'invoice' | 'storno'
  originalInvoiceNumber?: string      // For storno: reference to original invoice
}

/**
 * Format date to German format (DD.MM.YYYY)
 */
function formatDateGerman(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format currency to German format
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num)
}

/**
 * Generate HTML for German invoice
 * Includes all 10 Pflichtangaben nach § 14 UStG:
 * 1. Name und Anschrift des Leistenden (Supplier)
 * 2. Name und Anschrift des Empfängers (Customer)
 * 3. Steuernummer oder USt-IdNr
 * 4. Ausstellungsdatum (Issue date)
 * 5. Fortlaufende Rechnungsnummer (Invoice number)
 * 6. Leistungsdatum (Service date)
 * 7. Menge und Art der Leistung (Description)
 * 8. Nettobetrag (Net amount)
 * 9. Steuersatz und Steuerbetrag (VAT rate and amount)
 * 10. Bruttobetrag (Gross amount)
 */
export function generateInvoiceHtml(data: InvoiceTemplateData): string {
  const { invoice, business, customer, taxSettings, serviceName, serviceDate, showLogo = true, invoiceType, originalInvoiceNumber } = data
  const isStorno = invoiceType === 'storno'
  const documentTitle = isStorno ? 'STORNORECHNUNG' : 'RECHNUNG'
  const accentColor = isStorno ? '#DC2626' : (business.primaryColor || '#3B82F6')

  const items = invoice.items as Array<{
    description: string
    quantity: number
    unitPrice: string
    total: string
  }>

  const businessAddress = business.address || ''
  const customerAddress = [
    customer.street,
    `${customer.postalCode} ${customer.city}`,
    customer.country,
  ].filter(Boolean).join('<br>')

  const taxId = taxSettings.taxId || 'Nicht angegeben'
  const isKleinunternehmer = taxSettings.isKleinunternehmer

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rechnung ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #333;
      background: white;
    }

    .invoice {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${accentColor};
    }

    .logo-section {
      flex: 1;
    }

    .logo-section img {
      max-height: 60px;
      max-width: 180px;
      margin-bottom: 10px;
    }

    .logo-section h1 {
      font-size: 24pt;
      font-weight: 700;
      color: ${accentColor};
      margin-bottom: 5px;
    }

    .business-details {
      font-size: 9pt;
      color: #666;
      line-height: 1.6;
    }

    .invoice-title-section {
      text-align: right;
    }

    .invoice-title {
      font-size: 28pt;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }

    .invoice-number {
      font-size: 12pt;
      color: #666;
    }

    /* Address Section */
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .address-block {
      flex: 1;
    }

    .address-block h3 {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #999;
      margin-bottom: 8px;
    }

    .address-block p {
      font-size: 10pt;
      line-height: 1.6;
    }

    .customer-name {
      font-weight: 600;
      font-size: 11pt;
    }

    /* Invoice Meta */
    .invoice-meta {
      background: #f8f9fa;
      padding: 15px 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }

    .meta-item label {
      display: block;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #999;
      margin-bottom: 4px;
    }

    .meta-item span {
      font-size: 10pt;
      font-weight: 500;
      color: #333;
    }

    /* Line Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .items-table th {
      background: #f8f9fa;
      padding: 12px 15px;
      text-align: left;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      border-bottom: 2px solid #e5e7eb;
    }

    .items-table th:last-child {
      text-align: right;
    }

    .items-table td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10pt;
    }

    .items-table td:last-child {
      text-align: right;
      font-weight: 500;
    }

    .qty-col {
      width: 80px;
      text-align: center;
    }

    .price-col {
      width: 120px;
      text-align: right;
    }

    /* Totals */
    .totals {
      margin-left: auto;
      width: 300px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 10pt;
    }

    .totals-row.subtotal {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 12px;
      margin-bottom: 8px;
    }

    .totals-row.total {
      border-top: 2px solid #333;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 14pt;
      font-weight: 700;
    }

    .totals-row .label {
      color: #666;
    }

    .totals-row .value {
      font-weight: 500;
    }

    .totals-row.total .label,
    .totals-row.total .value {
      color: #333;
    }

    /* Kleinunternehmer Notice */
    .kleinunternehmer-notice {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 12px 15px;
      margin-bottom: 30px;
      font-size: 9pt;
      color: #92400e;
    }

    /* Footer Notes */
    .notes {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .notes h4 {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #999;
      margin-bottom: 8px;
    }

    .notes p {
      font-size: 9pt;
      color: #666;
      line-height: 1.6;
    }

    /* Payment Info */
    .payment-info {
      margin-top: 30px;
      background: #f0fdf4;
      border: 1px solid #22c55e;
      border-radius: 6px;
      padding: 15px 20px;
    }

    .payment-info h4 {
      font-size: 10pt;
      color: #166534;
      margin-bottom: 8px;
    }

    .payment-info p {
      font-size: 9pt;
      color: #166534;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8pt;
      color: #999;
    }

    .footer p {
      margin-bottom: 4px;
    }

    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .invoice {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <!-- Header with Business Info -->
    <div class="header">
      <div class="logo-section">
        ${showLogo && business.logoUrl ? `<img src="${business.logoUrl}" alt="${business.name}">` : ''}
        <h1>${business.legalName || business.name}</h1>
        <div class="business-details">
          ${businessAddress ? businessAddress + '<br>' : ''}
          ${business.email ? `E-Mail: ${business.email}<br>` : ''}
          ${business.phone ? `Tel: ${business.phone}<br>` : ''}
          ${business.website ? `Web: ${business.website}` : ''}
        </div>
      </div>
      <div class="invoice-title-section">
        <div class="invoice-title" ${isStorno ? 'style="color: #DC2626;"' : ''}>${documentTitle}</div>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        ${isStorno && originalInvoiceNumber ? `<div class="invoice-number" style="margin-top: 4px; font-size: 10pt; color: #DC2626;">Stornierung zu ${originalInvoiceNumber}</div>` : ''}
      </div>
    </div>

    <!-- Addresses -->
    <div class="addresses">
      <div class="address-block">
        <h3>Rechnungsempfänger</h3>
        <p>
          <span class="customer-name">${customer.name || 'Kunde'}</span><br>
          ${customerAddress}
        </p>
      </div>
      <div class="address-block" style="text-align: right;">
        <h3>Steuernummer</h3>
        <p>${taxId}</p>
      </div>
    </div>

    <!-- Invoice Meta -->
    <div class="invoice-meta">
      <div class="meta-grid">
        <div class="meta-item">
          <label>Rechnungsnummer</label>
          <span>${invoice.invoiceNumber}</span>
        </div>
        <div class="meta-item">
          <label>Rechnungsdatum</label>
          <span>${formatDateGerman(invoice.issueDate)}</span>
        </div>
        <div class="meta-item">
          <label>Leistungsdatum</label>
          <span>${formatDateGerman(serviceDate)}</span>
        </div>
        <div class="meta-item">
          <label>Fällig bis</label>
          <span>${formatDateGerman(invoice.dueDate)}</span>
        </div>
      </div>
    </div>

    <!-- Line Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Beschreibung</th>
          <th class="qty-col">Menge</th>
          <th class="price-col">Einzelpreis</th>
          <th class="price-col">Gesamt</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="qty-col">${item.quantity}</td>
            <td class="price-col">${formatCurrency(item.unitPrice)}</td>
            <td class="price-col">${formatCurrency(item.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-row subtotal">
        <span class="label">Nettobetrag</span>
        <span class="value">${formatCurrency(invoice.subtotal)}</span>
      </div>
      ${isKleinunternehmer ? '' : `
        <div class="totals-row">
          <span class="label">MwSt. (${invoice.taxRate}%)</span>
          <span class="value">${formatCurrency(invoice.taxAmount || '0')}</span>
        </div>
      `}
      <div class="totals-row total">
        <span class="label">Gesamtbetrag</span>
        <span class="value">${formatCurrency(invoice.total)}</span>
      </div>
    </div>

    ${isKleinunternehmer ? `
      <div class="kleinunternehmer-notice">
        <strong>Hinweis:</strong> Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
      </div>
    ` : ''}

    <!-- Payment Info -->
    <div class="payment-info">
      <h4>Zahlungsinformationen</h4>
      <p>
        Bitte überweisen Sie den Betrag von <strong>${formatCurrency(invoice.total)}</strong>
        bis zum <strong>${formatDateGerman(invoice.dueDate)}</strong>
        unter Angabe der Rechnungsnummer <strong>${invoice.invoiceNumber}</strong>.
      </p>
    </div>

    ${invoice.notes ? `
      <div class="notes">
        <h4>Anmerkungen</h4>
        <p>${invoice.notes}</p>
      </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>${business.legalName || business.name}${businessAddress ? ` • ${businessAddress}` : ''}</p>
      <p>
        ${business.email ? `E-Mail: ${business.email}` : ''}
        ${business.email && business.phone ? ' • ' : ''}
        ${business.phone ? `Tel: ${business.phone}` : ''}
      </p>
    </div>
  </div>
</body>
</html>
`
}

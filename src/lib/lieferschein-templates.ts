/**
 * Lieferschein (Delivery Note) HTML Template
 *
 * Documents what was delivered/performed at a booking.
 * Separate from invoices — no tax calculations.
 */

import type {
  businesses,
  customers,
  InvoiceLineItem,
} from './db/schema'

interface LieferscheinTemplateData {
  businessName: string
  businessAddress?: string | null
  businessEmail?: string | null
  businessPhone?: string | null
  businessWebsite?: string | null
  businessLogoUrl?: string | null
  primaryColor?: string
  customerName: string
  customerStreet?: string | null
  customerPostalCode?: string | null
  customerCity?: string | null
  customerCountry?: string | null
  items: InvoiceLineItem[]
  deliveryDate: string // ISO date string (YYYY-MM-DD)
  bookingId: string
  notes?: string | null
}

function formatDateGerman(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num)
}

export function generateLieferscheinHtml(data: LieferscheinTemplateData): string {
  const customerAddress = [
    data.customerStreet,
    [data.customerPostalCode, data.customerCity].filter(Boolean).join(' '),
    data.customerCountry && data.customerCountry !== 'Deutschland' ? data.customerCountry : null,
  ].filter(Boolean).join('<br>')

  const hasUnitPrices = data.items.some(item => parseFloat(item.unitPrice) > 0)

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lieferschein</title>
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

    .document {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${data.primaryColor || '#3B82F6'};
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
      color: ${data.primaryColor || '#3B82F6'};
      margin-bottom: 5px;
    }

    .business-details {
      font-size: 9pt;
      color: #666;
      line-height: 1.6;
    }

    .document-title-section {
      text-align: right;
    }

    .document-title {
      font-size: 28pt;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }

    .document-date {
      font-size: 11pt;
      color: #666;
    }

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

    .meta {
      background: #f8f9fa;
      padding: 15px 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
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

    .notes {
      margin-top: 30px;
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

    .signature-section {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }

    .signature-block {
      width: 45%;
    }

    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 8px;
      font-size: 9pt;
      color: #666;
    }

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

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .document {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="logo-section">
        ${data.businessLogoUrl ? `<img src="${data.businessLogoUrl}" alt="${data.businessName}">` : ''}
        <h1>${data.businessName}</h1>
        <div class="business-details">
          ${data.businessAddress ? data.businessAddress + '<br>' : ''}
          ${data.businessEmail ? `E-Mail: ${data.businessEmail}<br>` : ''}
          ${data.businessPhone ? `Tel: ${data.businessPhone}<br>` : ''}
          ${data.businessWebsite ? `Web: ${data.businessWebsite}` : ''}
        </div>
      </div>
      <div class="document-title-section">
        <div class="document-title">LIEFERSCHEIN</div>
        <div class="document-date">${formatDateGerman(data.deliveryDate)}</div>
      </div>
    </div>

    <div class="addresses">
      <div class="address-block">
        <h3>Empfänger</h3>
        <p>
          <span class="customer-name">${data.customerName}</span><br>
          ${customerAddress || ''}
        </p>
      </div>
    </div>

    <div class="meta">
      <div class="meta-grid">
        <div class="meta-item">
          <label>Lieferdatum</label>
          <span>${formatDateGerman(data.deliveryDate)}</span>
        </div>
        <div class="meta-item">
          <label>Buchungsnummer</label>
          <span>${data.bookingId.substring(0, 8).toUpperCase()}</span>
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Beschreibung</th>
          <th class="qty-col">Menge</th>
          ${hasUnitPrices ? `
          <th class="price-col">Einzelpreis</th>
          <th class="price-col">Gesamt</th>
          ` : ''}
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="qty-col">${item.quantity}</td>
            ${hasUnitPrices ? `
            <td class="price-col">${parseFloat(item.unitPrice) > 0 ? formatCurrency(item.unitPrice) : '-'}</td>
            <td class="price-col">${parseFloat(item.total) > 0 ? formatCurrency(item.total) : '-'}</td>
            ` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${data.notes ? `
    <div class="notes">
      <h4>Anmerkungen</h4>
      <p>${data.notes}</p>
    </div>
    ` : ''}

    <div class="signature-section">
      <div class="signature-block">
        <div class="signature-line">Übergeben von (Unterschrift)</div>
      </div>
      <div class="signature-block">
        <div class="signature-line">Empfangen von (Unterschrift)</div>
      </div>
    </div>

    <div class="footer">
      <p>${data.businessName}${data.businessAddress ? ` • ${data.businessAddress}` : ''}</p>
      <p>
        ${data.businessEmail ? `E-Mail: ${data.businessEmail}` : ''}
        ${data.businessEmail && data.businessPhone ? ' • ' : ''}
        ${data.businessPhone ? `Tel: ${data.businessPhone}` : ''}
      </p>
    </div>
  </div>
</body>
</html>
`
}

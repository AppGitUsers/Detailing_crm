import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const r = (n) => Number(n || 0).toFixed(2);
const fmtRs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const METHOD_LABEL = {
  cash: 'Cash', upi: 'UPI', card: 'Card',
  netbanking: 'Net Banking', cheque: 'Cheque', other: 'Other',
};

// ─── Invoice PDF ──────────────────────────────────────

export function downloadInvoicePdf(invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // ── Title bar
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(230, 230, 230);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE INVOICE', 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, W - 14, 14, { align: 'right' });

  // ── Meta block
  doc.setTextColor(50, 50, 50);
  let y = 30;
  const meta = [
    ['Invoice #', invoice.invoice_number],
    invoice.vendor_invoice_id ? ['Vendor Ref #', invoice.vendor_invoice_id] : null,
    ['Vendor', invoice.vendor_name || ''],
    ['Date', invoice.invoice_date || ''],
    ['Status', (invoice.payment_status || '').toUpperCase()],
  ].filter(Boolean);

  for (const [label, val] of meta) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(String(val), 55, y);
    y += 6;
  }

  y += 4;

  // ── Items table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('Items', 14, y);
  y += 2;

  const itemRows = (invoice.items || []).map((it) => {
    const total = Number(it.quantity) * Number(it.unit_price);
    return [
      it.product_name || '',
      it.product_brand || '—',
      String(it.quantity),
      fmtRs(it.unit_price),
      fmtRs(total),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Product', 'Brand', 'Qty', 'Cost Price', 'Line Total']],
    body: itemRows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [45, 45, 45], textColor: 220, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Summary
  autoTable(doc, {
    startY: y,
    body: [
      ['Total Amount', fmtRs(invoice.total_amount)],
      ['Total Paid', fmtRs(invoice.total_paid)],
      ['Outstanding', fmtRs(invoice.outstanding_amount)],
    ],
    styles: { fontSize: 8.5 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [80, 80, 80] },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: W - 90 },
    tableWidth: 76,
    theme: 'plain',
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Payments table
  if ((invoice.payments || []).length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text('Payment Installments', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: invoice.payments.map((p) => [
        p.payment_date || '',
        METHOD_LABEL[p.payment_method] || p.payment_method || '—',
        p.payment_reference || '—',
        fmtRs(p.amount),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [45, 45, 45], textColor: 220, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
      theme: 'grid',
    });
  }

  // ── Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-IN')} · Page ${i} of ${pageCount}`,
      W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' }
    );
  }

  doc.save(`${invoice.invoice_number}.pdf`);
}

// ─── Invoices Excel ────────────────────────────────────

export function exportInvoicesExcel(rows, filename = 'invoices.xlsx') {
  const data = rows.map((inv) => ({
    'Invoice #':       inv.invoice_number,
    'Vendor Ref #':    inv.vendor_invoice_id || '',
    'Vendor':          inv.vendor_name || '',
    'Date':            inv.invoice_date || '',
    'Total (Rs.)':     r(inv.total_amount),
    'Paid (Rs.)':      r(inv.total_paid),
    'Outstanding (Rs.)': r(inv.outstanding_amount),
    'Status':          inv.payment_status || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  // widen columns
  ws['!cols'] = [16, 18, 24, 12, 14, 14, 18, 10].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
  XLSX.writeFile(wb, filename);
}

// ─── Inventory Excel ────────────────────────────────────

export function exportInventoryExcel(rows, filename = 'inventory.xlsx') {
  const data = rows.map((item) => ({
    'Product':            item.product_name || '',
    'Code':               item.product_code || '',
    'Brand':              item.brand || '',
    'Type':               item.type_name || '',
    'Category':           item.category || '',
    'Cost Price (Rs.)':   item.cost_price != null ? r(item.cost_price) : '',
    'Selling Price (Rs.)': item.selling_price != null ? r(item.selling_price) : '',
    'Qty Available':      r(item.quantity_available),
    'Min Threshold':      r(item.minimum_threshold),
    'Unit':               item.unit || '',
    'Status':             Number(item.quantity_available) <= 0
                            ? 'Out of Stock'
                            : item.is_low_stock
                            ? 'Low Stock'
                            : 'In Stock',
    'Last Updated':       item.last_updated?.slice(0, 10) || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [24, 12, 16, 14, 14, 16, 18, 14, 14, 8, 12, 12].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  XLSX.writeFile(wb, filename);
}

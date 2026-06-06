const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s) => {
  if (!s) return '—';
  return new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const METHOD = {
  cash: 'Cash', upi: 'UPI', card: 'Card',
  netbanking: 'Net Banking', cheque: 'Cheque', other: 'Other',
};

function payStatusChip(status) {
  const cfg = {
    paid:    { label: '✓ PAID',    color: '#10b981', bg: '#052e16' },
    partial: { label: '⚡ PARTIAL', color: '#f59e0b', bg: '#2d1a07' },
    unpaid:  { label: '✗ UNPAID',  color: '#f43f5e', bg: '#2d0a0a' },
  };
  const { label, color, bg } = cfg[status] || cfg.unpaid;
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${bg};color:${color};border:1px solid ${color}55">${label}</span>`;
}

function buildGarageInvoiceHTML(group) {
  const {
    garage_name, garage_phone, garage_location, garage_gstin,
    job_cards = [],
    total_amount, paid_amount, outstanding, payment_status,
    job_card_count, completed_count, in_progress_count,
  } = group;

  const genDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const jcSections = job_cards.map((jc) => {
    const services  = jc.job_card_services  || [];
    const payments  = jc.payments           || [];
    const jobStatus = jc.job_card_status === 'COMPLETED' ? '✓ Completed' : '⏳ In Progress';
    const jobColor  = jc.job_card_status === 'COMPLETED' ? '#10b981' : '#f59e0b';

    const svcRows = services.map((s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1f2431;color:#e5e7eb">${s.service_name || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1f2431;text-align:center;font-size:10px;color:#9ca3af;text-transform:capitalize">${(s.service_status || 'pending').replace('_', ' ')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1f2431;text-align:right;font-weight:600;color:#c4b5fd">${fmt(s.price_at_time)}</td>
      </tr>`).join('');

    const payRows = payments.map((p) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #1f2431;color:#6b7280;font-size:11px">${fmtDate(p.payment_date)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1f2431;color:#9ca3af;font-size:11px">${METHOD[p.payment_method] || p.payment_method}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1f2431;text-align:right;color:#34d399;font-weight:700;font-size:12px">${fmt(p.amount)}</td>
      </tr>`).join('');

    const makeModel = [jc.vehicle_company, jc.vehicle_model].filter(Boolean).join(' · ');

    return `
    <div class="jc-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:700;color:#a78bfa">${jc.job_card_number}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">${fmtDate(jc.job_card_date)}${jc.employee_name ? `  ·  ${jc.employee_name}` : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:11px;font-weight:600;color:${jobColor}">${jobStatus}</span>
          ${payStatusChip(jc.payment_status)}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px">
        <div>
          <div class="lbl">Vehicle</div>
          <div class="val" style="color:#38bdf8;font-weight:700">${jc.vehicle_number || '—'}</div>
          ${makeModel ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${makeModel}</div>` : ''}
        </div>
        <div>
          <div class="lbl">Financials</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px;font-size:12px">
            <span style="color:#9ca3af">Total: <span style="color:#e5e7eb;font-weight:600">${fmt(jc.total_amount)}</span></span>
            <span style="color:#9ca3af">Paid: <span style="color:#34d399;font-weight:600">${fmt(jc.paid_amount)}</span></span>
            ${Number(jc.outstanding) > 0 ? `<span style="color:#9ca3af">Due: <span style="color:#f43f5e;font-weight:600">${fmt(jc.outstanding)}</span></span>` : ''}
          </div>
        </div>
      </div>

      ${services.length ? `
      <table style="font-size:12px;margin-bottom:10px">
        <thead><tr>
          <th style="padding:6px 12px;color:#6b7280;font-weight:500;text-align:left;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Service</th>
          <th style="padding:6px 12px;color:#6b7280;font-weight:500;text-align:center;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Status</th>
          <th style="padding:6px 12px;color:#6b7280;font-weight:500;text-align:right;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Price</th>
        </tr></thead>
        <tbody>${svcRows}</tbody>
      </table>` : ''}

      ${payments.length ? `
      <div style="margin-top:6px">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Payments Recorded</div>
        <table style="font-size:12px">
          <tbody>${payRows}</tbody>
        </table>
      </div>` : ''}
    </div>`;
  }).join('');

  const summaryRows = job_cards.map((jc) => `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #1f2431;color:#a78bfa;font-weight:600">${jc.job_card_number}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #1f2431;color:#38bdf8">${jc.vehicle_number || '—'}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #1f2431;color:#9ca3af;font-size:11px">${fmtDate(jc.job_card_date)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #1f2431;text-align:right;color:#e5e7eb;font-weight:600">${fmt(jc.total_amount)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #1f2431;text-align:right;color:#34d399;font-weight:600">${fmt(jc.paid_amount)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #1f2431;text-align:right;color:${Number(jc.outstanding) > 0 ? '#f43f5e' : '#6b7280'};font-weight:600">${fmt(jc.outstanding)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #1f2431">${payStatusChip(jc.payment_status)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Garage Invoice — ${garage_name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#0b0d12;color:#e5e7eb;padding:32px}
.page{max-width:900px;margin:0 auto}
.card{background:#13161d;border:1px solid #252a36;border-radius:12px;padding:22px 26px;margin-bottom:16px}
.jc-card{background:#0f1117;border:1px solid #1f2431;border-radius:10px;padding:18px 20px;margin-bottom:14px}
.lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px}
.val{font-size:13px;color:#e5e7eb;font-weight:500}
.sec{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
table{width:100%;border-collapse:collapse}
@media print{body{background:#fff;color:#111}.card,.jc-card{background:#fff;border-color:#e5e7eb}}
</style>
</head>
<body>
<div class="page">

<div class="card" style="background:linear-gradient(135deg,#1a1e27,#0f1117);margin-bottom:20px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
    <div>
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.3px">Garage Group Invoice</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">Detailing Workshop · Combined Job Card Invoice</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#6b7280">Generated: ${genDate}</div>
      <div style="margin-top:8px">${payStatusChip(payment_status)}</div>
    </div>
  </div>
</div>

<div class="card">
  <div class="sec">Garage Details</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;flex-wrap:wrap">
    <div><div class="lbl">Garage Name</div><div class="val" style="color:#38bdf8;font-size:15px;font-weight:700">${garage_name}</div></div>
    <div><div class="lbl">Phone</div><div class="val">${garage_phone || '—'}</div></div>
    ${garage_location ? `<div><div class="lbl">Location</div><div class="val">${garage_location}</div></div>` : ''}
    ${garage_gstin    ? `<div><div class="lbl">GSTIN</div><div class="val">${garage_gstin}</div></div>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px;padding-top:18px;border-top:1px solid #1f2431">
    <div style="background:#0f1117;border:1px solid #1f2431;border-radius:8px;padding:12px">
      <div class="lbl">Total Job Cards</div><div style="font-size:18px;font-weight:800;color:#a78bfa">${job_card_count}</div>
    </div>
    <div style="background:#0f1117;border:1px solid #1f2431;border-radius:8px;padding:12px">
      <div class="lbl">Completed</div><div style="font-size:18px;font-weight:800;color:#10b981">${completed_count}</div>
    </div>
    <div style="background:#0f1117;border:1px solid #1f2431;border-radius:8px;padding:12px">
      <div class="lbl">In Progress</div><div style="font-size:18px;font-weight:800;color:#f59e0b">${in_progress_count}</div>
    </div>
    <div style="background:#0f1117;border:1px solid #1f2431;border-radius:8px;padding:12px">
      <div class="lbl">Outstanding</div><div style="font-size:18px;font-weight:800;color:${Number(outstanding) > 0 ? '#f43f5e' : '#10b981'}">${fmt(outstanding)}</div>
    </div>
  </div>
</div>

<div class="card">
  <div class="sec">Summary — All Job Cards</div>
  <table>
    <thead><tr>
      <th style="padding:8px 14px;color:#6b7280;text-align:left;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Job Card #</th>
      <th style="padding:8px 14px;color:#6b7280;text-align:left;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Vehicle</th>
      <th style="padding:8px 14px;color:#6b7280;text-align:left;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Date</th>
      <th style="padding:8px 14px;color:#6b7280;text-align:right;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Total</th>
      <th style="padding:8px 14px;color:#6b7280;text-align:right;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Paid</th>
      <th style="padding:8px 14px;color:#6b7280;text-align:right;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Due</th>
      <th style="padding:8px 14px;color:#6b7280;text-align:left;border-bottom:1px solid #252a36;font-size:10px;text-transform:uppercase">Status</th>
    </tr></thead>
    <tbody>
      ${summaryRows}
      <tr style="background:#1a1e27">
        <td colspan="3" style="padding:10px 14px;font-weight:700;color:#9ca3af;font-size:12px">TOTAL</td>
        <td style="padding:10px 14px;text-align:right;font-weight:800;color:#e5e7eb;font-size:14px">${fmt(total_amount)}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:800;color:#34d399;font-size:14px">${fmt(paid_amount)}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:800;color:${Number(outstanding) > 0 ? '#f43f5e' : '#6b7280'};font-size:14px">${fmt(outstanding)}</td>
        <td style="padding:10px 14px">${payStatusChip(payment_status)}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="card">
  <div class="sec">Individual Job Card Details</div>
  ${jcSections}
</div>

</div>
</body>
</html>`;
}

export function downloadGarageInvoice(group) {
  const html = buildGarageInvoiceHTML(group);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `garage-invoice-${(group.garage_name || 'garage').replace(/\s+/g, '-').toLowerCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

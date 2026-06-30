import { useState, useEffect, useMemo } from 'react';
import { QRCode } from 'react-qr-code';
import { getSettings } from '../api/settings';

// Module-level cache — one API call per page load regardless of how many UpiQr instances render
let _cache = null;
let _promise = null;

function loadUpiSettings() {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = getSettings()
      .then(rows => {
        const map = {};
        (Array.isArray(rows) ? rows : []).forEach(r => { map[r.field_name] = r.value; });
        _cache = {
          upiId:   map.upi_id   || import.meta.env.VITE_UPI_ID   || '',
          upiName: map.upi_name || import.meta.env.VITE_UPI_NAME || '',
          upiNote: map.upi_note || import.meta.env.VITE_UPI_NOTE || 'Car Detailing Payment',
        };
        return _cache;
      })
      .catch(() => {
        _cache = {
          upiId:   import.meta.env.VITE_UPI_ID   || '',
          upiName: import.meta.env.VITE_UPI_NAME || '',
          upiNote: import.meta.env.VITE_UPI_NOTE || 'Car Detailing Payment',
        };
        return _cache;
      });
  }
  return _promise;
}

export default function UpiQr({ amount }) {
  const [upi, setUpi] = useState(null);

  useEffect(() => {
    loadUpiSettings().then(setUpi);
  }, []);

  const amt            = Number(amount);
  const hasValidAmount = amt > 0;
  const hasUpiId       = !!upi?.upiId && upi.upiId !== 'yourworkshop@upi';

  const upiUri = useMemo(() => {
    if (!upi || !hasUpiId || !hasValidAmount) return '';
    const params = new URLSearchParams({
      pa: upi.upiId,
      pn: upi.upiName,
      am: amt.toFixed(2),
      cu: 'INR',
      tn: upi.upiNote,
    });
    return `upi://pay?${params.toString()}`;
  }, [upi, amt, hasUpiId, hasValidAmount]);

  if (!upi) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg-hover/40 px-4 py-3 text-xs text-gray-500 text-center">
        Loading UPI settings…
      </div>
    );
  }

  if (!hasUpiId) {
    return (
      <div className="rounded-xl border border-dashed border-yellow-700/50 bg-yellow-950/20 px-4 py-3 text-xs text-yellow-400">
        Configure your <strong>UPI ID</strong> and <strong>UPI Payee Name</strong> in{' '}
        <strong>Settings → Business Info</strong> to enable UPI QR.
      </div>
    );
  }

  if (!hasValidAmount) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg-hover/40 px-4 py-3 text-xs text-gray-500 text-center">
        Enter an amount above to generate the UPI QR code.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-4">
      <QRCode value={upiUri} size={180} bgColor="#ffffff" fgColor="#000000" />
      <div className="text-center space-y-0.5">
        <div className="text-sm font-bold text-gray-900">
          Pay ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        {upi.upiName && <div className="text-xs text-gray-600">{upi.upiName}</div>}
        <div className="text-[10px] text-gray-400 font-mono">{upi.upiId}</div>
      </div>
      <div className="text-[10px] text-gray-400">
        Scan with any UPI app · Record payment after customer pays
      </div>
    </div>
  );
}

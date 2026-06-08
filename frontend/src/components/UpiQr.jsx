import { useMemo } from 'react';
import { QRCode } from 'react-qr-code';

export default function UpiQr({ amount }) {
  const upiId   = import.meta.env.VITE_UPI_ID   || '';
  const upiName = import.meta.env.VITE_UPI_NAME  || '';
  const upiNote = import.meta.env.VITE_UPI_NOTE  || 'Car Detailing Payment';

  const amt            = Number(amount);
  const hasValidAmount = amt > 0;
  const hasUpiId       = !!upiId && upiId !== 'yourworkshop@upi';

  const upiUri = useMemo(() => {
    if (!hasUpiId || !hasValidAmount) return '';
    const params = new URLSearchParams({
      pa: upiId,
      pn: upiName,
      am: amt.toFixed(2),
      cu: 'INR',
      tn: upiNote,
    });
    return `upi://pay?${params.toString()}`;
  }, [upiId, upiName, upiNote, amt, hasUpiId, hasValidAmount]);

  if (!hasUpiId) {
    return (
      <div className="rounded-xl border border-dashed border-yellow-700/50 bg-yellow-950/20 px-4 py-3 text-xs text-yellow-400">
        Set <code className="bg-yellow-900/40 px-1 rounded">VITE_UPI_ID</code>,{' '}
        <code className="bg-yellow-900/40 px-1 rounded">VITE_UPI_NAME</code> in{' '}
        <code className="bg-yellow-900/40 px-1 rounded">.env</code> to enable UPI QR.
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
        {upiName && <div className="text-xs text-gray-600">{upiName}</div>}
        <div className="text-[10px] text-gray-400 font-mono">{upiId}</div>
      </div>
      <div className="text-[10px] text-gray-400">
        Scan with any UPI app · Record payment after customer pays
      </div>
    </div>
  );
}

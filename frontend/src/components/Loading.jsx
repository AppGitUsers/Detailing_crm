import { Loader2 } from 'lucide-react';

export default function Loading({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-12 text-gray-400 ${className}`}>
      <Loader2 className="animate-spin" size={18} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

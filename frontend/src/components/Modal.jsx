import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeMap = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`
        relative w-full ${sizeMap[size]}
        max-h-[92vh] sm:max-h-[90vh]
        flex flex-col
        bg-bg-card border border-border
        rounded-t-2xl sm:rounded-xl
        shadow-2xl
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border">
          <h2 className="text-base sm:text-lg font-semibold text-gray-100 truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-100 hover:bg-bg-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-t border-border flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

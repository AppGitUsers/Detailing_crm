const variants = {
  default: 'bg-bg-elev text-gray-300 border-border',
  yellow: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
  green: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  red: 'bg-red-900/40 text-red-300 border-red-700/50',
  blue: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  purple: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  gray: 'bg-gray-700/40 text-gray-300 border-gray-600/50',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}

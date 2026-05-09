export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled,
  loading,
  ...rest
}) {
  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white border border-accent',
    secondary: 'bg-bg-elev hover:bg-bg-hover text-gray-100 border border-border',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-600',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600',
    ghost: 'bg-transparent hover:bg-bg-hover text-gray-300 border border-transparent',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

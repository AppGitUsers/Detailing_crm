export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 sm:mb-6">
      <div className="min-w-0">
        {breadcrumbs && <div className="text-xs text-gray-500 mb-1">{breadcrumbs}</div>}
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-100 truncate">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
      )}
    </div>
  );
}

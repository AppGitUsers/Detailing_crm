export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && <div className="text-xs text-gray-500 mb-1">{breadcrumbs}</div>}
        <h1 className="text-2xl font-semibold text-gray-100">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

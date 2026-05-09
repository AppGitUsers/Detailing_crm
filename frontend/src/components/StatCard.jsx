export default function StatCard({ icon: Icon, label, value, accent = 'accent', loading }) {
  const accents = {
    accent: 'bg-accent-soft text-accent',
    green: 'bg-emerald-900/40 text-emerald-300',
    yellow: 'bg-yellow-900/40 text-yellow-300',
    red: 'bg-red-900/40 text-red-300',
    blue: 'bg-blue-900/40 text-blue-300',
  };
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${accents[accent]}`}>
        {Icon && <Icon size={20} />}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-semibold text-gray-100 mt-0.5">
          {loading ? <span className="inline-block w-20 h-6 bg-bg-elev rounded animate-pulse" /> : value}
        </div>
      </div>
    </div>
  );
}

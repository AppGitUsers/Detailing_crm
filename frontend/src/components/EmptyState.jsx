import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-bg-elev flex items-center justify-center mb-3">
        <Icon className="text-gray-500" size={22} />
      </div>
      <h3 className="text-base font-medium text-gray-200">{title}</h3>
      {message && <p className="text-sm text-gray-400 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

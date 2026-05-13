import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, Wrench,
  UserCog, Truck, Sparkles, LogOut, User,
  Clock, CalendarCheck, Wallet, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { tokens, logout } from '../api/auth';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/jobcards', icon: ClipboardList, label: 'Job Cards' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/services', icon: Wrench, label: 'Services' },
  // Employees is a group with sub-links
  {
    icon: UserCog,
    label: 'Employees',
    group: true,
    base: '/employees',
    children: [
      { to: '/employees', label: 'All Employees', end: true },
      { to: '/employees/shifts', label: 'Shifts', icon: Clock },
      { to: '/employees/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/employees/salary', label: 'Salary', icon: Wallet },
    ],
  },
  { to: '/vendors', icon: Truck, label: 'Vendors' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const username = tokens.getUser();
  const [empOpen, setEmpOpen] = useState(
    // Keep open if currently on an employees page
    window.location.pathname.startsWith('/employees')
  );

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-60 shrink-0 bg-bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <Sparkles size={18} className="text-accent" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-100 leading-tight">Detailing CRM</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Workshop</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          // ── Grouped link (Employees) ──────────────────────────────────────
          if (link.group) {
            const isActive = window.location.pathname.startsWith(link.base);
            return (
              <div key={link.label}>
                {/* Group header — toggles the sub-links */}
                <button
                  onClick={() => setEmpOpen((o) => !o)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors border ${
                    isActive
                      ? 'bg-accent-soft text-accent border-accent/30'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-bg-hover border-transparent'
                  }`}
                >
                  <link.icon size={16} />
                  <span className="flex-1 text-left">{link.label}</span>
                  {empOpen
                    ? <ChevronDown size={13} />
                    : <ChevronRight size={13} />}
                </button>

                {/* Sub-links */}
                {empOpen && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                    {link.children.map(({ to, label, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                            isActive
                              ? 'text-accent font-medium'
                              : 'text-gray-400 hover:text-gray-100'
                          }`
                        }
                      >
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // ── Regular link ──────────────────────────────────────────────────
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-accent-soft text-accent border border-accent/30'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-bg-hover border border-transparent'
                }`
              }
            >
              <link.icon size={16} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-3 border-t border-border space-y-2">
        {username && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400">
            <div className="w-7 h-7 rounded-full bg-bg-elev flex items-center justify-center shrink-0">
              <User size={13} />
            </div>
            <span className="truncate">{username}</span>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { UserCog, Clock, CalendarCheck, Wallet, BarChart2 } from 'lucide-react';
import EmployeesTab from './EmployeesTab';
import ShiftsTab from './ShiftsTab';
import AttendanceTab from './AttendanceTab';
import SalaryTab from './SalaryTab';
import PerformanceTab from './PerformanceTab';

const tabs = [
  { to: '/employees', icon: UserCog, label: 'All Employees', end: true },
  { to: '/employees/shifts', icon: Clock, label: 'Shifts' },
  { to: '/employees/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/employees/salary', icon: Wallet, label: 'Salary' },
  { to: '/employees/performance', icon: BarChart2, label: 'Performance' },
];

export default function EmployeesHub() {
  return (
    <div>
      <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
        {tabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-accent text-gray-100'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`
            }
          >
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<EmployeesTab />} />
        <Route path="shifts" element={<ShiftsTab />} />
        <Route path="attendance" element={<AttendanceTab />} />
        <Route path="salary" element={<SalaryTab />} />
        <Route path="performance" element={<PerformanceTab />} />
        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </div>
  );
}

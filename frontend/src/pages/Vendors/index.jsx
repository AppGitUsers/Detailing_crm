import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Truck, Package, Boxes, Receipt } from 'lucide-react';
import VendorsTab from './VendorsTab';
import ProductsTab from './ProductsTab';
import InventoryTab from './InventoryTab';
import InvoicesTab from './InvoicesTab';

const tabs = [
  { to: '', icon: Truck, label: 'Vendors', end: true },
  { to: 'products', icon: Package, label: 'Products' },
  { to: 'inventory', icon: Boxes, label: 'Inventory' },
  { to: 'invoices', icon: Receipt, label: 'Invoices' },
];

export default function VendorsHub() {
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
        <Route index element={<VendorsTab />} />
        <Route path="products" element={<ProductsTab />} />
        <Route path="inventory" element={<InventoryTab />} />
        <Route path="invoices" element={<InvoicesTab />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  );
}

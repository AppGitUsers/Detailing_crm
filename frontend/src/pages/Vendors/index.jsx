import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Truck, Package, Boxes, Receipt } from 'lucide-react';
import VendorsTab from './VendorsTab';
import ProductsTab from './ProductsTab';
import InventoryTab from './InventoryTab';
import InvoicesTab from './InvoicesTab';

const tabs = [
  { to: '/vendors', icon: Truck, label: 'Vendors', end: true },
  { to: '/vendors/products', icon: Package, label: 'Products' },
  { to: '/vendors/inventory', icon: Boxes, label: 'Inventory' },
  { to: '/vendors/invoices', icon: Receipt, label: 'Invoices' },
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
              `relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive ? 'text-accent' : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} /> {label}
                {isActive && (
                  <span className="absolute left-2 right-2 -bottom-px h-[3px] rounded-full bg-accent" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<VendorsTab />} />
        <Route path="products" element={<ProductsTab />} />
        <Route path="inventory" element={<InventoryTab />} />
        <Route path="invoices" element={<InvoicesTab />} />
        <Route path="*" element={<Navigate to="/vendors" replace />} />
      </Routes>
    </div>
  );
}

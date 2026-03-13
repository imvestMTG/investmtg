/* shared/Icons.js — SVG icon helpers */
import React from 'react';
var h = React.createElement;

function Icon({ d, size, viewBox, children, className }) {
  return h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size || 18,
    height: size || 18,
    viewBox: viewBox || '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    className: className || undefined
  }, d ? h('path', { d: d }) : children);
}

export function SearchIcon() {
  return h(Icon, { d: 'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z' });
}

export function PortfolioIcon() {
  return h(Icon, null,
    h('path', { d: 'M3 3h18v18H3z', fill: 'none' }),
    h('polyline', { points: '3 9 12 2 21 9' }),
    h('path', { d: 'M9 22V12h6v10' })
  );
}

export function ShoppingCartIcon() {
  return h(Icon, null,
    h('circle', { cx: 9, cy: 21, r: 1 }),
    h('circle', { cx: 20, cy: 21, r: 1 }),
    h('path', { d: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' })
  );
}

export function CartIcon() {
  return h(ShoppingCartIcon);
}

export function MoonIcon() {
  return h(Icon, { d: 'M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z' });
}

export function SunIcon() {
  return h(Icon, null,
    h('circle', { cx: 12, cy: 12, r: 5 }),
    h('line', { x1: 12, y1: 1, x2: 12, y2: 3 }),
    h('line', { x1: 12, y1: 21, x2: 12, y2: 23 }),
    h('line', { x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 }),
    h('line', { x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 }),
    h('line', { x1: 1, y1: 12, x2: 3, y2: 12 }),
    h('line', { x1: 21, y1: 12, x2: 23, y2: 12 }),
    h('line', { x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 }),
    h('line', { x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 })
  );
}

export function MenuIcon() {
  return h(Icon, null,
    h('line', { x1: 3, y1: 12, x2: 21, y2: 12 }),
    h('line', { x1: 3, y1: 6, x2: 21, y2: 6 }),
    h('line', { x1: 3, y1: 18, x2: 21, y2: 18 })
  );
}

export function XIcon() {
  return h(Icon, null,
    h('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
    h('line', { x1: 6, y1: 6, x2: 18, y2: 18 })
  );
}

export function TrendingIcon() {
  return h(Icon, null,
    h('polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }),
    h('polyline', { points: '17 6 23 6 23 12' })
  );
}

export function StarIcon() {
  return h(Icon, { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' });
}

export function SparkleIcon() {
  return h(Icon, null,
    h('path', { d: 'M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z' })
  );
}

export function TrashIcon() {
  return h(Icon, null,
    h('polyline', { points: '3 6 5 6 21 6' }),
    h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' })
  );
}

export function ChevronLeftIcon() {
  return h(Icon, { d: 'M15 18l-6-6 6-6' });
}

export function MapPinIcon({ className }) {
  return h(Icon, { className: className, d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' });
}

export function PhoneIcon({ className }) {
  return h(Icon, { className: className, d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' });
}

export function ClockIcon({ className }) {
  return h(Icon, { className: className },
    h('circle', { cx: 12, cy: 12, r: 10 }),
    h('polyline', { points: '12 6 12 12 16 14' })
  );
}

export function GlobeIcon({ className }) {
  return h(Icon, { className: className },
    h('circle', { cx: 12, cy: 12, r: 10 }),
    h('line', { x1: 2, y1: 12, x2: 22, y2: 12 }),
    h('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' })
  );
}

export function PlusIcon() {
  return h(Icon, null,
    h('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
    h('line', { x1: 5, y1: 12, x2: 19, y2: 12 })
  );
}

export function SendIcon() {
  return h(Icon, null,
    h('line', { x1: 22, y1: 2, x2: 11, y2: 13 }),
    h('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })
  );
}

export function ChatIcon() {
  return h(Icon, { size: 24 },
    h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
  );
}

export function CloseIcon() {
  return h(XIcon);
}

/* ===== NEW ICONS for Storefront & Payments ===== */

export function CreditCardIcon() {
  return h(Icon, null,
    h('rect', { x: 1, y: 4, width: 22, height: 16, rx: 2, ry: 2 }),
    h('line', { x1: 1, y1: 10, x2: 23, y2: 10 })
  );
}

export function TruckIcon() {
  return h(Icon, null,
    h('rect', { x: 1, y: 3, width: 15, height: 13 }),
    h('polygon', { points: '16 8 20 8 23 11 23 16 16 16 16 8' }),
    h('circle', { cx: 5.5, cy: 18.5, r: 2.5 }),
    h('circle', { cx: 18.5, cy: 18.5, r: 2.5 })
  );
}

export function StorePickupIcon() {
  return h(Icon, null,
    h('path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
    h('polyline', { points: '9 22 9 12 15 12 15 22' })
  );
}

export function SellerIcon() {
  return h(Icon, null,
    h('path', { d: 'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z' }),
    h('path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' })
  );
}

export function OrderIcon() {
  return h(Icon, null,
    h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
    h('polyline', { points: '14 2 14 8 20 8' }),
    h('line', { x1: 16, y1: 13, x2: 8, y2: 13 }),
    h('line', { x1: 16, y1: 17, x2: 8, y2: 17 }),
    h('polyline', { points: '10 9 9 9 8 9' })
  );
}

export function EditIcon() {
  return h(Icon, null,
    h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
    h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
  );
}

export function CheckCircleIcon() {
  return h(Icon, null,
    h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
    h('polyline', { points: '22 4 12 14.01 9 11.01' })
  );
}

export function ChevronRightIcon() {
  return h(Icon, { d: 'M9 18l6-6-6-6' });
}

export function UserIcon() {
  return h(Icon, null,
    h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
    h('circle', { cx: 12, cy: 7, r: 4 })
  );
}

export function TagIcon() {
  return h(Icon, null,
    h('path', { d: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' }),
    h('line', { x1: 7, y1: 7, x2: 7.01, y2: 7 })
  );
}

export function ShieldIcon() {
  return h(Icon, null,
    h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
  );
}

export function UploadIcon() {
  return h(Icon, null,
    h('polyline', { points: '16 16 12 12 8 16' }),
    h('line', { x1: 12, y1: 12, x2: 12, y2: 21 }),
    h('path', { d: 'M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3' })
  );
}

export function FileTextIcon() {
  return h(Icon, null,
    h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
    h('polyline', { points: '14 2 14 8 20 8' }),
    h('line', { x1: 16, y1: 13, x2: 8, y2: 13 }),
    h('line', { x1: 16, y1: 17, x2: 8, y2: 17 }),
    h('polyline', { points: '10 9 9 9 8 9' })
  );
}

export function AlertCircleIcon() {
  return h(Icon, null,
    h('circle', { cx: 12, cy: 12, r: 10 }),
    h('line', { x1: 12, y1: 8, x2: 12, y2: 12 }),
    h('line', { x1: 12, y1: 16, x2: 12.01, y2: 16 })
  );
}

export function LayersIcon() {
  return h(Icon, null,
    h('polygon', { points: '12 2 2 7 12 12 22 7 12 2' }),
    h('polyline', { points: '2 17 12 22 22 17' }),
    h('polyline', { points: '2 12 12 17 22 12' })
  );
}

export function GridIcon() {
  return h(Icon, null,
    h('rect', { x: '3', y: '3', width: '7', height: '7' }),
    h('rect', { x: '14', y: '3', width: '7', height: '7' }),
    h('rect', { x: '3', y: '14', width: '7', height: '7' }),
    h('rect', { x: '14', y: '14', width: '7', height: '7' })
  );
}

export function ListIcon() {
  return h(Icon, null,
    h('line', { x1: '8', y1: '6', x2: '21', y2: '6' }),
    h('line', { x1: '8', y1: '12', x2: '21', y2: '12' }),
    h('line', { x1: '8', y1: '18', x2: '21', y2: '18' }),
    h('line', { x1: '3', y1: '6', x2: '3.01', y2: '6' }),
    h('line', { x1: '3', y1: '12', x2: '3.01', y2: '12' }),
    h('line', { x1: '3', y1: '18', x2: '3.01', y2: '18' })
  );
}

export function ShareIcon() {
  return h(Icon, null,
    h('circle', { cx: '18', cy: '5', r: '3' }),
    h('circle', { cx: '6', cy: '12', r: '3' }),
    h('circle', { cx: '18', cy: '19', r: '3' }),
    h('line', { x1: '8.59', y1: '13.51', x2: '15.42', y2: '17.49' }),
    h('line', { x1: '15.41', y1: '6.51', x2: '8.59', y2: '10.49' })
  );
}

export function CopyIcon() {
  return h(Icon, null,
    h('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }),
    h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
  );
}

export function LinkIcon() {
  return h(Icon, null,
    h('path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }),
    h('path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' })
  );
}

/* shared/Icons.js — SVG icon helpers */
import React from 'react';
var h = React.createElement;

function Icon({ d, size, viewBox, children }) {
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
    'aria-hidden': 'true'
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
  return h(Icon, { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' });
}

export function PhoneIcon({ className }) {
  return h(Icon, { d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' });
}

export function ClockIcon({ className }) {
  return h(Icon, null,
    h('circle', { cx: 12, cy: 12, r: 10 }),
    h('polyline', { points: '12 6 12 12 16 14' })
  );
}

export function GlobeIcon({ className }) {
  return h(Icon, null,
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

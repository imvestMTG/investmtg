/* shared/BackToTop.js */
import React from 'react';
var h = React.createElement;

export function BackToTop() {
  var ref = React.useState(false);
  var visible = ref[0], setVisible = ref[1];

  React.useEffect(function() {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return function() { window.removeEventListener('scroll', onScroll); };
  }, []);

  if (!visible) return null;

  return h('button', {
    className: 'back-to-top visible',
    onClick: function() { window.scrollTo({ top: 0, behavior: 'smooth' }); },
    'aria-label': 'Back to top'
  },
    h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 18,
      height: 18,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    },
      h('path', { d: 'M18 15l-6-6-6 6' })
    )
  );
}

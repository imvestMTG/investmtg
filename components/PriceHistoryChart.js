/* PriceHistoryChart.js — SVG price history chart using JustTCG data */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
var h = React.createElement;

var PERIODS = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' }
];

export function PriceHistoryChart(props) {
  var priceHistory = props.priceHistory || [];
  var onPeriodChange = props.onPeriodChange;
  var activePeriod = props.activePeriod || '7d';
  var change = props.change;

  if (!priceHistory || priceHistory.length < 2) {
    return h('div', { className: 'price-chart-empty' },
      h('p', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' } },
        'Price history not available for this card.'
      )
    );
  }

  // Extract prices and timestamps
  var points = priceHistory.map(function(p) {
    return { price: p.p, time: p.t * 1000 }; // convert to ms
  }).sort(function(a, b) { return a.time - b.time; });

  var prices = points.map(function(p) { return p.price; });
  var minPrice = Math.min.apply(null, prices);
  var maxPrice = Math.max.apply(null, prices);
  var priceRange = maxPrice - minPrice || 1;

  // SVG dimensions
  var W = 480;
  var H = 200;
  var PAD_T = 20;
  var PAD_B = 30;
  var PAD_L = 55;
  var PAD_R = 15;
  var chartW = W - PAD_L - PAD_R;
  var chartH = H - PAD_T - PAD_B;

  var timeMin = points[0].time;
  var timeMax = points[points.length - 1].time;
  var timeRange = timeMax - timeMin || 1;

  // Build SVG path
  var pathPoints = points.map(function(p, i) {
    var x = PAD_L + (p.time - timeMin) / timeRange * chartW;
    var y = PAD_T + chartH - (p.price - minPrice) / priceRange * chartH;
    return { x: x, y: y };
  });

  var linePath = pathPoints.map(function(p, i) {
    return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
  }).join(' ');

  // Fill area under the line
  var areaPath = linePath +
    ' L' + pathPoints[pathPoints.length - 1].x.toFixed(1) + ',' + (PAD_T + chartH) +
    ' L' + pathPoints[0].x.toFixed(1) + ',' + (PAD_T + chartH) + ' Z';

  // Y-axis labels (5 ticks)
  var yLabels = [];
  for (var i = 0; i <= 4; i++) {
    var val = minPrice + (priceRange * i / 4);
    var yPos = PAD_T + chartH - (i / 4) * chartH;
    yLabels.push({ value: val, y: yPos });
  }

  // X-axis labels (start, middle, end)
  var xLabels = [
    { time: timeMin, x: PAD_L },
    { time: timeMin + timeRange / 2, x: PAD_L + chartW / 2 },
    { time: timeMax, x: PAD_L + chartW }
  ];

  function formatDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  var isPositive = change !== null && change !== undefined && change >= 0;
  var lineColor = isPositive ? 'var(--color-green, #22c55e)' : 'var(--color-red, #ef4444)';
  var fillColor = isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';

  // Current and start price for display
  var currentPrice = prices[prices.length - 1];
  var startPrice = prices[0];

  return h('div', { className: 'price-chart-container' },
    h('div', { className: 'price-chart-header' },
      h('div', null,
        h('span', { className: 'price-chart-current' }, formatUSD(currentPrice)),
        change !== null && change !== undefined
          ? h('span', {
              className: 'price-chart-change ' + (isPositive ? 'positive' : 'negative')
            }, (isPositive ? '+' : '') + change.toFixed(1) + '%')
          : null
      ),
      onPeriodChange ? h('div', { className: 'price-chart-periods' },
        PERIODS.map(function(p) {
          return h('button', {
            key: p.value,
            className: 'period-btn' + (activePeriod === p.value ? ' active' : ''),
            onClick: function() { onPeriodChange(p.value); }
          }, p.label);
        })
      ) : null
    ),
    h('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      className: 'price-chart-svg',
      'aria-label': 'Price history chart'
    },
      // Grid lines
      yLabels.map(function(label, idx) {
        return h('line', {
          key: 'grid-' + idx,
          x1: PAD_L, y1: label.y,
          x2: PAD_L + chartW, y2: label.y,
          stroke: 'var(--color-border, rgba(255,255,255,0.08))',
          strokeWidth: '0.5'
        });
      }),
      // Fill area
      h('path', {
        d: areaPath,
        fill: fillColor,
        stroke: 'none'
      }),
      // Price line
      h('path', {
        d: linePath,
        fill: 'none',
        stroke: lineColor,
        strokeWidth: '2',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }),
      // Endpoint dot
      h('circle', {
        cx: pathPoints[pathPoints.length - 1].x,
        cy: pathPoints[pathPoints.length - 1].y,
        r: '3',
        fill: lineColor
      }),
      // Y-axis labels
      yLabels.map(function(label, idx) {
        return h('text', {
          key: 'y-' + idx,
          x: PAD_L - 8,
          y: label.y + 4,
          textAnchor: 'end',
          fill: 'var(--color-text-muted, #888)',
          fontSize: '10',
          fontFamily: 'inherit'
        }, '$' + label.value.toFixed(2));
      }),
      // X-axis labels
      xLabels.map(function(label, idx) {
        return h('text', {
          key: 'x-' + idx,
          x: label.x,
          y: H - 5,
          textAnchor: idx === 0 ? 'start' : (idx === 2 ? 'end' : 'middle'),
          fill: 'var(--color-text-muted, #888)',
          fontSize: '10',
          fontFamily: 'inherit'
        }, formatDate(label.time));
      })
    )
  );
}

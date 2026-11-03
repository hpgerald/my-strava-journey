// The gentle float shared by the dot charts. Each dot gets its own slow rhythm
// (a few seconds per sway, never in step with its neighbours) and drifts a few
// pixels around its true place, with a faint breath in its size. The data point
// itself never moves: the drift is always centred on it.
export function seedDrift(rnd, scale = 1) {
  return {
    ph: rnd() * Math.PI * 2,
    ph2: rnd() * Math.PI * 2,
    ph3: rnd() * Math.PI * 2,
    sp: 0.42 + rnd() * 0.58,
    amp: (1.5 + rnd() * 2.1) * scale,
  }
}

// s is time in seconds; returns the offset in pixels and a radius factor
export function drift(p, s) {
  const dx = Math.sin(s * p.sp + p.ph) * p.amp + Math.sin(s * p.sp * 2.13 + p.ph3) * p.amp * 0.28
  const dy = Math.cos(s * p.sp * 0.83 + p.ph2) * p.amp * 1.1 + Math.sin(s * p.sp * 1.71 + p.ph) * p.amp * 0.24
  const k = 1 + 0.06 * Math.sin(s * p.sp * 1.37 + p.ph2)
  return { dx, dy, k }
}

// The same float for SVG dots, done in CSS: each dot gets its own period, start
// and reach from its index, so a cloud of dots never moves in step.
export function floatStyle(i) {
  const h = (n) => { const x = Math.sin((i + 1) * n) * 43758.5453; return x - Math.floor(x) }
  return {
    '--fd': `${(5.5 + h(12.9898) * 6).toFixed(2)}s`,
    '--fp': `${(-h(78.233) * 10).toFixed(2)}s`,
    '--fx': `${(1.2 + h(39.346) * 1.8).toFixed(2)}px`,
    '--fy': `${(1.2 + h(11.135) * 2).toFixed(2)}px`,
  }
}

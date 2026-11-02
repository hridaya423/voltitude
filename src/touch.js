const DRAG = 12, HOLD = 0.12, TAP = 0.1, SPAN = 70;

export function createTouch(root, { onPause }) {
  const fingers = new Map();
  let dare = true, on = false, pulse = 0;
  const held = new Set();
  const stick = root.querySelector('.t-stick');

  for (const b of root.querySelectorAll('[data-t]')) {
    const id = b.dataset.t;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); if (id === 'pause') onPause(); else held.add(id); b.classList.add('on'); });
    const up = (e) => { e.stopPropagation(); held.delete(id); b.classList.remove('on'); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
  }
  const pad = root.querySelector('.t-pad');
  pad.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    root.classList.add('used');
    pad.setPointerCapture(e.pointerId);
    fingers.set(e.pointerId, { x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, t: performance.now(), drag: false, order: fingers.size });
  });
  pad.addEventListener('pointermove', (e) => {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    f.dx = e.clientX - f.x0; f.dy = e.clientY - f.y0;
    if (Math.hypot(f.dx, f.dy) > DRAG) f.drag = true;
  });
  const lift = (e) => {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    fingers.delete(e.pointerId);
    if (dare && f.order === 0 && !f.drag && (performance.now() - f.t) / 1000 < HOLD) pulse = TAP;
    if (!fingers.size) return;
    let k = 0;
    for (const g of fingers.values()) g.order = k++;
  };
  pad.addEventListener('pointerup', lift);
  pad.addEventListener('pointercancel', lift);

  const clamp = (v) => Math.max(-1, Math.min(1, v));
  return {
    get on() { return on; },
    get dare() { return dare; },
    show(visible, isDare) {
      on = visible;
      dare = isDare;
      root.hidden = !visible;
      root.classList.toggle('dare', dare);
      if (!visible) { fingers.clear(); held.clear(); pulse = 0; for (const b of root.querySelectorAll('.on')) b.classList.remove('on'); }
    },
    apply(inp, dt, airborne) {
      if (!on) return inp;
      pulse = Math.max(0, pulse - dt);
      const first = [...fingers.values()].find((f) => f.order === 0);
      const now = performance.now();
      const sx = first ? clamp(first.dx / SPAN) : 0, sy = first ? clamp(first.dy / SPAN) : 0;
      if (dare) {
        inp.throttle = 1; inp.brake = 0;
        inp.steer = airborne ? 0 : sx;
        inp.roll = airborne && Math.abs(sx) > 0.5 ? Math.sign(sx) : 0;
        inp.pitch = airborne ? sy : 0;
        inp.lift = pulse > 0 || (first && !first.drag && (now - first.t) / 1000 >= HOLD) ? 1 : 0;
        inp.boost = fingers.size > 1 ? 1 : 0;
      } else {
        inp.steer = sx;
        inp.throttle = held.has('gas') ? 1 : 0;
        inp.brake = held.has('brake') ? 1 : 0;
        inp.pitch = inp.brake - inp.throttle;
        inp.boost = held.has('boost') ? 1 : 0;
        inp.lift = held.has('lift') ? 1 : 0;
        inp.roll = airborne && Math.abs(sx) > 0.6 ? Math.sign(sx) : 0;
      }
      stick.style.transform = `translateX(${(sx * 28).toFixed(1)}px)`;
      return inp;
    },
  };
}

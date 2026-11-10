export const ACTIONS = [
  ['throttle', 'Throttle · nose down in air'],
  ['brake', 'Brake · nose up in air'],
  ['left', 'Steer left'],
  ['right', 'Steer right'],
  ['boost', 'Boost (rear thrusters)'],
  ['lift', 'Lift (down thrusters)'],
  ['rollLeft', 'Air roll left'],
  ['rollRight', 'Air roll right'],
  ['reset', 'Back to checkpoint'],
  ['restart', 'Restart'],
];

export const DEFAULT_KEYS = {
  throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  boost: ['ShiftLeft'], lift: ['Space'], rollLeft: ['KeyQ'], rollRight: ['KeyE'], reset: ['Backspace'], restart: ['KeyR'],
};

export function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ShiftRight: 'R Shift', Space: 'Space', Backspace: 'Backspace', Enter: 'Enter', ControlLeft: 'Ctrl', AltLeft: 'Alt' })[code] || code;
}

export function createInput(settings) {
  const down = new Set();
  const pressed = new Set();
  let pad = null, padSeen = false, lastPadButtons = [];
  let steerK = 0;
  const state = { throttle: 0, brake: 0, steer: 0, pitch: 0, roll: 0, boost: 0, lift: 0, reset: 0, restart: 0, flip: 0, device: 'keyboard' };
  const bound = (action) => settings.keys[action] || [];
  const isDown = (action) => bound(action).some((k) => down.has(k));

  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (!e.repeat) pressed.add(e.code);
    down.add(e.code);
    state.device = 'keyboard';
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.code) && !(e.target && e.target.tagName === 'BUTTON' && e.code === 'Space')) e.preventDefault();
  });
  addEventListener('keyup', (e) => down.delete(e.code));
  addEventListener('blur', () => down.clear());
  addEventListener('gamepadconnected', () => { padSeen = true; });

  function readPad() {
    if (!padSeen || !navigator.getGamepads) return null;
    for (const p of navigator.getGamepads()) if (p && p.connected) return p;
    return null;
  }
  const dz = (v, d = 0.12) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));

  return {
    state,
    wasPressed(code) { return pressed.has(code); },
    padPressed(i) { return !!(pad && pad.buttons[i] && pad.buttons[i].pressed && !lastPadButtons[i]); },
    actionPressed(action) { return bound(action).some((k) => pressed.has(k)); },
    poll(dt) {
      pad = readPad();
      const kSteer = (isDown('right') ? 1 : 0) - (isDown('left') ? 1 : 0);
      const ramp = (cur, target, up) => {
        if (target === 0) return Math.abs(cur) < dt * 12 ? 0 : cur - Math.sign(cur) * dt * 12;
        if (Math.sign(cur) !== Math.sign(target) && cur !== 0) return 0;
        return Math.max(-1, Math.min(1, cur + target * dt * up));
      };
      steerK = ramp(steerK, kSteer, 6);
      let throttle = isDown('throttle') ? 1 : 0, brake = isDown('brake') ? 1 : 0;
      let steer = steerK, pitch = brake - throttle;
      let roll = (isDown('rollRight') ? 1 : 0) - (isDown('rollLeft') ? 1 : 0);
      let boost = isDown('boost') ? 1 : 0, lift = isDown('lift') ? 1 : 0, reset = isDown('reset') ? 1 : 0, restart = isDown('restart') ? 1 : 0;
      let flip = brake && !throttle ? 1 : 0;
      if (pad) {
        const b = (i) => (pad.buttons[i] ? pad.buttons[i].value : 0);
        const ax = dz(pad.axes[0] || 0), ay = dz(pad.axes[1] || 0);
        const any = Math.abs(ax) + Math.abs(ay) + b(7) + b(6) + b(0) + b(1) + b(2) > 0.2;
        if (any) state.device = 'gamepad';
        throttle = Math.max(throttle, b(7));
        brake = Math.max(brake, b(6));
        if (Math.abs(ax) > Math.abs(steer)) steer = Math.sign(ax) * Math.pow(Math.abs(ax), 1.4);
        if (Math.abs(ay) > Math.abs(pitch)) pitch = Math.sign(ay) * Math.pow(Math.abs(ay), 1.3);
        if (Math.abs(ay) > 0.85) flip = 1;
        if (b(5) > 0.5) roll = 1; else if (b(4) > 0.5) roll = -1;
        boost = Math.max(boost, b(1) > 0.5 || b(2) > 0.5 ? 1 : 0);
        lift = Math.max(lift, b(0) > 0.5 ? 1 : 0);
        reset = Math.max(reset, b(3) > 0.5 ? 1 : 0);
        restart = Math.max(restart, b(8) > 0.5 ? 1 : 0);
      }
      if (settings.invertPitch) pitch = -pitch;
      Object.assign(state, { throttle, brake, steer, pitch, roll, boost, lift, reset, restart, flip });
      return state;
    },
    endFrame() {
      pressed.clear();
      lastPadButtons = pad ? pad.buttons.map((x) => x.pressed) : [];
    },
    rumble(strong, weak, ms) {
      if (!settings.rumble || !pad || !pad.vibrationActuator) return;
      try { pad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch { }
    },
    get pad() { return pad; },
  };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slide } from '../tools/slide-lab.mjs';

test('holding slide sets the car at an angle, turns it tighter and costs speed', () => {
  for (const v of [30, 45, 60]) {
    const grip = slide(v, false), s = slide(v, true);
    assert.ok(s.maxBetaDeg > 10 && s.maxBetaDeg < 25, `${v} m/s slides at ${s.maxBetaDeg} deg`);
    assert.ok(s.pathTurnDeg > 1.1 * grip.pathTurnDeg, `${v} m/s turns ${s.pathTurnDeg} against ${grip.pathTurnDeg} deg`);
    assert.ok(s.speedKept > 0.8 && s.speedKept < 0.97, `${v} m/s keeps ${s.speedKept}`);
    assert.ok(!s.spun && s.recoveredInS !== null && s.recoveredInS < 1.5, JSON.stringify(s));
  }
});

test('a left-right flick with slide held is caught without a spin', () => {
  for (const v of [30, 45, 60]) {
    const s = slide(v, true, 1.2, 0.6);
    assert.ok(!s.spun && s.maxBetaDeg < 50 && s.recoveredInS !== null, JSON.stringify(s));
  }
});

test('without slide the car still holds the grip limit', () => {
  for (const v of [30, 45, 60]) {
    const s = slide(v, false);
    assert.ok(s.maxBetaDeg < 9 && s.speedKept > 0.98, JSON.stringify(s));
  }
});

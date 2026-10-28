export const ROSTER = [
  { id: 'aal', code: 'AAL', name: 'Mika Aalto', no: 12, color: '#dfe6ee', skill: 0.962, aggr: 0.45, error: 0.08, boost: 0.85 },
  { id: 'rey', code: 'REY', name: 'Dani Reyes', no: 4, color: '#c4222d', skill: 0.957, aggr: 0.85, error: 0.16, boost: 0.55 },
  { id: 'nai', code: 'NAI', name: 'Priya Nair', no: 27, color: '#1c9d95', skill: 0.959, aggr: 0.5, error: 0.1, boost: 0.9 },
  { id: 'fer', code: 'FER', name: 'Tomás Ferreira', no: 9, color: '#e29a1a', skill: 0.948, aggr: 0.7, error: 0.2, boost: 0.35 },
  { id: 'han', code: 'HAN', name: 'Joon Han', no: 33, color: '#2452c4', skill: 0.953, aggr: 0.4, error: 0.12, boost: 0.7 },
  { id: 'vog', code: 'VOG', name: 'Lena Vogt', no: 18, color: '#7cb228', skill: 0.93, aggr: 0.55, error: 0.22, boost: 0.5 },
  { id: 'oky', code: 'OKY', name: 'Sam Okoye', no: 55, color: '#7840b4', skill: 0.91, aggr: 0.65, error: 0.28, boost: 0.3 },
];

export const PLAYER = { id: 'me', code: 'YOU', name: 'You', no: 1, color: '#9aa3ad' };

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

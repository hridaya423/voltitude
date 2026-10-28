export const FZ0 = 5000;
const FZ_MAX = 2.5 * FZ0;

const P = {
  Cx: 1.685, Dx1: 1.21, Dx2: -0.037, Ex1: 0.344, Ex2: 0.095, Ex3: -0.02, Kx1: 21.51, Kx2: -0.163, Kx3: 0.245,
  Cy: 1.193, Dy1: 0.99, Dy2: -0.145, Ey1: -0.837, Ey2: -0.294, Ky1: 14.95, Ky2: 2.13,
  rBx1: 12.35, rBx2: 10.77, rCx1: 1.092, rBy1: 6.461, rBy2: 4.196, rBy3: -0.015, rCy1: 1.081,
};

export const GRIP = { mu: 1.5, muY: 1.64, kx: 1.0, ky: 1.25 };

const out = { fx: 0, fy: 0, cx: 0 };

function pureX(fz, dfz, k) {
  const mu = (P.Dx1 + P.Dx2 * dfz) * GRIP.mu;
  const D = mu * fz;
  const K = fz * (P.Kx1 + P.Kx2 * dfz) * Math.exp(P.Kx3 * dfz) * GRIP.kx;
  const B = K / (P.Cx * D);
  const E = Math.min(1, P.Ex1 + P.Ex2 * dfz + P.Ex3 * dfz * dfz);
  const x = B * k;
  return D * Math.sin(P.Cx * Math.atan(x - E * (x - Math.atan(x))));
}

function pureY(fz, dfz, a) {
  const mu = (P.Dy1 + P.Dy2 * dfz) * GRIP.muY;
  const D = mu * fz;
  const K = P.Ky1 * FZ0 * Math.sin(2 * Math.atan(fz / (P.Ky2 * FZ0))) * GRIP.ky;
  const B = K / (P.Cy * D);
  const E = Math.min(1, P.Ey1 + P.Ey2 * dfz);
  const x = B * a;
  return D * Math.sin(P.Cy * Math.atan(x - E * (x - Math.atan(x))));
}

function longitudinal(fz, dfz, k, a) {
  const Bxa = P.rBx1 * Math.cos(Math.atan(P.rBx2 * k));
  return pureX(fz, dfz, k) * Math.cos(P.rCx1 * Math.atan(Bxa * a));
}

export function tyre(fz, kappa, alpha, scale = 1) {
  if (fz < 1) { out.fx = out.fy = out.cx = 0; return out; }
  const fzc = Math.min(fz, FZ_MAX);
  const n = (fz / fzc) * scale;
  const dfz = (fzc - FZ0) / FZ0;
  const k = Math.max(-1, Math.min(1, kappa));
  const fx = longitudinal(fzc, dfz, k, alpha);
  const eps = 0.004;
  out.cx = ((longitudinal(fzc, dfz, k + eps, alpha) - fx) / eps) * n;
  const Byk = P.rBy1 * Math.cos(Math.atan(P.rBy2 * (alpha - P.rBy3)));
  out.fx = fx * n;
  out.fy = pureY(fzc, dfz, alpha) * Math.cos(P.rCy1 * Math.atan(Byk * k)) * n;
  return out;
}

import json, sys
import numpy as np

SENSOR = 36.0


def euler(rx, ry, rz):
    cx, sx, cy, sy, cz, sz = np.cos(rx), np.sin(rx), np.cos(ry), np.sin(ry), np.cos(rz), np.sin(rz)
    X = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Y = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Z = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Z @ Y @ X


def project(p, P, W, H):
    C, r, lens = p[:3], p[3:6], p[6]
    R = euler(*r)
    q = (np.asarray(P) - C) @ R
    f = lens / SENSOR * W
    return np.stack([W / 2 + f * q[:, 0] / -q[:, 2], H / 2 - f * q[:, 1] / -q[:, 2]], 1)


def solve(P, X, p0, W, H, fixed=(), iters=200):
    p = np.array(p0, float)
    free = [i for i in range(7) if i not in fixed]
    lam = 1e-3
    def res(p):
        return (project(p, P, W, H) - X).ravel()
    r = res(p)
    for _ in range(iters):
        J = np.zeros((len(r), len(free)))
        for k, i in enumerate(free):
            d = np.zeros(7)
            d[i] = 1e-6 * max(1.0, abs(p[i]))
            J[:, k] = (res(p + d) - r) / d[i]
        A = J.T @ J
        g = J.T @ r
        while True:
            step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-9), -g)
            q = p.copy()
            q[free] += step
            r2 = res(q)
            if r2 @ r2 < r @ r:
                p, r, lam = q, r2, lam * 0.3
                break
            lam *= 10
            if lam > 1e12:
                return p, r
        if np.abs(step).max() < 1e-10:
            break
    return p, r


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    W, H = spec['size']
    P = np.array([c[0] for c in spec['points']], float)
    X = np.array([c[1] for c in spec['points']], float)
    p0 = spec['location'] + [np.radians(a) for a in spec['rotation']] + [spec['lens']]
    p, r = solve(P, X, p0, W, H, fixed=tuple(spec.get('fixed', ())))
    err = r.reshape(-1, 2)
    for (P3, X2), e in zip(spec['points'], err):
        print('  ', P3, X2, 'err', np.round(e, 1))
    print('rms px', float(np.sqrt((err ** 2).sum(1).mean())))
    out = dict(size=[W, H], location=p[:3].tolist(), rotation=np.degrees(p[3:6]).tolist(), lens=float(p[6]))
    json.dump(out, open(sys.argv[2], 'w'), indent=1)
    print(out)

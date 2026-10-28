import bpy, sys, json, math, os, tempfile
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from camera import project

args = sys.argv[sys.argv.index('--') + 1:]
pts_path, cam_path, mask_path, out_path = args[:4]
iters = int(args[4]) if len(args) > 4 else 250
spec = json.load(open(cam_path))
pts = json.load(open(pts_path))
W, H = spec['size']
SCALE = 4
w, h = W // SCALE, H // SCALE

P3 = np.array([c[0] for c in pts['points'][:4]], float)
X2 = np.array([c[1] for c in pts['points'][:4]], float)

img = bpy.data.images.load(mask_path)
m = np.array(img.pixels[:], np.float32).reshape(img.size[1], img.size[0], -1)[::-1, :, 0]
m = m.reshape(h, SCALE, w, SCALE).mean((1, 3)) > 0.5

scene = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.sensor_width = 36
cam.data.sensor_fit = 'HORIZONTAL'
cam.data.clip_end = 500
scene.render.resolution_x, scene.render.resolution_y = w, h
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.render_aa = 'OFF'
scene.display.shading.light = 'FLAT'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
tmp = os.path.join(tempfile.mkdtemp(), 's.png')
scene.render.filepath = tmp


def silhouette(p):
    cam.location = p[:3]
    cam.rotation_euler = p[3:6]
    cam.data.lens = p[6]
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(tmp, check_existing=False)
    a = np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1, :, 3] > 0.5
    bpy.data.images.remove(im)
    return a


def upper(p):
    hubs = project(p, P3[:2], W, H) / SCALE
    xs = np.arange(w)
    t = (xs - hubs[0, 0]) / (hubs[1, 0] - hubs[0, 0])
    line = hubs[0, 1] + t * (hubs[1, 1] - hubs[0, 1])
    return np.arange(h)[:, None] < line[None, :]


def cost(p):
    s = silhouette(p)
    u = upper(p)
    a, b = s & u, m & u
    iou = (a & b).sum() / max(1, (a | b).sum())
    rms = np.sqrt(((project(p, P3, W, H) - X2) ** 2).sum(1).mean())
    return (1 - iou) * 100 + rms * 0.15, iou, rms


p0 = np.array(spec['location'] + [math.radians(a) for a in spec['rotation']] + [spec['lens']])
step = np.array([0.15, 0.15, 0.05, 0.004, 0.004, 0.004, p0[6] * 0.03])
n = 7
simplex = [p0] + [p0 + np.eye(n)[i] * step[i] for i in range(n)]
vals = [cost(s)[0] for s in simplex]
print('start', cost(p0))
for it in range(iters):
    o = np.argsort(vals)
    simplex = [simplex[i] for i in o]
    vals = [vals[i] for i in o]
    c = np.mean(simplex[:-1], 0)
    xr = c + (c - simplex[-1])
    fr = cost(xr)[0]
    if fr < vals[0]:
        xe = c + 2 * (c - simplex[-1])
        fe = cost(xe)[0]
        simplex[-1], vals[-1] = (xe, fe) if fe < fr else (xr, fr)
    elif fr < vals[-2]:
        simplex[-1], vals[-1] = xr, fr
    else:
        xc = c + 0.5 * (simplex[-1] - c)
        fc = cost(xc)[0]
        if fc < vals[-1]:
            simplex[-1], vals[-1] = xc, fc
        else:
            simplex = [simplex[0]] + [simplex[0] + 0.5 * (s - simplex[0]) for s in simplex[1:]]
            vals = [vals[0]] + [cost(s)[0] for s in simplex[1:]]
best = simplex[int(np.argmin(vals))]
print('end', cost(best))
json.dump(dict(size=[W, H], location=best[:3].tolist(), rotation=np.degrees(best[3:6]).tolist(), lens=float(best[6])), open(out_path, 'w'), indent=1)

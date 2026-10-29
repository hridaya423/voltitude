import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix
import shape as S
import mats
from body import to_blender, nose_offset
from wheel import lathe, mesh_object


def sweep(points, half_w, half_h, up=Vector((0, 0, 1))):
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(points):
        a = points[max(i - 1, 0)]
        b = points[min(i + 1, len(points) - 1)]
        t = (b - a).normalized()
        n = up.cross(t).normalized()
        u = t.cross(n).normalized()
        rings.append([bm.verts.new(p + n * sx * half_w + u * sy * half_h) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(4):
            j = (k + 1) % 4
            bm.faces.new((r0[k], r0[j], r1[j], r1[k]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def box(center, size, rot=Matrix.Identity(3)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(center) + rot @ Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    return bm


def prism(outline, x0, x1):
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in outline]
    b = [bm.verts.new((x1, y, z)) for y, z in outline]
    bm.faces.new(a)
    bm.faces.new(b[::-1])
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], b[i], b[j], a[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def add(name, bm, mat, parent=None, smooth=False):
    return mesh_object(name, bm, mat, parent, smooth)


def front_light():
    pts = [to_blender(nose_offset(0.0, abs(w)) - 0.004, w, 0.462) for w in np.linspace(-0.6, 0.6, 61)]
    add('light_front', sweep(pts, 0.006, 0.004), 'light_front')


def splitter():
    side = [(u, max(0.6, float(S.pchip(S.ROCKER_W, u)) + 0.02)) for u in np.linspace(0.04, 0.45, 12)]
    front = [(nose_offset(0.0, abs(w)) - 0.025, w) for w in np.linspace(-0.6, 0.6, 41)]
    plan = [(u, -w) for u, w in side[::-1]] + front + side + [(0.45, 0.0)]
    top = [to_blender(u, w, float(S.pchip(S.FLOOR_V, max(u, 0.0))) + 0.002) for u, w in plan]
    bm = bmesh.new()
    a = [bm.verts.new(p) for p in top]
    b = [bm.verts.new(p - Vector((0, 0, 0.028))) for p in top]
    bm.faces.new(a)
    bm.faces.new(b[::-1])
    n = len(a)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], b[i], b[j], a[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    add('splitter', bm, 'trim')


def blade():
    bm = bmesh.new()
    ue, uf, top = S.L + 0.035, S.L - 0.13, 0.922
    hw = S.BLADE[4] + 0.025
    rings = []
    for w in np.linspace(-hw, hw, 33):
        h = 0.02 + 0.085 * min(1.0, (hw - abs(w)) / 0.16)
        pts = ((ue, top), (ue, top - h), (uf, top - h * 0.45), (uf, top))
        rings.append([bm.verts.new(to_blender(u, w, v)) for u, v in pts])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(4):
            j = (k + 1) % 4
            f = bm.faces.new((r0[k], r0[j], r1[j], r1[k]))
            f.material_index = 1 if k == 0 else 0
    for r in (rings[0], rings[-1][::-1]):
        bm.faces.new(r)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = add('blade', bm, 'paint')
    ob.data.materials.append(mats.get('gloss'))
    y = ue - S.L / 2 + 0.002
    pts = [Vector((w, y, 0.872 + S.GROUND)) for w in np.linspace(-0.87, 0.87, 41)]
    add('light_tail', sweep(pts, 0.004, 0.01), 'light_tail')
    for side in (1, -1):
        pts = [Vector((w * side, y + 0.001, 0.872 + S.GROUND)) for w in np.linspace(0.62, 0.86, 9)]
        add('lens', sweep(pts, 0.003, 0.012), 'lens')


def tail():
    blade()
    py = S.L / 2 - 0.08 + 0.004
    add('plate', box((0, py, 0.66 + S.GROUND), (0.305, 0.008, 0.152)), 'plate')
    cu = bpy.data.curves.new('rdstr', 'FONT')
    cu.body = 'RDSTR'
    cu.size = 0.095
    cu.extrude = 0.0015
    cu.align_x, cu.align_y = 'CENTER', 'CENTER'
    t = bpy.data.objects.new('rdstr', cu)
    bpy.context.scene.collection.objects.link(t)
    t.location = (0, py + 0.0055, 0.66 + S.GROUND)
    t.rotation_euler = (math.pi / 2, 0, math.pi)
    t.scale = (0.75, 1.0, 1.0)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(t.evaluated_get(dg))
    me.transform(t.matrix_world)
    bpy.data.objects.remove(t)
    me.materials.append(mats.get('black'))
    ob = bpy.data.objects.new('plate_text', me)
    bpy.context.scene.collection.objects.link(ob)
    for w in (0.86, -0.86):
        add('reflector', box((w * 0.97, S.L / 2 - 0.25, 0.6 + S.GROUND), (0.01, 0.07, 0.014)), 'reflector')
    for w in (0.79, -0.79):
        add('reflector', box((w, S.L / 2 + 0.002, 0.57 + S.GROUND), (0.17, 0.006, 0.012)), 'reflector')


def nozzles():
    shelf = [(-0.6, 0.44), (0.6, 0.44), (0.67, 0.565), (-0.67, 0.565)]
    ob = add('nozzle_shelf', prism([(-w, v + S.GROUND) for w, v in shelf], S.L / 2 - 0.07, S.L / 2 + 0.015), 'carbon')
    ob.rotation_euler = (0, 0, math.pi / 2)
    for v in (0.478, 0.522):
        add('louvre', box((0, S.L / 2 + 0.018, v + S.GROUND), (1.2, 0.008, 0.006)), 'black')
    lip = [(0.0, 0.048), (-0.072, 0.048), (-0.078, 0.046), (-0.08, 0.042), (-0.079, 0.038), (-0.074, 0.036), (-0.066, 0.036)]
    throat = [(-0.066, 0.036), (-0.035, 0.03), (-0.005, 0.022), (0.0, 0.0)]
    for w in S.NOZZLES:
        for name, prof, mat in (('nozzle', lip, 'lip'), ('nozzle_in', throat, 'throat')):
            ob = mesh_object(name, lathe(prof, 40), mat, None, True)
            ob.rotation_euler = (0, 0, -math.pi / 2)
            ob.location = (w, S.L / 2 - 0.045, 0.50 + S.GROUND)


def diffuser():
    lo, hi, hw = S.DIFFUSER
    u1 = S.L + 0.02
    add('diffuser', box((0, u1 - 0.06 - S.L / 2, 0.108 + S.GROUND), (2 * hw + 0.05, 0.12, 0.024)), 'black')
    for w in (-hw - 0.012, -hw / 2, 0.0, hw / 2, hw + 0.012):
        t = 0.012 if abs(w) > hw else 0.008
        add('strake', prism([(u - S.L / 2, v + S.GROUND) for u, v in ((4.08, 0.135), (u1, 0.096), (u1, hi + 0.005), (4.3, hi + 0.005))], w - t, w + t), 'carbon')


def wing():
    root = bpy.data.objects.new('wing', None)
    bpy.context.scene.collection.objects.link(root)
    root.location = to_blender(*S.WING_PIVOT)
    root.rotation_euler = (math.radians(S.WING_STOW), 0, 0)
    blade = [(-0.15, -0.014), (-0.142, -0.003), (-0.12, 0.0), (0.15, 0.0), (0.15, -0.008), (-0.11, -0.03), (-0.14, -0.025)]
    for name, outline, x0, x1, mat in (
        ('wing_blade', blade, -0.9, 0.9, 'paint'),
        ('wing_plate', [(-0.17, 0.006), (0.17, 0.006), (0.17, -0.07), (-0.17, -0.17)], 0.9, 0.912, 'gloss'),
        ('wing_plate', [(-0.17, 0.006), (0.17, 0.006), (0.17, -0.07), (-0.17, -0.17)], -0.912, -0.9, 'gloss'),
        ('wing_pylon', [(-0.05, -0.02), (0.06, -0.02), (0.035, -0.19), (-0.07, -0.19)], 0.42, 0.435, 'gloss'),
        ('wing_pylon', [(-0.05, -0.02), (0.06, -0.02), (0.035, -0.19), (-0.07, -0.19)], -0.435, -0.42, 'gloss'),
    ):
        mesh_object(name, prism(outline, x0, x1), mat, root, False)


def markers():
    for side in (1, -1):
        u0, v0 = 1.32, 0.668
        w0 = float(S.pchip(S.S_W, u0)) + 0.004
        add('marker', box((side * w0, u0 - S.L / 2, v0 + S.GROUND), (0.008, 0.07, 0.012)), 'amber')
        add('reflector', box((side * (w0 - 0.01), 1.21 - S.L / 2, 0.676 + S.GROUND), (0.008, 0.06, 0.012)), 'reflector')


def build():
    front_light()
    splitter()
    tail()
    nozzles()
    diffuser()
    wing()
    markers()

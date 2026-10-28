import bpy, bmesh, math
from mathutils import Vector
import mats


def mesh_object(name, bm, mat, parent, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mats.get(mat))
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    ob.parent = parent
    bpy.context.scene.collection.objects.link(ob)
    return ob


def lathe(profile, segs, a0=0.0, a1=2 * math.pi):
    bm = bmesh.new()
    full = abs(a1 - a0 - 2 * math.pi) < 1e-9
    n = segs if full else segs + 1
    rings = []
    for k in range(n):
        a = a0 + (a1 - a0) * k / segs
        ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((x, r * ca, r * sa)) for x, r in profile])
    for k in range(segs):
        r0, r1 = rings[k], rings[(k + 1) % n]
        for j in range(len(profile) - 1):
            bm.faces.new((r0[j], r0[j + 1], r1[j + 1], r1[j]))
    return bm


def tire_profile(r, w):
    h = w / 2
    tread = []
    for k in range(49):
        t = k / 48
        x = -h * 0.92 + 2 * h * 0.92 * t
        dip = 0.007 if any(abs(x - g * w) < 0.0055 for g in (-0.2, -0.04, 0.12, 0.27)) else 0.0
        tread.append((x, r - 0.006 * (2 * t - 1) ** 6 - dip))
    shoulder = [(h * 0.97, r - 0.012), (h * 1.0, r - 0.03), (h * 1.01, r - 0.05), (h * 0.99, r - 0.068), (h * 0.93, r - 0.078), (h * 0.86, r - 0.082)]
    return [(-x, y) for x, y in reversed(shoulder)] + tread + shoulder


def blade(top_bm, side_bm, side, x0, depth, quad):
    face = [Vector((x0, r * math.cos(t), r * math.sin(t))) for r, t in quad]
    lift = Vector((side * depth, 0, 0))
    order = (lambda q: q) if side > 0 else (lambda q: q[::-1])
    top_bm.faces.new(order([top_bm.verts.new(p + lift) for p in face]))
    for i in range(4):
        j = (i + 1) % 4
        q = [side_bm.verts.new(p) for p in (face[i], face[j], face[j] + lift, face[i] + lift)]
        side_bm.faces.new(order(q))


def lettering(name, r, h, side, root):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = 'P ZERO      TROFEO RS'
    cu.size = 0.024
    cu.extrude = 0.0007
    cu.resolution_u = 2
    cu.align_x, cu.align_y = 'CENTER', 'CENTER'
    t = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(t)
    me = bpy.data.meshes.new_from_object(t.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(t)
    R = r - 0.047
    bm = bmesh.new()
    for phase in (0.0, math.pi):
        part = bmesh.new()
        part.from_mesh(me)
        for v in part.verts:
            tx, ty, tz = v.co
            a = phase + side * tx / R
            v.co = Vector((side * (h * 1.01 + 0.0008 + tz), (R + ty) * math.sin(a), (R + ty) * math.cos(a)))
        if side < 0:
            bmesh.ops.reverse_faces(part, faces=part.faces)
        tmp = bpy.data.meshes.new('tmp')
        part.to_mesh(tmp)
        part.free()
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    bpy.data.meshes.remove(me)
    mesh_object(name, bm, 'tire_text', root, False)


def wheel(name, location, r, w, side, rim_frac=0.79):
    root = bpy.data.objects.new(name, None)
    root.location = location
    bpy.context.scene.collection.objects.link(root)
    h = w / 2
    rim_r = r * rim_frac

    mesh_object(name + '_tire', lathe(tire_profile(r, w), 128), 'tire', root)
    lettering(name + '_text', r, h, side, root)

    face_x = side * (h - 0.012)
    prof = [(side * (h - 0.06), 0.0)]
    for k in range(1, 13):
        t = k / 12
        rr = 0.06 + (rim_r - 0.07) * t
        prof.append((face_x - side * 0.035 * (1 - t) ** 1.5, rr))
    prof += [(face_x + side * 0.004, rim_r - 0.004), (face_x - side * 0.004, rim_r + 0.006), (side * (h - 0.05), rim_r + 0.006)]
    if side < 0:
        prof = prof[::-1]
    mesh_object(name + '_disc', lathe(prof, 128), 'rim', root)

    sp, edge, slot = bmesh.new(), bmesh.new(), bmesh.new()
    def polar(q):
        q = q if side > 0 else [(rr, math.pi - t) for rr, t in q][::-1]
        return q
    def spoke_pt(a, r, d):
        return (math.hypot(r, d), a + math.atan2(d, r))
    for k in range(6):
        a = 2 * math.pi * k / 6 + math.pi / 2
        for s in (-1, 1):
            quad = [spoke_pt(a, 0.07, s * 0.007), spoke_pt(a, rim_r - 0.006, s * 0.008), spoke_pt(a, rim_r - 0.006, s * 0.023), spoke_pt(a, 0.07, s * 0.04)]
            blade(sp, edge, side, face_x - side * 0.015, 0.03, polar(quad if s > 0 else quad[::-1]))
        gap = [spoke_pt(a, 0.09, -0.008), spoke_pt(a, rim_r - 0.012, -0.009), spoke_pt(a, rim_r - 0.012, 0.009), spoke_pt(a, 0.09, 0.008)]
        blade(slot, bmesh.new(), side, face_x - side * 0.004, 0.0, polar(gap))
    hub_x = face_x + side * 0.015
    hub = [(hub_x, 0.0), (hub_x, 0.088), (hub_x - side * 0.03, 0.095)]
    mesh_object(name + '_hub', lathe(hub if side > 0 else hub[::-1], 48), 'spoke', root)
    mesh_object(name + '_spokes', sp, 'spoke', root, smooth=False)
    mesh_object(name + '_spokeedge', edge, 'gunmetal', root, smooth=False)
    mesh_object(name + '_slot', slot, 'caliper', root, smooth=False)

    cap = [(hub_x + side * 0.006, 0.0), (hub_x + side * 0.006, 0.04), (hub_x + side * 0.002, 0.046), (hub_x - side * 0.002, 0.048)]
    if side < 0:
        cap = cap[::-1]
    mesh_object(name + '_cap', lathe(cap, 48), 'gunmetal', root)

    disc = [(side * (h * 0.15 - 0.014), 0.13), (side * (h * 0.15 - 0.014), 0.2), (side * (h * 0.15 + 0.014), 0.2), (side * (h * 0.15 + 0.014), 0.13)]
    if side < 0:
        disc = disc[::-1]
    mesh_object(name + '_brake', lathe(disc, 64), 'brake', root)

    cal = bmesh.new()
    bmesh.ops.create_cube(cal, size=1.0)
    for v in cal.verts:
        v.co = Vector((v.co.x * 0.07 + side * h * 0.15, v.co.y * 0.16, v.co.z * 0.06))
    ang = math.radians(-35)
    for v in cal.verts:
        y, z = v.co.y, v.co.z + 0.2
        v.co.y, v.co.z = y * math.cos(ang) - z * math.sin(ang), y * math.sin(ang) + z * math.cos(ang)
    mesh_object(name + '_caliper', cal, 'caliper', root, smooth=False)
    return root

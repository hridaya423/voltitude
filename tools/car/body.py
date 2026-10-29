import bpy, bmesh, math
import numpy as np
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt
from mathutils.kdtree import KDTree
import shape as S
import mats

LOFT = ['paint', 'black', 'glass', 'gloss', 'gap', 'carbon', 'trim']
M = {n: i for i, n in enumerate(LOFT)}
COLUMN = np.cumsum([0] + [s['n'] for s in S.STRIPS])


def to_blender(u, w, v):
    return Vector((w, u - S.L / 2, v + S.GROUND))


def uwv(co):
    return co.y + S.L / 2, abs(co.x), co.z - S.GROUND


def section_points(u):
    sec = S.section(u)
    pts, strip_of = [], []
    for k in range(len(sec) - 1):
        a, b = sec[k], sec[k + 1]
        cfg = S.STRIPS[k]
        chord = b - a
        n = np.array([chord[1], -chord[0]])
        ln = np.linalg.norm(n)
        n = n / ln if ln > 1e-9 else n
        if np.dot(n, (a + b) / 2 - np.array([0.0, 0.6])) < 0:
            n = -n
        for i in range(cfg['n']):
            t = i / cfg['n']
            if k == len(sec) - 2:
                p = np.array([a[0] * (1 - t), b[1] - (b[1] - a[1]) * (1 - t) ** 2])
            else:
                p = a + chord * t + n * cfg['bulge'] * 4 * t * (1 - t) * min(1.0, ln / 0.3)
            pts.append(p)
            strip_of.append(k)
    pts.append(sec[-1])
    return np.array(pts), strip_of


def nose_offset(u, w):
    if u >= S.NOSE_BOW:
        return 0.0
    k = min(w, S.NOSE_W) / S.NOSE_W
    return S.NOSE_BOW * k * k * (1 - u / S.NOSE_BOW)


def inside(p, poly):
    x, y = p
    c = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            c = not c
    return c


def cap(bm, loop, u_at, holes, mat_at):
    outer = [(v.co.x, v.co.z - S.GROUND) for v in loop]
    side = sorted((v, w) for w, v in outer if w > 0.3)
    def width(v0):
        return float(np.interp(v0, [v for v, w in side], [w for v, w in side]))
    polys = []
    for h in holes:
        hw = lambda v0: h.get('w') or width(v0) - h['inset']
        polys.append([(w, h['hi']) for w in np.linspace(hw(h['hi']), -hw(h['hi']), 25)] + [(w, h['lo']) for w in np.linspace(-hw(h['lo']), hw(h['lo']), 25)])
    vs = [v for w, v in outer]
    grid = []
    for v0 in np.arange(min(vs) + 0.015, max(vs), 0.035):
        for w0 in np.arange(-1.0, 1.01, 0.05):
            p = (float(w0), float(v0))
            if inside(p, outer) and not any(inside(p, q) for q in polys) and all(min(abs(v0 - h['lo']), abs(v0 - h['hi'])) > 0.012 for h in holes) and all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > 0.02 ** 2 for q in outer):
                grid.append(p)
    pts = outer + sum(polys, []) + grid
    starts = np.cumsum([len(outer)] + [len(q) for q in polys])
    edges = [(i, (i + 1) % len(outer)) for i in range(len(outer))]
    for k, q in enumerate(polys):
        edges += [(starts[k] + i, starts[k] + (i + 1) % len(q)) for i in range(len(q))]
    vo, eo, fo, ov, oe, of = delaunay_2d_cdt(pts, edges, [], 1, 1e-6)
    verts = []
    for i, co in enumerate(vo):
        src = [k for k in ov[i] if k < len(outer)]
        verts.append(loop[src[0]] if src else bm.verts.new(to_blender(u_at(abs(co.x)), co.x, co.y)))
    for f in fo:
        c = sum((vo[i] for i in f), Vector((0, 0))) / len(f)
        if not any(inside(c, q) for q in polys):
            bm.faces.new([verts[i] for i in f]).material_index = M[mat_at(c.y)]
    for k, (h, q) in enumerate(zip(holes, polys)):
        ring = [verts[[i for i in range(len(vo)) if starts[k] + j in ov[i]][0]] for j in range(len(q))]
        back = [bm.verts.new(to_blender(h['back'], v.co.x, h['ramp'] if 'ramp' in h and j > 24 else v.co.z - S.GROUND)) for j, v in enumerate(ring)]
        for j in range(len(q)):
            n = (j + 1) % len(q)
            wall = h.get('top', h['wall']) if j < 24 else h['wall']
            bm.faces.new((ring[j], ring[n], back[n], back[j])).material_index = M[wall]
        bm.faces.new(back).material_index = M[h['back_mat']]
    for e in {e for v in loop for e in v.link_edges if all(x in loop for x in e.verts)}:
        e.smooth = False


def loft():
    us = S.stations()
    rings, strips = [], None
    for u in us:
        pts, strips = section_points(u)
        rings.append([(u + nose_offset(u, w), w, v) for w, v in pts])
    m = len(rings[0])
    bm = bmesh.new()
    vert = {}
    for i, ring in enumerate(rings):
        for j, (u, w, v) in enumerate(ring):
            for side in (1, -1):
                if w < 1e-6 and side == -1:
                    vert[(i, j, -1)] = vert[(i, j, 1)]
                    continue
                vert[(i, j, side)] = bm.verts.new(to_blender(u, w * side, v))
    for i in range(len(rings) - 1):
        u = (us[i] + us[i + 1]) / 2
        for j in range(m - 1):
            mat = M[S.strip_material(strips[j], u)]
            for side in (1, -1):
                q = [vert[(i, j, side)], vert[(i + 1, j, side)], vert[(i + 1, j + 1, side)], vert[(i, j + 1, side)]]
                if side == -1:
                    q.reverse()
                q = list(dict.fromkeys(q))
                if len(q) < 3:
                    continue
                bm.faces.new(q).material_index = mat
    caps = []
    lo, hi = S.INTAKE
    cap(bm, [vert[(0, j, 1)] for j in range(m)] + [vert[(0, j, -1)] for j in range(m - 2, 0, -1)],
        lambda w: nose_offset(0.0, w), [dict(lo=lo, hi=hi, inset=0.035, back=S.INTAKE_DEPTH, wall='gap', back_mat='gap')], lambda v: 'trim')
    lo, hi = S.FASCIA
    cap(bm, [vert[(len(rings) - 1, j, 1)] for j in range(m)] + [vert[(len(rings) - 1, j, -1)] for j in range(m - 2, 0, -1)],
        lambda w: S.L, [dict(lo=lo, hi=hi, inset=0.04, back=S.L - 0.08, wall='black', top='paint', back_mat='paint'),
                        dict(lo=S.DIFFUSER[0], hi=S.DIFFUSER[1], w=S.DIFFUSER[2], back=S.L - 0.3, ramp=S.DIFFUSER[1] - 0.02, wall='gap', back_mat='gap')],
        lambda v: 'gap' if v > hi else 'black')
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    def feature(k, u0, u1):
        out = []
        for i in range(len(us) - 1):
            if u0 <= (us[i] + us[i + 1]) / 2 <= u1:
                for s in (1, -1):
                    a, b = vert[(i, COLUMN[k], s)], vert[(i + 1, COLUMN[k], s)]
                    if a.is_valid and b.is_valid:
                        out.append(bm.edges.get((a, b)))
        return out
    return bm, feature, caps


def groove(bm, edges, width, depth, mat):
    edges = [e for e in set(edges) if e is not None and e.is_valid]
    if not edges:
        return
    verts = list({v for e in edges for v in e.verts})
    kd = KDTree(len(verts))
    for i, v in enumerate(verts):
        kd.insert(v.co, i)
    kd.balance()
    normals = [v.normal.copy() for v in verts]
    res = bmesh.ops.bevel(bm, geom=edges + verts, offset=width, offset_type='OFFSET', segments=2, profile=0.5, affect='EDGES', clamp_overlap=True)
    for f in res['faces']:
        f.material_index = mat
    for v in res['verts']:
        co, i, d = kd.find(v.co)
        if d < width * 0.35:
            v.co -= normals[i] * min(depth, 0.001)
    bm.normal_update()


def cut(bm, co, no, region, width=0.0022, depth=0.006, mat=M['gap'], faces=None):
    geom = faces if faces is not None else bm.faces[:]
    geom = list(geom) + list({e for f in geom for e in f.edges}) + list({v for f in geom for v in f.verts})
    res = bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-6, plane_co=Vector(co), plane_no=Vector(no).normalized())
    edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge) and region(*uwv((e.verts[0].co + e.verts[1].co) / 2), e)]
    if width:
        groove(bm, edges, width, depth, mat)
    return edges


def plane3(a, b, c):
    a, b, c = (to_blender(*p) for p in (a, b, c))
    return a, (b - a).cross(c - a)


def mat_seams(bm, a, b):
    out = []
    for e in bm.edges:
        if len(e.link_faces) == 2:
            m0, m1 = e.link_faces[0].material_index, e.link_faces[1].material_index
            if {m0, m1} == {a, b}:
                out.append(e)
    return out


def is_mat(e, m):
    return any(f.material_index == m for f in e.link_faces)


def mark_sharp(feature):
    for e in feature(2, 0.0, S.L) + feature(3, S.PILLAR, S.L) + feature(4, 0.0, S.PILLAR) + feature(5, S.NOSE_BOW, S.GLASS_START):
        if e is not None:
            e.smooth = False


def smooth_object(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.shade_auto_smooth(angle=math.radians(30))
    ob.select_set(False)
    return ob


def transfer_normals(ob, ref):
    me = ob.data
    wall = set()
    for p in me.polygons:
        p.use_smooth = True
        c = p.center
        for u, r in ((S.FRONT_HUB, 0.347), (S.REAR_HUB, 0.364)):
            if abs(c.x) > 0.45 and abs(math.hypot(c.y - (u - S.L / 2), c.z - (S.GROUND + r)) - (r + 0.035)) < 0.004:
                wall.update(p.vertices)
    bm = bmesh.new()
    bm.from_mesh(me)
    for e in bm.edges:
        if len(e.link_faces) != 2 or e.calc_face_angle(0) > math.radians(30):
            e.smooth = False
    bm.to_mesh(me)
    bm.free()
    for e in me.edges:
        if e.use_edge_sharp:
            wall.update(e.vertices)
    edge_faces = {}
    for p in me.polygons:
        for k in p.edge_keys:
            edge_faces[k] = edge_faces.get(k, 0) + 1
    for k, n in edge_faces.items():
        if n == 1:
            wall.update(k)
    g = ob.vertex_groups.new(name='xfer')
    g.add([i for i in range(len(me.vertices)) if i not in wall], 1.0, 'REPLACE')
    mod = ob.modifiers.new('normals', 'DATA_TRANSFER')
    mod.object = ref
    mod.use_loop_data = True
    mod.data_types_loops = {'CUSTOM_NORMAL'}
    mod.loop_mapping = 'POLYINTERP_NEAREST'
    mod.use_max_distance = True
    mod.max_distance = 0.003
    mod.vertex_group = 'xfer'
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)


def panel_lines(bm, feature, caps):
    groove(bm, mat_seams(bm, M['paint'], M['glass']), 0.004, 0.008, M['gap'])
    groove(bm, feature(5, S.NOSE_BOW + 0.03, S.GLASS_START - 0.01), 0.0022, 0.006, M['gap'])
    groove(bm, feature(4, S.NOSE_BOW + 0.02, S.T1[0] - 0.01), 0.0022, 0.006, M['gap'])
    groove(bm, feature(5, S.PILLAR + 0.02, 1.9), 0.004, 0.001, M['gap'])

    for side in (1, -1):
        for pts in (
            ((1.42, 0.95, 0.684), (1.516, 0.955, 0.253), (1.576, 0.898, 0.805)),
            ((2.528, 0.955, 0.297), (2.686, 0.95, 0.85), (2.744, 0.85, 0.91)),
        ):
            co, no = plane3(*[(u, w * side, v) for u, w, v in pts])
            cut(bm, co, no, lambda u, w, v, e: w > 0.6 and 0.2 < v < 0.95 and not is_mat(e, M['glass']) and e.verts[0].co.x * side > 0)
        co, no = plane3((S.T1[0], S.T1[1] * side, S.T1[2]), (S.T2[0], S.T2[1] * side, S.T2[2]), (S.T1[0], S.T1[1] * side, S.T1[2] + 0.3))
        cut(bm, co, no, lambda u, w, v, e: u < 0.45 and S.T2[1] - 0.01 < w < S.T1[1] + 0.01 and v > 0.5 and e.verts[0].co.x * side > 0)
        co, no = plane3((0.50, 0.0, 0.6), (0.545, 0.52 * side, 0.65), (0.50, 0.0, 0.8))
        cut(bm, co, no, lambda u, w, v, e: u < 0.7 and v > 0.5 and w < float(S.pchip(S.P5_W, u)) - 0.01 and e.verts[0].co.x * side >= -1e-6)
        for a, b in S.GLASS_SEAMS:
            co, no = plane3((a[0], 0.9 * side, a[1]), (b[0], 0.9 * side, b[1]), (a[0], 0.0, a[1]))
            cut(bm, co, no, lambda u, w, v, e: is_mat(e, M['glass']) and w > 0.3 and v > 0.75 and e.verts[0].co.x * side > 0, width=0.007, depth=0.001)
        co, no = plane3((1.97, 0.0, 1.0), (2.0, 0.6 * side, 1.0), (1.97, 0.0, 1.3))
        cut(bm, co, no, lambda u, w, v, e: is_mat(e, M['glass']) and v > 1.0 and w < 0.62, width=0.0025, depth=0.002)
        co, no = plane3((1.97, 0.17 * side, 1.0), (2.85, 0.12 * side, 1.0), (1.97, 0.17 * side, 1.3))
        cut(bm, co, no, lambda u, w, v, e: is_mat(e, M['glass']) and 1.98 < u < 2.84, width=0.0025, depth=0.002)
    for side in (1, -1):
        co, no = plane3((4.17, 1.0 * side, 0.99), (4.35, 1.0 * side, 0.69), (4.17, 0.5 * side, 0.99))
        cut(bm, co, no, lambda u, w, v, e: w > 0.7 and 0.6 < v < 1.0 and 4.1 < u < 4.42 and e.verts[0].co.x * side > 0)
    co, no = plane3((S.DECK, 0.0, 0.9), (S.DECK, 0.6, 0.9), (S.DECK, 0.0, 1.3))
    cut(bm, co, no, lambda u, w, v, e: v > 0.86 and w < 0.93 and not is_mat(e, M['glass']))
    co, no = plane3((2.85, 0.0, 1.0), (2.85, 0.6, 1.0), (2.85, 0.0, 1.3))
    cut(bm, co, no, lambda u, w, v, e: is_mat(e, M['glass']) and v > 1.0 and w < 0.56, width=0.0025, depth=0.002)



def arch_cut(body):
    for name, u, r in (('arch_f', S.FRONT_HUB, 0.347), ('arch_r', S.REAR_HUB, 0.364)):
        parts = []
        for x in (0.95, -0.95):
            bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=r + 0.035, depth=0.7, rotation=(0, math.pi / 2, 0), location=(x, u - S.L / 2, S.GROUND + r))
            parts.append(bpy.context.object)
        for p in parts:
            p.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        c = parts[0]
        mod = body.modifiers.new(name, 'BOOLEAN')
        mod.operation, mod.solver, mod.object = 'DIFFERENCE', 'EXACT', c
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(c)


def liner(name, u, r):
    bm = bmesh.new()
    R = r + 0.035
    segs, a0, a1 = 64, math.radians(-25), math.radians(205)
    for side in (1, -1):
        ring = []
        for k in range(segs + 1):
            a = a0 + (a1 - a0) * k / segs
            y, z = -math.cos(a) * R, math.sin(a) * R
            ring.append((bm.verts.new((side * 0.5, u - S.L / 2 + y, S.GROUND + r + z)), bm.verts.new((side * 0.93, u - S.L / 2 + y, S.GROUND + r + z))))
        for (a, b), (c, d) in zip(ring, ring[1:]):
            bm.faces.new((a, b, d, c) if side > 0 else (c, d, b, a))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mats.get('liner'))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def split_glass(body):
    bm = bmesh.new()
    bm.from_mesh(body.data)
    gi = M['glass']
    glass = bmesh.new()
    vmap = {}
    for f in [f for f in bm.faces if f.material_index == gi]:
        vs = []
        for v in f.verts:
            if v not in vmap:
                vmap[v] = glass.verts.new(v.co)
            vs.append(vmap[v])
        glass.faces.new(vs)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == gi], context='FACES_ONLY')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(body.data)
    bm.free()
    glass.normal_update()
    flip = [f for f in glass.faces if f.normal.dot(f.calc_center_median() - Vector((0, f.calc_center_median().y, S.GROUND + 0.5))) < 0]
    bmesh.ops.reverse_faces(glass, faces=flip)
    print('GLASS flipped', len(flip), 'of', len(glass.faces))
    me = bpy.data.meshes.new('glass')
    glass.to_mesh(me)
    glass.free()
    me.materials.append(mats.get('glass'))
    ob = bpy.data.objects.new('glass', me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def build():
    bm, feature, caps = loft()
    mark_sharp(feature)
    ref = smooth_object('body_ref', bm.copy())
    panel_lines(bm, feature, caps)
    me = bpy.data.meshes.new('body')
    bm.to_mesh(me)
    bm.free()
    for n in LOFT:
        me.materials.append(mats.get(n))
    body = bpy.data.objects.new('body', me)
    bpy.context.scene.collection.objects.link(body)
    arch_cut(body)
    glass = split_glass(body)
    for ob in (body, glass):
        transfer_normals(ob, ref)
    bpy.data.objects.remove(ref)
    liners = [liner('liner_f', S.FRONT_HUB, 0.347), liner('liner_r', S.REAR_HUB, 0.364)]
    return body, glass, liners

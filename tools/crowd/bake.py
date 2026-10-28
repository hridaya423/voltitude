import bpy, os, math, json
import numpy as np
from mathutils import Vector, Matrix, Quaternion

SRC = os.environ['CROWDSRC']
OUT = os.environ.get('CROWDOUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'crowd'))
PREVIEW = os.environ.get('CROWDPREVIEW')
UBC = os.path.join(SRC, 'ubc', 'x', 'Universal Base Characters[Standard]')
BODY = os.path.join(UBC, 'Base Characters', 'Godot - UE')
HAIR = os.path.join(UBC, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)')
UAL1 = os.path.join(SRC, 'ual', 'x', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb')
UAL2 = os.path.join(SRC, 'ual2', 'ex', 'Universal Animation Library 2[Standard]', 'Unreal-Godot', 'UAL2_Standard.glb')

FRAMES = 12
ANIMS = [('idle', 2.0), ('fold', 2.0), ('cheer', 0.9), ('clap', 0.8), ('phone', 3.0), ('flag', 1.6), ('gasp', 1.2)]
KIND = dict(skin=0, torso=1, arm=2, leg=3, foot=4, hair=5, phone=6, pole=7, cloth=8)
CHARACTERS = [
    dict(name='male_a', body='Superhero_Male_FullBody', hair='Hair_Beard', tris=1250, hair_tris=140, sex=0, scale=(0.9, 1.0, 0.92)),
    dict(name='male_b', body='Superhero_Male_FullBody', hair='Hair_SimpleParted', tris=1250, hair_tris=160, sex=0, scale=(0.86, 1.0, 0.9)),
    dict(name='female_a', body='Superhero_Female_FullBody', hair='Hair_Long', tris=1250, hair_tris=260, sex=1, scale=(0.92, 1.0, 0.94)),
    dict(name='female_b', body='Superhero_Female_FullBody', hair='Hair_Buns', tris=1250, hair_tris=240, sex=1, scale=(0.92, 1.0, 0.94)),
]


def objects_of(t):
    return [o for o in bpy.data.objects if o.type == t]


def import_gltf(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def select_only(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def decimate(o, tris):
    select_only(o)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.quads_convert_to_tris()
    bpy.ops.object.mode_set(mode='OBJECT')
    n = len(o.data.polygons)
    mod = o.modifiers.new('dec', 'DECIMATE')
    mod.ratio = min(1.0, tris / n)
    while o.modifiers[0] != mod:
        bpy.ops.object.modifier_move_up(modifier=mod.name)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def build_character(c, arm_ual):
    objs = import_gltf(os.path.join(BODY, c['body'] + '.gltf'))
    arm = [o for o in objs if o.type == 'ARMATURE'][0]
    body = [o for o in objs if o.type == 'MESH' and o.name.lower().startswith('superhero')][0]
    for o in objs:
        if o.type == 'MESH' and o is not body:
            bpy.data.objects.remove(o)
        elif o.type not in ('MESH', 'ARMATURE'):
            bpy.data.objects.remove(o)
    hobjs = import_gltf(os.path.join(HAIR, c['hair'] + '.gltf'))
    hair = [o for o in hobjs if o.type == 'MESH' and o.name.startswith('Hair')][0]
    for o in hobjs:
        if o is not hair:
            bpy.data.objects.remove(o)
    hair.parent = arm
    for m in hair.modifiers:
        if m.type == 'ARMATURE':
            m.object = arm
    body.name = c['name'] + '_body'
    hair.name = c['name'] + '_hair'
    decimate(body, c['tris'])
    decimate(hair, c['hair_tris'])
    return arm, body, hair


def add_part(arm, kind, name, verts, faces, bone='hand_r'):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.parent = arm
    vg = o.vertex_groups.new(name=bone)
    vg.add(list(range(len(verts))), 1.0, 'REPLACE')
    mod = o.modifiers.new('arm', 'ARMATURE')
    mod.object = arm
    o['kind'] = KIND[kind]
    return o


def attach_extras(arm, name):
    hand = arm.data.bones['hand_r'].head_local
    c = Vector((hand.x - 0.02, hand.y - 0.05, hand.z))
    w, h, d = 0.04, 0.085, 0.006
    pv = [c + Vector((sx * d, sy * w, sz * h)) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    box = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]
    phone = add_part(arm, 'phone', name + '_phone', pv, box)
    x0, x1 = hand.x - 0.04, hand.x - 1.4
    pole_v = [(x, hand.y + sy * 0.012, hand.z + sz * 0.012) for sy in (-1, 1) for sz in (-1, 1) for x in (x0, x1)]
    pole = add_part(arm, 'pole', name + '_pole', pole_v, [[0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5], [0, 2, 3, 1], [4, 5, 7, 6]])
    cols, rows = 7, 4
    cx0, cx1 = x1 + 0.02, x1 + 0.52
    cv = [(cx0 + (cx1 - cx0) * j / rows, hand.y, hand.z - 0.8 * i / cols) for j in range(rows + 1) for i in range(cols + 1)]
    cf = []
    for j in range(rows):
        for i in range(cols):
            a = j * (cols + 1) + i
            cf.append([a, a + 1, a + cols + 2, a + cols + 1])
            cf.append([a, a + cols + 1, a + cols + 2, a + 1])
    cloth = add_part(arm, 'cloth', name + '_cloth', cv, cf)
    return phone, pole, cloth, hand.x - 0.04


def join(parts):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def vertex_kinds(o, hand_x):
    arm_names = ('upperarm', 'lowerarm')
    skin_names = ('hand', 'thumb', 'index', 'middle', 'ring', 'pinky', 'Head', 'neck')
    names = [g.name for g in o.vertex_groups]
    kinds, ts = [], []
    for v in o.data.vertices:
        best = max(v.groups, key=lambda g: g.weight).group if v.groups else None
        n = names[best] if best is not None else 'spine_01'
        x, z = abs(v.co.x), v.co.z
        if any(n.startswith(s) for s in skin_names):
            k, t = KIND['skin'], 0.0
        elif any(n.startswith(s) for s in arm_names):
            k, t = KIND['arm'], min(1.0, max(0.0, (x - 0.2) / 0.52))
        elif n.startswith('clavicle'):
            k, t = KIND['torso'], 0.0
        elif n.startswith('thigh') or n.startswith('calf') or n.startswith('pelvis'):
            k, t = KIND['leg'], min(1.0, max(0.0, (0.98 - z) / 0.86))
        elif n.startswith('foot') or n.startswith('ball'):
            k, t = KIND['foot'], 0.0
        else:
            k, t = KIND['torso'], 0.0
        kinds.append(k)
        ts.append(t)
    return kinds, ts


def capture(arm):
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy(), pb.scale.copy()) for pb in arm.pose.bones}


def restore(arm, snap):
    for pb in arm.pose.bones:
        pb.location, pb.rotation_quaternion, pb.scale = [v.copy() for v in snap[pb.name]]
    bpy.context.view_layer.update()


def use_action(arm, act):
    ad = arm.animation_data_create()
    ad.action = act
    if act is not None and hasattr(ad, 'action_slot') and len(act.slots):
        ad.action_slot = act.slots[0]


def set_matrix(pb, M):
    pb.matrix = M
    bpy.context.view_layer.update()


def aim(arm, name, d):
    pb = arm.pose.bones[name]
    M = pb.matrix.copy()
    cur = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    R = cur.rotation_difference(Vector(d).normalized()).to_matrix()
    set_matrix(pb, Matrix.Translation(M.translation) @ (R @ M.to_3x3()).to_4x4())


def rot_about(arm, name, axis, angle):
    pb = arm.pose.bones[name]
    M = pb.matrix.copy()
    p = M.translation.copy()
    R = Matrix.Rotation(angle, 4, axis)
    set_matrix(pb, Matrix.Translation(p) @ R @ Matrix.Translation(-p) @ M)


def lift(arm, h):
    pb = arm.pose.bones['root']
    set_matrix(pb, Matrix.Translation((0, 0, h)) @ pb.matrix)


def limb(arm, side, up, low):
    s = 'l' if side > 0 else 'r'
    aim(arm, 'upperarm_' + s, up)
    aim(arm, 'lowerarm_' + s, low)
    aim(arm, 'hand_' + s, low)


def pose_procedural(arm, base, anim, t):
    restore(arm, base)
    ph = 2 * math.pi * t
    if anim == 'cheer':
        lift(arm, 0.075 * (1 - math.cos(2 * ph)) * 0.5)
        for side in (1, -1):
            a = math.radians(22 + 22 * math.sin(ph + (0 if side > 0 else 2.2)))
            limb(arm, side, (side * math.sin(a), -0.12, math.cos(a)), (side * math.sin(a + 0.3), -0.12, math.cos(a + 0.3)))
    elif anim == 'clap':
        d = 0.5 + 0.5 * math.cos(2 * ph)
        for side in (1, -1):
            limb(arm, side, (-side * 0.1, -0.25, -0.96), (-side * (0.72 - 0.5 * d), -0.6, 0.35 + 0.1 * d))
    elif anim == 'gasp':
        k = 0.5 - 0.5 * math.cos(ph)
        rot_about(arm, 'spine_02', 'X', -math.radians(10) * k)
        for side in (1, -1):
            limb(arm, side, (side * (0.1 + 0.6 * k), -0.2 - 0.3 * k, -0.9 + 1.1 * k), (-side * 0.6 * k, -0.1 - 0.2 * k, 0.1 + 0.65 * k))
    elif anim == 'phone':
        sway = 0.04 * math.sin(ph)
        limb(arm, -1, (-0.3, -0.6 + sway, -0.2), (0.4 + sway, -0.4, 0.8))
    elif anim == 'flag':
        sw = math.sin(ph)
        limb(arm, -1, (-0.55 - 0.15 * sw, -0.05, 0.85), (-(0.25 + 0.4 * sw), -0.05, 0.95))
        a = math.radians(20 + 20 * math.sin(ph + 1.5))
        limb(arm, 1, (math.sin(a), -0.12, math.cos(a)), (math.sin(a + 0.3), -0.12, math.cos(a + 0.3)))
    bpy.context.view_layer.update()


MOCAP = {'idle': 'Idle_Loop', 'fold': 'Idle_FoldArms_Loop'}
PART_VERTS = {'phone': 8, 'pole': 8, 'cloth': 40}
COLS = 7


def load_actions():
    for p in (UAL1, UAL2):
        for o in import_gltf(p):
            bpy.data.objects.remove(o)
    for a in bpy.data.actions:
        a.use_fake_user = True


def sample(arm, base, anim, t):
    if anim in MOCAP:
        act = bpy.data.actions[MOCAP[anim]]
        use_action(arm, act)
        a, b = act.frame_range
        bpy.context.scene.frame_set(int(a + (b - a) * t))
        bpy.context.view_layer.update()
    else:
        use_action(arm, None)
        pose_procedural(arm, base, anim, t)


def evaluated(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    n = len(me.vertices)
    co = np.empty(n * 3, np.float32)
    nr = np.empty(n * 3, np.float32)
    me.vertices.foreach_get('co', co)
    me.vertex_normals.foreach_get('vector', nr)
    ev.to_mesh_clear()
    return co.reshape(-1, 3), nr.reshape(-1, 3)


def shape_extras(co, anim, t, ranges):
    p0, p1 = ranges['phone']
    q0, q1 = ranges['pole']
    c0, c1 = ranges['cloth']
    if anim != 'phone':
        co[p0:p1] = co[p0:p1].mean(0)
    if anim != 'flag':
        co[q0:c1] = co[q0]
    else:
        idx = np.arange(c1 - c0)
        i = (idx % (COLS + 1)) / COLS
        co[c0:c1, 1] += 0.10 * i * np.sin(2 * math.pi * (1.5 * i - t)) + 0.04 * i * np.sin(2 * math.pi * (3.0 * i + t))


def ensure_preview_scene():
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y = 240, 320
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'SINGLE'
    sc.display.shading.single_color = (0.8, 0.6, 0.5)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 3.4
    bpy.context.collection.objects.link(cam)
    sc.camera = cam
    return cam


def render_preview(cam, name):
    sc = bpy.context.scene
    for view, loc, rot in (('f', (0, -6, 1.3), (math.pi / 2, 0, 0)), ('s', (6, 0, 1.3), (math.pi / 2, 0, math.pi / 2))):
        cam.location, cam.rotation_euler = loc, rot
        sc.render.filepath = os.path.join(PREVIEW, f'{name}_{view}.png')
        bpy.ops.render.render(write_still=True)


SKINS = ['T_Superhero_Male_Ligh.png', 'T_Superhero_Female_Light_BaseColor.png']


def skin_atlas():
    size = 512
    buf = np.zeros((size * 2, size, 4), np.float32)
    for row, n in enumerate(SKINS):
        im = bpy.data.images.load(os.path.join(UBC, 'Base Characters', 'Textures', n))
        im.scale(size, size)
        buf[size * (1 - row):size * (2 - row)] = np.array(im.pixels[:], np.float32).reshape(size, size, 4)
    atlas = bpy.data.images.new('skin', size, size * 2, alpha=False)
    atlas.colorspace_settings.name = 'sRGB'
    atlas.pixels = buf.ravel()
    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.quality = 88
    atlas.save_render(os.path.join(OUT, 'skin.webp'))


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    load_actions()
    built = []
    for c in CHARACTERS:
        arm, body, hair = build_character(c, None)
        phone, pole, cloth, hand_x = attach_extras(arm, c['name'])
        nb, nh = len(body.data.vertices), len(hair.data.vertices)
        obj = join([body, hair, phone, pole, cloth])
        obj.name = c['name']
        ranges, at = {}, nb
        ranges['hair'] = (at, at + nh)
        at += nh
        for k in ('phone', 'pole', 'cloth'):
            ranges[k] = (at, at + PART_VERTS[k])
            at += PART_VERTS[k]
        built.append((c, arm, obj, ranges, nb))
    cam = ensure_preview_scene() if PREVIEW else None
    meta = {'frames': FRAMES, 'anims': [{'name': n, 'dur': d} for n, d in ANIMS], 'chars': []}
    blobs, pos_rows, nrm_rows = bytearray(), [], []
    for c, arm, obj, ranges, nb in built:
        for _, a2, o2, *_ in built:
            on = o2 is not obj
            o2.hide_render = o2.hide_viewport = a2.hide_viewport = a2.hide_render = on
        use_action(arm, bpy.data.actions['Idle_Loop'])
        bpy.context.scene.frame_set(int(bpy.data.actions['Idle_Loop'].frame_range[0]))
        base = capture(arm)
        kinds, ts = vertex_kinds(obj, 0)
        for k, v in (('hair', 'hair'), ('phone', 'phone'), ('pole', 'pole'), ('cloth', 'cloth')):
            a, b = ranges[k]
            for i in range(a, b):
                kinds[i], ts[i] = KIND[v], 0.0
        c0, c1 = ranges['cloth']
        for i in range(c0, c1):
            ts[i] = ((i - c0) // (COLS + 1)) / 4
        me = obj.data
        uvl = me.uv_layers.active.data
        keys, vidx, uvs, tri = {}, [], [], []
        for p in me.polygons:
            for li in p.loop_indices:
                v = me.loops[li].vertex_index
                u = uvl[li].uv
                k = (v, round(u.x, 4), round(u.y, 4))
                if k not in keys:
                    keys[k] = len(vidx)
                    vidx.append(v)
                    uvs.append((u.x, u.y * 0.5 + (0.5 if c['sex'] == 0 else 0.0)))
                tri.append(keys[k])
        vidx = np.array(vidx)
        V = len(vidx)
        pos = np.zeros((len(ANIMS) * FRAMES, V, 4), np.float16)
        nrm = np.zeros((len(ANIMS) * FRAMES, V, 4), np.uint8)
        for ai, (anim, _) in enumerate(ANIMS):
            for f in range(FRAMES):
                t = f / FRAMES
                sample(arm, base, anim, t)
                co, nr = evaluated(obj)
                shape_extras(co, anim, t, ranges)
                r = ai * FRAMES + f
                th = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)
                nt = np.stack([nr[:, 0], nr[:, 2], -nr[:, 1]], 1)
                pos[r, :, :3] = th[vidx]
                nrm[r, :, :3] = np.clip((nt[vidx] * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
                nrm[r, :, 3] = 255
                if cam and f % (FRAMES // 3) == 0 and c['name'] in PREVIEW_CHARS:
                    render_preview(cam, f'{c["name"]}_{anim}_{f}')
        def put(arr):
            off = len(blobs)
            blobs.extend(arr.tobytes())
            while len(blobs) % 4:
                blobs.append(0)
            return off
        attr = np.zeros((V, 4), np.uint8)
        attr[:, 0] = np.array(kinds)[vidx]
        attr[:, 1] = (np.array(ts)[vidx] * 255).astype(np.uint8)
        meta['chars'].append({
            'name': c['name'], 'sex': c['sex'], 'scale': c['scale'], 'verts': V, 'tris': len(tri) // 3,
            'index': put(np.array(tri, np.uint16)), 'uv': put(np.array(uvs, np.float32)), 'attr': put(attr),
            'rowBase': len(pos_rows) * len(ANIMS) * FRAMES,
        })
        pos_rows.append(pos)
        nrm_rows.append(nrm)
    W = max(p.shape[1] for p in pos_rows)
    def tex(rows, dtype):
        out = np.zeros((sum(r.shape[0] for r in rows), W, 4), dtype)
        y = 0
        for r in rows:
            out[y:y + r.shape[0], :r.shape[1]] = r
            y += r.shape[0]
        return out
    P, N = tex(pos_rows, np.float16), tex(nrm_rows, np.uint8)
    meta['vat'] = {'width': W, 'height': P.shape[0]}
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, 'crowd.bin'), 'wb').write(blobs)
    open(os.path.join(OUT, 'vat_pos.bin'), 'wb').write(P.tobytes())
    open(os.path.join(OUT, 'vat_nrm.bin'), 'wb').write(N.tobytes())
    json.dump(meta, open(os.path.join(OUT, 'crowd.json'), 'w'), separators=(',', ':'))
    skin_atlas()
    print('BAKED', [(m['name'], m['verts'], m['tris']) for m in meta['chars']], W, P.shape[0])


PREVIEW_CHARS = os.environ.get('CROWDCHARS', 'male_a,female_a').split(',')
main()

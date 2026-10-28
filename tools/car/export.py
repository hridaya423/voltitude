import bpy, sys

args = sys.argv[sys.argv.index('--') + 1:]
out, lod = args[0], float(args[1]) if len(args) > 1 else 1.0
WHEELS = ('wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr')


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    objs[0].name = name
    objs[0].data.name = name
    return objs[0]


def apply_transforms(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def decimate(o, ratio):
    if ratio >= 1:
        return
    m = o.modifiers.new('dec', 'DECIMATE')
    m.ratio = ratio
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=m.name)


loose = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent is None]
apply_transforms(loose)
chassis = join(loose, 'chassis')
decimate(chassis, lod)
for w in WHEELS:
    root = bpy.data.objects[w]
    kids = [o for o in root.children if o.type == 'MESH']
    static = [o for o in kids if o.name.endswith('_caliper')]
    spin = [o for o in kids if o not in static]
    s = join(spin, w + '_spin')
    decimate(s, lod)
    if static:
        join(static, w + '_caliper')

wing = bpy.data.objects.get('wing')
if wing:
    join([o for o in wing.children if o.type == 'MESH'], 'wing_body')

bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', export_yup=True, export_apply=True,
    export_texcoords=False, export_normals=True, export_materials='EXPORT',
    export_lights=False, export_cameras=False, export_extras=False,
)
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print('EXPORTED', out, 'tris', tris)

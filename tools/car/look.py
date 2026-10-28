import bpy, sys, json, math
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import shape as S

args = sys.argv[sys.argv.index('--') + 1:]
spec = json.load(open(args[0]))
out = args[1]
scale = float(args[2]) if len(args) > 2 else 0.5
W, H = spec['size']

scene = bpy.context.scene
wing = bpy.data.objects.get('wing')
if wing and not spec.get('wing'):
    for o in wing.children:
        o.hide_render = True
if wing and spec.get('wing'):
    k = spec['wing']
    wing.location.z += S.WING_DEPLOY[0] * k
    wing.rotation_euler.x = math.radians(S.WING_STOW + (S.WING_DEPLOY[1] - S.WING_STOW) * k)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = spec['location']
cam.rotation_euler = [math.radians(a) for a in spec['rotation']]
cam.data.lens = spec['lens']
cam.data.sensor_width = 36
cam.data.sensor_fit = 'HORIZONTAL'
cam.data.clip_end = 500
if 'ortho' in spec:
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = spec['ortho']

L = spec.get('lights', {})
world = bpy.data.worlds.new('studio')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.03, 0.034, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.6))
floor = bpy.context.object
fm = bpy.data.materials.new('floor')
fm.use_nodes = True
fp = fm.node_tree.nodes['Principled BSDF']
fp.inputs['Base Color'].default_value = (0.012, 0.012, 0.013, 1)
fp.inputs['Roughness'].default_value = L.get('floor_rough', 0.6)
fp.inputs['Specular IOR Level'].default_value = L.get('floor_spec', 0.1)
floor.data.materials.append(fm)

bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 14, 6), rotation=(math.radians(90), 0, 0))
wall = bpy.context.object
wall.scale = (60, 14, 1)
wm = bpy.data.materials.new('wall')
wm.use_nodes = True
wp = wm.node_tree.nodes['Principled BSDF']
wp.inputs['Base Color'].default_value = (0.0, 0.0, 0.0, 1)
wp.inputs['Emission Color'].default_value = (1, 1, 1.08, 1)
wp.inputs['Emission Strength'].default_value = L.get('wall', 0.016)
wall.data.materials.append(wm)


def light(name, kind, loc, rot, power, size=(1, 1), spot=None):
    l = bpy.data.lights.new(name, kind)
    l.energy = power
    if kind == 'AREA':
        l.shape = 'RECTANGLE'
        l.size, l.size_y = size
    if kind == 'SPOT':
        l.spot_size, l.spot_blend = math.radians(spot[0]), spot[1]
        l.shadow_soft_size = 0.3
    o = bpy.data.objects.new(name, l)
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    scene.collection.objects.link(o)


light('top', 'AREA', (0, L.get('top_y', -2.5), 4.2), (L.get('top_tilt', 0), 0, 0), L.get('top', 500), (3.0, 7.5))
light('pool', 'SPOT', (0.8, -3.2, 6.0), (0, 0, 0), L.get('pool', 2000), spot=(30, 0.7))
light('front', 'AREA', (4.5, -7.5, 1.0), (82, 0, 32), L.get('front', 280), (4.0, 1.5))

scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 64
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = int(scale * 100)
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('RENDERED', out)

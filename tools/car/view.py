import bpy, sys, json, math
from pathlib import Path

args = sys.argv[sys.argv.index('--') + 1:]
cam_path, out = args[0], args[1]
spec = json.load(open(cam_path))
W, H = spec['size']

scene = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = spec['location']
cam.rotation_euler = [math.radians(a) for a in spec['rotation']]
cam.data.lens = spec['lens']
if 'ortho' in spec:
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = spec['ortho']
cam.data.sensor_width = 36
cam.data.sensor_fit = 'HORIZONTAL'
cam.data.clip_end = 500

scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading
sh.light = 'STUDIO'
sh.color_type = 'MATERIAL'
sh.show_cavity = True
sh.cavity_type = 'BOTH'
sh.show_object_outline = False
scene.display.render_aa = '8'
scene.view_settings.view_transform = 'Standard'
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('RENDERED', out)

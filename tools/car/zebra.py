import bpy, sys, json, math

args = sys.argv[sys.argv.index('--') + 1:]
spec = json.load(open(args[0]))
W, H = spec['size']
scene = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = spec['location']
cam.rotation_euler = [math.radians(a) for a in spec['rotation']]
cam.data.lens = spec['lens']
cam.data.sensor_width = 36
cam.data.clip_end = 500
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 50
scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading
sh.light = 'MATCAP'
sh.studio_light = args[2] if len(args) > 2 else 'check_reflection_horizontal.exr'
sh.color_type = 'SINGLE'
scene.display.render_aa = '8'
scene.render.filepath = args[1]
bpy.ops.render.render(write_still=True)

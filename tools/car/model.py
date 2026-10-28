import bpy, sys, math
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import shape as S
import body, wheel, parts

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else '/tmp/roadster.blend'

bpy.ops.wm.read_factory_settings(use_empty=True)
car, glass, liners = body.build()
for name, u, x, r, w, side in (
    ('wheel_fl', S.FRONT_HUB, 0.835, 0.347, 0.265, 1), ('wheel_fr', S.FRONT_HUB, 0.835, 0.347, 0.265, -1),
    ('wheel_rl', S.REAR_HUB, 0.825, 0.364, 0.325, 1), ('wheel_rr', S.REAR_HUB, 0.825, 0.364, 0.325, -1),
):
    wheel.wheel(name, (x * side, u - S.L / 2, S.GROUND + r), r, w, side)
parts.build()
bpy.ops.wm.save_as_mainfile(filepath=OUT)
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print('SAVED', OUT, 'tris', tris)

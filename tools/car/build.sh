#!/bin/zsh
set -e
D=${0:A:h}
W=${CARWORK:-$(mktemp -d)}
B=/Applications/Blender.app/Contents/MacOS/Blender
OUT=$D/../../assets/models/car
$B -b --factory-startup --python $D/model.py -- $W/r.blend 2>&1 | grep -E "Error|SAVED|Traceback"
$B -b $W/r.blend --python $D/export.py -- $W/lod0.glb 1.0 2>&1 | grep -E "Error|EXPORTED|Traceback"
$B -b $W/r.blend --python $D/export.py -- $W/lod1.glb 0.3 2>&1 | grep -E "Error|EXPORTED|Traceback"
cd $D/.. && node car/pack.mjs $W/lod0.glb $OUT/roadster.glb && node car/pack.mjs $W/lod1.glb $OUT/roadster_lod1.glb
ls -la $OUT

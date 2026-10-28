#!/bin/zsh
D=${0:A:h}
/Applications/Blender.app/Contents/MacOS/Blender -b --python $D/bake.py 2>&1 | grep -E "BAKED|Traceback|Error|File |^\s+\^|Exception" | grep -v "Missing image"

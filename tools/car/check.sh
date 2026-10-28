#!/bin/zsh
W=${CARWORK:?}
B=/Applications/Blender.app/Contents/MacOS/Blender
BP=/Applications/Blender.app/Contents/Resources/5.0/python/bin/python3.11
D=${0:A:h}
$B -b --factory-startup --python $D/model.py -- $W/r.blend 2>&1 | grep -E "Error|SAVED|Traceback|File \"" | head
views=($@); (( $#views )) || views=(018 013-1 016 017)
for v in $views; do
  c=${v%-1}
  $B -b $W/r.blend --python $D/view.py -- $W/cams/$( [[ -f $W/cams/${c}r.json ]] && echo ${c}r || echo $c ).json $W/r$c.png 2>&1 | grep -E "Error|Traceback"
  echo -n "$v "; $BP -I $D/overlay.py $W/../ref/roadster-photos/$v.jpg $W/r$c.png $W/o$c.png $W/masks/$v.png
done

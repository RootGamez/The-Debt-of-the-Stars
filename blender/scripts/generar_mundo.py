# Genera la base de un mundo desde cero y la guarda en blender/<mundo>.blend:
# mundo_base.py (planeta + colisión) + marcas.py (marcas de blender/marcas/<mundo>.json).
# Uso: blender -b --factory-startup --python blender/scripts/generar_mundo.py -- <mundo>
# Cuidado: sobrescribe blender/<mundo>.blend. Úsalo solo para crear la base inicial.
import os
import runpy
import sys

import bpy

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if not ARGS:
    raise SystemExit("Indica el mundo: -- <mundo>")
WORLD = ARGS[0]
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
BLEND = os.path.join(os.path.dirname(SCRIPTS), f"{WORLD}.blend")

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

runpy.run_path(os.path.join(SCRIPTS, "mundo_base.py"), run_name="__main__")
runpy.run_path(os.path.join(SCRIPTS, "marcas.py"), run_name="__main__")
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print(f"Guardado {BLEND}")

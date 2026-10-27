# Exporta la colección de un mundo a .glb para Three.js y revisa presupuestos de triángulos.
# Uso: blender -b blender/<mundo>.blend --python exportar_glb.py -- <mundo> [carpeta_salida]
import os
import sys

import bpy

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if "__file__" in globals():
    REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
else:  # ejecutado desde el MCP de Blender, sin archivo
    REPO = r"D:\Proyectos\Juego"
WORLD = ARGS[0] if ARGS else "umbral"
OUT_DIR = ARGS[1] if len(ARGS) > 1 else os.path.join(REPO, "web", "public", "models")
PRESUPUESTO_TOTAL = 15000      # triángulos visibles del mundo (planeta + props)
PRESUPUESTO_PLANETA = 8000
PRESUPUESTO_PROP = 500


def triangulos(obj, depsgraph):
    ev = obj.evaluated_get(depsgraph)
    mesh = ev.to_mesh()
    mesh.calc_loop_triangles()
    n = len(mesh.loop_triangles)
    ev.to_mesh_clear()
    return n


def informe(objs):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total, avisos, datos_vistos = 0, [], set()
    for obj in objs:
        if obj.type != "MESH" or obj.name.startswith("COL_"):
            continue
        n = triangulos(obj, depsgraph)
        total += n
        if obj.name.endswith("_Terreno"):
            limite = PRESUPUESTO_PLANETA
        elif obj.name.endswith(("_Lugares", "_Luces")):
            # Los lugares de arte_<mundo>.py van en una sola malla: los vigila el total del mundo.
            limite = PRESUPUESTO_TOTAL
        else:
            limite = PRESUPUESTO_PROP
        if n > limite and obj.data.name not in datos_vistos:
            avisos.append(f"  {obj.name}: {n} > {limite}")
        datos_vistos.add(obj.data.name)
    print(f"Triángulos visibles: {total} / {PRESUPUESTO_TOTAL}")
    for a in avisos:
        print("AVISO presupuesto:", a)
    if total > PRESUPUESTO_TOTAL:
        print("AVISO: el mundo supera el presupuesto total")


def main():
    col = bpy.data.collections.get(WORLD)
    if col is None:
        raise SystemExit(f"No existe la colección '{WORLD}' en este .blend")
    objs = list(col.all_objects)
    informe(objs)
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in objs:
        o.hide_set(False)
        o.select_set(True)
    os.makedirs(OUT_DIR, exist_ok=True)
    ruta = os.path.join(OUT_DIR, f"{WORLD}.glb")
    bpy.ops.export_scene.gltf(
        filepath=ruta, export_format="GLB", use_selection=True, export_apply=True,
        export_yup=True, export_extras=True, export_vertex_color="ACTIVE",
        export_cameras=False, export_lights=False,
    )
    print(f"Exportado {ruta} ({os.path.getsize(ruta) / 1024:.0f} KB)")
    # No usar "gltf-transform optimize": borra los nodos vacíos (las marcas SPAWN_/INT_/TRIG_).
    print("Para comprimir: npm run modelos (desde web/), que usa gltf-transform meshopt")


main()

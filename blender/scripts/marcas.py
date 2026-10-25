# Coloca marcas de juego (SPAWN_, INT_, TRIG_) sobre la superficie de un mundo, alineadas
# a la normal. Las propiedades personalizadas viajan a Three.js como userData.
# Las marcas de cada mundo se leen de blender/marcas/<mundo>.json:
#   [{"nombre": "SPAWN_LaBoca", "lat": 8, "lon": 20, "alto": 1.0, "props": {}}, ...]
# Uso: blender -b blender/<mundo>.blend --python marcas.py -- <mundo>
import json
import math
import os
import re
import sys

import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if "__file__" in globals():
    BLENDER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
else:  # ejecutado desde el MCP de Blender, sin archivo
    BLENDER_DIR = r"D:\Proyectos\Juego\blender"
WORLD = ARGS[0] if ARGS else "umbral"
REPLACE = True
# Mismas reglas que web/src/worlds/markers.ts, para fallar aquí y no en el navegador.
NOMBRE_VALIDO = re.compile(r"^(SPAWN|INT|TRIG|COL)_[A-Za-z0-9_]+$")
KINDS = ("texto", "grabacion", "objeto")
TRIGGER_RADIUS_DEFECTO = 5  # igual que DEFAULT_TRIGGER_RADIUS en markers.ts


class MarcaInvalida(Exception):
    pass


def validar(m):
    nombre, props = m["nombre"], m.get("props", {})
    if not NOMBRE_VALIDO.match(nombre):
        raise MarcaInvalida(f"{nombre}: nombre inválido (prefijo SPAWN_/INT_/TRIG_/COL_ y solo letras, números y _)")
    if nombre.startswith("INT_"):
        if not props.get("clue_id"):
            raise MarcaInvalida(f"{nombre}: falta clue_id")
        if props.get("kind") not in KINDS:
            raise MarcaInvalida(f"{nombre}: kind debe ser uno de {KINDS}")
    if nombre.startswith("TRIG_") and not props.get("event"):
        raise MarcaInvalida(f"{nombre}: falta event")
    for clave in ("radius", "duration"):
        if clave in props and not props[clave] > 0:
            raise MarcaInvalida(f"{nombre}: {clave} debe ser mayor que 0")
    if "loop_time" in props and props["loop_time"] < 0:
        raise MarcaInvalida(f"{nombre}: loop_time no puede ser negativo")


def leer_marcas(world):
    ruta = os.path.join(BLENDER_DIR, "marcas", f"{world}.json")
    if not os.path.exists(ruta):
        print(f"Sin marcas para {world} ({ruta})")
        return []
    with open(ruta, encoding="utf-8") as f:
        datos = json.load(f)
    nombres = [m["nombre"] for m in datos]
    repetidos = {n for n in nombres if nombres.count(n) > 1}
    if repetidos:
        raise MarcaInvalida(f"Marcas repetidas en {ruta}: {sorted(repetidos)}")
    for m in datos:
        validar(m)
    return [(m["nombre"], m["lat"], m["lon"], m.get("alto", 0.0), m.get("props", {})) for m in datos]


def direccion(lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    return Vector((math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)))


def estilo(nombre, props):
    if nombre.startswith("SPAWN_"):
        return "SINGLE_ARROW", 2.0
    if nombre.startswith("TRIG_"):
        return "SPHERE", float(props.get("radius", TRIGGER_RADIUS_DEFECTO))
    return "SPHERE", 0.5


def main():
    raiz = bpy.data.objects[WORLD]
    terreno = bpy.data.objects[f"{WORLD}_Terreno"]
    col = bpy.data.collections[WORLD]
    alcance = float(raiz.get("radius", 100)) * 3
    for nombre, lat, lon, alto, props in leer_marcas(WORLD):
        viejo = bpy.data.objects.get(nombre)
        if viejo and REPLACE:
            bpy.data.objects.remove(viejo, do_unlink=True)
        d = direccion(lat, lon)
        hit, loc, normal, _ = terreno.ray_cast(d * alcance, -d)
        if not hit:
            raise MarcaInvalida(f"{nombre}: no toca el suelo en lat {lat}, lon {lon}")
        tipo, tam = estilo(nombre, props)
        obj = bpy.data.objects.new(nombre, None)
        obj.empty_display_type = tipo
        obj.empty_display_size = tam
        col.objects.link(obj)
        obj.parent = raiz
        arriba = d.lerp(normal, 0.5).normalized()
        rot = Vector((0, 0, 1)).rotation_difference(arriba).to_matrix().to_4x4()
        obj.matrix_world = terreno.matrix_world @ Matrix.Translation(loc + arriba * alto) @ rot
        for k, v in props.items():
            obj[k] = v
        print(f"{nombre}: lat {lat} lon {lon}")


main()

# Coloca marcas de juego (SPAWN_, PARK_, INT_, TRIG_, PASO_) sobre la superficie de un mundo, alineadas
# a la normal. Las propiedades personalizadas viajan a Three.js como userData.
# Las marcas de cada mundo se leen de blender/marcas/<mundo>.json:
#   [{"nombre": "SPAWN_LaBoca", "lat": 8, "lon": 20, "alto": 1.0, "props": {}}, ...]
# Opcionales: "rumbo" (grados desde el norte hacia el este: hacia dónde mira la marca, su +Y) y, en los
# mundos huecos (el Nudo), "dentro": true para ponerla en la cara interior (de pie hacia el centro).
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
NOMBRE_VALIDO = re.compile(r"^(SPAWN|PARK|INT|TRIG|COL|PASO)_[A-Za-z0-9_]+$")
KINDS = ("texto", "grabacion", "objeto", "observacion")
TRIGGER_RADIUS_DEFECTO = 5  # igual que DEFAULT_TRIGGER_RADIUS en markers.ts


class MarcaInvalida(Exception):
    pass


def validar(m):
    nombre, props = m["nombre"], m.get("props", {})
    if not NOMBRE_VALIDO.match(nombre):
        raise MarcaInvalida(f"{nombre}: nombre inválido (prefijo SPAWN_/PARK_/INT_/TRIG_/COL_/PASO_ y solo letras, números y _)")
    if nombre.startswith("PASO_") and not str(props.get("destino", "")).startswith("PASO_"):
        raise MarcaInvalida(f"{nombre}: falta destino (el nombre de su anillo gemelo, PASO_…)")
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
    pasos = {m["nombre"] for m in datos if m["nombre"].startswith("PASO_")}
    for m in datos:
        destino = m.get("props", {}).get("destino")
        if m["nombre"].startswith("PASO_") and (destino not in pasos or destino == m["nombre"]):
            raise MarcaInvalida(f"{m['nombre']}: su destino {destino} no es otro anillo PASO_ de este mundo")
    return [(m["nombre"], m["lat"], m["lon"], m.get("alto", 0.0), m.get("props", {}),
             m.get("rumbo"), bool(m.get("dentro", False))) for m in datos]


def direccion(lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    return Vector((math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)))


def orientacion(arriba, rumbo):
    """Matriz de giro: Z = arriba y, si hay rumbo, +Y hacia ese rumbo (grados desde el norte al este).
    Es el mismo marco que arte_comun.Planeta.lugar."""
    if rumbo is None:
        return Vector((0, 0, 1)).rotation_difference(arriba).to_matrix().to_4x4()
    norte = Vector((0, 0, 1)) - arriba * arriba.z
    if norte.length < 1e-6:
        norte = Vector((1, 0, 0))
    norte.normalize()
    este = norte.cross(arriba).normalized()
    r = math.radians(rumbo)
    frente = (norte * math.cos(r) + este * math.sin(r)).normalized()
    derecha = frente.cross(arriba).normalized()
    return Matrix((derecha, frente, arriba)).transposed().to_4x4()


def estilo(nombre, props):
    if nombre.startswith(("SPAWN_", "PARK_", "PASO_")):
        return "SINGLE_ARROW", 2.0
    if nombre.startswith("TRIG_"):
        return "SPHERE", float(props.get("radius", TRIGGER_RADIUS_DEFECTO))
    return "SPHERE", 0.5


def main():
    raiz = bpy.data.objects[WORLD]
    terreno = bpy.data.objects[f"{WORLD}_Terreno"]
    col = bpy.data.collections[WORLD]
    alcance = float(raiz.get("radius", 100)) * 3
    for nombre, lat, lon, alto, props, rumbo, dentro in leer_marcas(WORLD):
        viejo = bpy.data.objects.get(nombre)
        if viejo and REPLACE:
            bpy.data.objects.remove(viejo, do_unlink=True)
        d = direccion(lat, lon)
        if dentro:
            # Cara interior de un mundo hueco: el rayo sale del centro y "arriba" es hacia el centro.
            hit, loc, normal, _ = terreno.ray_cast(d * 0.01, d)
            vertical = -d
        else:
            hit, loc, normal, _ = terreno.ray_cast(d * alcance, -d)
            vertical = d
        if not hit:
            raise MarcaInvalida(f"{nombre}: no toca el suelo en lat {lat}, lon {lon}")
        tipo, tam = estilo(nombre, props)
        obj = bpy.data.objects.new(nombre, None)
        obj.empty_display_type = tipo
        obj.empty_display_size = tam
        col.objects.link(obj)
        obj.parent = raiz
        arriba = vertical.lerp(normal, 0.5).normalized()
        rot = orientacion(arriba, rumbo)
        obj.matrix_world = terreno.matrix_world @ Matrix.Translation(loc + arriba * alto) @ rot
        for k, v in props.items():
            obj[k] = v
        print(f"{nombre}: lat {lat} lon {lon}")


main()

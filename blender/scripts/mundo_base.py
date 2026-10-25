# Genera el planeta base de un mundo del juego: icosfera low poly facetada, color por cara
# (vertex colors, exportable a glTF), rasgos propios del mundo y malla de colisión COL_.
# Los presets salen de CONTEXTO_PLANETAS.md (v0.1). Si el documento cambia, actualízalos.
# Uso: blender -b --python mundo_base.py -- <mundo>   (o ejecutar dentro de Blender con WORLD fijo)
import sys

import bpy
import bmesh
import math
import random
from mathutils import Vector, noise

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
WORLD = ARGS[0] if ARGS else "umbral"  # umbral, archivo, taller, cicatriz, observatorio, laboratorio, hogar, luna
SUBDIV = 5            # 5 ≈ 5.120 triángulos (presupuesto 3k–8k)
# Colisión con la misma resolución que el suelo visible: con menos, el jugador se hundiría o
# flotaría entre vértices. Se puede bajar en la Fase 2 si la física lo necesita.
COL_SUBDIV = SUBDIV
SEED = 1
REPLACE = True

# Bandas: (altura normalizada 0..1, color hex). La altura 0..1 sale del relieve.
PRESETS = {
    "umbral": dict(radius=90, gravity=1.0, clock=1.00, relief=0.05, freq=1.2,
                   bands=[(0.0, "#7A6A5E"), (0.30, "#D8C49A"), (0.62, "#B87A3A"), (0.80, "#7A6A5E")],
                   massif=((0.8, 0.3, 0.5), 0.35, 0.18, "#7A6A5E"), polar_ice="#A8D0E8"),
    "archivo": dict(radius=70, gravity=1.5, clock=0.80, relief=0.03, freq=1.6,
                    bands=[(0.0, "#22303E"), (0.25, "#4A6680"), (0.55, "#C8CCD0"), (0.85, "#EEE6D2")],
                    canyon=(0.16, 0.22, "#22303E")),
    "taller": dict(radius=45, gravity=0.6, clock=0.85, relief=0.05, freq=1.4,
                   bands=[(0.0, "#2A2E34"), (0.35, "#6A7480"), (0.6, "#EEEEEA"), (0.85, "#E07830")],
                   terraces=4),
    "cicatriz": dict(radius=80, gravity=1.2, clock=0.60, relief=0.04, freq=1.5,
                     bands=[(0.0, "#141012"), (0.35, "#5A5458"), (0.6, "#8A3A22"), (0.85, "#5A5458")],
                     bites=(14, (0.18, 0.45), "#141012", "#FF7A20")),
    "observatorio": dict(radius=30, gravity=0.2, clock=1.15, relief=0.12, freq=1.0,
                         bands=[(0.0, "#0A0A12"), (0.35, "#2A2A5A"), (0.7, "#77778A")],
                         stretch=(1.25, 0.9, 0.8), craters=6),
    "laboratorio": dict(radius=25, gravity=0.3, clock=0.20, relief=0.03, freq=1.3,
                        bands=[(0.0, "#4E5650"), (0.4, "#8A9A88"), (0.75, "#EDEAE0")]),
    "hogar": dict(radius=120, gravity=1.0, clock=1.00, relief=0.05, freq=1.4,
                  bands=[(0.0, "#3A7AA0"), (0.42, "#C8963C"), (0.47, "#8AB04A"), (0.65, "#5A8A3A"), (0.85, "#7A5A3A")],
                  sea=0.42),
    "luna": dict(radius=35, gravity=0.4, clock=1.00, relief=0.04, freq=1.3,
                 bands=[(0.0, "#4E5666"), (0.4, "#8A94A6"), (0.7, "#B4BCC8")], craters=12),
}


def hex_lineal(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1.0]


class Relieve:
    """Altura en función de la dirección: ruido + rasgos del mundo. Devuelve (radio, color_override)."""

    def __init__(self, cfg, seed):
        self.cfg = cfg
        rng = random.Random(seed)
        rnd = lambda: Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized()
        self.craters = [(rnd(), rng.uniform(0.12, 0.3), rng.uniform(0.4, 0.9)) for _ in range(cfg.get("craters", 0))]
        b = cfg.get("bites")
        self.bites = []
        if b:
            n, (lo, hi), _, _ = b
            for _ in range(n):
                rb = cfg["radius"] * rng.uniform(lo, hi)
                self.bites.append((rnd() * cfg["radius"] * rng.uniform(0.95, 1.1), rb))

    def altura(self, d):
        c = self.cfg
        h = noise.fractal(d * c["freq"], 0.9, 2.0, 4)
        for cd, cr, depth in self.craters:
            x = d.angle(cd) / cr
            h += depth * (x * x - 1.0) if x < 1 else (depth * 0.3 * (1 - (x - 1) / 0.4) if x < 1.4 else 0)
        if "massif" in c:
            md, mr, mh, _ = c["massif"]
            x = d.angle(Vector(md).normalized()) / mr
            if x < 1:
                h += (mh / c["relief"]) * (1 - x * x)
        if "canyon" in c:
            w, depth, _ = c["canyon"]
            lat = abs(math.asin(max(-1, min(1, d.z))))
            if lat < w:
                h -= (depth / c["relief"]) * min(1.0, (w - lat) / (w * 0.25))
        if "terraces" in c:
            h = round(h * c["terraces"]) / c["terraces"]
        h01 = (max(-1.0, min(1.0, h)) + 1) / 2
        if "sea" in c:
            h01 = max(h01, c["sea"])
        return c["radius"] * (1 + (h01 * 2 - 1) * c["relief"]), h01

    def mordida(self, d, r):
        """Corte esférico perfecto: lleva el punto a la cara interior de la esfera que lo contiene."""
        for centro, rb in self.bites:
            p = d * r
            if (p - centro).length < rb:
                dc = d.dot(centro)
                disc = dc * dc - centro.length_squared + rb * rb
                if disc > 0:
                    return max(0.3 * self.cfg["radius"], dc - math.sqrt(disc)), True
        return r, False


def construir(nombre, subdiv, cfg, relieve, con_color):
    bm = bmesh.new()
    try:
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    except TypeError:
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, diameter=2.0)
    info = {}
    stretch = Vector(cfg.get("stretch", (1, 1, 1)))
    for v in bm.verts:
        d = v.co.normalized()
        r, h01 = relieve.altura(d)
        r, mordido = relieve.mordida(d, r)
        v.co = Vector((d.x * stretch.x, d.y * stretch.y, d.z * stretch.z)) * r
        info[v.index] = (h01, mordido, d)
    mesh = bpy.data.meshes.new(nombre)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = False
    if con_color:
        pintar(mesh, cfg, info)
    return mesh


def color_cara(cfg, h01, mordido, d):
    if mordido:
        return cfg["bites"][2]
    if "sea" in cfg and h01 <= cfg["sea"] + 1e-4:
        return cfg["bands"][0][1]
    if cfg.get("polar_ice") and abs(d.z) > 0.82:
        return cfg["polar_ice"]
    if "canyon" in cfg and abs(math.asin(max(-1, min(1, d.z)))) < cfg["canyon"][0] * 0.8:
        return cfg["canyon"][2]
    color = cfg["bands"][0][1]
    for pos, col in cfg["bands"]:
        if h01 >= pos:
            color = col
    return color


def pintar(mesh, cfg, info):
    attr = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    mesh.color_attributes.active_color = attr
    for p in mesh.polygons:
        vals = [info[i] for i in p.vertices]
        h01 = min(v[0] for v in vals) if "sea" in cfg else sum(v[0] for v in vals) / len(vals)
        mordido = sum(v[1] for v in vals) >= 2
        d = sum((v[2] for v in vals), Vector()).normalized()
        borde = cfg.get("bites") and any(v[1] for v in vals) and not mordido
        col = hex_lineal(cfg["bites"][3] if borde else color_cara(cfg, h01, mordido, d))
        for li in p.loop_indices:
            attr.data[li].color = col


def material(world):
    nombre = f"M_Paleta_{world}"
    mat = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = 0.9
    vc = next((n for n in nt.nodes if n.type == "VERTEX_COLOR"), None) or nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Color"
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def main():
    if WORLD not in PRESETS:
        raise SystemExit(f"Mundo desconocido '{WORLD}'. Opciones: {', '.join(PRESETS)}")
    cfg = PRESETS[WORLD]
    noise.seed_set(SEED)
    col = bpy.data.collections.get(WORLD) or bpy.data.collections.new(WORLD)
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    if REPLACE:
        for obj in list(col.all_objects):
            bpy.data.objects.remove(obj, do_unlink=True)

    raiz = bpy.data.objects.new(WORLD, None)
    raiz.empty_display_size = cfg["radius"] * 0.2
    col.objects.link(raiz)
    raiz["world_id"] = WORLD
    raiz["radius"] = float(cfg["radius"])
    raiz["gravity"] = float(cfg["gravity"])
    raiz["clock_rate"] = float(cfg["clock"])

    relieve = Relieve(cfg, SEED)
    terreno = bpy.data.objects.new(f"{WORLD}_Terreno", construir(f"{WORLD}_Terreno", SUBDIV, cfg, relieve, True))
    terreno.data.materials.append(material(WORLD))
    colision = bpy.data.objects.new(f"COL_{WORLD}_Terreno",
                                    construir(f"COL_{WORLD}_Terreno", COL_SUBDIV, cfg, relieve, False))
    colision.display_type = "WIRE"
    colision.hide_render = True
    for obj in (terreno, colision):
        col.objects.link(obj)
        obj.parent = raiz
    tris = sum(len(p.vertices) - 2 for p in terreno.data.polygons)
    print(f"{WORLD}: radio {cfg['radius']} m, {tris} triángulos, reloj {cfg['clock']}, gravedad {cfg['gravity']}")


main()

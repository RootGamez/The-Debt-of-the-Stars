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
SUBDIV = 5            # 5 ≈ 5.120 triángulos (presupuesto 3k–8k); un preset puede pedir más ("subdiv")
# La colisión usa la misma resolución que el suelo visible: con menos, el jugador se hundiría o
# flotaría entre vértices.
SEED = 1
REPLACE = True

# Bandas: (altura normalizada 0..1, color hex). La altura 0..1 sale del relieve.
PRESETS = {
    "umbral": dict(radius=90, gravity=1.0, clock=1.00, relief=0.05, freq=1.2,
                   bands=[(0.0, "#7A6A5E"), (0.30, "#D8C49A"), (0.62, "#B87A3A"), (0.80, "#7A6A5E")],
                   massif=((0.8, 0.3, 0.5), 0.35, 0.18, "#7A6A5E"), polar_ice="#A8D0E8"),
    "archivo": dict(radius=70, gravity=1.5, clock=0.80, relief=0.03, freq=1.6,
                    bands=[(0.0, "#22303E"), (0.25, "#4A6680"), (0.55, "#C8CCD0"), (0.85, "#EEE6D2")],
                    canyon=(0.16, 12.0, "#33465C")),  # semiancho (rad) y hondo (m) del cañón ecuatorial
    "taller": dict(radius=45, gravity=0.6, clock=0.85, relief=0.05, freq=1.4,
                   bands=[(0.0, "#2A2E34"), (0.35, "#6A7480"), (0.6, "#EEEEEA"), (0.85, "#E07830")],
                   terraces=4),
    "cicatriz": dict(radius=80, gravity=1.2, clock=0.60, relief=0.04, freq=1.5,
                     bands=[(0.0, "#141012"), (0.35, "#5A5458"), (0.6, "#8A3A22"), (0.85, "#5A5458")],
                     bites=(14, (0.18, 0.45), "#141012", "#FF7A20")),
    "observatorio": dict(radius=30, gravity=0.2, clock=1.15, relief=0.12, freq=1.0,
                         bands=[(0.0, "#0A0A12"), (0.35, "#2A2A5A"), (0.7, "#77778A")],
                         stretch=(1.25, 0.9, 0.8), craters=6),
    # El Nudo (Fase 7): una cáscara oscura y rugosa por fuera y, por dentro, una cavidad donde se camina por la
    # cara interior (la gravedad empuja hacia fuera). Dentro está el Laboratorio Oculto.
    # Relieve exterior acotado: la cáscara nunca baja de 23,75 m, por encima del límite de la cavidad (23 m).
    "laboratorio": dict(radius=25, gravity=0.3, clock=0.20, relief=0.05, freq=1.9, subdiv=4,
                        bands=[(0.0, "#0B0A10"), (0.4, "#17151E"), (0.7, "#26232F")],
                        # Por dentro, franjas oscuras cada 30° de latitud: los estratos de los Ausentes, que además
                        # dan dónde mirar en una esfera donde todo se parece.
                        hollow=dict(inner=21, relief=0.02, freq=2.2, strata=(30, 3.2, "#47514A"),
                                    bands=[(0.0, "#56605A"), (0.45, "#7C8A7E"), (0.8, "#A3AE9F")])),
    # Hogar (Fase 9): el mundo más grande y el único vivo. Más resolución que los demás, una colina con la cima
    # llana para el Instituto (lat 36, lon 14) y prados con un poco de variación de color por cara.
    "hogar": dict(radius=120, gravity=1.0, clock=1.00, relief=0.05, freq=1.4, subdiv=6, jitter=0.06,
                  bands=[(0.0, "#3A7AA0"), (0.42, "#D8B070"), (0.46, "#9ABA5A"), (0.62, "#6E9A4A"),
                         (0.8, "#5E8E40"), (0.97, "#88B058")],
                  sea=0.42, massif=((0.74, 0.14, 0.66), 0.32, 0.1, "#88B058")),
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
        if "terraces" in c:
            h = round(h * c["terraces"]) / c["terraces"]
        h01 = (max(-1.0, min(1.0, h)) + 1) / 2
        if "sea" in c:
            h01 = max(h01, c["sea"])
        radio = c["radius"] * (1 + (h01 * 2 - 1) * c["relief"])
        if "canyon" in c:
            # Cañón de verdad (metros, no limitado por el relieve): suelo plano y paredes casi verticales.
            w, hondo, _ = c["canyon"]
            lat = abs(math.asin(max(-1, min(1, d.z))))
            if lat < w:
                radio -= hondo * min(1.0, (w - lat) / (w * 0.25))
                h01 = min(h01, 0.2)
        return radio, h01

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


def icosfera(bm, subdiv):
    try:
        return bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)["verts"]
    except TypeError:
        return bmesh.ops.create_icosphere(bm, subdivisions=subdiv, diameter=2.0)["verts"]


def construir_hueco(nombre, cfg, con_color):
    """Mundo hueco: cáscara exterior (caras hacia fuera) y cara interior (caras hacia el centro), juntas en
    una sola malla. En la interior, 'más alto' es más cerca del centro."""
    hueco = cfg["hollow"]
    bm = bmesh.new()
    capa = bm.loops.layers.float_color.new("Color") if con_color else None

    def capa_esfera(verts, radio_de, bandas, invertir, estratos=None):
        caras = {f for v in verts for f in v.link_faces}
        alturas = {}
        for v in verts:
            d = v.co.normalized()
            r, h01 = radio_de(d)
            v.co = d * r
            alturas[v] = h01
        if invertir:
            bmesh.ops.reverse_faces(bm, faces=list(caras))
        if capa is not None:
            for f in caras:
                h01 = sum(alturas[v] for v in f.verts) / len(f.verts)
                color = bandas[0][1]
                for pos, col in bandas:
                    if h01 >= pos:
                        color = col
                if estratos:
                    cada, ancho, tono = estratos
                    lat = math.degrees(math.asin(max(-1, min(1, f.calc_center_median().normalized().z))))
                    if abs((lat + cada / 2) % cada - cada / 2) < ancho:
                        color = tono
                rgba = hex_lineal(color)
                for loop in f.loops:
                    loop[capa] = rgba

    relieve = Relieve(cfg, SEED)
    capa_esfera(icosfera(bm, cfg.get("subdiv", SUBDIV)), relieve.altura, cfg["bands"], False)

    interior = dict(radius=hueco["inner"], relief=hueco["relief"], freq=hueco["freq"], bands=hueco["bands"])
    relieve_dentro = Relieve(interior, SEED + 1)

    def radio_dentro(d):
        _, h01 = relieve_dentro.altura(d)
        # Los bultos suben hacia el centro: más alto = más cerca.
        return hueco["inner"] * (1 - (h01 * 2 - 1) * hueco["relief"]), h01

    capa_esfera(icosfera(bm, SUBDIV), radio_dentro, hueco["bands"], True, hueco.get("strata"))
    mesh = bpy.data.meshes.new(nombre)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = False
    if con_color and "Color" in mesh.color_attributes:
        mesh.color_attributes.active_color = mesh.color_attributes["Color"]
    return mesh


def construir(nombre, subdiv, cfg, relieve, con_color):
    if "hollow" in cfg:
        return construir_hueco(nombre, cfg, con_color)
    bm = bmesh.new()
    icosfera(bm, subdiv)
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
        if cfg.get("jitter") and not ("sea" in cfg and h01 <= cfg["sea"] + 1e-4):
            # Un poco de variación por cara (siempre la misma): el prado no parece de plástico.
            k = 1 + cfg["jitter"] * noise.noise(d * 37.0)
            col = [min(1.0, c * k) for c in col[:3]] + [1.0]
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
    if "hollow" in cfg:
        raiz["inner_radius"] = float(cfg["hollow"]["inner"])

    relieve = Relieve(cfg, SEED)
    subdiv = cfg.get("subdiv", SUBDIV)
    terreno = bpy.data.objects.new(f"{WORLD}_Terreno", construir(f"{WORLD}_Terreno", subdiv, cfg, relieve, True))
    terreno.data.materials.append(material(WORLD))
    colision = bpy.data.objects.new(f"COL_{WORLD}_Terreno",
                                    construir(f"COL_{WORLD}_Terreno", subdiv, cfg, relieve, False))
    colision.display_type = "WIRE"
    colision.hide_render = True
    for obj in (terreno, colision):
        col.objects.link(obj)
        obj.parent = raiz
    tris = sum(len(p.vertices) - 2 for p in terreno.data.polygons)
    print(f"{WORLD}: radio {cfg['radius']} m, {tris} triángulos, reloj {cfg['clock']}, gravedad {cfg['gravity']}")


main()

# Herramientas comunes para vestir un mundo: colocar piezas sobre la superficie por latitud y longitud
# (como las marcas), construir mallas low poly con color por cara y reunir las colisiones COL_.
#
# Cada script arte_<mundo>.py crea tres objetos hijos de la raíz del mundo:
#   <mundo>_Lugares      todo lo visible (una sola malla, la paleta del mundo: un draw call)
#   <mundo>_Luces        lo que brilla (material emisivo)
#   COL_<mundo>_Lugares  cajas y cilindros sencillos para caminar (oculto en el juego)
# y los vuelve a crear desde cero cada vez (reproducible; no se edita el .blend a mano).
import math

import bpy
import bmesh
from mathutils import Matrix, Vector


def hex_lineal(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1.0]


def matriz(pos=(0, 0, 0), rot=(0, 0, 0), escala=(1, 1, 1)):
    r = Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")
    return Matrix.Translation(Vector(pos)) @ r @ Matrix.Diagonal(Vector((*escala, 1.0)))


def media(valores):
    return sum(valores) / len(valores)


def direccion(lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    return Vector((math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)))


# ---- Primitivas (todas centradas; los cilindros y conos con eje Z y longitud 1) ----------------------

def caja(bm):
    return bmesh.ops.create_cube(bm, size=1.0)


def cono(r1, r2=0.0, lados=8, tapas=True):
    def crear(bm):
        try:
            return bmesh.ops.create_cone(bm, cap_ends=tapas, segments=lados, radius1=r1, radius2=r2, depth=1.0)
        except TypeError:
            return bmesh.ops.create_cone(bm, cap_ends=tapas, segments=lados, diameter1=r1 * 2, diameter2=r2 * 2, depth=1.0)
    return crear


def cilindro(r, lados=8):
    return cono(r, r, lados)


def bola(r, nivel=1):
    def crear(bm):
        try:
            return bmesh.ops.create_icosphere(bm, subdivisions=nivel, radius=r)
        except TypeError:
            return bmesh.ops.create_icosphere(bm, subdivisions=nivel, diameter=r * 2)
    return crear


def toro(radio, grosor, lados=24, seccion=6):
    """Anillo en el plano XZ (de pie, mirando a lo largo de Y)."""
    def crear(bm):
        verts = []
        anillos = []
        for i in range(lados):
            a = 2 * math.pi * i / lados
            centro = Vector((math.cos(a) * radio, 0, math.sin(a) * radio))
            radial = centro.normalized()
            fila = []
            for j in range(seccion):
                b = 2 * math.pi * j / seccion
                p = centro + radial * math.cos(b) * grosor + Vector((0, 1, 0)) * math.sin(b) * grosor
                v = bm.verts.new(p)
                fila.append(v)
                verts.append(v)
            anillos.append(fila)
        for i in range(lados):
            a, b = anillos[i], anillos[(i + 1) % lados]
            for j in range(seccion):
                bm.faces.new((a[j], b[j], b[(j + 1) % seccion], a[(j + 1) % seccion]))
        return {"verts": verts}
    return crear


# ---- Malla con color por cara --------------------------------------------------------------------

class Malla:
    def __init__(self):
        self.bm = bmesh.new()
        self.capa = self.bm.loops.layers.float_color.new("Color")
        self.piezas = 0

    def pieza(self, color, crear, m):
        verts = crear(self.bm)["verts"]
        bmesh.ops.transform(self.bm, matrix=m, verts=verts)
        caras = {f for v in verts for f in v.link_faces}
        rgba = hex_lineal(color)
        for f in caras:
            for loop in f.loops:
                loop[self.capa] = rgba
        self.piezas += 1
        return caras


class Colisiones:
    """Formas sencillas para caminar: no hace falta color ni detalle."""

    def __init__(self):
        self.bm = bmesh.new()

    def pieza(self, crear, m):
        verts = crear(self.bm)["verts"]
        bmesh.ops.transform(self.bm, matrix=m, verts=verts)


# ---- Colocar sobre el planeta --------------------------------------------------------------------

class Planeta:
    def __init__(self, mundo):
        self.mundo = mundo
        self.raiz = bpy.data.objects[mundo]
        self.terreno = bpy.data.objects[f"{mundo}_Terreno"]
        self.radio = float(self.raiz.get("radius", 100))

    def suelo(self, lat, lon):
        """Punto del terreno en esa dirección."""
        d = direccion(lat, lon)
        hit, loc, _, _ = self.terreno.ray_cast(d * self.radio * 3, -d)
        if not hit:
            raise RuntimeError(f"{self.mundo}: no hay suelo en lat {lat}, lon {lon}")
        return loc

    def lugar(self, lat, lon, rumbo=0.0, hundir=0.0, apoyo=0.0, tomar=min):
        # `tomar` recibe las alturas del suelo bajo el círculo de apoyo: min, max o media.
        """Marco local en la superficie: Z arriba (radial), Y hacia el rumbo (grados desde el norte hacia
        el este), X a la derecha. `apoyo` > 0: se apoya en el punto más bajo de un círculo de ese radio
        (los edificios no flotan en las cuestas); con `tomar=media`, en la altura media (plataformas
        bajas: la roca asoma por el lado alto). `hundir` lo baja un poco más."""
        arriba = direccion(lat, lon)
        norte = Vector((0, 0, 1)) - arriba * arriba.z
        if norte.length < 1e-6:
            norte = Vector((1, 0, 0))
        norte.normalize()
        este = norte.cross(arriba).normalized()
        r = math.radians(rumbo)
        frente = (norte * math.cos(r) + este * math.sin(r)).normalized()
        derecha = frente.cross(arriba).normalized()
        alturas = [self.suelo(lat, lon).length]
        if apoyo > 0:
            grados = math.degrees(apoyo / self.radio)
            for k in range(8):
                a = 2 * math.pi * k / 8
                alturas.append(self.suelo(lat + grados * math.cos(a), lon + grados * math.sin(a) / max(0.2, math.cos(math.radians(lat)))).length)
        altura = tomar(alturas)
        origen = arriba * (altura - hundir)
        base = Matrix((
            (derecha.x, frente.x, arriba.x, origen.x),
            (derecha.y, frente.y, arriba.y, origen.y),
            (derecha.z, frente.z, arriba.z, origen.z),
            (0, 0, 0, 1),
        ))
        return Lugar(base)

    def rumbo_hacia(self, lat, lon, objetivo):
        """Rumbo (grados desde el norte hacia el este) que mira hacia una dirección del espacio."""
        arriba = direccion(lat, lon)
        norte = (Vector((0, 0, 1)) - arriba * arriba.z).normalized()
        este = norte.cross(arriba).normalized()
        t = objetivo - arriba * objetivo.dot(arriba)
        return math.degrees(math.atan2(t.dot(este), t.dot(norte)))


class Lugar:
    def __init__(self, base):
        self.base = base

    def m(self, pos=(0, 0, 0), rot=(0, 0, 0), escala=(1, 1, 1)):
        return self.base @ matriz(pos, rot, escala)


# ---- Objetos finales ---------------------------------------------------------------------------

def borrar(nombres):
    for nombre in nombres:
        viejo = bpy.data.objects.get(nombre)
        if viejo:
            datos = viejo.data
            bpy.data.objects.remove(viejo, do_unlink=True)
            if datos is not None and datos.users == 0:
                bpy.data.meshes.remove(datos)


def material_luces(nombre, color):
    mat = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    vc = next((n for n in nt.nodes if n.type == "VERTEX_COLOR"), None) or nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Color"
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Emission Color"].default_value = hex_lineal(color)
    bsdf.inputs["Emission Strength"].default_value = 1.5
    return mat


def objeto(planeta, nombre, malla, material):
    datos = bpy.data.meshes.new(nombre)
    malla.bm.to_mesh(datos)
    malla.bm.free()
    for p in datos.polygons:
        p.use_smooth = False
    if "Color" in datos.color_attributes:
        datos.color_attributes.active_color = datos.color_attributes["Color"]
    if material is not None:
        datos.materials.append(material)
    obj = bpy.data.objects.new(nombre, datos)
    bpy.data.collections[planeta.mundo].objects.link(obj)
    obj.parent = planeta.raiz
    return obj, sum(len(p.vertices) - 2 for p in datos.polygons)


def colisiones(planeta, nombre, col):
    obj, _ = objeto(planeta, nombre, col, None)
    obj.display_type = "WIRE"
    obj.hide_render = True
    return obj

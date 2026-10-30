# Herramientas comunes para vestir un mundo: colocar piezas sobre la superficie por latitud y longitud
# (como las marcas), construir mallas low poly con color por cara y reunir las colisiones COL_.
#
# Cada script arte_<mundo>.py crea tres objetos hijos de la raíz del mundo:
#   <mundo>_Lugares      todo lo visible (una sola malla, la paleta del mundo: un draw call)
#   <mundo>_Luces        lo que brilla (material emisivo)
#   COL_<mundo>_Lugares  cajas y cilindros sencillos para caminar (oculto en el juego)
# y, si las usa, <mundo>_LucesVivas: un segundo brillo de otro color (en Hogar, la luz viva de los Ool).
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


def torno(perfil, lados=16, desde=0.0, hasta=2 * math.pi, tapar=True):
    """Superficie de revolución alrededor de Z: `perfil` es una lista de (radio, z) de abajo arriba. Con
    `desde`/`hasta` (rad) sale un gajo; `tapar` cierra con un vértice los extremos de radio 0 (cúpulas, bulbos,
    jarrones). Para casas redondas, techos de tela, faroles y troncos."""
    def crear(bm):
        completo = abs((hasta - desde) - 2 * math.pi) < 1e-6
        n = lados if completo else lados + 1
        filas = []
        verts = []
        for r, z in perfil:
            if r <= 1e-6 and tapar:
                v = bm.verts.new((0, 0, z))
                verts.append(v)
                filas.append([v] * n)
                continue
            fila = []
            for i in range(n):
                a = desde + (hasta - desde) * i / lados
                v = bm.verts.new((math.cos(a) * r, math.sin(a) * r, z))
                fila.append(v)
                verts.append(v)
            filas.append(fila)
        for j in range(len(filas) - 1):
            abajo, arriba = filas[j], filas[j + 1]
            for i in range(lados):
                i2 = (i + 1) % n
                cara = [abajo[i], abajo[i2], arriba[i2], arriba[i]]
                unicos = []
                for v in cara:
                    if v not in unicos:
                        unicos.append(v)
                if len(unicos) >= 3:
                    bm.faces.new(unicos)
        return {"verts": verts}
    return crear


def cupula(r, alto, lados=16, anillos=5, desde=0.0, hasta=2 * math.pi):
    """Cúpula (cuarto de elipse girado) de radio `r` y altura `alto`, cerrada arriba y abierta abajo."""
    perfil = [(r * math.cos(t), alto * math.sin(t))
              for t in (math.pi / 2 * k / anillos for k in range(anillos))] + [(0.0, alto)]
    return torno(perfil, lados, desde, hasta)


def arco(radio, grosor, desde=0.0, hasta=math.pi, lados=10, seccion=5):
    """Trozo de anillo en el plano XZ (como `toro`), de `desde` a `hasta` (rad, 0 = +X, π/2 = arriba): arcos de
    puertas, costillas de cúpulas, aros."""
    def crear(bm):
        verts = []
        anillos = []
        for i in range(lados + 1):
            a = desde + (hasta - desde) * i / lados
            centro = Vector((math.cos(a) * radio, 0, math.sin(a) * radio))
            radial = centro.normalized()
            fila = []
            for j in range(seccion):
                b = 2 * math.pi * j / seccion
                v = bm.verts.new(centro + radial * math.cos(b) * grosor + Vector((0, 1, 0)) * math.sin(b) * grosor)
                fila.append(v)
                verts.append(v)
            anillos.append(fila)
        for i in range(lados):
            a, b = anillos[i], anillos[i + 1]
            for j in range(seccion):
                bm.faces.new((a[j], b[j], b[(j + 1) % seccion], a[(j + 1) % seccion]))
        return {"verts": verts}
    return crear


def fragmento(cortes, divisiones=4, medidas=(1.0, 1.0, 1.0)):
    """Caja (centrada) de `medidas` metros con mordidas esféricas perfectas: `cortes` es una lista de (centro, radio)
    en el marco de la caja y en metros. Así son los fragmentos de los Ausentes que llegan a casa: piedra tallada con
    un borde cortado en curva perfecta. Se restan esferas de verdad (booleana exacta de Blender), así que el corte
    queda limpio; para que sea una esfera y no un elipsoide, la caja se hace ya a su tamaño en vez de escalarla.
    (`divisiones` ya no se usa: se deja por los scripts antiguos.)"""
    mx, my, mz = medidas

    def crear(bm):
        escena = bpy.context.scene
        caja = bmesh.new()
        bmesh.ops.create_cube(caja, size=1.0)
        for v in caja.verts:
            v.co = Vector((v.co.x * mx, v.co.y * my, v.co.z * mz))
        datos = bpy.data.meshes.new("_fragmento")
        caja.to_mesh(datos)
        caja.free()
        obj = bpy.data.objects.new("_fragmento", datos)
        escena.collection.objects.link(obj)
        solvers = [i.identifier for i in bpy.types.BooleanModifier.bl_rna.properties["solver"].enum_items]
        esferas = []
        for i, (centro, radio) in enumerate(cortes):
            bola_bm = bmesh.new()
            try:
                bmesh.ops.create_uvsphere(bola_bm, u_segments=40, v_segments=20, radius=radio)
            except TypeError:
                bmesh.ops.create_uvsphere(bola_bm, u_segments=40, v_segments=20, diameter=radio * 2)
            bmesh.ops.translate(bola_bm, vec=Vector(centro), verts=bola_bm.verts)
            bola_datos = bpy.data.meshes.new(f"_corte{i}")
            bola_bm.to_mesh(bola_datos)
            bola_bm.free()
            bola = bpy.data.objects.new(f"_corte{i}", bola_datos)
            escena.collection.objects.link(bola)
            esferas.append(bola)
            mod = obj.modifiers.new(f"corte{i}", "BOOLEAN")
            mod.operation = "DIFFERENCE"
            mod.object = bola
            mod.solver = "EXACT" if "EXACT" in solvers else solvers[0]
        evaluado = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        resultado = evaluado.to_mesh()
        nuevos = [bm.verts.new(v.co) for v in resultado.vertices]
        for poligono in resultado.polygons:
            try:
                bm.faces.new([nuevos[i] for i in poligono.vertices])
            except ValueError:
                pass  # cara repetida
        evaluado.to_mesh_clear()
        for o in [obj] + esferas:
            malla = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.meshes.remove(malla)
        return {"verts": nuevos}
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

    def suelo_dentro(self, lat, lon):
        """Punto de la cara interior de un mundo hueco (el Nudo) en esa dirección: el rayo sale del centro."""
        d = direccion(lat, lon)
        hit, loc, _, _ = self.terreno.ray_cast(d * 0.01, d)
        if not hit:
            raise RuntimeError(f"{self.mundo}: no hay cara interior en lat {lat}, lon {lon}")
        return loc

    def lugar_dentro(self, lat, lon, rumbo=0.0, hundir=0.0, apoyo=0.0, tomar=max):
        """Como `lugar`, pero en la cara interior de un mundo hueco: Z (arriba) apunta al centro. La cara
        interior es cóncava (sube a tu alrededor), así que con `apoyo` el suelo se pone en el punto más alto
        del círculo (`tomar=max`): los bordes quedan a ras y el centro, sobre un zócalo."""
        d = direccion(lat, lon)
        arriba = -d
        norte = Vector((0, 0, 1)) - arriba * arriba.z
        if norte.length < 1e-6:
            norte = Vector((1, 0, 0))
        norte.normalize()
        este = norte.cross(arriba).normalized()
        r = math.radians(rumbo)
        frente = (norte * math.cos(r) + este * math.sin(r)).normalized()
        derecha = frente.cross(arriba).normalized()
        # Alturas hacia el centro: cuanto más cerca del centro, más alto.
        alturas = [-self.suelo_dentro(lat, lon).length]
        if apoyo > 0:
            radio = self.suelo_dentro(lat, lon).length
            grados = math.degrees(apoyo / radio)
            for k in range(8):
                a = 2 * math.pi * k / 8
                alturas.append(-self.suelo_dentro(lat + grados * math.cos(a), lon + grados * math.sin(a) / max(0.2, math.cos(math.radians(lat)))).length)
        origen = d * (-tomar(alturas) + hundir)
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


# ---- Base para vestir un mundo ---------------------------------------------------------------------

class Vestido:
    """Reúne lo visible, las luces, las colisiones y las marcas de un mundo. Cada arte_<mundo>.py hereda,
    escribe sus lugares en `lugares()` y llama a `ejecutar()`."""

    def __init__(self, mundo, color_luz, scripts, ambiente=None, color_vivas="#7FF0C8"):
        """`ambiente`: (intensidad, "#rrggbb") de la luz ambiente propia del mundo, o None para la general.
        `color_vivas`: el del segundo brillo (`self.vivas`), si se usa."""
        self.mundo = mundo
        self.color_vivas = color_vivas
        self.ambiente = ambiente
        self.color_luz = color_luz
        self.scripts = scripts
        self.planeta = Planeta(mundo)
        self.vista = Malla()
        self.luces = Malla()
        self.vivas = Malla()
        self.col = Colisiones()
        self.marcas = {}
        self.extra = []  # objetos sueltos (EVT_…), además de las tres mallas

    def lugares(self):
        raise NotImplementedError

    def solido(self, color, crear, m, crear_col=None):
        """Pieza que se ve y además se pisa o choca."""
        self.vista.pieza(color, crear, m)
        self.col.pieza(crear_col or crear, m)

    def marca(self, nombre, lugar, pos, rumbo=None):
        """`rumbo`: hacia dónde mira la marca (grados desde el norte), si importa (aparición, PASO_)."""
        self.marcas[nombre] = (lugar.base @ Vector(pos), rumbo)

    def suelo_local(self, lugar, x, y):
        """Altura del terreno (en el marco del lugar) bajo el punto local (x, y), o None si no hay suelo."""
        arriba = lugar.base.to_3x3() @ Vector((0, 0, 1))
        hit, loc, _, _ = self.planeta.terreno.ray_cast(lugar.base @ Vector((x, y, 60)), -arriba)
        return (lugar.base.inverted() @ loc).z if hit else None

    def rampa(self, lugar, x0, y0, z0, dx, dy, color, ancho=2.4, pendiente=0.45, grueso=0.4):
        """Rampa que baja desde el borde de una plataforma (x0, y0, a altura z0) en la dirección local (dx, dy)
        hasta que alcanza el terreno: así se sube a edificios que el planeta pequeño deja en alto."""
        norma = math.hypot(dx, dy)
        dx, dy = dx / norma, dy / norma
        largo, final = 0.0, (x0, y0, z0)
        while largo < 14.0:
            largo += 0.5
            x, y, z = x0 + dx * largo, y0 + dy * largo, z0 - pendiente * largo
            final = (x, y, z)
            suelo = self.suelo_local(lugar, x, y)
            if suelo is None or z <= suelo + 0.1:
                break
        bajo = grueso / 2
        a = lugar.base @ Vector((x0, y0, z0 - bajo))
        b = lugar.base @ Vector((final[0], final[1], final[2] - bajo - 0.1))
        self.solido(color, caja, caja_entre(a, b, ancho, grueso))

    def marca_en(self, nombre, punto, rumbo=None):
        self.marcas[nombre] = (Vector(punto), rumbo)

    def construir(self):
        borrar([f"{self.mundo}_Lugares", f"{self.mundo}_Luces", f"{self.mundo}_LucesVivas",
                f"COL_{self.mundo}_Lugares"]
               + [o.name for o in bpy.data.objects if o.name.startswith(("EVT_", "OOL_"))])
        self.lugares()
        raiz = self.planeta.raiz
        for clave in ("ambient", "ambient_color"):
            if clave in raiz:
                del raiz[clave]
        if self.ambiente:
            raiz["ambient"], raiz["ambient_color"] = float(self.ambiente[0]), self.ambiente[1]
        paleta = bpy.data.materials.get(f"M_Paleta_{self.mundo}")
        _, tris = objeto(self.planeta, f"{self.mundo}_Lugares", self.vista, paleta)
        _, tris_luz = objeto(self.planeta, f"{self.mundo}_Luces", self.luces,
                             material_luces(f"M_Luces_{self.mundo}", self.color_luz))
        tris_vivas = 0
        if self.vivas.piezas:
            _, tris_vivas = objeto(self.planeta, f"{self.mundo}_LucesVivas", self.vivas,
                                   material_luces(f"M_LucesVivas_{self.mundo}", self.color_vivas))
        else:
            self.vivas.bm.free()
        colisiones(self.planeta, f"COL_{self.mundo}_Lugares", self.col)
        print(f"{self.mundo}: lugares {tris} triángulos, luces {tris_luz}, luces vivas {tris_vivas}")

    def escribir_marcas(self):
        """Lleva las marcas a sus objetos: latitud, longitud y altura sobre el terreno."""
        import json
        import os
        ruta = os.path.join(os.path.dirname(self.scripts), "marcas", f"{self.mundo}.json")
        with open(ruta, encoding="utf-8") as f:
            datos = json.load(f)
        for marca in datos:
            colocada = self.marcas.get(marca["nombre"])
            if colocada is None:
                continue
            punto, rumbo = colocada
            d = punto.normalized()
            lat = math.degrees(math.asin(max(-1.0, min(1.0, d.z))))
            lon = math.degrees(math.atan2(d.y, d.x))
            marca["lat"], marca["lon"] = round(lat, 3), round(lon, 3)
            if marca.get("dentro"):
                # Cara interior: la altura se mide hacia el centro.
                marca["alto"] = round(self.planeta.suelo_dentro(lat, lon).length - punto.length, 3)
            else:
                marca["alto"] = round(punto.length - self.planeta.suelo(lat, lon).length, 3)
            if rumbo is not None:
                marca["rumbo"] = round(rumbo, 2)
        with open(ruta, "w", encoding="utf-8", newline="\n") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
            f.write("\n")

    def ejecutar(self):
        import os
        import runpy
        import sys
        self.construir()
        self.escribir_marcas()
        sys.argv = [sys.argv[0], "--", self.mundo]
        runpy.run_path(os.path.join(self.scripts, "marcas.py"), run_name="__main__")
        bpy.ops.wm.save_mainfile()
        print("Guardado", bpy.data.filepath)


def caja_entre(a, b, ancho, grueso):
    """Matriz de una caja de 1 m que va de `a` a `b` (largo), con `ancho` de lado y `grueso` hacia arriba
    (el "arriba" es la dirección radial en el punto medio). Para rampas, puentes y vigas."""
    a, b = Vector(a), Vector(b)
    largo = b - a
    eje_y = largo.normalized()
    arriba = ((a + b) / 2).normalized()
    eje_x = eje_y.cross(arriba).normalized()
    eje_z = eje_x.cross(eje_y).normalized()
    centro = (a + b) / 2
    return Matrix((
        (eje_x.x * ancho, eje_y.x * largo.length, eje_z.x * grueso, centro.x),
        (eje_x.y * ancho, eje_y.y * largo.length, eje_z.y * grueso, centro.y),
        (eje_x.z * ancho, eje_y.z * largo.length, eje_z.z * grueso, centro.z),
        (0, 0, 0, 1),
    ))


def objeto_suelto(planeta, nombre, malla, material, matriz_mundo, propiedades=None):
    """Objeto aparte (no va en la malla común) con su origen en `matriz_mundo`: para piezas que giran
    (ANIM_, alrededor de su Z local) o que aparecen con un evento (EVT_). La malla va en coordenadas
    locales de ese origen."""
    obj, tris = objeto(planeta, nombre, malla, material)
    obj.matrix_world = matriz_mundo
    for clave, valor in (propiedades or {}).items():
        obj[clave] = valor
    return obj, tris

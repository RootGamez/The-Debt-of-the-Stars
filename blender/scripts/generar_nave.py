# Genera la nave del jugador y la guarda en blender/nave.blend.
#
# Qué es (CONTEXTO_PLANETAS.md §9, 🟡): la lanzadera del Instituto con la que el joven explorador hace su
# primer vuelo oficial, un trayecto corto y seguro hasta su luna para estudiar un fragmento. No es una nave
# de guerra ni de carga: es pequeña, redondeada y amable, con los colores cálidos de Hogar (crema, ocre y
# verde) y una gran burbuja de cristal para mirar. Diseño original (nada de chapa remachada ni cabina
# analógica de otros juegos). Lleva:
#   - casco en lágrima con franja verde, ojos de buey, emblema del Instituto y faros en el morro,
#   - burbuja de cristal semitransparente (malla aparte): desde fuera se ve la cabina,
#   - dos góndolas con propulsores y aletas, motor principal con aros, aleta dorsal con el farol,
#   - un relicario bajo la panza (la caja donde iba a traer el fragmento de la luna),
#   - trípode de patas con rodilla, escotilla a babor con escalerilla,
#   - dentro: tablero con el RELOJ DOBLE (el tuyo y el de referencia, lo mismo que el HUD), pantalla,
#     palanca de mando y de empuje, consolas, asiento con reposabrazos y el cuaderno del Registro.
#
# Truco de la cabina: casco y forro tienen una sola cara (hacia fuera y hacia dentro): desde la cabina no
# se ve el casco y desde fuera no se ve el forro.
#
# Ejes: +Y proa, +Z arriba, +X estribor (glTF los exporta con -Z como proa).
# Marcas: SEAT_Piloto (los ojos) y EXIT_Escotilla (donde se pisa el suelo al bajar, con la nave posada).
# La raíz "nave" lleva collision_radius: la nave colisiona como una esfera y las patas llegan a ese radio.
# Mallas: nave_Casco (opaca), nave_Cristal (semitransparente, dos caras) y nave_Motor (toberas y luces,
# emisiva: el juego la aviva con el empuje).
# Uso: blender -b --factory-startup --python blender/scripts/generar_nave.py   (sobrescribe nave.blend)
import math
import os

import bpy
import bmesh
from mathutils import Matrix, Vector

NAVE = "nave"
RADIO_COLISION = 2.0
SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
BLEND = os.path.join(os.path.dirname(SCRIPTS), f"{NAVE}.blend")

# Casco: esfera unidad deformada en lágrima.
SEMIEJES = Vector((1.35, 2.7, 1.05))
CENTRO = Vector((0.0, 0.0, 0.15))
COLA = 0.3          # cuánto se estrecha la popa
PANZA = 0.88        # la mitad de abajo, algo más plana
FORRO = 0.93        # el forro interior es el casco encogido
SEGMENTOS = (18, 12)
SEGMENTOS_FORRO = (14, 9)  # el forro casi no se ve: menos triángulos

# Paleta (Hogar: verde y ocre, cálido).
CREMA = "#E9DDC2"
CREMA_SOMBRA = "#D2C29E"
OCRE = "#C8963C"
OCRE_OSCURO = "#8A5A2A"
VERDE = "#5E8C4A"
VERDE_OSCURO = "#3E6432"
MARCO = "#A8743A"
OSCURO = "#2E3236"
METAL = "#6E747A"
FORRO_COLOR = "#6E7666"
SUELO = "#4A4E48"
ASIENTO = "#7A5A3A"
TABLERO = "#4A3A2E"
ESFERA = "#F0E8D0"
AGUJA = "#2E3236"
PANTALLA = "#7FD8C8"
BOTON_ROJO = "#C0503A"
BOTON_VERDE = "#7FC86A"
CUADERNO = "#7A4A2A"
VIDRIO = "#9FD0EA"
OJO_DE_BUEY = "#2C4656"
FUEGO = "#FFB060"
BRASA_APAGADA = "#5A2A10"  # color de las toberas sin luz: el brillo lo pone el material emisivo
FAROL = "#FFD27A"


def hex_lineal(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1.0]


def matriz(pos=(0, 0, 0), rot=(0, 0, 0), escala=(1, 1, 1)):
    r = Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")
    return Matrix.Translation(Vector(pos)) @ r @ Matrix.Diagonal(Vector((*escala, 1.0)))


def entre(a, b):
    """Lleva el eje Z de una primitiva de longitud 1 al segmento a-b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    return Matrix.Translation((a + b) / 2) @ rot @ Matrix.Diagonal(Vector((1, 1, d.length, 1)))


def sobre(normal, pos, escala=(1, 1, 1)):
    """Coloca una primitiva con su eje Z a lo largo de `normal` (piezas pegadas al casco)."""
    rot = Vector((0, 0, 1)).rotation_difference(Vector(normal).normalized()).to_matrix().to_4x4()
    return Matrix.Translation(Vector(pos)) @ rot @ Matrix.Diagonal(Vector((*escala, 1)))


# ---- Forma del casco -------------------------------------------------------------------------------

def forma(u, escala=1.0):
    """Punto del casco para un punto `u` de la esfera unidad (escala < 1: el forro)."""
    estrecho = 1 - COLA * max(0.0, -u.y) ** 2
    p = Vector((u.x * SEMIEJES.x * estrecho,
                u.y * SEMIEJES.y,
                u.z * SEMIEJES.z * estrecho * (PANZA if u.z < 0 else 1.0)))
    return CENTRO + p * escala


def superficie(y, z, lado):
    """Punto del casco más cercano a (y, z) en el costado `lado` (+1 estribor, -1 babor) y su normal."""
    mejor = None
    for i in range(121):
        a = -math.pi / 2 + math.pi * i / 120
        for j in range(61):
            b = -math.pi / 2 + math.pi * j / 60
            u = Vector((lado * math.cos(a) * math.cos(b), math.sin(a), math.cos(a) * math.sin(b)))
            p = forma(u)
            d = (p.y - y) ** 2 + (p.z - z) ** 2
            if mejor is None or d < mejor[0]:
                mejor = (d, p)
    p = mejor[1]
    q = p - CENTRO
    n = Vector((q.x / SEMIEJES.x ** 2, q.y / SEMIEJES.y ** 2, q.z / SEMIEJES.z ** 2)).normalized()
    return p, n


def es_burbuja(u):
    """La gran ventana delantera: mitad de proa, por encima de la línea de flotación."""
    return u.y > 0.22 and u.z > -0.12


# ---- Mallas con color por cara --------------------------------------------------------------------

class Malla:
    def __init__(self):
        self.bm = bmesh.new()
        self.capa = self.bm.loops.layers.float_color.new("Color")

    def pintar(self, caras, color):
        rgba = hex_lineal(color)
        for f in caras:
            for loop in f.loops:
                loop[self.capa] = rgba

    def pieza(self, color, crear, m):
        verts = crear(self.bm)["verts"]
        bmesh.ops.transform(self.bm, matrix=m, verts=verts)
        caras = {f for v in verts for f in v.link_faces}
        self.pintar(caras, color)
        return caras

    def casco(self, escala, color, segmentos=SEGMENTOS):
        """Esfera unidad deformada con forma(); devuelve sus caras y el punto de la esfera unidad de cada una."""
        verts = esfera(self.bm, segmentos)["verts"]
        unidad = {v: v.co.normalized() for v in verts}
        caras = {f for v in verts for f in v.link_faces}
        centros = {f: sum((unidad[v] for v in f.verts), Vector()).normalized() for f in caras}
        for v in verts:
            v.co = forma(unidad[v], escala)
        self.pintar(caras, color)
        return caras, centros


def esfera(bm, segmentos=SEGMENTOS):
    u, v = segmentos
    try:
        return bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0)
    except TypeError:
        return bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, diameter=2.0)


def caja(bm):
    return bmesh.ops.create_cube(bm, size=1.0)


def aleta(bm):
    """Caja con la parte de arriba estrecha y echada hacia popa (aleta barrida)."""
    res = bmesh.ops.create_cube(bm, size=1.0)
    for v in res["verts"]:
        if v.co.z > 0:
            v.co.y = v.co.y * 0.45 - 0.3
    return res


def cono(r1, r2=0.0, lados=8, tapas=True):
    """Eje Z, longitud 1: r1 en z=-0,5 y r2 en z=+0,5. Sin tapas queda un tubo abierto."""
    def crear(bm):
        try:
            return bmesh.ops.create_cone(bm, cap_ends=tapas, segments=lados, radius1=r1, radius2=r2, depth=1.0)
        except TypeError:
            return bmesh.ops.create_cone(bm, cap_ends=tapas, segments=lados, diameter1=r1 * 2, diameter2=r2 * 2, depth=1.0)
    return crear


def cilindro(r, lados=8):
    return cono(r, r, lados)


def bola(r):
    def crear(bm):
        try:
            return bmesh.ops.create_icosphere(bm, subdivisions=0, radius=r)
        except TypeError:
            return bmesh.ops.create_icosphere(bm, subdivisions=0, diameter=r * 2)
    return crear


# ---- Piezas -----------------------------------------------------------------------------------------

CUARTO = math.pi / 2


def tobera(m, fuego, pos, garganta, boca, largo, lados=10):
    """Tobera abierta hacia popa: tubo exterior de metal, interior oscuro y la brasa al fondo."""
    x, y, z = pos
    centro = (x, y - largo / 2, z)
    m.pieza(METAL, cono(garganta, boca, lados, tapas=False), matriz(centro, (CUARTO, 0, 0), (1, 1, largo)))
    caras = m.pieza(OSCURO, cono(garganta * 0.92, boca * 0.92, lados, tapas=False),
                    matriz(centro, (CUARTO, 0, 0), (1, 1, largo * 0.98)))
    bmesh.ops.reverse_faces(m.bm, faces=list(caras))
    fuego.pieza(BRASA_APAGADA, cilindro(garganta * 0.9, lados), matriz((x, y - 0.02, z), (CUARTO, 0, 0), (1, 1, 0.02)))


def casco(m, cristal):
    """Exterior: crema, franja verde, panza ocre, una junta de paneles y marco alrededor de la burbuja.
    La burbuja va en la malla del cristal, con la misma forma, y se quita del casco."""
    caras, centros = m.casco(1.0, CREMA)
    hueco = {f for f in caras if es_burbuja(centros[f])}
    for f in caras - hueco:
        u = centros[f]
        if abs(u.z + 0.08) < 0.07:
            color = VERDE
        elif u.z < -0.2:
            color = OCRE
        elif abs(u.y + 0.45) < 0.05:
            color = CREMA_SOMBRA
        else:
            color = CREMA
        m.pintar([f], color)
    bmesh.ops.delete(m.bm, geom=list(hueco), context="FACES")
    marco(m)
    vidrio, centros_vidrio = cristal.casco(1.0, VIDRIO)
    sobra = [f for f in vidrio if not es_burbuja(centros_vidrio[f])]
    bmesh.ops.delete(cristal.bm, geom=sobra, context="FACES")


def marco(m):
    """Un reborde estrecho a lo largo del borde del hueco de la burbuja (solo hay casco en la malla)."""
    alto = 0.06
    bordes = [e for e in m.bm.edges if len(e.link_faces) == 1]
    for e in bordes:
        a, b = (v.co.copy() for v in e.verts)
        sube_a = (a - CENTRO).normalized() * alto
        sube_b = (b - CENTRO).normalized() * alto
        puntos = (a - sube_a * 0.3, b - sube_b * 0.3, b + sube_b, a + sube_a)
        # Pared fina de dos caras (cada una con sus vértices): se ve desde fuera y desde la cabina.
        caras = [m.bm.faces.new([m.bm.verts.new(q) for q in orden]) for orden in (puntos, puntos[::-1])]
        m.pintar(caras, MARCO)


def forro(m):
    """Interior: el casco encogido y del revés, sin la parte de la burbuja (por ahí se mira)."""
    caras, centros = m.casco(FORRO, FORRO_COLOR, SEGMENTOS_FORRO)
    bmesh.ops.reverse_faces(m.bm, faces=list(caras))
    bmesh.ops.delete(m.bm, geom=[f for f in caras if es_burbuja(centros[f])], context="FACES")


def gondolas(m, fuego):
    for lado in (-1, 1):
        x = lado * 1.6
        m.pieza(CREMA, cilindro(0.36), matriz((x, -0.55, -0.45), (CUARTO, 0, 0), (1, 1, 2.1)))
        m.pieza(VERDE, cilindro(0.375), matriz((x, -0.2, -0.45), (CUARTO, 0, 0), (1, 1, 0.22)))
        m.pieza(OSCURO, cilindro(0.38), matriz((x, 0.45, -0.45), (CUARTO, 0, 0), (1, 1, 0.08)))
        m.pieza(OCRE, cono(0.36, 0.06), matriz((x, 0.75, -0.45), (-CUARTO, 0, 0), (1, 1, 0.5)))
        tobera(m, fuego, (x, -1.6, -0.45), 0.22, 0.33, 0.35)
        # Aleta trasera de la góndola y soporte al casco.
        m.pieza(VERDE_OSCURO, caja, matriz((x, -1.3, -0.05), (0.3, 0, 0), (0.06, 0.5, 0.4)))
        m.pieza(OCRE_OSCURO, caja, matriz((lado * 1.08, -0.55, -0.35), (0, lado * 0.18, 0), (0.75, 1.1, 0.1)))


def motor(m, fuego):
    tobera(m, fuego, (0, -2.45, 0.1), 0.34, 0.58, 0.75, 14)
    for y, r in ((-2.6, 0.43), (-2.95, 0.53)):
        m.pieza(OCRE_OSCURO, cono(r, r, 14, tapas=False), matriz((0, y, 0.1), (CUARTO, 0, 0), (1, 1, 0.08)))


def patas(m):
    suelo = -RADIO_COLISION
    for cadera, rodilla, pie in (((0, 1.45, -0.55), (0, 1.95, -1.25), (0, 1.8, suelo + 0.1)),
                                 ((-1.55, -1.3, -0.78), (-2.0, -1.45, -1.3), (-1.95, -1.55, suelo + 0.1)),
                                 ((1.55, -1.3, -0.78), (2.0, -1.45, -1.3), (1.95, -1.55, suelo + 0.1))):
        m.pieza(OSCURO, cilindro(0.07, 6), entre(cadera, rodilla))
        m.pieza(METAL, cilindro(0.055, 6), entre(rodilla, pie))
        m.pieza(OCRE, bola(0.11), matriz(rodilla))
        m.pieza(OCRE_OSCURO, cono(0.32, 0.2), matriz((pie[0], pie[1], suelo + 0.05), escala=(1, 1, 0.1)))


def detalles(m, fuego):
    # Aleta dorsal con el farol en la punta.
    m.pieza(CREMA, aleta, matriz((0, -1.85, 0.95), escala=(0.08, 1.2, 0.6)))
    m.pieza(VERDE, aleta, matriz((0, -2.12, 1.2), escala=(0.09, 0.42, 0.1)))
    m.pieza(OSCURO, cilindro(0.03, 6), entre((0, -2.25, 1.24), (0, -2.35, 1.62)))
    fuego.pieza(FAROL, bola(0.1), matriz((0, -2.35, 1.68)))
    # Relicario bajo la panza: caja con dos cinchas y asa.
    m.pieza(OCRE_OSCURO, caja, matriz((0, -0.95, -0.9), escala=(0.85, 1.0, 0.36)))
    for y in (-1.25, -0.65):
        m.pieza(VERDE_OSCURO, caja, matriz((0, y, -0.9), escala=(0.88, 0.1, 0.38)))
    m.pieza(METAL, caja, matriz((0, -0.95, -1.1), escala=(0.3, 0.06, 0.05)))
    for lado in (-1, 1):
        # Faros en el morro, bajo la burbuja.
        p, n = superficie(2.3, -0.25, lado * 0.35 / 0.35)
        p = Vector((lado * 0.35, p.y, p.z))
        m.pieza(OSCURO, cilindro(0.12), sobre(n, p, (1, 1, 0.04)))
        fuego.pieza(FAROL, cilindro(0.09), sobre(n, p + n * 0.025, (1, 1, 0.02)))
        # Dos ojos de buey por costado.
        for y in (-0.55, -1.15):
            p, n = superficie(y, 0.42, lado)
            m.pieza(MARCO, cilindro(0.16, 12), sobre(n, p, (1, 1, 0.05)))
            m.pieza(OJO_DE_BUEY, cilindro(0.12, 12), sobre(n, p + n * 0.025, (1, 1, 0.03)))
        # Toberas de maniobra.
        for y, z in ((1.3, -0.2), (-1.75, 0.45)):
            p, n = superficie(y, z, lado)
            m.pieza(OSCURO, caja, sobre(n, p, (0.12, 0.18, 0.12)))
    # Emblema del Instituto a estribor (a babor está la escotilla).
    p, n = superficie(0.35, -0.3, 1)
    m.pieza(VERDE, cilindro(0.22, 12), sobre(n, p, (1, 1, 0.04)))
    m.pieza(CREMA, cilindro(0.09, 10), sobre(n, p + n * 0.025, (1, 1, 0.03)))
    # Escotilla a babor con marco, puerta y asa; escalerilla hasta el suelo.
    p, n = superficie(1.1, -0.3, -1)
    m.pieza(MARCO, caja, sobre(n, p, (0.85, 0.95, 0.06)))
    m.pieza(CREMA_SOMBRA, caja, sobre(n, p + n * 0.025, (0.7, 0.8, 0.04)))
    m.pieza(METAL, caja, sobre(n, p + n * 0.05 + Vector((0, 0.24, 0)), (0.06, 0.22, 0.05)))
    for y in (0.85, 1.35):
        m.pieza(OSCURO, cilindro(0.03, 6), entre((-1.2, y, -0.72), (-1.45, y, -RADIO_COLISION + 0.05)))
    for k in range(4):
        m.pieza(METAL, caja, matriz((-1.24 - (k + 0.6) * 0.05, 1.1, -0.92 - k * 0.27), escala=(0.06, 0.5, 0.04)))


def cabina(m):
    inclinacion = -0.5          # el tablero mira al piloto y un poco hacia arriba
    cara = (0, 1.135, -0.03)    # centro de la cara del tablero que da al piloto
    normal_esfera = 1.071       # gira el eje Z de un cilindro hasta la normal de esa cara
    m.pieza(SUELO, caja, matriz((0, 0.3, -0.5), escala=(1.5, 2.0, 0.08)))
    # Asiento con reposabrazos.
    m.pieza(ASIENTO, caja, matriz((0, 0.4, -0.2), escala=(0.62, 0.6, 0.16)))
    m.pieza(ASIENTO, caja, matriz((0, 0.08, 0.22), (0.18, 0, 0), (0.62, 0.12, 0.75)))
    for lado in (-1, 1):
        m.pieza(OCRE_OSCURO, caja, matriz((lado * 0.36, 0.4, -0.02), escala=(0.08, 0.5, 0.06)))
    m.pieza(TABLERO, caja, matriz((0, 1.35, -0.15), (inclinacion, 0, 0), (1.5, 0.45, 0.35)))
    # Reloj doble: tu reloj (izquierda) y el de referencia (derecha), con agujas en momentos distintos.
    for x, angulo in ((-0.32, 0.6), (0.32, 2.1)):
        m.pieza(MARCO, cilindro(0.15, 14), matriz((x, cara[1] + 0.005, cara[2]), (normal_esfera, 0, 0), (1, 1, 0.03)))
        m.pieza(ESFERA, cilindro(0.125, 14), matriz((x, cara[1] - 0.008, cara[2] + 0.01), (normal_esfera, 0, 0), (1, 1, 0.03)))
        aguja = (Matrix.Translation(Vector((x, cara[1] - 0.026, cara[2] + 0.018)))
                 @ Matrix.Rotation(normal_esfera, 4, "X") @ Matrix.Rotation(angulo, 4, "Z")
                 @ Matrix.Translation(Vector((0, 0.045, 0))) @ Matrix.Diagonal(Vector((0.018, 0.09, 0.01, 1))))
        m.pieza(AGUJA, caja, aguja)
    m.pieza(PANTALLA, caja, matriz((0, cara[1] - 0.01, cara[2]), (inclinacion, 0, 0), (0.22, 0.02, 0.16)))
    # Palanca de mando entre las rodillas y palanca de empuje a babor.
    m.pieza(OSCURO, cilindro(0.025, 6), entre((0, 0.85, -0.45), (0, 0.8, -0.12)))
    m.pieza(ASIENTO, bola(0.05), matriz((0, 0.8, -0.1)))
    m.pieza(OSCURO, cilindro(0.02, 6), entre((-0.72, 0.75, -0.12), (-0.68, 0.9, 0.08)))
    m.pieza(BOTON_ROJO, caja, matriz((-0.68, 0.9, 0.09), escala=(0.07, 0.07, 0.05)))
    # Consolas laterales con botones y el cuaderno del Registro sobre la de estribor.
    for lado in (-1, 1):
        m.pieza(OSCURO, caja, matriz((lado * 0.72, 0.55, -0.28), escala=(0.24, 0.9, 0.36)))
        for k, color in enumerate((BOTON_VERDE, PANTALLA, BOTON_ROJO)):
            m.pieza(color, caja, matriz((lado * 0.72, 0.25 + k * 0.12, -0.09), escala=(0.06, 0.06, 0.03)))
    m.pieza(CUADERNO, caja, matriz((0.72, 0.75, -0.08), (0, 0, 0.3), (0.18, 0.25, 0.04)))
    # Panel del techo y montantes laterales de la burbuja (nada delante de los ojos).
    m.pieza(TABLERO, caja, matriz((0, 0.15, 0.98), (-0.25, 0, 0), (0.6, 0.45, 0.06)))
    for lado in (-1, 1):
        m.pieza(MARCO, caja, matriz((lado * 0.98, 1.15, -0.1), (0, 0, lado * 0.32), (0.08, 1.5, 0.07)))


# ---- Materiales y objetos ---------------------------------------------------------------------------

def material(nombre, emisivo=None, alfa=1.0, rugosidad=0.75):
    mat = bpy.data.materials.new(nombre)
    mat.use_nodes = True
    # Casco y motor de una sola cara (glTF doubleSided = false); el cristal se ve por las dos.
    mat.use_backface_culling = alfa >= 1.0
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = rugosidad
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Color"
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    if emisivo:
        bsdf.inputs["Emission Color"].default_value = hex_lineal(emisivo)
        bsdf.inputs["Emission Strength"].default_value = 1.0
    if alfa < 1.0:
        bsdf.inputs["Alpha"].default_value = alfa
        for atributo, valor in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(mat, atributo, valor)
            except (AttributeError, TypeError):
                pass
    return mat


def objeto(col, raiz, nombre, malla, mat):
    datos = bpy.data.meshes.new(nombre)
    malla.bm.to_mesh(datos)
    malla.bm.free()
    for p in datos.polygons:
        p.use_smooth = False
    datos.color_attributes.active_color = datos.color_attributes["Color"]
    datos.materials.append(mat)
    obj = bpy.data.objects.new(nombre, datos)
    col.objects.link(obj)
    obj.parent = raiz
    return sum(len(p.vertices) - 2 for p in datos.polygons)


def marca(col, raiz, nombre, pos, tipo="SINGLE_ARROW"):
    obj = bpy.data.objects.new(nombre, None)
    obj.empty_display_type = tipo
    obj.empty_display_size = 0.4
    col.objects.link(obj)
    obj.parent = raiz
    obj.location = pos


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    col = bpy.data.collections.get(NAVE) or bpy.data.collections.new(NAVE)
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    raiz = bpy.data.objects.new(NAVE, None)
    col.objects.link(raiz)
    raiz["collision_radius"] = float(RADIO_COLISION)

    m, cristal, fuego = Malla(), Malla(), Malla()
    casco(m, cristal)
    forro(m)
    gondolas(m, fuego)
    motor(m, fuego)
    patas(m)
    detalles(m, fuego)
    cabina(m)
    tris = objeto(col, raiz, "nave_Casco", m, material("M_Paleta_nave"))
    tris += objeto(col, raiz, "nave_Cristal", cristal, material("M_Cristal_nave", alfa=0.18, rugosidad=0.05))
    tris += objeto(col, raiz, "nave_Motor", fuego, material("M_Motor_nave", FUEGO))

    marca(col, raiz, "SEAT_Piloto", (0.0, 0.5, 0.42))
    marca(col, raiz, "EXIT_Escotilla", (-2.3, 1.1, -RADIO_COLISION), "SPHERE")
    print(f"nave: {tris} triángulos, radio de colisión {RADIO_COLISION} m")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print(f"Guardado {BLEND}")


main()

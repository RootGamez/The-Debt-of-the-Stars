# Genera la nave del jugador "El Albatros II" (Fase 5) y la guarda en blender/nave.blend.
# Diseño retro-futurista analógico/rústico basado en la Propuesta 4:
# - Chasis de chapa octogonal remachada (azul pizarra/óxido/metal).
# - Cúpula de mando delantera facetada con montantes y cristales estilizados.
# - Módulos de soporte vital: 4 tanques cilíndricos con tapas hemisféricas y tuberías de cobre.
# - Antenas de techo: antena parabólica orientable y mástil de sensores/balizas.
# - Propulsores de maniobra multidireccionales (RCS) en 4 esquinas.
# - Motor de empuje térmico trasero con tobera escalonada, aros de refrigeración y núcleo brasa.
# - 4 patas mecánicas de aterrizaje con amortiguadores de muelle, pistones y platos circulares a z = -RADIO_COLISION.
# - Cabina interior en primera persona: asiento con parches, tablero analógico, monitor CRT verde,
#   tubos Nixie naranjas, relojes con aguja roja, palancas con pomos de color, portapapeles y flexo.
#
# Convención de ejes: +Y = proa (adelante), +Z = arriba, +X = derecha (glTF lo exporta como -Z proa).
# Marcas: SEAT_Piloto (ojos del piloto) y EXIT_Escotilla (dónde pisa el suelo al bajar).
# La raíz "nave" lleva collision_radius = 2.0 m.
# Uso: blender -b --factory-startup --python blender/scripts/generar_nave.py

import math
import os
import bpy
import bmesh
from mathutils import Matrix, Vector

NAVE = "nave"
RADIO_COLISION = 2.0  # m: la nave descansa con el centro a esta altura sobre el suelo
SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
BLEND = os.path.join(os.path.dirname(SCRIPTS), f"{NAVE}.blend")

# Paleta de colores lineales (estilo Albatros II / Outer Wilds)
CASCO_AZUL = "#3D5B72"
CASCO_CLARO = "#58768E"
CASCO_OXIDO = "#7A4730"
METAL_OSCURO = "#242830"
METAL_MEDIO = "#3A4048"
METAL_BRILLANTE = "#7B8590"
REMACHE = "#9CA5AD"

# Soporte vital y tuberías
TANQUE_VERDE = "#768266"
TANQUE_OXIDO = "#885038"
COBRE = "#BA6236"
LATON = "#B89642"

# Cabina e interior
CRISTAL = "#8CD2E8"
SUELO = "#2C3138"
ASIENTO_CUERO = "#7A4E32"
ASIENTO_TELA = "#48624C"
CONSOLA = "#252B33"
CRT_CARCASA = "#27382F"
CRT_PANTALLA = "#48E092"
NIXIE_BRILLO = "#FF8024"
DIAL_BLANCO = "#E6E0D2"
AGUJA_ROJA = "#C83226"
POMO_ROJO = "#C43030"
POMO_AZUL = "#3268B8"
POMO_AMARILLO = "#D6A426"
PAPEL = "#E4DEC8"
BOMBILLA = "#FFD868"

# Motor y propulsores
BRASA = "#FF7C24"
NUCLEO_CALIENTE = "#FFE484"
TOBERA_EXTERIOR = "#32373F"
TOBERA_QUEMADA = "#6E4230"
MUELLE_AMORTIGUADOR = "#CFA445"
PLATO_PIE = "#32363D"


def hex_lineal(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1.0]


def matriz(pos=(0, 0, 0), rot=(0, 0, 0), escala=(1, 1, 1)):
    t = Matrix.Translation(Vector(pos))
    r = Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")
    s = Matrix.Diagonal(Vector((*escala, 1.0)))
    return t @ r @ s


def pieza(bm, capa, color, crear, m, **kw):
    """Crea una primitiva bmesh, la transforma y asigna color a todas sus caras."""
    res = crear(bm, **kw)
    verts = res["verts"]
    bmesh.ops.transform(bm, matrix=m, verts=verts)
    caras = {f for v in verts for f in v.link_faces}
    rgba = hex_lineal(color)
    for f in caras:
        for loop in f.loops:
            loop[capa] = rgba


def esfera(bm, u=5, v=3, r=1.0, **kw):
    try:
        return bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    except TypeError:
        return bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, diameter=r * 2)


def caja(bm, size=1.0, **kw):
    return bmesh.ops.create_cube(bm, size=size)


def cono(bm, r1=0.5, r2=0.0, profundo=1.0, lados=6, **kw):
    try:
        return bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=r1, radius2=r2, depth=profundo)
    except TypeError:
        return bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, diameter1=r1 * 2, diameter2=r2 * 2, depth=profundo)


def cilindro(bm, r=0.5, profundo=1.0, lados=6, **kw):
    return cono(bm, r1=r, r2=r, profundo=profundo, lados=lados)


def construir_fuselaje(bm, capa):
    pi_2 = math.pi / 2
    pi_8 = math.pi / 8

    # Cuerpo principal octogonal
    m_cuerpo = matriz((0, -0.1, 0.1), (pi_2, 0, pi_8))
    pieza(bm, capa, CASCO_AZUL, cilindro, m_cuerpo, r=1.15, profundo=2.8, lados=8)

    # Paneles de acento y chapa remachada
    for lado in (-1, 1):
        pieza(bm, capa, CASCO_CLARO, caja, matriz((lado * 1.16, -0.1, 0.1), escala=(0.04, 2.4, 0.5)))
        pieza(bm, capa, CASCO_OXIDO, caja, matriz((lado * 1.17, 0.3, 0.25), escala=(0.03, 0.6, 0.35)))
        pieza(bm, capa, CASCO_OXIDO, caja, matriz((lado * 1.17, -0.6, -0.1), escala=(0.03, 0.5, 0.3)))

    # Aros de refuerzo estructural
    for y_aro in (-1.2, -0.1, 0.9):
        pieza(bm, capa, METAL_OSCURO, cilindro, matriz((0, y_aro, 0.1), (pi_2, 0, pi_8)), r=1.17, profundo=0.05, lados=8)
        pieza(bm, capa, REMACHE, cilindro, matriz((0, y_aro, 0.1), (pi_2, 0, pi_8)), r=1.18, profundo=0.02, lados=8)


def construir_cabina_exterior(bm, capa):
    pi_2 = math.pi / 2
    pi_8 = math.pi / 8

    # Transición frontal cónica (de Y = 1.3 a Y = 2.0)
    m_morro = matriz((0, 1.65, 0.1), (pi_2, 0, pi_8))
    pieza(bm, capa, CASCO_AZUL, cono, m_morro, r1=1.15, r2=0.92, profundo=0.7, lados=8)

    # Cúpula facetada frontal (de Y = 2.0 a Y = 2.65): estructura de montantes oscuros
    m_cupula = matriz((0, 2.32, 0.1), (pi_2, 0, pi_8))
    pieza(bm, capa, METAL_OSCURO, cono, m_cupula, r1=0.92, r2=0.55, profundo=0.65, lados=8)

    # Cristal frontal central (inclinado hacia adelante/abajo)
    pieza(bm, capa, CRISTAL, caja, matriz((0, 2.58, 0.12), (-0.35, 0, 0), (0.48, 0.04, 0.38)))

    # Cristales superiores frontales (mirando hacia el cielo)
    pieza(bm, capa, CRISTAL, caja, matriz((0, 2.38, 0.48), (0.6, 0, 0), (0.48, 0.04, 0.32)))
    for lado in (-1, 1):
        pieza(bm, capa, CRISTAL, caja, matriz((lado * 0.42, 2.32, 0.45), (0.5, lado * 0.4, 0), (0.36, 0.04, 0.28)))
        pieza(bm, capa, CRISTAL, caja, matriz((lado * 0.72, 2.22, 0.15), (0, lado * 0.65, 0), (0.04, 0.42, 0.38)))
        pieza(bm, capa, CRISTAL, caja, matriz((lado * 0.45, 2.38, -0.2), (-0.5, lado * 0.35, 0), (0.35, 0.04, 0.26)))

    # Montantes y travesaños del marco de la cúpula
    pieza(bm, capa, METAL_OSCURO, caja, matriz((0, 2.52, 0.32), (0.1, 0, 0), (0.55, 0.08, 0.08)))
    pieza(bm, capa, METAL_OSCURO, caja, matriz((0, 2.52, -0.06), (-0.1, 0, 0), (0.55, 0.08, 0.08)))
    for lado in (-1, 1):
        pieza(bm, capa, METAL_OSCURO, caja, matriz((lado * 0.28, 2.52, 0.12), (0, 0, lado * 0.2), (0.08, 0.08, 0.52)))


def construir_cabina_interior(bm, capa):
    # Suelo interior antideslizante
    pieza(bm, capa, SUELO, caja, matriz((0, 1.0, -0.52), escala=(1.4, 2.0, 0.08)))

    # Pedales de timón
    for lado in (-1, 1):
        pieza(bm, capa, METAL_OSCURO, caja, matriz((lado * 0.22, 1.72, -0.42), (-0.6, 0, 0), (0.14, 0.08, 0.04)))

    # Asiento del piloto con parches
    pieza(bm, capa, METAL_OSCURO, caja, matriz((0, 0.52, -0.38), escala=(0.36, 0.42, 0.2)))
    pieza(bm, capa, ASIENTO_CUERO, caja, matriz((0, 0.55, -0.16), escala=(0.64, 0.62, 0.18)))
    pieza(bm, capa, ASIENTO_TELA, caja, matriz((0.15, 0.68, -0.06), escala=(0.28, 0.24, 0.03)))
    pieza(bm, capa, ASIENTO_CUERO, caja, matriz((0, 0.22, 0.24), (0.22, 0, 0), (0.6, 0.14, 0.68)))
    pieza(bm, capa, ASIENTO_TELA, caja, matriz((-0.14, 0.26, 0.38), (0.22, 0, 0), (0.26, 0.03, 0.26)))
    pieza(bm, capa, ASIENTO_CUERO, caja, matriz((0, 0.12, 0.64), (0.15, 0, 0), (0.38, 0.12, 0.22)))
    for lado in (-1, 1):
        pieza(bm, capa, METAL_OSCURO, caja, matriz((lado * 0.36, 0.48, -0.05), escala=(0.08, 0.45, 0.12)))
        pieza(bm, capa, ASIENTO_CUERO, caja, matriz((lado * 0.36, 0.52, 0.03), escala=(0.1, 0.42, 0.05)))

    # Consola envolvente
    pieza(bm, capa, CONSOLA, caja, matriz((0, 1.82, -0.05), (-0.42, 0, 0), (1.5, 0.48, 0.45)))
    pieza(bm, capa, CONSOLA, caja, matriz((0, 1.62, 0.22), (-0.42, 0, 0), (1.3, 0.12, 0.25)))

    # 1. Monitor CRT abombado a la derecha
    pieza(bm, capa, CRT_CARCASA, caja, matriz((0.32, 1.76, 0.24), (-0.42, -0.15, 0), (0.42, 0.32, 0.34)))
    pieza(bm, capa, METAL_OSCURO, caja, matriz((0.32, 1.62, 0.29), (-0.42, -0.15, 0), (0.38, 0.06, 0.28)))
    pieza(bm, capa, CRT_PANTALLA, caja, matriz((0.32, 1.65, 0.28), (-0.42, -0.15, 0), (0.32, 0.02, 0.22)))

    # 2. Tubos Nixie en el centro/izquierda (2 dígitos indicadores estilizados)
    pieza(bm, capa, METAL_OSCURO, caja, matriz((-0.08, 1.78, 0.32), (-0.42, 0, 0), (0.18, 0.08, 0.06)))
    for i in (-0.05, 0.05):
        m_nixie = matriz((-0.08 + i, 1.74, 0.34), (-0.42, 0, 0))
        pieza(bm, capa, CRISTAL, cilindro, m_nixie, r=0.028, profundo=0.08, lados=4)
        pieza(bm, capa, NIXIE_BRILLO, cilindro, m_nixie, r=0.016, profundo=0.06, lados=4)

    # 3. Diales analógicos / manómetros a la izquierda
    pieza(bm, capa, LATON, cilindro, matriz((-0.38, 1.72, 0.25), (math.pi / 2 - 0.42, 0, 0)), r=0.12, profundo=0.03, lados=6)
    pieza(bm, capa, DIAL_BLANCO, cilindro, matriz((-0.38, 1.70, 0.26), (math.pi / 2 - 0.42, 0, 0)), r=0.10, profundo=0.02, lados=6)
    pieza(bm, capa, AGUJA_ROJA, caja, matriz((-0.38, 1.69, 0.28), (-0.42, 0, 0.5), (0.015, 0.01, 0.09)))

    pieza(bm, capa, LATON, cilindro, matriz((-0.56, 1.68, 0.18), (math.pi / 2 - 0.42, 0, 0)), r=0.09, profundo=0.03, lados=6)
    pieza(bm, capa, DIAL_BLANCO, cilindro, matriz((-0.56, 1.66, 0.19), (math.pi / 2 - 0.42, 0, 0)), r=0.075, profundo=0.02, lados=6)

    # 4. Palancas de control con pomos de colores
    pieza(bm, capa, METAL_OSCURO, caja, matriz((-0.45, 1.35, -0.06), escala=(0.28, 0.35, 0.08)))
    palancas = [(-0.52, POMO_ROJO, 0.15), (-0.45, POMO_AZUL, -0.1), (-0.38, POMO_AMARILLO, 0.05)]
    for x_p, color_pomo, inclinacion in palancas:
        m_varilla = matriz((x_p, 1.35 + inclinacion * 0.1, 0.04), (inclinacion, 0, 0))
        pieza(bm, capa, METAL_BRILLANTE, cilindro, m_varilla, r=0.012, profundo=0.18, lados=4)
        pieza(bm, capa, color_pomo, caja, matriz((x_p, 1.35 + inclinacion * 0.2, 0.13)), escala=(0.06, 0.06, 0.06))

    # 5. Portapapeles con checklist pegada
    pieza(bm, capa, LATON, caja, matriz((0.54, 1.58, 0.05), (-0.35, -0.2, 0), (0.24, 0.32, 0.02)))
    pieza(bm, capa, PAPEL, caja, matriz((0.54, 1.57, 0.06), (-0.35, -0.2, 0), (0.20, 0.28, 0.01)))

    # 6. Flexo / bombilla de lectura de cabina
    pieza(bm, capa, METAL_OSCURO, cilindro, matriz((0.48, 1.45, 0.68), (0, 0.3, 0)), r=0.015, profundo=0.15, lados=4)
    pieza(bm, capa, LATON, cono, matriz((0.45, 1.48, 0.62), (0.4, 0, 0)), r1=0.06, r2=0.03, profundo=0.08, lados=5)
    pieza(bm, capa, BOMBILLA, caja, matriz((0.45, 1.50, 0.59)), escala=(0.05, 0.05, 0.05))


def construir_soporte_vital(bm, capa):
    pi_2 = math.pi / 2
    for lado in (-1, 1):
        # 1. Tanque superior (más grande, tono verdoso)
        x_sup = lado * 1.28
        y_sup = -0.15
        z_sup = 0.56
        m_tanque_sup = matriz((x_sup, y_sup, z_sup), (pi_2, 0, 0))
        pieza(bm, capa, TANQUE_VERDE, cilindro, m_tanque_sup, r=0.30, profundo=1.6, lados=6)
        # Tapas piramidales/cónicas low poly
        pieza(bm, capa, TANQUE_VERDE, cono, matriz((x_sup, y_sup + 0.85, z_sup), (-pi_2, 0, 0)), r1=0.30, r2=0.08, profundo=0.18, lados=6)
        pieza(bm, capa, TANQUE_VERDE, cono, matriz((x_sup, y_sup - 0.85, z_sup), (pi_2, 0, 0)), r1=0.30, r2=0.08, profundo=0.18, lados=6)

        # Abrazaderas metálicas oscuras
        for y_abraz in (y_sup - 0.45, y_sup + 0.45):
            pieza(bm, capa, METAL_OSCURO, caja, matriz((x_sup, y_abraz, z_sup), escala=(0.64, 0.08, 0.64)))
            pieza(bm, capa, METAL_OSCURO, caja, matriz((lado * 1.15, y_abraz, z_sup), escala=(0.22, 0.08, 0.12)))

        # 2. Tanque inferior (algo más compacto, tono óxido/bronce)
        x_inf = lado * 1.30
        y_inf = -0.22
        z_inf = -0.16
        m_tanque_inf = matriz((x_inf, y_inf, z_inf), (pi_2, 0, 0))
        pieza(bm, capa, TANQUE_OXIDO, cilindro, m_tanque_inf, r=0.24, profundo=1.4, lados=6)
        pieza(bm, capa, TANQUE_OXIDO, cono, matriz((x_inf, y_inf + 0.75, z_inf), (-pi_2, 0, 0)), r1=0.24, r2=0.06, profundo=0.16, lados=6)
        pieza(bm, capa, TANQUE_OXIDO, cono, matriz((x_inf, y_inf - 0.75, z_inf), (pi_2, 0, 0)), r1=0.24, r2=0.06, profundo=0.16, lados=6)

        for y_abraz in (y_inf - 0.38, y_inf + 0.38):
            pieza(bm, capa, METAL_OSCURO, caja, matriz((x_inf, y_abraz, z_inf), escala=(0.52, 0.07, 0.52)))
            pieza(bm, capa, METAL_OSCURO, caja, matriz((lado * 1.16, y_abraz, z_inf), escala=(0.24, 0.07, 0.10)))

        # 3. Tuberías de cobre curvadas conectoras
        pieza(bm, capa, COBRE, caja, matriz((x_sup, y_sup + 0.95, z_sup), escala=(0.06, 0.25, 0.06)))
        pieza(bm, capa, COBRE, caja, matriz((lado * 1.18, y_sup + 1.05, z_sup), escala=(0.22, 0.06, 0.06)))

        pieza(bm, capa, COBRE, caja, matriz((lado * 1.38, y_sup - 0.1, (z_sup + z_inf) / 2), escala=(0.06, 0.06, 0.52)))

        pieza(bm, capa, COBRE, caja, matriz((x_inf, y_inf - 0.85, z_inf), escala=(0.06, 0.28, 0.06)))
        pieza(bm, capa, COBRE, caja, matriz((lado * 1.05, y_inf - 0.95, z_inf), escala=(0.35, 0.06, 0.06)))


def construir_antenas_techo(bm, capa):
    pi_2 = math.pi / 2

    # 1. Antena parabólica (orientada hacia arriba y en ángulo)
    x_rad = -0.12
    y_rad = 0.65
    z_rad = 1.26
    pieza(bm, capa, METAL_OSCURO, cilindro, matriz((x_rad, y_rad, z_rad)), r=0.18, profundo=0.08, lados=6)
    m_brazo = matriz((x_rad, y_rad + 0.05, z_rad + 0.16), (-0.35, 0, 0))
    pieza(bm, capa, METAL_MEDIO, cilindro, m_brazo, r=0.035, profundo=0.28, lados=4)
    m_plato = matriz((x_rad, y_rad + 0.14, z_rad + 0.38), (pi_2 - 0.45, 0, -0.2))
    pieza(bm, capa, METAL_BRILLANTE, cono, m_plato, r1=0.42, r2=0.08, profundo=0.18, lados=8)
    m_foco = matriz((x_rad, y_rad + 0.22, z_rad + 0.48), (pi_2 - 0.45, 0, -0.2))
    pieza(bm, capa, LATON, cono, m_foco, r1=0.03, r2=0.005, profundo=0.18, lados=4)

    # 2. Mástil de comunicaciones y sensores
    x_mast = 0.28
    y_mast = -0.45
    z_mast = 1.26
    pieza(bm, capa, METAL_OSCURO, cilindro, matriz((x_mast, y_mast, z_mast)), r=0.12, profundo=0.06, lados=6)
    pieza(bm, capa, METAL_MEDIO, cilindro, matriz((x_mast, y_mast, z_mast + 0.45)), r=0.028, profundo=0.9, lados=4)
    pieza(bm, capa, METAL_MEDIO, cilindro, matriz((x_mast, y_mast, z_mast + 0.72), (0, pi_2, 0)), r=0.016, profundo=0.32, lados=4)
    pieza(bm, capa, CASCO_AZUL, caja, matriz((x_mast, y_mast, z_mast + 0.52), escala=(0.14, 0.14, 0.16)))
    pieza(bm, capa, BOMBILLA, caja, matriz((x_mast, y_mast, z_mast + 0.92)), escala=(0.08, 0.08, 0.08))


def construir_rcs(bm, capa):
    pi_2 = math.pi / 2
    bloques = [
        (0.92, 1.25, 0.92, 0.4, 0.5),    # Delantero superior derecho
        (-0.92, 1.25, 0.92, 0.4, -0.5),  # Delantero superior izquierdo
        (0.95, -1.15, -0.65, -0.4, 0.5), # Trasero inferior derecho
        (-0.95, -1.15, -0.65, -0.4, -0.5) # Trasero inferior izquierdo
    ]
    for x_b, y_b, z_b, rx, rz in bloques:
        m_base = matriz((x_b, y_b, z_b), (rx, 0, rz))
        pieza(bm, capa, METAL_OSCURO, caja, m_base, escala=(0.18, 0.18, 0.15))

        toberas_offset = [
            (Vector((0.08, 0.0, 0.08)), (0, pi_2 * 0.7, 0)),
            (Vector((0.0, 0.08, 0.08)), (-pi_2 * 0.7, 0, 0)),
            (Vector((0.08, 0.08, 0.0)), (0, 0, 0))
        ]
        for v_off, rot_t in toberas_offset:
            m_t = matriz(Vector((x_b, y_b, z_b)) + m_base.to_3x3() @ v_off, (rx + rot_t[0], rot_t[1], rz + rot_t[2]))
            pieza(bm, capa, METAL_MEDIO, cono, m_t, r1=0.02, r2=0.05, profundo=0.10, lados=4)


def construir_motor_termico(bm, capa):
    pi_2 = math.pi / 2
    pi_8 = math.pi / 8

    # 1. Transición de cola
    m_trans = matriz((0, -1.68, 0.1), (pi_2, 0, pi_8))
    pieza(bm, capa, CASCO_AZUL, cono, m_trans, r1=0.95, r2=1.15, profundo=0.35, lados=8)

    # 2. Bloque cilíndrico del motor primario
    m_bloque = matriz((0, -2.15, 0.1), (pi_2, 0, 0))
    pieza(bm, capa, TOBERA_EXTERIOR, cilindro, m_bloque, r=0.82, profundo=0.6, lados=8)

    # Aros de refrigeración
    for y_aro in (-1.95, -2.15, -2.35):
        pieza(bm, capa, METAL_MEDIO, cilindro, matriz((0, y_aro, 0.1), (pi_2, 0, 0)), r=0.88, profundo=0.06, lados=8)

    # Tuberías exteriores de combustible en el motor
    for ang in (0.78, 2.35, 3.92, 5.50):
        x_tub = math.cos(ang) * 0.86
        z_tub = math.sin(ang) * 0.86 + 0.1
        pieza(bm, capa, COBRE, cilindro, matriz((x_tub, -2.15, z_tub), (pi_2, 0, 0)), r=0.035, profundo=0.55, lados=4)

    # 3. Gran tobera cónica divergente
    m_tobera = matriz((0, -2.95, 0.1), (pi_2, 0, 0))
    pieza(bm, capa, TOBERA_EXTERIOR, cono, m_tobera, r1=1.02, r2=0.65, profundo=1.0, lados=8)

    # Labio exterior engrosado de la tobera
    pieza(bm, capa, METAL_OSCURO, cilindro, matriz((0, -3.42, 0.1), (pi_2, 0, 0)), r=1.05, profundo=0.08, lados=8)

    # Anillos de refuerzo estructural en la campana
    pieza(bm, capa, METAL_OSCURO, cono, matriz((0, -2.95, 0.1), (pi_2, 0, 0)), r1=0.85, r2=0.80, profundo=0.08, lados=8)

    # 4. Interior térmico incandescente (brasa / núcleo de empuje)
    m_brasa = matriz((0, -2.75, 0.1), (pi_2, 0, 0))
    pieza(bm, capa, BRASA, cono, m_brasa, r1=0.58, r2=0.25, profundo=0.55, lados=8)
    m_nucleo = matriz((0, -2.55, 0.1), (pi_2, 0, 0))
    pieza(bm, capa, NUCLEO_CALIENTE, cono, m_nucleo, r1=0.22, r2=0.05, profundo=0.20, lados=6)


def construir_patas_aterrizaje(bm, capa):
    patas = [
        (1, 0.85, 0.35),   # Delantera derecha
        (-1, 0.85, 0.35),  # Delantera izquierda
        (1, -0.85, -0.35), # Trasera derecha
        (-1, -0.85, -0.35) # Trasera izquierda
    ]
    for signo_x, y_p, ang_y in patas:
        x_anclaje = signo_x * 0.95
        z_anclaje = -0.45

        # 1. Anclaje al chasis (horquilla articulada)
        pieza(bm, capa, METAL_OSCURO, caja, matriz((x_anclaje, y_p, z_anclaje), escala=(0.28, 0.32, 0.22)))

        # 2. Brazo superior diagonal hacia afuera
        x_codo = signo_x * 1.55
        y_codo = y_p + ang_y * 0.3
        z_codo = -1.15

        dx = x_codo - x_anclaje
        dy = y_codo - y_p
        dz = z_codo - z_anclaje
        longitud_brazo = math.sqrt(dx*dx + dy*dy + dz*dz)

        centro_brazo = Vector(((x_anclaje + x_codo) / 2, (y_p + y_codo) / 2, (z_anclaje + z_codo) / 2))
        dir_brazo = Vector((dx, dy, dz)).normalized()
        rot_brazo = Vector((0, 0, 1)).rotation_difference(dir_brazo).to_matrix().to_4x4()
        m_brazo = Matrix.Translation(centro_brazo) @ rot_brazo

        pieza(bm, capa, METAL_MEDIO, cilindro, m_brazo, r=0.075, profundo=longitud_brazo, lados=5)

        # 3. Amortiguador con muelle helicoidal
        pieza(bm, capa, METAL_OSCURO, cilindro, m_brazo, r=0.13, profundo=longitud_brazo * 0.65, lados=5)
        for i_res in (-0.12, 0.12):
            m_espiral = Matrix.Translation(centro_brazo + dir_brazo * (i_res * longitud_brazo)) @ rot_brazo
            pieza(bm, capa, MUELLE_AMORTIGUADOR, cilindro, m_espiral, r=0.145, profundo=0.08, lados=5)

        # 4. Articulación de codo hidráulica (bloque facetado robusto)
        pieza(bm, capa, METAL_OSCURO, caja, matriz((x_codo, y_codo, z_codo)), escala=(0.28, 0.28, 0.28))

        # 5. Pistón vertical inferior telescópico
        z_suelo_plato = -RADIO_COLISION + 0.08
        alto_piston = z_codo - z_suelo_plato
        m_piston = matriz((x_codo, y_codo, (z_codo + z_suelo_plato) / 2))
        pieza(bm, capa, METAL_BRILLANTE, cilindro, m_piston, r=0.06, profundo=alto_piston, lados=5)

        # 6. Plato circular ancho de aterrizaje en la base
        m_pie = matriz((x_codo, y_codo, -RADIO_COLISION + 0.05))
        pieza(bm, capa, PLATO_PIE, cono, m_pie, r1=0.40, r2=0.22, profundo=0.10, lados=7)


def construir_escotilla(bm, capa):
    x_esc = 1.16
    y_esc = 0.25
    z_esc = 0.0
    pieza(bm, capa, METAL_OSCURO, caja, matriz((x_esc, y_esc, z_esc), escala=(0.04, 0.65, 0.95)))
    pieza(bm, capa, CASCO_OXIDO, caja, matriz((x_esc + 0.01, y_esc, z_esc), escala=(0.03, 0.55, 0.82)))
    pieza(bm, capa, POMO_AMARILLO, cilindro, matriz((x_esc + 0.04, y_esc, z_esc), (0, math.pi / 2, 0)), r=0.12, profundo=0.04, lados=6)

    for z_pel in (-0.55, -0.85, -1.15, -1.45):
        pieza(bm, capa, POMO_AMARILLO, caja, matriz((1.18, y_esc, z_pel), escala=(0.06, 0.38, 0.04)))


def construir():
    bm = bmesh.new()
    capa = bm.loops.layers.float_color.new("Color")

    construir_fuselaje(bm, capa)
    construir_cabina_exterior(bm, capa)
    construir_cabina_interior(bm, capa)
    construir_soporte_vital(bm, capa)
    construir_antenas_techo(bm, capa)
    construir_rcs(bm, capa)
    construir_motor_termico(bm, capa)
    construir_patas_aterrizaje(bm, capa)
    construir_escotilla(bm, capa)

    return bm


def material():
    mat = bpy.data.materials.new("M_Paleta_nave")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = 0.8
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Color"
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def marca(col, raiz, nombre, pos, tipo="SINGLE_ARROW"):
    obj = bpy.data.objects.new(nombre, None)
    obj.empty_display_type = tipo
    obj.empty_display_size = 0.5
    col.objects.link(obj)
    obj.parent = raiz
    obj.location = pos
    return obj


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    col = bpy.data.collections.get(NAVE) or bpy.data.collections.new(NAVE)
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)

    raiz = bpy.data.objects.new(NAVE, None)
    raiz.empty_display_size = 1.0
    col.objects.link(raiz)
    raiz["collision_radius"] = float(RADIO_COLISION)

    bm = construir()
    malla = bpy.data.meshes.new("nave_Casco")
    bm.to_mesh(malla)
    bm.free()
    for p in malla.polygons:
        p.use_smooth = False
    malla.color_attributes.active_color = malla.color_attributes["Color"]
    malla.materials.append(material())
    casco = bpy.data.objects.new("nave_Casco", malla)
    col.objects.link(casco)
    casco.parent = raiz

    marca(col, raiz, "SEAT_Piloto", (0.0, 0.75, 0.45))
    marca(col, raiz, "EXIT_Escotilla", (2.1, 0.25, -RADIO_COLISION), "SPHERE")

    tris = sum(len(p.vertices) - 2 for p in malla.polygons)
    print(f"nave: {tris} triángulos, radio de colisión {RADIO_COLISION} m")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print(f"Guardado {BLEND}")


main()

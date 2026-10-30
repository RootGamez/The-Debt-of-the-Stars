# Genera el Contrapeso y lo guarda en blender/contrapeso.blend (Fase 10, hito 10B).
#
# Qué es (CONTEXTO_HISTORIA.md, 🟡 el aspecto): el artilugio que terminaron los tres del Laboratorio para
# sustituir el motor viejo de Cicatriz. Gramática de los Ausentes: anillos y estratos, marcas de reloj,
# arenisca clara y pizarra, luz ámbar. Un núcleo de luz sujeto por dos husos de pizarra en un eje de latón;
# alrededor, tres anillos que giran (dos meridianos y el ecuador, como una esfera armilar propia) dentro de un
# aro fijo con doce marcas: su reloj. Un pie de arenisca en estratos y dos asas para llevarlo en brazos.
# Mide unos 0,8 m de alto: se lleva a pie, con las dos manos (sin correr), y viaja en el relicario de la nave.
#
# Ejes: +Z arriba (glTF lo exporta como +Y); origen en el centro del núcleo.
# Mallas: contrapeso_Cuerpo (paleta), contrapeso_Luz (ámbar, emisiva: el juego la aviva) y los anillos
# contrapeso_AnilloA/B/C, aparte y con origen en el centro: giran alrededor de su Z (propiedad `spin`, rad/s).
# Uso: blender -b --factory-startup --python blender/scripts/generar_contrapeso.py   (sobrescribe contrapeso.blend)
import math
import os
import sys

import bpy

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

NOMBRE = "contrapeso"
BLEND = os.path.join(os.path.dirname(SCRIPTS), f"{NOMBRE}.blend")

ARENISCA = "#B9AE96"
ARENISCA_OSCURA = "#8E8570"
PIZARRA = "#2C3834"
PIZARRA_CLARA = "#4A5A54"
LATON = "#A88A50"
LATON_OSCURO = "#7A6236"
AMBAR = "#FFC070"

# El aro fijo (la esfera del reloj) y los anillos que giran dentro, sin tocarse al girar.
ARO = 0.31
ANILLOS = (  # nombre, radio, grosor, color, giro (rad/s), plano
    ("contrapeso_AnilloA", 0.25, 0.014, LATON, 0.45, "meridiano"),
    ("contrapeso_AnilloB", 0.195, 0.012, ARENISCA, -0.7, "meridiano_girado"),
    ("contrapeso_AnilloC", 0.145, 0.012, PIZARRA_CLARA, 0.25, "ecuador"),
)
PIE_ARRIBA = -ARO - 0.015
CUARTO = math.pi / 2


def material(nombre, emisivo=None):
    mat = bpy.data.materials.new(nombre)
    mat.use_nodes = True
    mat.use_backface_culling = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = 0.7
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Color"
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    if emisivo:
        bsdf.inputs["Emission Color"].default_value = ac.hex_lineal(emisivo)
        bsdf.inputs["Emission Strength"].default_value = 1.5
    return mat


def marcas_en_aro(m, radio, cuantas, color, color_primera, plano, largo=0.05, ancho=0.02):
    """Marcas de reloj sobre un aro: en el plano XZ (meridiano) o XY (ecuador)."""
    for k in range(cuantas):
        a = 2 * math.pi * k / cuantas
        if plano == "ecuador":
            pos = (math.cos(a) * radio, math.sin(a) * radio, 0)
            rot = (0, 0, a)
            escala = (largo, ancho, ancho * 1.6)
        else:
            pos = (math.cos(a) * radio, 0, math.sin(a) * radio)
            rot = (0, -a, 0)
            escala = (largo, ancho * 1.6, ancho)
        m.pieza(color_primera if k == 0 else color, ac.caja, ac.matriz(pos, rot, escala))


def anillo(radio, grosor, color, plano):
    """Un anillo que gira, en coordenadas locales de su centro, con sus marcas."""
    m = ac.Malla()
    giro = {"meridiano": (0, 0, 0), "meridiano_girado": (0, 0, CUARTO), "ecuador": (CUARTO, 0, 0)}[plano]
    m.pieza(color, ac.toro(radio, grosor, 28, 5), ac.matriz(rot=giro))
    if plano == "meridiano_girado":
        # El anillo girado está en el plano YZ: sus marcas también.
        for k in range(8):
            a = 2 * math.pi * k / 8
            pos = (0, math.cos(a) * radio, math.sin(a) * radio)
            m.pieza(AMBAR if k == 0 else PIZARRA, ac.caja, ac.matriz(pos, (a, 0, 0), (0.026, 0.035, 0.016)))
    elif plano == "ecuador":
        marcas_en_aro(m, radio, 12, ARENISCA, AMBAR, "ecuador", 0.035, 0.016)
    else:
        marcas_en_aro(m, radio, 8, PIZARRA, AMBAR, "meridiano", 0.035, 0.016)
    return m


def cuerpo(m, luz):
    # El pie en estratos: arenisca oscura, una franja de pizarra y arenisca clara arriba.
    perfil = [(0.0, PIE_ARRIBA - 0.1), (0.2, PIE_ARRIBA - 0.1), (0.23, PIE_ARRIBA - 0.075),
              (0.22, PIE_ARRIBA - 0.06), (0.0, PIE_ARRIBA - 0.06)]
    m.pieza(ARENISCA_OSCURA, ac.torno(perfil, 14), ac.matriz())
    m.pieza(PIZARRA, ac.torno([(0.0, PIE_ARRIBA - 0.06), (0.19, PIE_ARRIBA - 0.06), (0.19, PIE_ARRIBA - 0.035),
                               (0.0, PIE_ARRIBA - 0.035)], 14), ac.matriz())
    m.pieza(ARENISCA, ac.torno([(0.0, PIE_ARRIBA - 0.035), (0.16, PIE_ARRIBA - 0.035), (0.11, PIE_ARRIBA),
                                (0.0, PIE_ARRIBA)], 14), ac.matriz())
    # El aro fijo con sus marcas (arriba no: ahí está la tapa) y dos asas a los lados.
    m.pieza(PIZARRA, ac.toro(ARO, 0.02, 32, 6), ac.matriz())
    for k in range(1, 12):
        a = CUARTO + 2 * math.pi * k / 12
        m.pieza(ARENISCA, ac.caja, ac.matriz((math.cos(a) * ARO, 0, math.sin(a) * ARO), (0, -a, 0),
                                             (0.055, 0.05, 0.02)))
    for lado in (-1, 1):
        m.pieza(LATON, ac.toro(0.055, 0.013, 14, 4), ac.matriz((lado * (ARO + 0.06), 0, 0)))
        m.pieza(LATON_OSCURO, ac.cilindro(0.022, 8), ac.matriz((lado * (ARO + 0.005), 0, 0), (0, CUARTO, 0),
                                                               (1, 1, 0.03)))
    # El eje de latón, de polo a polo, y la tapa de arriba con su anillo de luz.
    m.pieza(LATON, ac.cilindro(0.016, 8), ac.matriz((0, 0, 0.005), escala=(1, 1, 2 * ARO + 0.02)))
    m.pieza(ARENISCA, ac.torno([(0.0, ARO + 0.01), (0.05, ARO + 0.01), (0.045, ARO + 0.045), (0.0, ARO + 0.06)], 10),
            ac.matriz())
    luz.pieza(AMBAR, ac.toro(0.04, 0.008, 12, 4), ac.matriz((0, 0, ARO + 0.035), (CUARTO, 0, 0)))
    # Dos husos de pizarra sujetan el núcleo.
    for signo in (-1, 1):
        m.pieza(PIZARRA, ac.cono(0.016, 0.055, 10), ac.matriz((0, 0, signo * 0.11), (0 if signo > 0 else math.pi, 0, 0),
                                                            (1, 1, 0.09)))
        m.pieza(LATON, ac.cilindro(0.06, 10), ac.matriz((0, 0, signo * 0.067), escala=(1, 1, 0.012)))
    # El núcleo: luz ámbar.
    luz.pieza(AMBAR, ac.bola(0.065, 1), ac.matriz())


def objeto(col, raiz, nombre, malla, mat, propiedades=None):
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
    for clave, valor in (propiedades or {}).items():
        obj[clave] = valor
    return sum(len(p.vertices) - 2 for p in datos.polygons)


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    col = bpy.data.collections.get(NOMBRE) or bpy.data.collections.new(NOMBRE)
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    raiz = bpy.data.objects.new(NOMBRE, None)
    col.objects.link(raiz)

    paleta = material("M_Paleta_contrapeso")
    m, luz = ac.Malla(), ac.Malla()
    cuerpo(m, luz)
    tris = objeto(col, raiz, "contrapeso_Cuerpo", m, paleta)
    tris += objeto(col, raiz, "contrapeso_Luz", luz, material("M_Luz_contrapeso", AMBAR))
    for nombre, radio, grosor, color, giro, plano in ANILLOS:
        tris += objeto(col, raiz, nombre, anillo(radio, grosor, color, plano), paleta, {"spin": giro})
    print(f"contrapeso: {tris} triángulos")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print(f"Guardado {BLEND}")


main()

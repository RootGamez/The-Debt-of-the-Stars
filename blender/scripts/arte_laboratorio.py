# Viste el Nudo y el Laboratorio Oculto (CONTEXTO_PLANETAS.md §8; plan de la Fase 7). El Nudo es la garganta
# de la primera Puerta, plegada sobre sí misma: por fuera, una cáscara negra y rugosa con una Puerta de anillos
# y un pequeño muelle donde posarse; por dentro, una cavidad donde la gravedad empuja hacia fuera y se camina
# por la cara interior, con la semilla del Nudo colgando en el centro. Allí, repartido en zonas unidas por
# senderos y farolas, el Laboratorio abandonado con prisa:
#   el Recibidor (la Puerta gemela), la Sala de Trabajo (pizarra y armario con la orden de silencio), el Banco
#   del Contrapeso, el escritorio del escéptico, el de la investigadora, el dormitorio y la Cámara.
# Tiempo muy lento (0,20): lo único que se mueve es la aguja del reloj de mesa y, muy despacio, los anillos
# que rodean la semilla. Atmósfera: verde grisáceo clínico, blanco roto, luz de lámpara cálida.
# Gramática de los Ausentes (🟡): anillos y estratos, marcas de reloj, arenisca clara y pizarra, luz ámbar.
# Uso: blender -b blender/laboratorio.blend --python-exit-code 1 --python blender/scripts/arte_laboratorio.py
import math
import os
import sys

import bpy
from mathutils import Vector

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "laboratorio"

VERDE = "#7C8C80"
VERDE_CLARO = "#9CAC9E"
GRIS = "#555E58"
GRIS_OSCURO = "#2E3430"
BLANCO = "#E4E2D6"
MADERA = "#8A6A48"
LATON = "#A88A50"
PAPEL = "#EDE6D0"
TIZA = "#F4F0E4"
PIZARRA = "#2C3834"
MANTA = "#4A6A72"
SELLO = "#A83A32"
ARENISCA = "#B9AE96"
ARENISCA_OSCURA = "#8E8570"
CASCARA = "#1C1A24"
NEGRO = "#07060A"
AMBAR = "#FFC070"
PLIEGUE = "#CFE6DA"
SEMILLA = "#9FD0C0"

# Dónde está cada zona en la cara interior (latitud, longitud) y hacia dónde mira (rumbo).
RECIBIDOR = (-55.0, 0.0)
SALA = (-18.0, 0.0)
BANCO = (-10.0, 42.0)
ESCEPTICO = (-12.0, -42.0)
CRUCE = (5.0, 0.0)
INVESTIGADORA = (22.0, 28.0)
DORMITORIO = (22.0, -28.0)
CAMARA = (58.0, 0.0)
MUELLE = (-72.0, 0.0)  # por fuera, en la cáscara
# Del centro del Contrapeso (contrapeso.glb) a la base de su pie (generar_contrapeso.py).
CONTRAPESO_BAJO = 0.425


def norte_este(arriba):
    norte = Vector((0, 0, 1)) - arriba * arriba.z
    if norte.length < 1e-6:
        norte = Vector((1, 0, 0))
    norte.normalize()
    return norte, norte.cross(arriba).normalized()


def rumbo_dentro(desde, hacia):
    """Rumbo (grados) en la cara interior para ir de un punto (lat, lon) a otro."""
    a, b = ac.direccion(*desde), ac.direccion(*hacia)
    arriba = -a
    norte, este = norte_este(arriba)
    t = b - a
    t -= arriba * t.dot(arriba)
    return math.degrees(math.atan2(t.dot(este), t.dot(norte)))


def interpolar(desde, hacia, f):
    """Punto (lat, lon) a una fracción `f` del arco entre dos direcciones."""
    d = ac.direccion(*desde).slerp(ac.direccion(*hacia), f).normalized()
    return math.degrees(math.asin(max(-1, min(1, d.z)))), math.degrees(math.atan2(d.y, d.x))


class Laboratorio(ac.Vestido):
    def __init__(self):
        # Luz cálida de lámpara sobre un ambiente verde grisáceo; dentro manda la luz de la semilla.
        super().__init__(MUNDO, AMBAR, SCRIPTS, ambiente=(1.4, "#A8B8A8"))
        self.p = self.planeta
        self.paleta = bpy.data.materials.get(f"M_Paleta_{MUNDO}")
        # Lo que brilla frío (la membrana de las Puertas, el halo de la semilla) va aparte: el emisivo no
        # toma el color de cada cara.
        self.frio = ac.Malla()

    # ---- Piezas -------------------------------------------------------------------------------

    def dentro(self, punto, rumbo, ancho, fondo):
        """Plataforma de una zona de la cara interior, a la altura media del suelo bajo ella. Como la cara es
        cóncava, el terreno la va tapando por los bordes y se entra y se sale sin escalón (el motor no sube
        escalones: con el punto más alto, el borde quedaba hasta un metro por encima del terreno)."""
        apoyo = math.hypot(ancho, fondo) / 2
        lugar = self.p.lugar_dentro(*punto, rumbo=rumbo, apoyo=apoyo, tomar=ac.media)
        self.solido(BLANCO, ac.caja, lugar.m((0, 0, 0.15 - 1.2), escala=(ancho, fondo, 2.4)))
        # Marcas de reloj en el borde (la gramática de los Ausentes): rayas cortas cada tanto.
        for k in range(6):
            a = 2 * math.pi * k / 6
            x, y = math.cos(a) * (ancho / 2 - 0.25), math.sin(a) * (fondo / 2 - 0.25)
            self.vista.pieza(LATON if k == 0 else VERDE, ac.caja, lugar.m((x, y, 0.16), (0, 0, a), (0.35, 0.06, 0.02)))
        return lugar

    def farol(self, lugar, x, y, z=0.15, alto=2.4):
        self.solido(GRIS_OSCURO, ac.cilindro(0.06, 4), lugar.m((x, y, z + alto / 2), escala=(1, 1, alto)))
        self.vista.pieza(LATON, ac.caja, lugar.m((x, y + 0.22, z + alto), escala=(0.06, 0.5, 0.06)))
        self.vista.pieza(LATON, ac.cono(0.2, 0.06, 4), lugar.m((x, y + 0.45, z + alto - 0.08), escala=(1, 1, 0.18)))
        self.luces.pieza(AMBAR, ac.bola(0.1, 0), lugar.m((x, y + 0.45, z + alto - 0.2)))

    def puerta(self, lugar, z=0.0):
        """Anillo de una Puerta plegada, de pie y mirando a +Y, con su membrana pálida y dos pilares."""
        self.vista.pieza(ARENISCA, ac.toro(1.75, 0.2, 24, 4), lugar.m((0, 0, z + 1.55)))
        self.vista.pieza(PIZARRA, ac.toro(1.95, 0.08, 24, 4), lugar.m((0, -0.05, z + 1.55)))
        # Marcas de reloj en el anillo: cada hora de un reloj de doce, y la última en ámbar.
        for k in range(12):
            a = math.pi / 2 - 2 * math.pi * k / 12
            pieza = self.luces if k == 0 else self.vista
            pieza.pieza(AMBAR if k == 0 else PIZARRA, ac.caja,
                        lugar.m((math.cos(a) * 1.75, 0.22, z + 1.55 + math.sin(a) * 1.75), (0, math.pi / 2 - a, 0), (0.08, 0.05, 0.28)))
        self.frio.pieza(PLIEGUE, ac.cilindro(1.52, 20), lugar.m((0, 0, z + 1.55), (math.pi / 2, 0, 0), (1, 1, 0.02)))
        for x in (-2.05, 2.05):
            self.solido(ARENISCA_OSCURA, ac.caja, lugar.m((x, 0, z + 0.9), escala=(0.4, 0.5, 1.8)))
            self.vista.pieza(LATON, ac.caja, lugar.m((x, 0, z + 1.85), escala=(0.48, 0.58, 0.1)))

    def cama(self, lugar, x, y, usada):
        z = 0.15
        self.solido(GRIS, ac.caja, lugar.m((x, y, z + 0.22), escala=(1.0, 2.1, 0.34)))
        self.vista.pieza(BLANCO, ac.caja, lugar.m((x, y, z + 0.46), escala=(0.94, 2.0, 0.14)))
        self.vista.pieza(BLANCO, ac.caja, lugar.m((x, y + 0.8, z + 0.58), escala=(0.6, 0.35, 0.12)))
        if usada:
            # Manta revuelta, almohada torcida y la huella en el colchón.
            self.vista.pieza(MANTA, ac.caja, lugar.m((x + 0.18, y - 0.15, z + 0.58), (0, 0.08, 0.18), (0.8, 1.2, 0.1)))
            self.vista.pieza(MANTA, ac.caja, lugar.m((x - 0.38, y - 1.0, z + 0.4), (0.1, 0, 0.3), (0.4, 0.5, 0.3)))
            self.vista.pieza(VERDE, ac.caja, lugar.m((x, y + 0.1, z + 0.54), escala=(0.5, 0.9, 0.04)))
        else:
            self.vista.pieza(MANTA, ac.caja, lugar.m((x, y - 0.75, z + 0.56), escala=(0.9, 0.45, 0.1)))

    def mesa(self, lugar, x, y, ancho=2.2, fondo=0.9, giro=0.0):
        z = 0.15
        self.solido(MADERA, ac.caja, lugar.m((x, y, z + 0.78), (0, 0, giro), (ancho, fondo, 0.08)))
        c, s = math.cos(giro), math.sin(giro)
        for dx in (-ancho / 2 + 0.1, ancho / 2 - 0.1):
            for dy in (-fondo / 2 + 0.1, fondo / 2 - 0.1):
                px, py = x + dx * c - dy * s, y + dx * s + dy * c
                self.solido(GRIS, ac.caja, lugar.m((px, py, z + 0.37), (0, 0, giro), (0.08, 0.08, 0.74)))

    def papeles(self, lugar, x, y, z, cantidad=4, giro=0.0):
        for k in range(cantidad):
            self.vista.pieza(PAPEL, ac.caja, lugar.m((x + 0.12 * (k % 2) - 0.06, y + 0.08 * k, z + 0.012 * k), (0, 0, giro + 0.35 * k - 0.5), (0.34, 0.44, 0.01)))

    def estrato(self, lugar, x, y, ancho, alto=1.4, giro=0.0):
        """Muro bajo en capas horizontales (los estratos de los Ausentes)."""
        capas = 4
        for k in range(capas):
            color = ARENISCA if k % 2 == 0 else ARENISCA_OSCURA
            h = alto / capas
            self.solido(color, ac.caja, lugar.m((x, y, 0.15 + h * (k + 0.5)), (0, 0, giro), (ancho - 0.06 * k, 0.4 - 0.03 * k, h)))

    # ---- Zonas --------------------------------------------------------------------------------

    def recibidor(self):
        lugar = self.dentro(RECIBIDOR, 0, 6.5, 6.5)
        self.puerta(lugar, 0.15)
        self.estrato(lugar, 0, -2.4, 5.5, alto=1.1)
        self.farol(lugar, -2.7, 1.2)
        self.farol(lugar, 2.7, 1.2)
        self.marca("PASO_Dentro", lugar, (0, 0, 0.15), rumbo=0)
        self.marca("SPAWN_Laboratorio", lugar, (0, 2.4, 1.15), rumbo=0)

    def sala_trabajo(self):
        lugar = self.dentro(SALA, rumbo_dentro(SALA, RECIBIDOR), 7.5, 6.0)
        z = 0.15
        # La pizarra, de pie al fondo, de cara a quien llega.
        self.estrato(lugar, 0, -2.7, 6.8, alto=1.6)
        for x in (-2.1, 2.1):
            self.solido(GRIS_OSCURO, ac.caja, lugar.m((x, -2.15, z + 1.1), escala=(0.1, 0.1, 2.2)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((0, -2.15, z + 1.6), escala=(4.4, 0.08, 2.0)))
        self.vista.pieza(PIZARRA, ac.caja, lugar.m((0, -2.1, z + 1.6), escala=(4.1, 0.06, 1.75)))
        filas = ((0.6, (0.5, 0.2, 0.9, 0.3, 0.5)), (0.2, (0.7, 0.4, 0.3, 0.8)), (-0.2, (0.5, 0.9, 0.2)), (-0.55, (0.4, 0.3)))
        for dz, tramos in filas:
            x = -1.8
            for ancho in tramos:
                self.vista.pieza(TIZA, ac.caja, lugar.m((x + ancho / 2, -2.06, z + 1.6 + dz), escala=(ancho, 0.02, 0.05)))
                x += ancho + 0.16
        self.vista.pieza(TIZA, ac.cilindro(0.16, 10), lugar.m((0.9, -2.06, z + 1.15), (math.pi / 2, 0, 0), (1, 1, 0.02)))
        self.vista.pieza(TIZA, ac.caja, lugar.m((-1.5, -1.95, z + 0.72), escala=(0.5, 0.1, 0.03)))
        # Mesa larga de trabajo con frascos, una caja abierta y papeles por el suelo.
        self.mesa(lugar, 1.4, 0.6, ancho=2.6, fondo=1.0)
        self.papeles(lugar, 1.0, 0.5, z + 0.83, 3)
        for k in range(4):
            self.vista.pieza(VERDE_CLARO, ac.cilindro(0.07, 6), lugar.m((2.0 + 0.18 * k, 0.75, z + 0.95), escala=(1, 1, 0.24)))
        self.solido(MADERA, ac.caja, lugar.m((-1.6, 1.0, z + 0.25), (0, 0, 0.3), (0.7, 0.5, 0.5)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((-1.25, 1.2, z + 0.55), (0.9, 0, 0.3), (0.7, 0.04, 0.4)))
        self.papeles(lugar, -0.4, 1.6, z + 0.01, 3, giro=0.6)
        # El armario con la orden de silencio: un sobre cerrado con sello rojo, apoyado encima.
        self.solido(GRIS, ac.caja, lugar.m((-3.0, -1.0, z + 0.65), escala=(0.7, 1.4, 1.3)))
        self.vista.pieza(VERDE_CLARO, ac.caja, lugar.m((-2.64, -1.0, z + 0.65), escala=(0.02, 0.05, 1.1)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((-3.0, -1.0, z + 1.32), (0, 0, 0.2), (0.34, 0.46, 0.03)))
        self.vista.pieza(SELLO, ac.cilindro(0.06, 8), lugar.m((-3.0, -1.0, z + 1.35), escala=(1, 1, 0.025)))
        self.farol(lugar, 3.2, -1.6)
        self.farol(lugar, -3.2, 1.8)
        self.marca("INT_pizarra", lugar, (0, -1.1, z + 1.3))
        self.marca("INT_orden_silencio", lugar, (-2.2, -1.0, z + 1.1))

    def banco_contrapeso(self):
        lugar = self.dentro(BANCO, rumbo_dentro(BANCO, SALA), 5.5, 4.0)
        z = 0.15
        self.mesa(lugar, 0, -0.4, ancho=3.6, fondo=1.1)
        # El Contrapeso terminado (modelo aparte, contrapeso.glb: se coge y se lleva) sobre su peana, entre dos
        # soportes; al lado, un prototipo tumbado del motor, piezas sueltas y cables.
        for dx in (-0.6, 0.6):
            self.vista.pieza(GRIS, ac.caja, lugar.m((dx, -0.4, z + 1.0), escala=(0.08, 0.5, 0.34)))
        self.vista.pieza(PIZARRA, ac.cilindro(0.3, 12), lugar.m((0, -0.4, z + 0.83), escala=(1, 1, 0.02)))
        self.vista.pieza(GRIS, ac.cilindro(0.28, 10), lugar.m((-1.2, -0.4, z + 1.0), (0, math.pi / 2, 0), (1, 1, 0.9)))
        self.vista.pieza(LATON, ac.cilindro(0.18, 8), lugar.m((-1.2, -0.4, z + 1.0), (0, math.pi / 2, 0), (1, 1, 1.05)))
        for k in range(4):
            self.vista.pieza(LATON, ac.cilindro(0.06, 6), lugar.m((0.5 + k * 0.28, -0.05, z + 0.85), escala=(1, 1, 0.06)))
        self.vista.pieza(PIZARRA, ac.caja, lugar.m((-0.5, -0.1, z + 0.84), (0, 0, 0.5), (0.35, 0.2, 0.02)))
        # Cables enrollados en el suelo y una caja de herramientas abierta.
        self.vista.pieza(GRIS_OSCURO, ac.toro(0.35, 0.05, 10, 4), lugar.m((1.8, 0.9, z + 0.05), (math.pi / 2, 0, 0)))
        self.vista.pieza(GRIS_OSCURO, ac.toro(0.25, 0.05, 10, 4), lugar.m((1.95, 1.0, z + 0.12), (math.pi / 2, 0, 0)))
        self.solido(SELLO, ac.caja, lugar.m((-1.8, 1.0, z + 0.18), (0, 0, 0.4), (0.6, 0.3, 0.3)))
        self.farol(lugar, 2.3, -1.4)
        # La marca es el propio Contrapeso: su centro, mirando hacia la Sala (por donde se llega).
        self.marca("INT_contrapeso", lugar, (0, -0.4, z + 0.84 + CONTRAPESO_BAJO), rumbo=rumbo_dentro(BANCO, SALA))

    def escritorio_esceptico(self):
        lugar = self.dentro(ESCEPTICO, rumbo_dentro(ESCEPTICO, SALA), 4.5, 4.0)
        z = 0.15
        self.mesa(lugar, 0, -0.8, ancho=1.8, fondo=0.8)
        # La silla tumbada, papeles amontonados y la funda vacía de una grabadora.
        self.vista.pieza(MADERA, ac.caja, lugar.m((-1.1, 0.3, z + 0.28), (0, math.pi / 2, 0.4), (0.5, 0.5, 0.06)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((-1.35, 0.25, z + 0.1), (0.1, 0, 0.4), (0.06, 0.5, 0.6)))
        for k in range(5):
            self.vista.pieza(PAPEL, ac.caja, lugar.m((-0.4 + 0.08 * k, -0.8 + 0.05 * k, z + 0.83 + 0.012 * k), (0, 0, 0.3 * k - 0.4), (0.4, 0.5, 0.012)))
        self.vista.pieza(GRIS_OSCURO, ac.caja, lugar.m((0.5, -0.85, z + 0.9), escala=(0.5, 0.35, 0.16)))
        self.vista.pieza(NEGRO, ac.caja, lugar.m((0.5, -0.85, z + 0.99), escala=(0.42, 0.27, 0.02)))
        # Un tablón con una carta del cielo y una flecha a lápiz (la corrección que nadie quiso oír).
        for x in (-0.9, 0.9):
            self.solido(GRIS_OSCURO, ac.caja, lugar.m((x, -1.6, z + 0.9), escala=(0.08, 0.08, 1.8)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((0, -1.6, z + 1.4), escala=(2.0, 0.06, 1.0)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((0, -1.56, z + 1.4), escala=(1.6, 0.02, 0.8)))
        for k in range(9):
            self.vista.pieza(PIZARRA, ac.bola(0.025, 0), lugar.m((-0.6 + 0.16 * k, -1.54, z + 1.15 + 0.5 * ((k * 0.618) % 1))))
        self.vista.pieza(SELLO, ac.caja, lugar.m((0.2, -1.54, z + 1.45), (0, 0.6, 0), (0.6, 0.01, 0.025)))
        self.farol(lugar, 1.8, 0.8)
        self.marca("INT_notas_esceptico", lugar, (0, 0.1, z + 1.2))

    def escritorio_investigadora(self):
        lugar = self.dentro(INVESTIGADORA, rumbo_dentro(INVESTIGADORA, CRUCE), 5.5, 4.5)
        z = 0.15
        self.mesa(lugar, 0, -0.9)
        # Silla echada hacia atrás, papeles, lámpara y reloj de mesa con la aguja casi quieta.
        self.solido(MADERA, ac.caja, lugar.m((0.2, 0.1, z + 0.5), (0, 0, 0.3), (0.5, 0.5, 0.06)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((0.3, 0.35, z + 0.85), (0.15, 0, 0.3), (0.5, 0.06, 0.6)))
        self.papeles(lugar, -0.6, -1.0, z + 0.83, 4)
        self.vista.pieza(LATON, ac.cilindro(0.1, 6), lugar.m((0.9, -1.1, z + 0.84), escala=(1, 1, 0.04)))
        self.vista.pieza(LATON, ac.cilindro(0.02, 4), lugar.m((0.9, -1.1, z + 1.07), escala=(1, 1, 0.45)))
        self.vista.pieza(LATON, ac.cono(0.2, 0.06, 8), lugar.m((0.9, -1.1, z + 1.3), escala=(1, 1, 0.2)))
        self.luces.pieza(AMBAR, ac.bola(0.07, 1), lugar.m((0.9, -1.1, z + 1.25)))
        reloj = (0.2, -0.75, z + 0.84)
        self.vista.pieza(BLANCO, ac.cilindro(0.2, 12), lugar.m(reloj, escala=(1, 1, 0.05)))
        self.vista.pieza(GRIS, ac.cilindro(0.2, 12), lugar.m((reloj[0], reloj[1], reloj[2] - 0.02), escala=(1.1, 1.1, 0.03)))
        for k in range(12):
            a = 2 * math.pi * k / 12
            self.vista.pieza(PIZARRA, ac.caja, lugar.m((reloj[0] + math.cos(a) * 0.16, reloj[1] + math.sin(a) * 0.16, reloj[2] + 0.03), (0, 0, a), (0.04, 0.012, 0.01)))
        aguja = ac.Malla()
        aguja.pieza(PIZARRA, ac.caja, ac.matriz((0, 0.075, 0), escala=(0.015, 0.15, 0.012)))
        ac.objeto_suelto(self.p, "ANIM_reloj_mesa", aguja, self.paleta, lugar.m((reloj[0], reloj[1], reloj[2] + 0.04)), {"spin": 0.05})
        # Estantería con libros y cuadernos, a un lado.
        self.solido(MADERA, ac.caja, lugar.m((-2.2, -1.2, z + 0.9), escala=(0.5, 1.4, 1.8)))
        for fila in range(3):
            for k in range(5):
                color = (VERDE, SELLO, MANTA, ARENISCA, GRIS)[(fila + k) % 5]
                self.vista.pieza(color, ac.caja, lugar.m((-1.98, -1.7 + 0.24 * k, z + 0.45 + 0.55 * fila), (0.12 * (k % 2), 0, 0), (0.06, 0.18, 0.4)))
        self.farol(lugar, 2.4, 0.6)
        self.marca("INT_notas_investigadora", lugar, (0, 0.6, z + 1.2))

    def dormitorio(self):
        lugar = self.dentro(DORMITORIO, rumbo_dentro(DORMITORIO, CRUCE), 5.5, 5.0)
        z = 0.15
        # Un cuarto sin techo (dentro del Nudo no llueve), con la puerta hacia el sendero (+Y).
        alto = 1.7
        self.solido(VERDE, ac.caja, lugar.m((0, -2.3, z + alto / 2), escala=(5.0, 0.2, alto)))
        for x in (-2.4, 2.4):
            self.solido(VERDE, ac.caja, lugar.m((x, 0, z + alto / 2), escala=(0.2, 4.6, alto)))
        for x in (-1.6, 1.6):
            self.solido(VERDE, ac.caja, lugar.m((x, 2.3, z + alto / 2), escala=(1.8, 0.2, alto)))
        self.vista.pieza(VERDE_CLARO, ac.caja, lugar.m((0, 0, z + alto + 0.05), escala=(5.0, 4.8, 0.1)), )
        self.cama(lugar, -1.5, -0.9, usada=True)
        self.cama(lugar, 1.5, -0.9, usada=False)
        self.solido(MADERA, ac.caja, lugar.m((0, -1.7, z + 0.28), escala=(0.5, 0.5, 0.55)))
        self.vista.pieza(BLANCO, ac.cilindro(0.04, 6), lugar.m((0, -1.7, z + 0.67), escala=(1, 1, 0.24)))
        self.luces.pieza(AMBAR, ac.bola(0.05, 1), lugar.m((0, -1.7, z + 0.84)))
        self.vista.pieza(GRIS, ac.caja, lugar.m((-0.9, 0.5, z + 0.05), (0, 0, 0.5), (0.3, 0.12, 0.1)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((1.5, 0.7, z + 0.18), escala=(0.7, 0.45, 0.35)))
        self.farol(lugar, 2.9, 2.9)
        self.marca("INT_dormitorio", lugar, (0, 0.8, z + 1.0))

    def camara(self):
        """La Cámara: dos anillos cruzados, un asiento y un dial de 24 marcas con el último cuarto encendido."""
        lugar = self.dentro(CAMARA, rumbo_dentro(CAMARA, CRUCE), 6.5, 6.5)
        z = 0.15
        self.solido(ARENISCA, ac.cilindro(2.6, 20), lugar.m((0, 0, z + 0.1), escala=(1, 1, 0.2)))
        self.vista.pieza(PIZARRA, ac.cilindro(2.2, 20), lugar.m((0, 0, z + 0.21), escala=(1, 1, 0.02)))
        centro = z + 2.0
        self.vista.pieza(ARENISCA, ac.toro(1.8, 0.14, 28, 4), lugar.m((0, 0, centro)))
        self.vista.pieza(PIZARRA, ac.toro(1.5, 0.1, 24, 4), lugar.m((0, 0, centro), (0, 0, math.pi / 2)))
        for k in range(24):
            a = 2 * math.pi * k / 24
            pieza = self.luces if k < 6 else self.vista
            pieza.pieza(AMBAR if k < 6 else PIZARRA, ac.caja,
                        lugar.m((math.cos(a) * 1.8, -0.17, centro + math.sin(a) * 1.8), (0, math.pi / 2 - a, 0), (0.14, 0.06, 0.34)))
        self.solido(GRIS, ac.caja, lugar.m((0, 0, z + 0.5), escala=(0.8, 0.9, 0.5)))
        self.vista.pieza(VERDE_CLARO, ac.caja, lugar.m((0, 0.45, z + 1.05), (-0.3, 0, 0), (0.8, 0.12, 0.8)))
        self.vista.pieza(VERDE_CLARO, ac.caja, lugar.m((0, -0.2, z + 0.78), escala=(0.7, 0.6, 0.1)))
        self.frio.pieza(PLIEGUE, ac.caja, lugar.m((0, 1.8, z + 0.25), escala=(0.6, 0.04, 0.02)))
        # Arcos de anillo alrededor, como un claustro: la Cámara es lo más cuidado del Laboratorio.
        for k in range(6):
            a = 2 * math.pi * k / 6 + math.pi / 6
            self.vista.pieza(ARENISCA_OSCURA, ac.toro(0.8, 0.1, 8, 4), lugar.m((math.cos(a) * 2.9, math.sin(a) * 2.9, z + 0.4), (0, 0, a + math.pi / 2)))
        self.marca("INT_camara", lugar, (0, 2.6, z + 1.2))

    def semilla(self):
        """La semilla del Nudo, en el centro de la cavidad: negra, con un halo frío y tres anillos que giran
        muy despacio (el tiempo aquí apenas corre)."""
        self.vista.pieza(NEGRO, ac.bola(0.9, 2), ac.matriz())
        self.frio.pieza(SEMILLA, ac.toro(1.25, 0.03, 24, 3), ac.matriz(rot=(0.3, 0.2, 0)))
        for k, (r, giro) in enumerate(((2.2, (0.4, 0, 0)), (2.8, (1.3, 0.6, 0)), (3.4, (0.2, 1.1, 0.5)))):
            anillo = ac.Malla()
            anillo.pieza(ARENISCA if k != 1 else PIZARRA, ac.toro(r, 0.08, 18, 3), ac.matriz())
            for t in range(4):
                a = 2 * math.pi * t / 4
                anillo.pieza(LATON, ac.caja, ac.matriz((math.cos(a) * r, 0, math.sin(a) * r), (0, math.pi / 2 - a, 0), (0.12, 0.12, 0.3)))
            ac.objeto_suelto(self.p, f"ANIM_semilla_{k}", anillo, self.paleta, ac.matriz(rot=giro), {"spin": 0.03 * (1 + k)})

    def senderos(self):
        """Losas sobre la cara interior uniendo las zonas, con farolas cada tanto."""
        tramos = [(RECIBIDOR, SALA), (SALA, BANCO), (SALA, ESCEPTICO), (SALA, CRUCE),
                  (CRUCE, INVESTIGADORA), (CRUCE, DORMITORIO), (CRUCE, CAMARA)]
        losa = 1.8
        for n, (a, b) in enumerate(tramos):
            largo = ac.direccion(*a).angle(ac.direccion(*b)) * 21  # arco sobre la cara interior (m)
            pasos = max(2, int(largo / losa))
            for k in range(1, pasos):
                f = k / pasos
                punto = interpolar(a, b, f)
                siguiente = interpolar(a, b, min(1.0, f + 0.05))
                lugar = self.p.lugar_dentro(*punto, rumbo=rumbo_dentro(punto, siguiente), apoyo=0.8, tomar=ac.media)
                color = ARENISCA if k % 2 else ARENISCA_OSCURA
                self.solido(color, ac.caja, lugar.m((0, 0, -0.1), escala=(1.3, losa - 0.12, 0.3)))
                if k % 5 == 0:
                    self.farol(lugar, 1.1 if (k + n) % 2 else -1.1, 0, z=0.0, alto=2.0)

    # ---- Por fuera ----------------------------------------------------------------------------

    def cascara(self):
        """La Puerta exterior y el muelle donde posarse, sobre la cáscara negra."""
        lugar = self.p.lugar(*RECIBIDOR, rumbo=180, apoyo=3.0, tomar=max)
        top = 0.2
        self.solido(ARENISCA_OSCURA, ac.cilindro(3.0, 16), lugar.m((0, 0, top - 1.0), escala=(1, 1, 2.0)))
        self.puerta(lugar, top)
        self.rampa(lugar, 0, 2.9, top, 0, 1, ARENISCA_OSCURA, ancho=2.2)
        self.marca("PASO_Boca", lugar, (0, 0, top), rumbo=180)
        # El muelle: un círculo de losas con marcas de reloj y dos balizas ámbar.
        muelle = self.p.lugar(*MUELLE, rumbo=0, apoyo=4.0, tomar=max)
        self.solido(ARENISCA_OSCURA, ac.cilindro(4.0, 20), muelle.m((0, 0, 0.2 - 1.2), escala=(1, 1, 2.4)))
        self.vista.pieza(PIZARRA, ac.cilindro(3.6, 20), muelle.m((0, 0, 0.21), escala=(1, 1, 0.02)))
        for k in range(24):
            a = 2 * math.pi * k / 24
            self.vista.pieza(AMBAR if k % 6 == 0 else ARENISCA, ac.caja, muelle.m((math.cos(a) * 3.3, math.sin(a) * 3.3, 0.23), (0, 0, a), (0.4, 0.08, 0.02)))
        for x in (-3.4, 3.4):
            self.solido(GRIS_OSCURO, ac.cilindro(0.1, 6), muelle.m((x, 3.4, 0.2 + 0.9), escala=(1, 1, 1.8)))
            self.luces.pieza(AMBAR, ac.bola(0.16, 1), muelle.m((x, 3.4, 0.2 + 1.9)))
        # Un cinturón de estratos de los Ausentes que abraza la cáscara, roto en tramos.
        for k in range(5):
            lon = -80 + k * 40
            tramo = self.p.lugar(0.0, lon, rumbo=90, apoyo=2.0, tomar=ac.media)
            self.solido(CASCARA if k % 2 else GRIS_OSCURO, ac.caja, tramo.m((0, 0, 0.2), escala=(0.8, 7.0, 0.9)))
            self.vista.pieza(LATON, ac.caja, tramo.m((0, 0, 0.67), escala=(0.84, 7.0, 0.06)))

    def lugares(self):
        ac.borrar([o.name for o in bpy.data.objects if o.name.startswith("ANIM_")])
        raiz = self.p.raiz
        raiz["interior_light"] = 1.5
        raiz["interior_light_color"] = "#F0DDB8"
        self.recibidor()
        self.sala_trabajo()
        self.banco_contrapeso()
        self.escritorio_esceptico()
        self.escritorio_investigadora()
        self.dormitorio()
        self.camara()
        self.semilla()
        self.senderos()
        self.cascara()

    def construir(self):
        ac.borrar([f"{MUNDO}_Frio"])
        super().construir()
        _, tris = ac.objeto(self.p, f"{MUNDO}_Frio", self.frio, ac.material_luces(f"M_Frio_{MUNDO}", PLIEGUE))
        print(f"{MUNDO}: frío {tris} triángulos")


Laboratorio().ejecutar()

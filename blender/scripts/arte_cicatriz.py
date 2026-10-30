# Viste Cicatriz (CONTEXTO_PLANETAS.md §6): el mundo cortado a pedazos donde está la maquinaria que abre las
# Puertas. La Sala del Motor (un anillo enorme con el núcleo cerrado, que se abre y arde con el pulso de las
# 9:00), la bitácora de la máquina y la lista de mundos conectados, una de las Mordidas con la pared del
# símbolo partido, el Puesto del Escéptico con su grabadora, la ruina de la Primera Puerta y el Borde, un
# mirador sobre la mordida más grande, frente al cielo donde nacerá el agujero negro.
#
# Las mordidas son las de mundo_base.py (misma semilla): aquí se calculan igual para usar las de verdad.
# Gramática de los Ausentes (🟡): anillos y estratos, aquí en óxido, negro y naranja incandescente.
# Uso: blender -b blender/cicatriz.blend --python-exit-code 1 --python blender/scripts/arte_cicatriz.py
import math
import os
import random
import sys

import bpy
from mathutils import Vector

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "cicatriz"
PULSO = "pulso_cicatriz"

OXIDO = "#8A3A22"
OXIDO_CLARO = "#A85A3A"
NEGRO = "#141012"
HUMO = "#5A5458"
HUMO_CLARO = "#7A7478"
INCANDESCENTE = "#FF7A20"
ARENISCA = "#B8A27A"
PAPEL = "#E4D8C0"
LUZ = "#FFB070"
# Del centro del Contrapeso (contrapeso.glb) a la base de su pie (generar_contrapeso.py).
CONTRAPESO_BAJO = 0.425


def mordidas(radio=80, semilla=1, cantidad=14, minimo=0.18, maximo=0.45):
    """Las mismas mordidas que mundo_base.py: (dirección, radio del corte, distancia del centro)."""
    rng = random.Random(semilla)
    resultado = []
    for _ in range(cantidad):
        rb = radio * rng.uniform(minimo, maximo)
        d = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized()
        resultado.append((d, rb, radio * rng.uniform(0.95, 1.1)))
    return resultado


def latlon(d):
    return math.degrees(math.asin(max(-1, min(1, d.z)))), math.degrees(math.atan2(d.y, d.x))


class Cicatriz(ac.Vestido):
    def __init__(self):
        # Luz rojiza y humosa.
        super().__init__(MUNDO, LUZ, SCRIPTS, ambiente=(1.7, "#B88070"))
        self.p = self.planeta
        self.paleta = bpy.data.materials.get(f"M_Paleta_{MUNDO}")

    def brasero(self, lugar, x, y, z=0.0):
        self.solido(NEGRO, ac.cilindro(0.08, 6), lugar.m((x, y, z + 1.1), escala=(1, 1, 2.2)))
        self.vista.pieza(OXIDO, ac.cono(0.3, 0.18, 6), lugar.m((x, y, z + 2.25), escala=(1, 1, 0.3)))
        self.luces.pieza(LUZ, ac.bola(0.16, 1), lugar.m((x, y, z + 2.45)))

    # ---- Lugares ------------------------------------------------------------------------------

    def sala_motor(self):
        """El anillo de la máquina sobre su basamento, con el núcleo en medio. En el pulso: se abre y arde."""
        lugar = self.p.lugar(26, 40, rumbo=180, apoyo=10, tomar=ac.media)
        top = 0.4
        self.solido(HUMO, ac.cilindro(11, 16), lugar.m((0, 0, top - 1.5), escala=(1, 1, 3.0)))
        self.vista.pieza(OXIDO, ac.toro(10.6, 0.12, 32, 4), lugar.m((0, 0, top + 0.02), (math.pi / 2, 0, 0)))
        for k, r in enumerate((7.5, 5.0)):
            self.solido(HUMO_CLARO if k else HUMO, ac.cilindro(r, 16), lugar.m((0, 0, top + 0.2 + k * 0.4), escala=(1, 1, 0.4)))
        centro = top + 9.6
        self.solido(NEGRO, ac.toro(8.8, 0.9, 32, 6), lugar.m((0, 0, centro)), ac.toro(8.8, 0.9, 16, 4))
        self.vista.pieza(OXIDO, ac.toro(7.7, 0.25, 32, 4), lugar.m((0, -0.3, centro)))
        for k in range(16):
            a = 2 * math.pi * k / 16
            self.vista.pieza(INCANDESCENTE if k % 4 == 0 else OXIDO_CLARO, ac.caja,
                             lugar.m((math.cos(a) * 8.8, -0.85, centro + math.sin(a) * 8.8), (0, math.pi / 2 - a, 0), (0.3, 0.15, 1.0)))
        for x in (-6.5, 6.5):
            self.solido(NEGRO, ac.caja, lugar.m((x, 0, top + 1.4), escala=(2.4, 2.4, 2.8)))
        # El núcleo: el motor viejo dentro de una coraza que, con el pulso, gira y se abre.
        self.solido(NEGRO, ac.cilindro(1.2, 10), lugar.m((0, 0, top + 1.2), escala=(1, 1, 1.6)))
        self.motor_viejo(lugar, centro, top)
        self.cuna(lugar, top)

        def coraza(m):
            for lado in (-1, 1):
                m.pieza(OXIDO, ac.caja, ac.matriz((lado * 1.15, 0, 0), escala=(0.25, 2.2, 3.4)))
                m.pieza(NEGRO, ac.caja, ac.matriz((lado * 1.3, 0, 0), escala=(0.08, 1.6, 2.6)))

        malla = ac.Malla()
        coraza(malla)
        ac.objeto_suelto(self.p, "ANIM_nucleo_coraza", malla, self.paleta, lugar.m((0, 0, centro)),
                         {"spin": 2.5, "event": PULSO})
        fuego = ac.Malla()
        fuego.pieza(INCANDESCENTE, ac.bola(1.0, 2), ac.matriz())
        for k in range(8):
            a = 2 * math.pi * k / 8
            fuego.pieza(INCANDESCENTE, ac.caja, ac.matriz((math.cos(a) * 3.5, 0, math.sin(a) * 3.5), (0, math.pi / 2 - a, 0), (0.12, 0.12, 4.5)))
        ac.objeto_suelto(self.p, f"EVT_{PULSO}_Nucleo", fuego, ac.material_luces("M_Pulso_cicatriz", INCANDESCENTE),
                         lugar.m((0, 0, centro)), {"event": PULSO})
        # La bitácora (consola) y la lista de mundos (panel con huecos), a los lados.
        consola = (6.0, -7.5)
        self.solido(NEGRO, ac.caja, lugar.m((consola[0], consola[1], top + 0.5), (0, 0, 0.3), (1.6, 0.7, 1.0)))
        self.vista.pieza(INCANDESCENTE, ac.caja, lugar.m((consola[0], consola[1] - 0.2, top + 1.05), (-0.5, 0, 0.3), (1.2, 0.3, 0.04)))
        for k in range(6):
            self.vista.pieza(PAPEL, ac.caja, lugar.m((consola[0] - 0.5 + k * 0.2, consola[1] - 0.25, top + 1.08 + 0.05 * (k % 3)), (-0.5, 0, 0.3), (0.06, 0.2, 0.02)))
        panel = (-6.0, -7.5)
        self.solido(HUMO, ac.caja, lugar.m((panel[0], panel[1] + 0.3, top + 1.6), (0, 0, -0.3), (3.0, 0.3, 3.2)))
        for fila in range(6):
            for col in range(5):
                hueco = (fila, col) in ((1, 3), (3, 1), (4, 4), (5, 2))
                self.vista.pieza(NEGRO if hueco else ARENISCA, ac.caja,
                                 lugar.m((panel[0] - 1.1 + col * 0.55, panel[1] + 0.12, top + 0.6 + fila * 0.42), (0, 0, -0.3), (0.45, 0.04, 0.3)))
        self.brasero(lugar, 9.5, -6.0, top)
        self.brasero(lugar, -9.5, -6.0, top)
        self.marca("SPAWN_Motor", lugar, (0, -14.0, top + 1.0))
        self.marca("INT_sala_motor", lugar, (0, -6.0, top + 1.6))
        self.marca("INT_bitacora", lugar, (consola[0], consola[1] - 1.0, top + 1.3))
        self.marca("INT_lista_mundos", lugar, (panel[0], panel[1] - 1.0, top + 1.6))

    def motor_viejo(self, lugar, centro, top):
        """El motor viejo, aparte (Fase 10C): con la palanca sale del núcleo y queda tumbado en el suelo, en
        cicatriz_MotorFuera. Su origen es el centro del núcleo: ahí encaja el Contrapeso."""
        motor = ac.Malla()
        motor.pieza(HUMO, ac.cilindro(0.9, 10), ac.matriz(rot=(math.pi / 2, 0, 0), escala=(1, 1, 2.6)))
        for y in (-0.8, 0.8):
            motor.pieza(OXIDO, ac.toro(0.93, 0.07, 16, 4), ac.matriz((0, y, 0)))
        for y in (-1.33, 1.33):
            motor.pieza(NEGRO, ac.cilindro(0.6, 10), ac.matriz((0, y, 0), (math.pi / 2, 0, 0), (1, 1, 0.1)))
        for k in range(6):
            a = 2 * math.pi * k / 6
            motor.pieza(HUMO_CLARO, ac.caja, ac.matriz((math.cos(a) * 0.9, 0, math.sin(a) * 0.9), (0, -a, 0), (0.08, 1.2, 0.12)))
        ac.objeto_suelto(self.p, "cicatriz_MotorViejo", motor, self.paleta, lugar.m((0, 0, centro)))
        fuera = bpy.data.objects.new("cicatriz_MotorFuera", None)
        fuera.empty_display_type = "ARROWS"
        bpy.data.collections[MUNDO].objects.link(fuera)
        fuera.parent = self.p.raiz
        fuera.matrix_world = lugar.m((-4.6, -8.2, top + 0.9), (0, 0, math.pi / 2))
        # La palanca que lo saca, en una consola a la derecha de la cuna.
        palanca = (2.6, -7.9)
        self.solido(NEGRO, ac.caja, lugar.m((palanca[0], palanca[1], top + 0.5), escala=(0.9, 0.6, 1.0)))
        self.vista.pieza(OXIDO, ac.caja, lugar.m((palanca[0], palanca[1], top + 1.02), escala=(0.7, 0.4, 0.04)))
        self.vista.pieza(OXIDO_CLARO, ac.cilindro(0.04, 6),
                         lugar.m((palanca[0], palanca[1] - 0.15, top + 1.3), (0.45, 0, 0), (1, 1, 0.6)))
        self.luces.pieza(INCANDESCENTE, ac.bola(0.07, 1), lugar.m((palanca[0], palanca[1] - 0.29, top + 1.58)))
        self.marca("INT_palanca", lugar, (palanca[0], palanca[1] - 0.7, top + 1.25))

    def cuna(self, lugar, top):
        """La cuna del núcleo (Fase 10C): una peana entre dos soportes donde se pone el Contrapeso, y en su cara
        dos ruedas (minutos y segundos) para ajustar su reloj. Con el pulso, lo que hay en ella sube al núcleo."""
        y = -8.6
        self.solido(OXIDO, ac.caja, lugar.m((0, y, top + 0.45), escala=(1.4, 1.0, 0.9)))
        self.vista.pieza(NEGRO, ac.caja, lugar.m((0, y, top + 0.9), escala=(1.5, 1.1, 0.04)))
        self.vista.pieza(ARENISCA, ac.cilindro(0.32, 12), lugar.m((0, y, top + 0.93), escala=(1, 1, 0.03)))
        for dx in (-0.62, 0.62):
            self.vista.pieza(OXIDO_CLARO, ac.caja, lugar.m((dx, y, top + 1.1), escala=(0.08, 0.5, 0.36)))
        # Las dos ruedas en la cara de delante, con radios y el cubo encendido.
        for x in (-0.32, 0.32):
            frente = y - 0.52
            self.vista.pieza(NEGRO, ac.toro(0.17, 0.03, 16, 4), lugar.m((x, frente, top + 0.5)))
            for k in range(4):
                self.vista.pieza(HUMO_CLARO, ac.caja, lugar.m((x, frente, top + 0.5), (0, math.pi / 4 * k, 0), (0.3, 0.03, 0.025)))
            self.luces.pieza(INCANDESCENTE, ac.cilindro(0.045, 8), lugar.m((x, frente - 0.01, top + 0.5), (math.pi / 2, 0, 0), (1, 1, 0.05)))
        self.vista.pieza(ARENISCA, ac.caja, lugar.m((0, y - 0.51, top + 0.78), escala=(0.5, 0.02, 0.12)))
        self.marca("INT_cuna", lugar, (0, y, top + 0.93 + CONTRAPESO_BAJO), rumbo=180)

    def mordida_con_pared(self, lat, lon):
        """En el fondo de una mordida, una pared tallada con medio símbolo: un anillo partido con marcas."""
        lugar = self.p.lugar(lat, lon, rumbo=0, apoyo=1.5)
        self.solido(ARENISCA, ac.caja, lugar.m((0, 0, 1.6), escala=(4.0, 0.6, 3.2)))
        # Medio anillo con marcas de reloj, cortado limpio por la mitad.
        for k in range(9):
            a = math.pi * k / 8
            self.vista.pieza(OXIDO, ac.caja, lugar.m((math.cos(a) * 1.1, -0.32, 1.5 + math.sin(a) * 1.1), (0, math.pi / 2 - a, 0), (0.12, 0.06, 0.45 if k % 2 == 0 else 0.25)))
        self.vista.pieza(NEGRO, ac.caja, lugar.m((0, -0.33, 1.5), escala=(2.6, 0.04, 0.06)))
        self.vista.pieza(INCANDESCENTE, ac.caja, lugar.m((2.0, -0.31, 1.6), escala=(0.04, 0.05, 3.1)))
        self.brasero(lugar, -2.8, -1.5)
        self.marca("INT_mordidas", lugar, (0, -1.4, 1.6))

    def puesto(self):
        """La caseta del escéptico, sola en un alto, con su grabadora sobre la mesa."""
        lugar = self.p.lugar(45, 100, rumbo=200, apoyo=2.5, hundir=0.2)
        alto = 2.4
        for k in range(7):
            a = math.radians(-90 + k * 30)
            self.solido(HUMO, ac.caja, lugar.m((math.sin(a) * 2.0, math.cos(a) * 2.0, alto / 2), (0, 0, -a), (1.1, 0.2, alto)))
        self.vista.pieza(OXIDO, ac.cono(2.5, 0.2, 10), lugar.m((0, 0, alto + 0.4), escala=(1, 1, 0.8)))
        self.solido(NEGRO, ac.caja, lugar.m((0, 0.8, 0.75), escala=(1.2, 0.6, 0.08)))
        for x in (-0.5, 0.5):
            self.solido(NEGRO, ac.caja, lugar.m((x, 0.8, 0.37), escala=(0.06, 0.5, 0.75)))
        self.vista.pieza(HUMO_CLARO, ac.caja, lugar.m((0, 0.8, 0.92), escala=(0.5, 0.35, 0.25)))
        for x in (-0.12, 0.12):
            self.vista.pieza(NEGRO, ac.cilindro(0.09, 10), lugar.m((x, 0.65, 1.05), (math.pi / 2, 0, 0), (1, 1, 0.04)))
        self.luces.pieza(LUZ, ac.caja, lugar.m((0.2, 0.62, 0.87), escala=(0.05, 0.02, 0.05)))
        self.brasero(lugar, 2.8, -1.0)
        self.marca("INT_grabacion_esceptico", lugar, (0, 0.0, 1.2))

    def primera_puerta(self):
        """La ruina del primer anillo: trozos de arco aún en pie y otros caídos."""
        lugar = self.p.lugar(5, 72, rumbo=90, apoyo=6, tomar=ac.media)
        top = 0.2
        self.solido(HUMO, ac.cilindro(6.5, 12), lugar.m((0, 0, top - 1.0), escala=(1, 1, 2.0)))
        centro = top + 5.4
        # Arcos que quedan: tramos de toro (segmentos sueltos).
        for k in range(16):
            if k in (3, 4, 5, 9, 10, 13):
                continue  # los que faltan
            a = 2 * math.pi * k / 16 + 0.1
            self.solido(OXIDO_CLARO if k % 3 else ARENISCA, ac.caja,
                        lugar.m((math.cos(a) * 5.0, 0, centro + math.sin(a) * 5.0), (0, math.pi / 2 - a, 0), (0.9, 0.9, 2.1)))
        for x, y, giro in ((-3.5, 3.0, 0.6), (2.5, 4.2, -0.4), (4.5, -2.0, 1.2)):
            self.solido(OXIDO_CLARO, ac.caja, lugar.m((x, y, top + 0.45), (0.3, 0.2, giro), (0.9, 0.9, 2.0)))
        # La garganta que se cerró mal: un hueco negro que no refleja nada.
        self.vista.pieza(NEGRO, ac.bola(0.8, 2), lugar.m((0, 0, centro)))
        self.marca("INT_primera_puerta", lugar, (0, -6.8, top + 1.6))

    def borde(self, d, rb, distancia):
        """Mirador sobre el filo de la mordida más grande: el Borde, frente al cielo."""
        lat0, lon0 = latlon(d)
        # Se busca el filo yendo hacia el norte desde el centro del corte, hasta recuperar el radio normal.
        lat = lat0
        while lat < lat0 + 40 and self.p.suelo(lat, lon0).length < self.p.radio * 0.98:
            lat += 0.5
        lugar = self.p.lugar(lat + 1.5, lon0, rumbo=180, apoyo=2.5, tomar=ac.media)
        self.solido(NEGRO, ac.caja, lugar.m((0, -1.0, -0.4), escala=(5.0, 5.5, 1.2)))
        for k in range(-4, 5):
            self.solido(OXIDO, ac.caja, lugar.m((k * 0.6, -3.6, 0.6), escala=(0.08, 0.08, 1.2)))
        self.vista.pieza(OXIDO, ac.caja, lugar.m((0, -3.6, 1.2), escala=(5.2, 0.1, 0.08)))
        self.brasero(lugar, -2.6, 1.0, 0.2)
        self.marca("INT_borde", lugar, (0, -2.8, 1.8))

    def lugares(self):
        ac.borrar([o.name for o in bpy.data.objects if o.name.startswith("ANIM_")])
        ac.borrar(["cicatriz_MotorViejo", "cicatriz_MotorFuera"])
        cortes = mordidas(radio=int(self.p.radio))
        self.sala_motor()
        # La pared del símbolo, en la mordida cercana al ecuador al oeste; el Borde, en la más grande de esa zona.
        pared = min(cortes, key=lambda c: (ac.direccion(-1.3, -54.9) - c[0]).length)
        self.mordida_con_pared(*latlon(pared[0]))
        grande = min(cortes, key=lambda c: (ac.direccion(22.2, -50.1) - c[0]).length)
        self.borde(*grande)
        self.puesto()
        self.primera_puerta()


Cicatriz().ejecutar()

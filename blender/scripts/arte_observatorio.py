# Viste el Observatorio (CONTEXTO_PLANETAS.md §7): un asteroide alargado y silencioso, lejos de todo, con
# una cúpula de costillas abierta al cielo y su gran telescopio, la caseta del turno con el libro y el informe,
# y el Mirador, una plataforma en la punta desde donde se ve el sistema entero (el palco del final).
#
# Hacia las 6:30 (evento `alineacion`) aparece en el cielo, en la dirección que apunta el telescopio, un punto
# que no se mueve como una estrella: la imagen desplazada del Laboratorio (objeto EVT_alineacion_Punto).
# Gramática de los Ausentes (🟡): anillos y estratos; aquí arenisca clara, pizarra índigo y luz ámbar.
# Uso: blender -b blender/observatorio.blend --python-exit-code 1 --python blender/scripts/arte_observatorio.py
import math
import os
import sys

import bpy
from mathutils import Vector

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "observatorio"
ALINEACION = "alineacion"

ARENISCA = "#B8AD94"
ARENISCA_SOMBRA = "#8E8570"
PIZARRA = "#3B4468"
PIZARRA_OSCURA = "#222640"
LATON = "#A88A50"
PAPEL = "#E6DEC8"
AMBAR = "#FFC070"
BLANCO = "#FFF4D0"

ELEVACION = math.radians(52)  # lo que se levanta el telescopio sobre el horizonte
POLO = (88.0, 0.0)            # la cúpula, en el casquete norte, que es casi plano


class Observatorio(ac.Vestido):
    def __init__(self):
        # Luz fría índigo: poco que iluminar, casi todo es cielo.
        super().__init__(MUNDO, AMBAR, SCRIPTS, ambiente=(1.5, "#8C94D0"))
        self.p = self.planeta
        self.paleta = bpy.data.materials.get(f"M_Paleta_{MUNDO}")

    def farol(self, lugar, x, y, z=0.0, alto=2.2):
        self.solido(PIZARRA_OSCURA, ac.cilindro(0.06, 6), lugar.m((x, y, z + alto / 2), escala=(1, 1, alto)))
        self.vista.pieza(LATON, ac.cono(0.22, 0.12, 6), lugar.m((x, y, z + alto + 0.08), escala=(1, 1, 0.22)))
        self.luces.pieza(AMBAR, ac.bola(0.13, 1), lugar.m((x, y, z + alto - 0.02)))

    # ---- Lugares ------------------------------------------------------------------------------

    def cupula(self):
        """Basamento redondo, costillas de arenisca que forman la cúpula abierta y el telescopio en el centro."""
        lugar = self.p.lugar(*POLO, rumbo=0, apoyo=6, tomar=max)
        top = 0.35
        radio = 5.0
        self.solido(ARENISCA_SOMBRA, ac.cilindro(6.3, 16), lugar.m((0, 0, top - 2.25), escala=(1, 1, 4.5)))
        self.vista.pieza(ARENISCA, ac.cilindro(5.9, 16), lugar.m((0, 0, top - 0.04), escala=(1, 1, 0.08)))
        # Marcas de reloj alrededor del suelo: 24 y la cuarta parte en ámbar (el último cuarto de hora).
        for k in range(24):
            a = 2 * math.pi * k / 24
            iluminada = k < 6
            pieza = self.luces if iluminada else self.vista
            pieza.pieza(AMBAR if iluminada else PIZARRA, ac.caja,
                        lugar.m((math.cos(a) * 5.5, math.sin(a) * 5.5, top + 0.02), (0, 0, a), (0.45, 0.12, 0.04)))
        # La cúpula: costillas verticales y dos anillos de refuerzo, medio hundidos en el suelo.
        costillas = 7
        for k in range(costillas):
            giro = math.pi * k / costillas
            self.solido(ARENISCA, ac.toro(radio, 0.16, 20, 4), lugar.m((0, 0, top), (0, 0, giro)), ac.toro(radio, 0.16, 10, 4))
        for z in (2.5, 3.8):
            r = math.sqrt(radio * radio - z * z)
            self.vista.pieza(PIZARRA, ac.toro(r, 0.14, 24, 4), lugar.m((0, 0, top + z), (math.pi / 2, 0, 0)))
        self.vista.pieza(LATON, ac.bola(0.28, 1), lugar.m((0, 0, top + radio + 0.05)))
        # Rampa de entrada, al sur.
        self.rampa(lugar, 0, -6.0, top, 0, -1, ARENISCA, ancho=3.0)
        for x in (-2.2, 2.2):
            self.farol(lugar, x, -5.6, top + 0.0)

        # El telescopio: pedestal, horquilla, tubo inclinado hacia el cielo (+Y) y contrapeso.
        pivote = Vector((0, 0, top + 1.9))
        dir_tubo = Vector((0, math.cos(ELEVACION), math.sin(ELEVACION)))
        giro = (-(math.pi / 2 - ELEVACION), 0, 0)
        self.solido(PIZARRA, ac.cilindro(0.55, 10), lugar.m((0, 0, top + 0.7), escala=(1, 1, 1.4)))
        self.vista.pieza(ARENISCA, ac.cilindro(0.75, 10), lugar.m((0, 0, top + 0.12), escala=(1, 1, 0.24)))
        for x in (-0.6, 0.6):
            self.vista.pieza(PIZARRA, ac.caja, lugar.m((x, 0, top + 1.55), escala=(0.14, 0.4, 1.0)))
        centro = pivote + dir_tubo * 1.3
        self.vista.pieza(ARENISCA, ac.cilindro(0.42, 10), lugar.m(tuple(centro), giro, (1, 1, 4.6)))
        self.vista.pieza(PIZARRA_OSCURA, ac.cilindro(0.5, 10), lugar.m(tuple(pivote + dir_tubo * 3.35), giro, (1, 1, 0.9)))
        for t in (-0.6, 1.0, 2.6):
            self.vista.pieza(LATON, ac.cilindro(0.46, 10), lugar.m(tuple(pivote + dir_tubo * t), giro, (1, 1, 0.1)))
        ocular = pivote - dir_tubo * 1.25
        self.vista.pieza(PIZARRA_OSCURA, ac.cilindro(0.13, 6), lugar.m(tuple(ocular), giro, (1, 1, 0.55)))
        self.vista.pieza(LATON, ac.bola(0.3, 1), lugar.m(tuple(pivote - dir_tubo * 1.0 + Vector((0, 0, -0.1)))))
        self.marca("SPAWN_Cupula", lugar, (0, -9.5, top + 1.0))
        self.marca("INT_telescopio", lugar, (0, -1.4, top + 1.25))

        # La mesa del libro de turnos, contra las costillas.
        atril = (-3.1, -2.6)
        self.solido(PIZARRA, ac.caja, lugar.m((atril[0], atril[1], top + 0.5), (0, 0, 0.5), (0.7, 0.5, 1.0)))
        self.vista.pieza(ARENISCA, ac.caja, lugar.m((atril[0], atril[1], top + 1.05), (0.35, 0, 0.5), (0.9, 0.7, 0.07)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((atril[0], atril[1] + 0.02, top + 1.1), (0.35, 0, 0.5), (0.7, 0.5, 0.06)))
        self.vista.pieza(PIZARRA_OSCURA, ac.caja, lugar.m((atril[0] + 0.01, atril[1] + 0.02, top + 1.07), (0.35, 0, 0.5), (0.74, 0.54, 0.03)))
        self.luces.pieza(AMBAR, ac.bola(0.07, 1), lugar.m((atril[0] - 0.5, atril[1] + 0.25, top + 1.15)))
        self.marca("INT_libro", lugar, (atril[0] + 0.5, atril[1] - 0.6, top + 1.35))

        # El punto del cielo que se ve en la alineación: en la dirección del tubo, lejos, sin sitio fijo entre las estrellas.
        punto = ac.Malla()
        punto.pieza(BLANCO, ac.bola(1.0, 1), ac.matriz())
        punto.pieza(BLANCO, ac.caja, ac.matriz(escala=(0.1, 0.1, 5.0)))
        punto.pieza(BLANCO, ac.caja, ac.matriz(escala=(5.0, 0.1, 0.1)))
        ac.objeto_suelto(self.p, f"EVT_{ALINEACION}_Punto", punto, ac.material_luces("M_Alineacion_observatorio", BLANCO),
                         lugar.m(tuple(pivote + dir_tubo * 160)), {"event": ALINEACION})

    def caseta(self):
        """La caseta del turno: una habitación pequeña con su mesa y, fuera, el tablón con el informe."""
        lat, lon = 61.0, 95.0
        rumbo = self.p.rumbo_hacia(lat, lon, ac.direccion(*POLO)) + 180
        lugar = self.p.lugar(lat, lon, rumbo=rumbo, apoyo=3.5, tomar=max)
        top = 0.3
        self.solido(ARENISCA_SOMBRA, ac.caja, lugar.m((0, 0, top - 2.0), escala=(5.6, 4.6, 4.0)))
        alto = 2.5
        self.solido(ARENISCA, ac.caja, lugar.m((0, 2.1, top + alto / 2), escala=(5.0, 0.3, alto)))
        for x in (-2.35, 2.35):
            self.solido(ARENISCA, ac.caja, lugar.m((x, 0, top + alto / 2), escala=(0.3, 4.0, alto)))
        for x in (-1.75, 1.75):
            self.solido(ARENISCA, ac.caja, lugar.m((x, -2.1, top + alto / 2), escala=(1.5, 0.3, alto)))
        self.solido(PIZARRA, ac.caja, lugar.m((0, -2.1, top + 2.2), escala=(2.0, 0.3, 0.6)))
        self.solido(PIZARRA, ac.caja, lugar.m((0, 0, top + alto + 0.12), escala=(5.8, 4.8, 0.24)))
        self.vista.pieza(ARENISCA_SOMBRA, ac.caja, lugar.m((0, 0, top + alto + 0.34), escala=(5.2, 4.2, 0.2)))
        # Ventana al fondo (luz ámbar) y mesa con una lámpara.
        self.luces.pieza(AMBAR, ac.caja, lugar.m((0, 1.93, top + 1.5), escala=(1.3, 0.06, 0.7)))
        self.solido(PIZARRA, ac.caja, lugar.m((0, 1.4, top + 0.78), escala=(2.2, 0.8, 0.08)))
        for x in (-1.0, 1.0):
            self.solido(PIZARRA_OSCURA, ac.caja, lugar.m((x, 1.4, top + 0.37), escala=(0.1, 0.6, 0.74)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((-0.4, 1.4, top + 0.84), (0, 0, 0.3), (0.5, 0.35, 0.03)))
        self.luces.pieza(AMBAR, ac.bola(0.1, 1), lugar.m((0.7, 1.5, top + 1.05)))
        self.solido(PIZARRA_OSCURA, ac.caja, lugar.m((-0.6, 0.55, top + 0.25), (0, 0, 0.4), (0.5, 0.5, 0.5)))
        self.rampa(lugar, 0, -2.2, top, 0, -1, ARENISCA, ancho=1.8)
        # Tablón del informe fuera, a la derecha de la puerta.
        for x in (2.9, 4.5):
            self.solido(PIZARRA_OSCURA, ac.caja, lugar.m((x, -3.0, top + 0.9), escala=(0.12, 0.12, 1.8)))
        self.vista.pieza(PIZARRA, ac.caja, lugar.m((3.7, -3.0, top + 1.35), escala=(1.9, 0.08, 1.1)))
        for k, (dx, dz, giro) in enumerate(((-0.55, 0.2, 0.05), (0.1, 0.25, -0.04), (0.6, 0.1, 0.07), (-0.2, -0.25, -0.05))):
            self.vista.pieza(PAPEL, ac.caja, lugar.m((3.7 + dx, -3.06, top + 1.35 + dz), (0, giro, 0), (0.45, 0.02, 0.55)))
        self.farol(lugar, 1.9, -3.4, top)
        self.marca("INT_informe", lugar, (3.7, -4.0, top + 1.4))

    def mirador(self):
        """La plataforma de la punta, con una barandilla y un banco mirando hacia fuera: el palco del final."""
        lugar = self.p.lugar(8.0, 0.0, rumbo=90, apoyo=3.2, tomar=max)
        top = 0.3
        self.solido(ARENISCA_SOMBRA, ac.cilindro(3.4, 14), lugar.m((0, 0, top - 2.0), escala=(1, 1, 4.0)))
        self.vista.pieza(ARENISCA, ac.cilindro(3.1, 14), lugar.m((0, 0, top - 0.03), escala=(1, 1, 0.06)))
        for k in range(14):
            a = 2 * math.pi * k / 14 + 0.1
            if abs(math.sin(a)) < 0.2 and math.cos(a) < 0:
                continue  # hueco de la barandilla donde se sube
            self.solido(PIZARRA, ac.caja, lugar.m((math.cos(a) * 3.0, math.sin(a) * 3.0, top + 0.55), (0, 0, a), (0.1, 0.12, 1.1)))
        self.vista.pieza(LATON, ac.toro(3.0, 0.05, 28, 4), lugar.m((0, 0, top + 1.1), (math.pi / 2, 0, 0)))
        self.rampa(lugar, -3.0, 0, top, -1, 0, ARENISCA, ancho=1.8)
        # Banco mirando hacia la punta (+Y de este lugar), con respaldo.
        self.solido(PIZARRA, ac.caja, lugar.m((0, -0.4, top + 0.25), escala=(2.2, 0.5, 0.5)))
        self.vista.pieza(PIZARRA_OSCURA, ac.caja, lugar.m((0, -0.7, top + 0.65), (0.2, 0, 0), (2.2, 0.1, 0.5)))
        self.farol(lugar, -2.5, 1.0, top, alto=1.8)
        self.farol(lugar, 2.5, 1.0, top, alto=1.8)

    def lugares(self):
        ac.borrar([o.name for o in bpy.data.objects if o.name.startswith("ANIM_")])
        self.cupula()
        self.caseta()
        self.mirador()


Observatorio().ejecutar()

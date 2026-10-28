# Viste el Laboratorio Oculto (CONTEXTO_PLANETAS.md §8): un edificio pequeño y íntimo, abandonado con prisa.
# La Sala de Trabajo con su pizarra, el dormitorio de dos camas (una sola usada), el escritorio de la
# investigadora, el del escéptico con su silla caída, el armario con la orden de silencio, el
# Banco del Contrapeso con lo que queda del artilugio y la Cámara, el aparato de los Ausentes con sus anillos y
# un dial de 24 marcas cuyo último cuarto está encendido.
#
# Tiempo muy lento (0,20): lo único que se mueve es la aguja del reloj de mesa (ANIM_reloj_mesa, casi quieta).
# Atmósfera: verde grisáceo clínico, blanco roto, luz de lámpara cálida.
# Uso: blender -b blender/laboratorio.blend --python-exit-code 1 --python blender/scripts/arte_laboratorio.py
import math
import os
import sys

import bpy

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "laboratorio"

VERDE = "#7C8C80"
VERDE_CLARO = "#9CAC9E"
GRIS = "#555E58"
BLANCO = "#E4E2D6"
MADERA = "#8A6A48"
LATON = "#A88A50"
PAPEL = "#EDE6D0"
TIZA = "#F4F0E4"
PIZARRA = "#2C3834"
MANTA = "#4A6A72"
SELLO = "#A83A32"
ARENISCA = "#B9AE96"
AMBAR = "#FFC070"
CIAN = "#7ADCC8"


class Laboratorio(ac.Vestido):
    def __init__(self):
        # Luz cálida de lámpara sobre un ambiente verde grisáceo.
        super().__init__(MUNDO, AMBAR, SCRIPTS, ambiente=(1.6, "#A8B8A8"))
        self.p = self.planeta
        self.paleta = bpy.data.materials.get(f"M_Paleta_{MUNDO}")
        self.top = 0.5

    def lampara_colgante(self, lugar, x, y, largo=0.7):
        t = self.top
        self.vista.pieza(GRIS, ac.cilindro(0.015, 4), lugar.m((x, y, t + 3.0 - largo / 2), escala=(1, 1, largo)))
        self.vista.pieza(LATON, ac.cono(0.28, 0.08, 8), lugar.m((x, y, t + 3.0 - largo - 0.04), escala=(1, 1, 0.2)))
        self.luces.pieza(AMBAR, ac.bola(0.11, 1), lugar.m((x, y, t + 3.0 - largo - 0.12)))

    def cama(self, lugar, x, y, usada):
        t = self.top
        self.solido(GRIS, ac.caja, lugar.m((x, y, t + 0.22), escala=(1.0, 2.1, 0.34)))
        self.vista.pieza(BLANCO, ac.caja, lugar.m((x, y, t + 0.46), escala=(0.94, 2.0, 0.14)))
        self.vista.pieza(BLANCO, ac.caja, lugar.m((x, y + 0.8, t + 0.58), escala=(0.6, 0.35, 0.12)))
        if usada:
            # Manta revuelta, almohada torcida y la huella en el colchón.
            self.vista.pieza(MANTA, ac.caja, lugar.m((x + 0.18, y - 0.15, t + 0.58), (0, 0.08, 0.18), (0.8, 1.2, 0.1)))
            self.vista.pieza(MANTA, ac.caja, lugar.m((x - 0.38, y - 1.0, t + 0.4), (0.1, 0, 0.3), (0.4, 0.5, 0.3)))
            self.vista.pieza(VERDE, ac.caja, lugar.m((x, y + 0.1, t + 0.54), escala=(0.5, 0.9, 0.04)))
        else:
            self.vista.pieza(MANTA, ac.caja, lugar.m((x, y - 0.75, t + 0.56), escala=(0.9, 0.45, 0.1)))

    def escritorio(self, lugar, x, y, ancho=2.4, fondo=0.9):
        t = self.top
        self.solido(MADERA, ac.caja, lugar.m((x, y, t + 0.78), escala=(ancho, fondo, 0.08)))
        for dx in (-ancho / 2 + 0.1, ancho / 2 - 0.1):
            for dy in (-fondo / 2 + 0.1, fondo / 2 - 0.1):
                self.solido(GRIS, ac.caja, lugar.m((x + dx, y + dy, t + 0.37), escala=(0.08, 0.08, 0.74)))

    # ---- Edificio -----------------------------------------------------------------------------

    def edificio(self, lugar):
        t = self.top
        alto = 3.2
        self.solido(GRIS, ac.caja, lugar.m((0, 0, t - 2.0), escala=(15.6, 10.6, 4.0)))
        for ix in range(6):
            for iy in range(4):
                color = BLANCO if (ix + iy) % 2 == 0 else VERDE_CLARO
                self.vista.pieza(color, ac.caja, lugar.m((-6.25 + ix * 2.5, -3.75 + iy * 2.5, t + 0.005), escala=(2.5, 2.5, 0.012)))
        self.solido(VERDE, ac.caja, lugar.m((0, 5.0, t + alto / 2), escala=(15.0, 0.3, alto)))
        for x in (-7.5, 7.5):
            self.solido(VERDE, ac.caja, lugar.m((x, 0, t + alto / 2), escala=(0.3, 10.0, alto)))
        for x in (-4.3, 4.3):
            self.solido(VERDE, ac.caja, lugar.m((x, -5.0, t + alto / 2), escala=(6.4, 0.3, alto)))
        self.solido(GRIS, ac.caja, lugar.m((0, -5.0, t + 2.9), escala=(2.2, 0.3, 0.6)))
        self.solido(GRIS, ac.caja, lugar.m((0, 0, t + alto + 0.15), escala=(15.8, 10.8, 0.3)))
        self.vista.pieza(VERDE_CLARO, ac.caja, lugar.m((0, 0, t + alto + 0.36), escala=(14.6, 9.6, 0.14)))
        # Zócalo oscuro y ventanas cálidas hacia fuera (las del lado sur, junto a la puerta).
        self.vista.pieza(GRIS, ac.caja, lugar.m((0, -5.17, t + 0.25), escala=(15.0, 0.06, 0.5)))
        for x in (-4.4, 4.4):
            self.vista.pieza(GRIS, ac.caja, lugar.m((x, -5.17, t + 1.7), escala=(1.8, 0.06, 1.2)))
            self.luces.pieza(AMBAR, ac.caja, lugar.m((x, -5.2, t + 1.7), escala=(1.5, 0.04, 0.9)))
        # Escalón y farol en la puerta.
        self.rampa(lugar, 0, -5.2, t, 0, -1, BLANCO, ancho=2.6)
        self.vista.pieza(GRIS, ac.cilindro(0.06, 6), lugar.m((1.9, -5.9, t + 1.1), escala=(1, 1, 2.2)))
        self.luces.pieza(AMBAR, ac.bola(0.14, 1), lugar.m((1.9, -5.9, t + 2.25)))
        for x, y in ((-4.0, 1.8), (3.0, 0.2), (-3.6, -2.2), (4.8, 3.5)):
            self.lampara_colgante(lugar, x, y)

    def dormitorio(self, lugar):
        t = self.top
        self.cama(lugar, -6.2, 3.3, usada=True)
        self.cama(lugar, -6.2, 0.5, usada=False)
        self.solido(MADERA, ac.caja, lugar.m((-6.5, 1.9, t + 0.28), escala=(0.5, 0.5, 0.55)))
        self.vista.pieza(BLANCO, ac.cilindro(0.04, 6), lugar.m((-6.5, 1.9, t + 0.67), escala=(1, 1, 0.24)))
        self.luces.pieza(AMBAR, ac.bola(0.05, 1), lugar.m((-6.5, 1.9, t + 0.84)))
        # Un par de zapatillas bajo la cama usada y una maleta cerrada a los pies de la otra.
        self.vista.pieza(GRIS, ac.caja, lugar.m((-5.5, 4.0, t + 0.05), (0, 0, 0.5), (0.3, 0.12, 0.1)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((-6.2, -1.1, t + 0.18), escala=(0.7, 0.45, 0.35)))
        self.marca("INT_dormitorio", lugar, (-5.0, 1.9, t + 1.0))

    def pizarra(self, lugar):
        t = self.top
        self.vista.pieza(MADERA, ac.caja, lugar.m((-2.0, 4.8, t + 1.75), escala=(4.5, 0.06, 2.1)))
        self.vista.pieza(PIZARRA, ac.caja, lugar.m((-2.0, 4.77, t + 1.75), escala=(4.2, 0.06, 1.8)))
        # La ecuación a medias: renglones de rayas de tiza y, al final, una línea que se corta.
        filas = ((0.6, (0.5, 0.2, 0.9, 0.3, 0.5)), (0.2, (0.7, 0.4, 0.3, 0.8)), (-0.2, (0.5, 0.9, 0.2)), (-0.6, (0.4, 0.3)))
        for z, tramos in filas:
            x = -3.8
            for ancho in tramos:
                self.vista.pieza(TIZA, ac.caja, lugar.m((x + ancho / 2, 4.73, t + 1.75 + z), (0, 0.02, 0), (ancho, 0.02, 0.06)))
                x += ancho + 0.18
        self.vista.pieza(TIZA, ac.cilindro(0.17, 10), lugar.m((-0.9, 4.73, t + 1.55), (math.pi / 2, 0, 0), (1, 1, 0.02)))
        self.vista.pieza(TIZA, ac.caja, lugar.m((-0.9, 4.73, t + 1.3), escala=(0.5, 0.02, 0.04)))
        self.marca("INT_pizarra", lugar, (-2.0, 3.8, t + 1.3))

    def escritorio_investigadora(self, lugar):
        t = self.top
        x, y = 4.8, 3.9
        self.escritorio(lugar, x, y)
        # Silla echada hacia atrás, con el respaldo.
        self.solido(MADERA, ac.caja, lugar.m((x + 0.2, y - 1.0, t + 0.5), (0, 0, 0.3), (0.5, 0.5, 0.06)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((x + 0.3, y - 1.25, t + 0.85), (-0.15, 0, 0.3), (0.5, 0.06, 0.6)))
        # Papeles, lámpara y reloj de mesa de aguja lentísima.
        for k, (dx, dy, giro) in enumerate(((-0.6, 0.05, 0.3), (-0.2, -0.1, -0.2), (0.1, 0.15, 0.5), (-0.7, -0.2, -0.1))):
            self.vista.pieza(PAPEL, ac.caja, lugar.m((x + dx, y + dy, t + 0.83 + 0.01 * k), (0, 0, giro), (0.35, 0.45, 0.01)))
        self.vista.pieza(LATON, ac.cilindro(0.1, 6), lugar.m((x + 0.9, y + 0.2, t + 0.84), escala=(1, 1, 0.04)))
        self.vista.pieza(LATON, ac.cilindro(0.02, 4), lugar.m((x + 0.9, y + 0.2, t + 1.07), escala=(1, 1, 0.45)))
        self.vista.pieza(LATON, ac.cono(0.2, 0.06, 8), lugar.m((x + 0.9, y + 0.2, t + 1.3), escala=(1, 1, 0.2)))
        self.luces.pieza(AMBAR, ac.bola(0.07, 1), lugar.m((x + 0.9, y + 0.2, t + 1.25)))
        self.vista.pieza(BLANCO, ac.cilindro(0.2, 12), lugar.m((x + 0.2, y - 0.2, t + 0.84), escala=(1, 1, 0.05)))
        self.vista.pieza(GRIS, ac.cilindro(0.2, 12), lugar.m((x + 0.2, y - 0.2, t + 0.82), escala=(1.1, 1.1, 0.03)))
        aguja = ac.Malla()
        aguja.pieza(PIZARRA, ac.caja, ac.matriz((0, 0.08, 0), escala=(0.015, 0.16, 0.012)))
        ac.objeto_suelto(self.p, "ANIM_reloj_mesa", aguja, self.paleta, lugar.m((x + 0.2, y - 0.2, t + 0.88)), {"spin": 0.05})
        self.marca("INT_notas_investigadora", lugar, (x, y - 1.0, t + 1.3))

    def escritorio_esceptico(self, lugar):
        t = self.top
        x, y = 5.2, -3.6
        self.escritorio(lugar, x, y, ancho=1.6, fondo=0.7)
        # La silla caída de lado y los papeles amontonados.
        self.vista.pieza(MADERA, ac.caja, lugar.m((x - 1.3, y + 0.5, t + 0.28), (0, math.pi / 2, 0.4), (0.5, 0.5, 0.06)))
        self.vista.pieza(MADERA, ac.caja, lugar.m((x - 1.55, y + 0.45, t + 0.1), (0.1, 0, 0.4), (0.06, 0.5, 0.6)))
        for k in range(5):
            self.vista.pieza(PAPEL, ac.caja, lugar.m((x - 0.4 + 0.08 * k, y + 0.05 * k, t + 0.83 + 0.012 * k), (0, 0, 0.3 * k - 0.4), (0.4, 0.5, 0.012)))
        self.vista.pieza(GRIS, ac.cilindro(0.06, 6), lugar.m((x + 0.5, y - 0.1, t + 0.89), escala=(1, 1, 0.12)))
        self.marca("INT_notas_esceptico", lugar, (x, y + 0.9, t + 1.3))

    def armario_orden(self, lugar):
        t = self.top
        self.solido(GRIS, ac.caja, lugar.m((7.1, 1.6, t + 0.6), escala=(0.6, 1.6, 1.2)))
        self.vista.pieza(VERDE_CLARO, ac.caja, lugar.m((6.78, 1.6, t + 0.6), escala=(0.02, 0.06, 1.0)))
        # La orden: un sobre cerrado con un sello rojo, apoyado encima, y una carpeta debajo.
        self.vista.pieza(PAPEL, ac.caja, lugar.m((7.1, 1.6, t + 1.215), (0, 0, 0.2), (0.34, 0.46, 0.03)))
        self.vista.pieza(SELLO, ac.cilindro(0.06, 8), lugar.m((7.1, 1.6, t + 1.245), escala=(1, 1, 0.025)))
        self.vista.pieza(GRIS, ac.caja, lugar.m((7.1, 1.15, t + 1.205), (0, 0, -0.1), (0.3, 0.4, 0.02)))
        self.marca("INT_orden_silencio", lugar, (6.2, 1.6, t + 1.1))

    def banco_contrapeso(self, lugar):
        t = self.top
        x, y = 2.6, -0.8
        self.solido(MADERA, ac.caja, lugar.m((x, y, t + 0.9), escala=(3.6, 1.1, 0.1)))
        for dx in (-1.65, 1.65):
            for dy in (-0.45, 0.45):
                self.solido(GRIS, ac.caja, lugar.m((x + dx, y + dy, t + 0.43), escala=(0.1, 0.1, 0.86)))
        # El artilugio a medias: un anillo en dos soportes, el motor tumbado, piezas sueltas y cables.
        for dx in (-0.55, 0.55):
            self.vista.pieza(GRIS, ac.caja, lugar.m((x + dx, y, t + 1.12), escala=(0.08, 0.5, 0.34)))
        self.vista.pieza(ARENISCA, ac.toro(0.62, 0.07, 18, 4), lugar.m((x, y, t + 1.75)))
        self.vista.pieza(ARENISCA, ac.caja, lugar.m((x + 0.9, y - 0.2, t + 1.0), (0, 0.3, 0.2), (0.45, 0.1, 0.08)))
        self.vista.pieza(GRIS, ac.cilindro(0.28, 10), lugar.m((x - 1.15, y, t + 1.12), (0, math.pi / 2, 0), (1, 1, 0.9)))
        self.vista.pieza(LATON, ac.cilindro(0.18, 8), lugar.m((x - 1.15, y, t + 1.12), (0, math.pi / 2, 0), (1, 1, 1.05)))
        for k in range(4):
            self.vista.pieza(LATON, ac.cilindro(0.06, 6), lugar.m((x + 0.5 + k * 0.28, y + 0.35, t + 0.97), escala=(1, 1, 0.06)))
        self.vista.pieza(PIZARRA, ac.caja, lugar.m((x - 0.5, y + 0.32, t + 0.96), (0, 0, 0.5), (0.35, 0.2, 0.02)))
        # Cables que bajan al suelo y siguen hacia la Cámara.
        self.vista.pieza(GRIS, ac.caja, lugar.m((x - 1.8, y - 0.2, t + 0.5), (0, 0.4, 0), (0.03, 0.03, 1.0)))
        self.vista.pieza(GRIS, ac.caja, lugar.m((x - 3.2, y - 0.8, t + 0.03), (0, 0, 0.2), (2.6, 0.04, 0.04)))
        self.marca("INT_contrapeso", lugar, (x, y - 1.0, t + 1.3))

    def camara(self, lugar):
        """La Cámara: dos anillos cruzados, un asiento y un dial de 24 marcas con el último cuarto encendido."""
        t = self.top
        cx, cy = -3.6, -2.2
        self.solido(ARENISCA, ac.cilindro(2.0, 16), lugar.m((cx, cy, t + 0.1), escala=(1, 1, 0.2)))
        self.vista.pieza(PIZARRA, ac.cilindro(1.7, 16), lugar.m((cx, cy, t + 0.21), escala=(1, 1, 0.02)))
        centro = t + 1.8
        self.vista.pieza(ARENISCA, ac.toro(1.6, 0.13, 24, 4), lugar.m((cx, cy, centro)))
        self.vista.pieza(PIZARRA, ac.toro(1.3, 0.09, 20, 4), lugar.m((cx, cy, centro), (0, 0, math.pi / 2)))
        for k in range(24):
            a = 2 * math.pi * k / 24
            pieza = self.luces if k < 6 else self.vista
            pieza.pieza(AMBAR if k < 6 else PIZARRA, ac.caja,
                        lugar.m((cx + math.cos(a) * 1.6, cy - 0.16, centro + math.sin(a) * 1.6), (0, math.pi / 2 - a, 0), (0.14, 0.06, 0.34)))
        # Un asiento reclinado en el centro, mirando a la puerta, y una cinta que baja a un pupitre.
        self.solido(GRIS, ac.caja, lugar.m((cx, cy, t + 0.5), escala=(0.8, 0.9, 0.5)))
        self.vista.pieza(VERDE_CLARO, ac.caja, lugar.m((cx, cy + 0.45, t + 1.05), (-0.3, 0, 0), (0.8, 0.12, 0.8)))
        self.vista.pieza(VERDE_CLARO, ac.caja, lugar.m((cx, cy - 0.2, t + 0.78), escala=(0.7, 0.6, 0.1)))
        self.luces.pieza(CIAN, ac.caja, lugar.m((cx, cy + 1.55, t + 0.05), escala=(0.5, 0.04, 0.02)))
        self.vista.pieza(GRIS, ac.caja, lugar.m((cx + 1.0, cy + 0.4, t + 0.03), (0, 0, -0.4), (1.7, 0.04, 0.04)))
        self.marca("INT_camara", lugar, (cx, cy - 2.5, t + 1.2))

    def lugares(self):
        ac.borrar([o.name for o in bpy.data.objects if o.name.startswith("ANIM_")])
        # Plataforma: se apoya en el punto más alto y se hunde por los lados (el planeta es pequeño y curva).
        lugar = self.p.lugar(5.0, 0.0, rumbo=0, apoyo=9, tomar=max)
        self.edificio(lugar)
        self.dormitorio(lugar)
        self.pizarra(lugar)
        self.escritorio_investigadora(lugar)
        self.escritorio_esceptico(lugar)
        self.armario_orden(lugar)
        self.banco_contrapeso(lugar)
        self.camara(lugar)
        self.marca("SPAWN_Laboratorio", lugar, (0, -8.5, self.top + 1.0))


Laboratorio().ejecutar()

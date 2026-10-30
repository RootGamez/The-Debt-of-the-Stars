# Viste la Luna de Hogar (CONTEXTO_PLANETAS.md §9, plan de la Fase 9D): gris azulada, con cráteres, polvo claro y
# piedras sueltas. En la cara que mira a Hogar (cerca de lat 0, lon −111: el juego la pone así con sistema-hogar.json)
# está el fragmento más grande que ha llegado nunca: una losa de los Ausentes clavada de canto en el suelo, con el
# borde de arriba cortado en curva perfecta, sus estratos y una fecha tallada con marcas de reloj. Alrededor, las
# esquirlas que soltó al llegar. En el fondo de la mordida, un hilo de luz (🟡): ahí se abrirá el gusano (hito 9E).
#
# Uso: blender -b blender/luna.blend --python-exit-code 1 --python blender/scripts/arte_luna.py
#      (deja el .blend guardado; luego `npm run modelos -- luna` desde web/)
import math
import os
import random
import sys

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "luna"
SEMILLA = 5

POLVO = "#B4BCC8"
POLVO_CLARO = "#CCD2DC"
ROCA = "#6A7080"
ROCA_CLARA = "#9AA2B2"
ROCA_OSCURA = "#4E5666"
# Los Ausentes, como en Umbral y en las vitrinas del Instituto.
ARENISCA = "#D8C49A"
ARENISCA_SOMBRA = "#B8A27A"
PIZARRA_AUSENTES = "#3A3A48"
LUZ = "#FFD890"

FRAGMENTO = (18.0, -102.0)  # cerca del centro de la cara que mira a Hogar


class Luna(ac.Vestido):
    def __init__(self):
        # Luz fría, sin aire: la que rebota de Hogar.
        super().__init__(MUNDO, LUZ, SCRIPTS, ambiente=(1.05, "#B8C4E0"))
        self.p = self.planeta
        self.rng = random.Random(SEMILLA)

    def fragmento_grande(self):
        lat, lon = FRAGMENTO
        # De cara al norte del sitio (rumbo 20: por donde suele posarse la nave, viniendo de Hogar).
        lugar = self.p.lugar(lat, lon, rumbo=200, apoyo=2.2, hundir=0.7)
        # La losa en su propio marco (inclinada, sin escalar): ancho X, fondo Y, alto Z; su cara grande mira a −Y.
        ancho, fondo, alto = 2.6, 0.95, 3.8
        losa = ac.Lugar(lugar.m((0, 0, 1.55), (0.22, 0.06, 0.0)))
        cara = -fondo / 2
        mordida = ((0.45, -0.7, 1.75), 1.05)  # arriba, en la arista de delante: una esfera perfecta
        self.solido(ARENISCA, ac.fragmento([mordida, ((-1.45, -0.15, 0.35), 0.5)], 12, (ancho, fondo, alto)), losa.m())
        # Estratos: franjas más oscuras de lado a lado (los Ausentes tallaban en capas).
        for z in (-1.35, -0.85, 0.15):
            self.vista.pieza(ARENISCA_SOMBRA, ac.caja, losa.m((0, cara - 0.012, z), escala=(ancho * 0.97, 0.03, 0.1)))
        # La fecha tallada: un aro de doce marcas de reloj (las de los cuartos, más largas) con su aguja y, debajo,
        # tres muescas. Es lo que dice que esta piedra es más antigua que las anteriores.
        cx, cz, r = -0.55, -0.15, 0.42
        self.vista.pieza(PIZARRA_AUSENTES, ac.toro(r, 0.025, 28, 4), losa.m((cx, cara - 0.015, cz)))
        for k in range(12):
            a = 2 * math.pi * k / 12
            largo = 0.16 if k % 3 == 0 else 0.08
            self.vista.pieza(PIZARRA_AUSENTES, ac.caja, losa.m((cx + math.cos(a) * (r - 0.1), cara - 0.015, cz + math.sin(a) * (r - 0.1)),
                                                               (0, math.pi / 2 - a, 0), (0.035, 0.03, largo)))
        self.vista.pieza(PIZARRA_AUSENTES, ac.caja, losa.m((cx + 0.1, cara - 0.02, cz + 0.08), (0, -0.9, 0), (0.03, 0.03, 0.3)))
        for k in range(3):
            self.vista.pieza(PIZARRA_AUSENTES, ac.cilindro(0.04, 6), losa.m((cx - 0.15 + k * 0.15, cara - 0.015, cz - r - 0.18),
                                                                             (math.pi / 2, 0, 0), (1, 1, 0.03)))
        # El hilo de luz en el fondo de la mordida.
        (mx, my, mz), mr = mordida
        self.luces.pieza(LUZ, ac.caja, losa.m((mx - 0.1, my + mr - 0.04, mz - 0.25), (0, 0.35, 0), (0.025, 0.02, 0.9)))
        # Esquirlas alrededor y la tierra removida donde se clavó.
        for k in range(16):
            a = self.rng.uniform(0, 2 * math.pi)
            d = self.rng.uniform(1.9, 4.8)
            s = self.rng.uniform(0.18, 0.42)
            medidas = (s * 1.6, s, s * 0.9)
            corte = [((self.rng.uniform(-0.3, 0.3) * s, -0.5 * s, 0.45 * s), 0.6 * s)]
            self.solido(self.rng.choice((ARENISCA, ARENISCA_SOMBRA)), ac.fragmento(corte, 3, medidas),
                        lugar.m((math.cos(a) * d, math.sin(a) * d, s * 0.25), (self.rng.uniform(-0.4, 0.4), self.rng.uniform(-0.4, 0.4), a)))
        for k in range(8):
            a = 2 * math.pi * k / 8 + self.rng.uniform(-0.2, 0.2)
            self.vista.pieza(ROCA_OSCURA, ac.bola(self.rng.uniform(0.5, 0.8), 1),
                             lugar.m((math.cos(a) * 1.9, math.sin(a) * 1.3, 0.05), (0, 0, a), (1.4, 0.6, 0.25)))
        self.marca("INT_fragmento_luna", lugar, (0.0, -1.7, 1.5))
        self.marca("SPAWN_Luna", lugar, (0.5, -7.0, 1.0), rumbo=200)  # mirando al fragmento

    def suelo_lunar(self):
        """Rocas sueltas, losas de polvo claro y cantos en toda la Luna (lejos del fragmento)."""
        centro = ac.direccion(*FRAGMENTO)
        for tipo, n in (("roca", 90), ("polvo", 60), ("canto", 160)):
            puestos = 0
            while puestos < n:
                lat = math.degrees(math.asin(self.rng.uniform(-1, 1)))
                lon = self.rng.uniform(-180, 180)
                if ac.direccion(lat, lon).angle(centro) * self.p.radio < 7:
                    continue
                lugar = self.p.lugar(lat, lon, rumbo=self.rng.uniform(0, 360), apoyo=0.4, hundir=0.15)
                if tipo == "roca":
                    r = self.rng.uniform(0.3, 1.2)
                    self.solido(self.rng.choice((ROCA, ROCA_CLARA, ROCA_OSCURA)), ac.bola(r, 1),
                                lugar.m((0, 0, r * 0.25), (self.rng.uniform(0, 1), 0, 0), (1.0, self.rng.uniform(0.6, 1.0), self.rng.uniform(0.45, 0.8))))
                elif tipo == "polvo":
                    r = self.rng.uniform(1.0, 2.6)
                    self.vista.pieza(POLVO_CLARO, ac.cilindro(r, 9), lugar.m((0, 0, 0.12), escala=(1.0, self.rng.uniform(0.6, 1.0), 0.04)))
                else:
                    r = self.rng.uniform(0.06, 0.16)
                    self.vista.pieza(self.rng.choice((ROCA, ROCA_CLARA)), ac.bola(r, 1), lugar.m((0, 0, r * 0.2)))
                puestos += 1

    def lugares(self):
        self.fragmento_grande()
        self.suelo_lunar()


Luna().ejecutar()

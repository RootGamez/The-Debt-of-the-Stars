# Los Ool (✅ Anthony, 2026-10-29; CONTEXTO_HISTORIA.md §7): pequeños, redondeados, tiernos y extraterrestres, sin
# rasgos de animales de la Tierra (ni hocico, ni orejas, ni pelo común). Cuerpo de fibras como musgo con motas de
# luz, dos ojos grandes y oscuros, manos y pies de cuatro dedos y filamentos en la cabeza que se iluminan.
# Los adultos miden de 1,6 a 1,8 m (como quien juega: sus ojos están a 1,6 m) y una cría, 1,1 m.
# Se modelan en low poly (🟡, plan de la Fase 9): cabeza grande y redonda, cuerpo en pera, ropa encima según quién
# es. Cada uno se construye en dos mallas: lo que se ve (`vista`, colores por cara) y lo que brilla (`vivas`: las
# puntas de los filamentos y las motas). Origen a ras de los pies, mirando hacia +Y.
#
# Variantes: la Maestra (mayor, gafas redondas, bufanda, abrigo con dibujos, libro y bolsa), la Directora (abrigo
# largo rojo con broche, cuello alto), el técnico (delantal de cuero, gafas de taller en la frente, cinturón de
# herramientas), la mecánica (mono verde remendado, pañuelo, llave) y vecinos de la aldea (túnicas; una cría).
import math
import random

import arte_comun as ac

PIEL = ("#4E8A7A", "#5A9682", "#4A8270", "#62A08A")
PIEL_MAYOR = "#6E8E82"
MOTA = "#9AD0A8"
OJO = "#161A24"
BRILLO_OJO = "#F4F8FF"
CUERO = "#6A4428"
CUERO_OSCURO = "#4A2E1C"
LATON = "#B89040"
TELA = {
    "crema": "#E8D8B0", "ocre": "#C8963C", "rojo": "#9E3A2E", "rojo_claro": "#B0503A", "azul": "#4A6A8A",
    "verde": "#5A7A4A", "verde_claro": "#7A9A5A", "mostaza": "#D0A040", "rosa": "#C8807A", "gris": "#8A8478",
    "marron": "#7A5A3C", "papel": "#F0E6D0", "tinta": "#3A3040",
}
VIVA = "#7FF0C8"


class Ool:
    """Construye un Ool en las mallas `vista` y `vivas` en el marco `lugar` (pies en el origen, mirando a +Y)."""

    def __init__(self, vista, vivas, lugar, semilla, alto=1.25, piel=None, mayor=False):
        self.vista, self.vivas, self.l = vista, vivas, lugar
        self.rng = random.Random(semilla)
        self.s = alto / 1.25
        self.piel = piel or (PIEL_MAYOR if mayor else self.rng.choice(PIEL))
        self.mayor = mayor

    def m(self, pos, rot=(0, 0, 0), escala=(1, 1, 1)):
        s = self.s
        return self.l.m((pos[0] * s, pos[1] * s, pos[2] * s), rot, (escala[0] * s, escala[1] * s, escala[2] * s))

    # ---- El cuerpo -----------------------------------------------------------------------------

    def cuerpo(self, ropa, perfil=None):
        """Botas, cuerpo en pera (vestido con `ropa`), brazos y manos de cuatro dedos."""
        for lado in (-1, 1):
            self.vista.pieza(CUERO_OSCURO, ac.bola(0.1, 2), self.m((lado * 0.12, 0.03, 0.07), escala=(1.25, 1.7, 0.85)))
            self.vista.pieza(CUERO, ac.cilindro(0.085, 8), self.m((lado * 0.12, 0.0, 0.17), escala=(1, 1, 0.14)))
        perfil = perfil or [(0.0, 0.14), (0.22, 0.16), (0.31, 0.3), (0.33, 0.45), (0.29, 0.58), (0.2, 0.67), (0.0, 0.7)]
        self.vista.pieza(ropa, ac.torno(perfil, 14), self.m((0, 0, 0)))
        for lado in (-1, 1):
            hombro = (lado * 0.27, 0.0, 0.56)
            self.vista.pieza(ropa, ac.bola(0.1, 2), self.m(hombro))
            self.vista.pieza(ropa, ac.cono(0.085, 0.07, 8), self.m((lado * 0.33, 0.02, 0.43), (0, lado * 0.35, 0), (1, 1, 0.28)))
            self.mano(lado * 0.38, 0.04, 0.27, lado)

    def mano(self, x, y, z, lado):
        self.vista.pieza(self.piel, ac.bola(0.07, 2), self.m((x, y, z), escala=(0.9, 1.0, 1.1)))
        for k in range(4):
            a = math.radians(-35 + k * 23)
            self.vista.pieza(self.piel, ac.bola(0.026, 1),
                             self.m((x + lado * 0.02 + math.sin(a) * 0.03, y + math.cos(a) * 0.05, z - 0.06 - 0.01 * (k % 2)), escala=(1, 1, 1.3)))

    def cabeza(self, z=0.98):
        """Cabeza grande y redonda de musgo, con motas claras, ojos grandes con brillo, boca pequeña y filamentos."""
        r = 0.31
        self.vista.pieza(self.piel, ac.bola(r, 4), self.m((0, 0, z), escala=(1.0, 0.94, 0.92)))
        # Motas de musgo claro y unas pocas que brillan.
        for k in range(34):
            u = self.rng.uniform(-0.35, 1.0)
            a = self.rng.uniform(0, 2 * math.pi)
            if u < 0.2 and math.sin(a) > 0.4:
                continue  # la cara queda limpia
            d = ac.direccion(math.degrees(math.asin(u)), math.degrees(a))
            p = (d.x * r * 1.0, d.y * r * 0.94, z + d.z * r * 0.92)
            if k % 9 == 0:
                self.vivas.pieza(VIVA, ac.bola(0.012, 1), self.m(p))
            else:
                self.vista.pieza(MOTA if k % 2 else self.piel, ac.bola(self.rng.uniform(0.018, 0.03), 1), self.m(p, escala=(1, 1, 0.6)))
        # Ojos grandes, oscuros, un poco separados, con su brillo.
        for lado in (-1, 1):
            ojo = (lado * 0.115, r * 0.84, z + 0.02)
            self.vista.pieza(OJO, ac.bola(0.085, 3), self.m(ojo, escala=(1.0, 0.55, 1.15)))
            self.vista.pieza(BRILLO_OJO, ac.bola(0.022, 1), self.m((ojo[0] - 0.025, ojo[1] + 0.045, ojo[2] + 0.04)))
            self.vista.pieza(BRILLO_OJO, ac.bola(0.01, 1), self.m((ojo[0] + 0.02, ojo[1] + 0.045, ojo[2] - 0.03)))
        self.vista.pieza(OJO, ac.caja, self.m((0, r * 0.86, z - 0.12), escala=(0.05, 0.01, 0.008)))
        # Filamentos: tallos finos que salen de lo alto, suben y se curvan hacia fuera, con la punta de luz viva.
        fin = math.pi * 0.45
        for k in range(self.rng.randint(7, 10)):
            a = self.rng.uniform(0, 2 * math.pi)
            u = self.rng.uniform(0.45, 0.85)
            base = ac.direccion(math.degrees(math.asin(u)), math.degrees(a))
            p = (base.x * r * 0.95, base.y * r * 0.9, z + base.z * r * 0.88)
            radio = self.rng.uniform(0.09, 0.16)
            giro = math.atan2(base.y, base.x)
            self.vista.pieza(self.piel, ac.arco(radio, 0.014, fin, math.pi, 7, 5),
                             self.m((p[0] + math.cos(giro) * radio, p[1] + math.sin(giro) * radio, p[2]), (0, 0, giro)))
            fuera = radio * (1 + math.cos(fin))
            punta = (p[0] + math.cos(giro) * fuera, p[1] + math.sin(giro) * fuera, p[2] + radio * math.sin(fin))
            self.vivas.pieza(VIVA, ac.bola(0.022, 1), self.m(punta))

    def remiendos(self, colores, n=4, z0=0.22, z1=0.6, r=0.32):
        for k in range(n):
            a = self.rng.uniform(-math.pi, math.pi)
            z = self.rng.uniform(z0, z1)
            self.vista.pieza(self.rng.choice(colores), ac.caja,
                             self.m((math.cos(a) * r, math.sin(a) * r, z), (0, 0, a), (0.02, 0.09, 0.08)))

    # ---- Quién es ------------------------------------------------------------------------------

    def maestra(self):
        """Mayor: abrigo largo con dibujos, bufanda, gafas redondas, bolsa al hombro y un libro en la mano."""
        abrigo = [(0.0, 0.1), (0.3, 0.11), (0.34, 0.28), (0.34, 0.45), (0.29, 0.58), (0.2, 0.67), (0.0, 0.7)]
        self.cuerpo(TELA["crema"], abrigo)
        for z, col in ((0.16, TELA["rojo"]), (0.21, TELA["azul"]), (0.26, TELA["mostaza"])):
            self.vista.pieza(col, ac.toro(0.315, 0.012, 20, 3), self.m((0, 0, z), (math.pi / 2, 0, 0)))
        for k in range(10):
            a = 2 * math.pi * k / 10
            self.vista.pieza(TELA["rojo"], ac.caja, self.m((math.cos(a) * 0.335, math.sin(a) * 0.335, 0.37), (0, 0, a), (0.01, 0.05, 0.05)))
        self.vista.pieza(TELA["mostaza"], ac.toro(0.2, 0.06, 16, 5), self.m((0, 0, 0.69), (math.pi / 2, 0, 0)))
        self.vista.pieza(TELA["mostaza"], ac.caja, self.m((0.1, 0.2, 0.52), (0.1, 0, 0.2), (0.09, 0.03, 0.3)))
        self.cabeza()
        for lado in (-1, 1):
            self.vista.pieza(LATON, ac.toro(0.06, 0.008, 12, 3), self.m((lado * 0.11, 0.33, 1.0)))
        self.vista.pieza(LATON, ac.caja, self.m((0, 0.34, 1.01), escala=(0.05, 0.01, 0.008)))
        self.vista.pieza(CUERO, ac.caja, self.m((0.33, 0.0, 0.35), escala=(0.08, 0.22, 0.18)))
        self.vista.pieza(CUERO_OSCURO, ac.caja, ac.caja_entre(self.l.base @ ac.Vector((0.3 * self.s, 0.0, 0.45 * self.s)),
                                                              self.l.base @ ac.Vector((-0.18 * self.s, 0.05 * self.s, 0.68 * self.s)), 0.03 * self.s, 0.015 * self.s))
        self.vista.pieza(TELA["verde"], ac.caja, self.m((-0.37, 0.12, 0.3), (0.3, 0, 0.2), (0.05, 0.14, 0.18)))
        self.vista.pieza(TELA["papel"], ac.caja, self.m((-0.37, 0.12, 0.3), (0.3, 0, 0.2), (0.045, 0.13, 0.17)))

    def directora(self):
        """Abrigo largo rojo hasta los pies, cuello alto y un broche de latón con el aro del Instituto."""
        abrigo = [(0.0, 0.06), (0.32, 0.07), (0.35, 0.25), (0.34, 0.45), (0.3, 0.58), (0.22, 0.68), (0.0, 0.72)]
        self.cuerpo(TELA["rojo"], abrigo)
        self.vista.pieza(TELA["rojo_claro"], ac.torno([(0.17, 0.66), (0.21, 0.7), (0.2, 0.8), (0.16, 0.82)], 14), self.m((0, 0, 0)))
        for k in range(5):
            self.vista.pieza(LATON, ac.bola(0.018, 1), self.m((0, 0.33, 0.22 + k * 0.08)))
        self.vista.pieza(LATON, ac.toro(0.045, 0.012, 12, 3), self.m((0.12, 0.29, 0.56)))
        self.vista.pieza(TELA["mostaza"], ac.toro(0.33, 0.02, 20, 3), self.m((0, 0, 0.33), (math.pi / 2, 0, 0)))
        self.cabeza(1.0)

    def tecnico(self):
        """Delantal de cuero, cinturón con herramientas y gafas de taller en la frente."""
        self.cuerpo(TELA["azul"])
        # El delantal: un gajo de cuero por delante del cuerpo.
        self.vista.pieza(CUERO, ac.torno([(0.0, 0.2), (0.24, 0.2), (0.3, 0.32), (0.31, 0.5), (0.0, 0.5)], 12, -0.9, 0.9),
                         self.m((0, 0.015, 0), (0, 0, math.pi / 2), (1.05, 1.05, 1)))
        self.vista.pieza(CUERO_OSCURO, ac.toro(0.325, 0.02, 20, 3), self.m((0, 0, 0.36), (math.pi / 2, 0, 0)))
        for k, col in enumerate((LATON, "#5A5A60", CUERO_OSCURO)):
            a = math.radians(200 + k * 25)
            self.vista.pieza(col, ac.caja, self.m((math.cos(a) * 0.33, math.sin(a) * 0.33, 0.3), (0, 0.2, a), (0.02, 0.03, 0.14)))
        self.cabeza()
        for lado in (-1, 1):
            self.vista.pieza(LATON, ac.cilindro(0.05, 10), self.m((lado * 0.08, 0.22, 1.18), (1.1, 0, 0), (1, 1, 0.05)))
            self.vista.pieza("#9AC8D8", ac.cilindro(0.04, 10), self.m((lado * 0.08, 0.245, 1.19), (1.1, 0, 0), (1, 1, 0.02)))
        self.vista.pieza(CUERO_OSCURO, ac.toro(0.29, 0.012, 20, 3), self.m((0, 0, 1.14), (math.pi / 2 - 0.25, 0, 0)))
        self.remiendos((TELA["crema"], TELA["mostaza"]), 3, 0.5, 0.62)

    def mecanica(self):
        """Mono verde remendado, pañuelo en la cabeza y una llave en la mano."""
        self.cuerpo(TELA["verde"])
        self.remiendos((TELA["ocre"], TELA["crema"], TELA["rojo_claro"], TELA["azul"]), 6)
        for lado in (-1, 1):
            self.vista.pieza(TELA["verde_claro"], ac.caja, ac.caja_entre(self.l.base @ ac.Vector((lado * 0.12 * self.s, 0.27 * self.s, 0.42 * self.s)),
                                                                         self.l.base @ ac.Vector((lado * 0.14 * self.s, 0.16 * self.s, 0.68 * self.s)), 0.04 * self.s, 0.015 * self.s))
        self.vista.pieza(TELA["marron"], ac.caja, self.m((0, 0.3, 0.38), escala=(0.16, 0.03, 0.1)))
        self.cabeza()
        self.vista.pieza(TELA["rojo_claro"], ac.cupula(0.3, 0.19, 12, 3), self.m((0, -0.02, 1.11), (-0.25, 0, 0)))
        self.vista.pieza(TELA["rojo_claro"], ac.cono(0.04, 0.0, 6), self.m((0.0, -0.3, 1.0), (1.9, 0, 0), (1, 1, 0.16)))
        self.vista.pieza("#7A7A80", ac.caja, self.m((0.4, 0.08, 0.22), (0.4, 0, 0), (0.03, 0.03, 0.24)))
        self.vista.pieza("#7A7A80", ac.toro(0.04, 0.012, 8, 3), self.m((0.4, 0.13, 0.33), (0, 0, math.pi / 2)))

    def vecino(self, colores):
        """Una túnica sencilla con su cinturón y, a veces, un pañuelo."""
        ropa, faja = colores
        self.cuerpo(ropa)
        self.vista.pieza(faja, ac.toro(0.32, 0.025, 20, 3), self.m((0, 0, 0.38), (math.pi / 2, 0, 0)))
        if self.rng.random() < 0.5:
            self.vista.pieza(faja, ac.toro(0.19, 0.05, 14, 4), self.m((0, 0, 0.69), (math.pi / 2, 0, 0)))
        self.remiendos((TELA["crema"], TELA["mostaza"], TELA["rosa"]), self.rng.randint(1, 3))
        self.cabeza()


def construir(vista, vivas, lugar, quien, semilla):
    """Un Ool de la lista de personajes (`quien`: maestra, directora, tecnico, mecanica, vecino_N, cria_N)."""
    if quien == "maestra":
        Ool(vista, vivas, lugar, semilla, 1.62, mayor=True).maestra()
    elif quien == "directora":
        Ool(vista, vivas, lugar, semilla, 1.8).directora()
    elif quien == "tecnico":
        Ool(vista, vivas, lugar, semilla, 1.7).tecnico()
    elif quien == "mecanica":
        Ool(vista, vivas, lugar, semilla, 1.66).mecanica()
    elif quien.startswith("cria"):
        rng = random.Random(semilla)
        Ool(vista, vivas, lugar, semilla, 1.1).vecino(rng.choice(((TELA["mostaza"], TELA["rojo_claro"]), (TELA["rosa"], TELA["azul"]))))
    else:
        rng = random.Random(semilla)
        colores = rng.choice(((TELA["ocre"], TELA["marron"]), (TELA["azul"], TELA["mostaza"]), (TELA["verde_claro"], TELA["rojo_claro"]),
                              (TELA["gris"], TELA["rojo"]), (TELA["crema"], TELA["verde"])))
        Ool(vista, vivas, lugar, semilla, rng.uniform(1.58, 1.76)).vecino(colores)

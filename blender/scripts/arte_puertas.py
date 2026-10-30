# Viste el Archivo de las Puertas (plan de la Fase 10D, todo 🟡): el sitio fuera del tiempo al otro lado del
# horizonte estable. Un planetoide oscuro y casi liso; de pie sobre él, y flotando en el cielo negro, las bocas de
# todas las épocas: anillos de los Ausentes y de otros que no conocemos, cada uno con una vista encendida de su
# lado. Un muro curvo guarda los rastros de quienes llegaron antes (filas de signos en escrituras distintas; la
# última, lisa: en blanco). Aparte, mirando al lugar de llegada, las cuatro bocas de casa con su reloj tallado
# (una cerrada: "pronto"), un atril delante y el Banco con los planos del Contrapeso.
#
# Uso: blender -b blender/puertas.blend --python-exit-code 1 --python blender/scripts/arte_puertas.py
#      (deja el .blend guardado; luego `npm run modelos -- puertas` desde web/)
import math
import os
import random
import sys

import bpy

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "puertas"
SEMILLA = 11

# Los Ausentes (como en sus mundos) y otras manos.
ARENISCA = "#D8C49A"
ARENISCA_SOMBRA = "#B8A27A"
PIZARRA = "#3A3A48"
OXIDO = "#8A3A22"
BRONCE = "#9A7A4A"
HUESO = "#D9D2C0"
VERDIN = "#4A8A80"
OBSIDIANA = "#18161E"
PAPEL = "#E8DEC6"
PIEDRA = "#2C2C3A"
PIEDRA_CLARA = "#4A4A5C"
LUZ = "#FFE8C0"
# Las vistas: lo que se ve al otro lado de cada boca (cielos, mares, ciudades lejanas).
VISTAS = ["#E07830", "#7FB8E0", "#B83A50", "#6AD0A0", "#F0D070", "#8070D0", "#40A0C0", "#D0A0E0",
          "#C8E0F0", "#E0A060", "#5070B0", "#A0D060"]
MATERIALES = [ARENISCA, BRONCE, HUESO, VERDIN, OBSIDIANA, OXIDO, PIZARRA]

LLEGADA = (62.0, 0.0)
CASA = (32.0, 0.0)  # las bocas de casa, al sur de la llegada y mirándola
RASTROS = (45.0, 60.0)


class Puertas(ac.Vestido):
    def __init__(self):
        # Luz fría y escasa: la que dan las propias bocas.
        super().__init__(MUNDO, LUZ, SCRIPTS, ambiente=(0.7, "#8C96C8"))
        self.p = self.planeta
        self.paleta = bpy.data.materials.get(f"M_Paleta_{MUNDO}")
        self.rng = random.Random(SEMILLA)

    def boca(self, lugar, radio, material, vista, horas=12, centro_x=0.0, base=0.0):
        """Un anillo de pie sobre su zócalo, mirando a −Y, con su vista encendida y marcas de reloj en el aro."""
        alto = base + radio + 0.45
        self.solido(PIEDRA_CLARA, ac.caja, lugar.m((centro_x, 0, base + 0.25), escala=(radio * 1.3, 1.0, 0.5)))
        self.solido(material, ac.toro(radio, 0.2, 24, 4), lugar.m((centro_x, 0, alto)), ac.toro(radio, 0.2, 12, 4))
        for k in range(horas):
            a = 2 * math.pi * k / horas
            largo = 0.34 if k % 3 == 0 else 0.18
            self.vista.pieza(LUZ if k == 0 else material, ac.caja,
                             lugar.m((centro_x + math.cos(a) * (radio + 0.3), -0.05, alto + math.sin(a) * (radio + 0.3)),
                                     (0, math.pi / 2 - a, 0), (0.07, 0.08, largo)))
        if vista is None:
            return alto
        self.luces.pieza(vista, ac.cilindro(radio - 0.12, 16), lugar.m((centro_x, 0, alto), (math.pi / 2, 0, 0), (1, 1, 0.02)))
        return alto

    def bocas_ajenas(self):
        """Una veintena de bocas de pie por todo el planetoide, lejos de la llegada, de casa y del muro."""
        evitar = [ac.direccion(*LLEGADA), ac.direccion(*CASA), ac.direccion(*RASTROS)]
        puestas = 0
        while puestas < 18:
            lat = math.degrees(math.asin(self.rng.uniform(-0.95, 0.9)))
            lon = self.rng.uniform(-180, 180)
            d = ac.direccion(lat, lon)
            if any(d.angle(e) * self.p.radio < 14 for e in evitar):
                continue
            radio = self.rng.uniform(1.4, 3.2)
            lugar = self.p.lugar(lat, lon, rumbo=self.rng.uniform(0, 360), apoyo=radio * 0.6, hundir=0.2)
            material = self.rng.choice(MATERIALES)
            vista = self.rng.choice(VISTAS)
            alto = self.boca(lugar, radio, material, vista, horas=self.rng.choice((8, 10, 12, 16)))
            # Un astro o un horizonte en la vista: lo que hay al otro lado.
            if self.rng.random() < 0.6:
                r = radio * self.rng.uniform(0.18, 0.35)
                self.luces.pieza(self.rng.choice(VISTAS), ac.cilindro(r, 10),
                                 lugar.m((self.rng.uniform(-0.4, 0.4) * radio, -0.03, alto + self.rng.uniform(-0.3, 0.4) * radio),
                                         (math.pi / 2, 0, 0), (1, 1, 0.02)))
            puestas += 1

    def bocas_del_cielo(self):
        """Más bocas, flotando lejos en el negro: cientos, dice la historia; aquí unas pocas dan la idea."""
        for k in range(22):
            d = ac.direccion(math.degrees(math.asin(self.rng.uniform(-1, 1))), self.rng.uniform(-180, 180))
            distancia = self.p.radio * self.rng.uniform(1.9, 3.6)
            radio = self.rng.uniform(2.5, 7.0)
            centro = d * distancia
            giro = (self.rng.uniform(0, math.pi), self.rng.uniform(0, math.pi), self.rng.uniform(0, math.pi))
            m = ac.matriz(tuple(centro), giro)
            self.vista.pieza(self.rng.choice(MATERIALES), ac.toro(radio, 0.3, 16, 4), m)
            self.luces.pieza(self.rng.choice(VISTAS), ac.cilindro(radio - 0.2, 12), m @ ac.matriz(rot=(math.pi / 2, 0, 0), escala=(1, 1, 0.02)))

    def muro_de_rastros(self):
        """Un muro curvo con filas de signos de quienes llegaron antes, en escrituras distintas; la última, lisa."""
        lat, lon = RASTROS
        lugar = self.p.lugar(lat, lon, rumbo=self.p.rumbo_hacia(lat, lon, ac.direccion(*LLEGADA)) + 180, apoyo=3.0, hundir=0.3)
        tramos, radio_muro, alto = 7, 7.0, 2.8
        for k in range(tramos):
            a = math.radians(-45 + 90 * k / (tramos - 1))
            x, y = math.sin(a) * radio_muro, math.cos(a) * radio_muro - radio_muro
            tx, ty = math.cos(a), -math.sin(a)  # a lo largo del muro
            nx, ny = -math.sin(a), -math.cos(a)  # hacia fuera de la cara cóncava (a la llegada)
            self.solido(PIEDRA, ac.caja, lugar.m((x - nx * 0.2, y - ny * 0.2, alto / 2), (0, 0, -a), (1.75, 0.4, alto)))
            # Seis escrituras, una por fila: puntos, rayas, cuñas, aros, ganchos y rombos.
            for fila in range(6):
                z = alto - 0.4 - fila * 0.36
                for g in range(4):
                    gx = x + tx * (-0.6 + g * 0.4) + nx * 0.03
                    gy = y + ty * (-0.6 + g * 0.4) + ny * 0.03
                    rot = (0, 0, -a)
                    if fila == 0:
                        crear, esc = ac.bola(0.06, 1), (1, 1, 1)
                    elif fila == 1:
                        crear, esc = ac.caja, (0.22, 0.04, 0.05)
                    elif fila == 2:
                        crear, esc = ac.cono(0.08, 0.0, 3), (1, 0.4, 0.16)  # el cono mide 1 m de alto
                    elif fila == 3:
                        crear, esc = ac.toro(0.07, 0.018, 8, 3), (1, 1, 1)
                    elif fila == 4:
                        crear, esc = ac.caja, (0.05, 0.04, 0.2)
                    else:
                        crear, esc = ac.caja, (0.1, 0.04, 0.1)
                        rot = (0, math.pi / 4, -a)
                    self.vista.pieza(ARENISCA if fila % 2 else HUESO, crear, lugar.m((gx, gy, z), rot, esc))
            # La última fila, lisa y más clara: en blanco, esperando.
            self.vista.pieza(PIEDRA_CLARA, ac.caja, lugar.m((x + nx * 0.03, y + ny * 0.03, 0.42), (0, 0, -a), (1.6, 0.04, 0.28)))
        self.marca("INT_rastros", lugar, (0.0, -1.4, 1.5))

    def casa(self):
        """Las cuatro bocas de casa en arco, mirando a la llegada, cada una con su reloj; el atril y el Banco."""
        lat, lon = CASA
        # Un poco por encima del suelo más bajo: el terreno del centro queda justo bajo las losas.
        lugar = self.p.lugar(lat, lon, rumbo=180, apoyo=8.0, hundir=-0.15)
        # El suelo de losas claras sobre un zócalo grueso (el planetoide se curva y los bordes quedarían en el aire):
        # aquí todo es de los Ausentes, como en casa. Una rampa baja hacia la llegada.
        self.solido(ARENISCA_SOMBRA, ac.cilindro(9.5, 20), lugar.m((0, 0.5, -0.75), escala=(1, 0.75, 1.7)))
        self.rampa(lugar, 0, -6.3, 0.1, 0, -1, ARENISCA_SOMBRA, ancho=3.0)
        vistas = [
            # La Sala de Fragmentos llena: luz de lámparas sobre vitrinas.
            ("#E8B070", [("#7A5A30", (-0.5, 0.2), (0.35, 1.1)), ("#7A5A30", (0.45, 0.1), (0.35, 0.9))]),
            # El Instituto más joven: el cielo de Hogar sobre la colina.
            ("#7FB8E0", [("#6E9A4A", (0.0, -0.75), (1.6, 0.6)), ("#F2EEE4", (0.25, -0.2), (0.3, 0.45))]),
            # Hogar al anochecer, con la Puerta pequeña encendida en la colina.
            ("#C0603A", [("#3A2A3A", (0.0, -0.8), (1.6, 0.5)), ("#FFF0B0", (-0.2, -0.35), (0.12, 0.12))]),
            None,  # cerrada: "pronto"
        ]
        for k, vista in enumerate(vistas):
            x = -6.0 + k * 4.0
            y = 2.2 + abs(x) * 0.25
            sub = ac.Lugar(lugar.m((x, y, 0), (0, 0, -x * 0.06)))
            radio = 1.7
            alto = self.boca(sub, radio, ARENISCA, None, horas=12, base=0.1)
            if vista:
                self.vista_de_casa(sub, k, radio, alto, *vista)
            else:
                # Tapada con una losa, y en ella la marca de "pronto": un aro abierto.
                self.solido(ARENISCA_SOMBRA, ac.cilindro(radio - 0.05, 16), sub.m((0, 0, alto), (math.pi / 2, 0, 0), (1, 1, 0.12)))
                self.vista.pieza(PIZARRA, ac.arco(0.5, 0.05, 0.4, 2 * math.pi - 0.4, 12, 4), sub.m((0, -0.08, alto), (math.pi / 2, 0, 0)))
            # Su reloj, tallado en una estela al lado: la hora de casa al otro lado.
            self.solido(PIEDRA_CLARA, ac.caja, sub.m((radio + 0.55, -0.1, 0.75), escala=(0.5, 0.25, 1.5)))
            self.vista.pieza(PIZARRA, ac.toro(0.18, 0.02, 16, 3), sub.m((radio + 0.55, -0.24, 1.15)))
            aguja = 0.6 + k * 1.3
            self.vista.pieza(LUZ, ac.caja, sub.m((radio + 0.55 + math.sin(aguja) * 0.07, -0.25, 1.15 + math.cos(aguja) * 0.07),
                                                 (0, aguja, 0), (0.025, 0.02, 0.15)))
            for n in range(k + 1):
                self.vista.pieza(PIZARRA, ac.cilindro(0.03, 6), sub.m((radio + 0.4 + n * 0.1, -0.24, 0.7), (math.pi / 2, 0, 0), (1, 1, 0.03)))
        # El atril delante de las bocas: aquí se leen sus horas y sus desfases.
        self.solido(PIEDRA_CLARA, ac.caja, lugar.m((0, -3.2, 0.5), escala=(0.55, 0.45, 1.0)))
        self.solido(ARENISCA, ac.caja, lugar.m((0, -3.25, 1.05), (-0.45, 0, 0), (0.75, 0.55, 0.06)))
        self.luces.pieza(LUZ, ac.caja, lugar.m((0, -3.3, 1.09), (-0.45, 0, 0), (0.5, 0.3, 0.01)))
        self.marca("INT_bocas", lugar, (0, -3.7, 1.3))
        # El Banco, como el del Laboratorio, con los planos del Contrapeso enrollados encima.
        bx, by = 5.2, -3.4  # lejos del borde de la terraza
        self.solido(OBSIDIANA, ac.caja, lugar.m((bx, by, 0.85), (0, 0, 0.5), (2.2, 0.8, 0.12)))
        for s in (-0.8, 0.8):
            self.solido(PIEDRA_CLARA, ac.caja, lugar.m((bx + s * math.cos(0.5), by + s * math.sin(0.5), 0.42), (0, 0, 0.5), (0.2, 0.7, 0.84)))
        self.planos(lugar, bx, by)
        self.marca("INT_planos", lugar, (bx - 0.3, by - 0.7, 1.2))

    def vista_de_casa(self, sub, k, radio, alto, cielo, siluetas):
        """La vista de una boca de casa, aparte (puertas_VistaCasa_k) con su propio brillo: el material de luces del
        mundo tiene un solo color de emisión y las cuatro se verían iguales. Las siluetas, delante y sin brillo."""
        ventana = ac.Malla()
        ventana.pieza(cielo, ac.cilindro(radio - 0.12, 16), ac.matriz(rot=(math.pi / 2, 0, 0), escala=(1, 1, 0.02)))
        ac.objeto_suelto(self.p, f"puertas_VistaCasa_{k}", ventana, ac.material_luces(f"M_VistaCasa_{k}", cielo),
                         sub.m((0, 0, alto)))
        for color, (dx, dz), (w, h) in siluetas:
            self.vista.pieza(color, ac.caja, sub.m((dx, -0.04, alto + dz), escala=(w, 0.02, h)))

    def planos(self, lugar, bx, by):
        """Los planos del Contrapeso, aparte (puertas_Planos): el juego los quita del Banco al cogerlos. Su origen
        es el tablero del Banco; la malla va en coordenadas de ese origen."""
        planos = ac.Malla()
        for n, (dx, dy) in enumerate(((-0.35, 0.05), (0.0, -0.1), (0.35, 0.08))):
            planos.pieza(PAPEL, ac.cilindro(0.07 + 0.01 * n, 8),
                         ac.matriz((dx, dy, 0.08), (0, math.pi / 2, 0.2 * n), (1, 1, 0.75)))
        planos.pieza(PAPEL, ac.caja, ac.matriz((0.1, -0.2, 0.01), (0, 0, -0.15), (0.6, 0.42, 0.01)))
        planos.pieza(PIZARRA, ac.toro(0.12, 0.012, 12, 3), ac.matriz((0.1, -0.2, 0.02), (math.pi / 2, 0, 0)))
        ac.objeto_suelto(self.p, "puertas_Planos", planos, self.paleta, lugar.m((bx, by, 0.91), (0, 0, 0.5)))

    def llegada(self):
        lat, lon = LLEGADA
        lugar = self.p.lugar(lat, lon, rumbo=180, apoyo=1.5, hundir=0.2)
        # Un anillo caído donde se despierta: por ahí se ha llegado.
        self.solido(OBSIDIANA, ac.toro(1.6, 0.18, 24, 4), lugar.m((0, 2.0, 0.15), (math.pi / 2, 0, 0)), ac.toro(1.6, 0.18, 12, 4))
        self.marca("SPAWN_Puertas", lugar, (0, -0.5, 1.0), rumbo=self.p.rumbo_hacia(lat, lon, ac.direccion(*CASA)))

    def lugares(self):
        ac.borrar(["puertas_Planos"] + [f"puertas_VistaCasa_{k}" for k in range(4)])
        self.llegada()
        self.casa()
        self.muro_de_rastros()
        self.bocas_ajenas()
        self.bocas_del_cielo()


Puertas().ejecutar()

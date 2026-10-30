# Viste Hogar (CONTEXTO_PLANETAS.md §9, plan de la Fase 9): el mundo de los Ool, cálido y vivo. En la cima llana
# de la colina, el Instituto: la Sala de Fragmentos (rotonda con cúpula de tela), el aula de la Maestra, el taller
# de la Puerta pequeña y el despacho de la Directora, unidos por pasillos de aros y lona; delante, la plaza de
# entrada. Al este de la cima, el hangar donde espera el Albatros II, con el cobertizo de la mecánica. Abajo, en los
# prados del norte, la aldea: casas redondas con techos de tela acolchada, la del explorador por dentro, el árbol
# de musgo de la plaza, el taller de telas y un embarcadero en la costa del este. Caminos de losas, faroles cálidos
# y faroles vivos (la luz verde azulada de los Ool), árboles, matas, musgo, rocas y flores.
#
# Lenguaje de los Ool (🟡): redondeado, blando y hecho a mano. Telas cosidas en gajos de colores sobre costillas de
# madera, puertas y ventanas redondeadas, musgo por todas partes y luz viva. Nada de troncos ni chapa remachada.
# Los fragmentos de los Ausentes (arenisca y pizarra, cortados en curva perfecta) se ven aquí como lo que son: ajenos.
#
# Uso: blender -b blender/hogar.blend --python-exit-code 1 --python blender/scripts/arte_hogar.py
#      (deja el .blend guardado; luego `npm run modelos -- hogar` desde web/)
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402
import ool  # noqa: E402

MUNDO = "hogar"
SEMILLA = 9

# ---- Paleta de Hogar -----------------------------------------------------------------------------
CREMA = "#EFE3C8"
CREMA_SOMBRA = "#D6C6A4"
OCRE = "#C8963C"
OCRE_OSCURO = "#9E6E2C"
MUSGO = "#6E9A4A"
MUSGO_OSCURO = "#4A7A3A"
MUSGO_CLARO = "#9ABA5A"
HOJA = "#5E9A4E"
MADERA = "#8A5A34"
MADERA_OSCURA = "#5A3A24"
MADERA_CLARA = "#B07A48"
TELA_ROJA = "#B0503A"
TELA_AZUL = "#4A6A8A"
TELA_VERDE = "#5A8A6A"
TELA_MOSTAZA = "#D0A040"
TELA_ROSA = "#C8807A"
PIEDRA = "#9A9488"
PIEDRA_CLARA = "#C8C0B0"
PIEDRA_OSCURA = "#6A665E"
LATON = "#B89040"
PAPEL = "#F0E6D0"
TINTA = "#3A3040"
LOZA = "#E8E0D0"
TIZA = "#E8E8E0"
PIZARRA = "#2E3A34"
FLORES = ("#E07A6A", "#E8C060", "#B08AD0", "#F0E0F0", "#E89A50")
# Los Ausentes (lo que llega en los fragmentos): su arenisca y su pizarra, como en Umbral.
ARENISCA = "#D8C49A"
ARENISCA_SOMBRA = "#B8A27A"
PIZARRA_AUSENTES = "#3A3A48"
# Luces: cálida (ventanas, faroles) y viva (la de los Ool, verde azulada).
LUZ = "#FFD890"
VIVA = "#7FF0C8"

R_SUELO = 125.0  # radio aproximado del suelo en la colina, para pasar metros a grados

# ---- Dónde está cada cosa (lat, lon) ---------------------------------------------------------------
INSTITUTO = (47.0, 8.0)      # la Sala de Fragmentos, en la cima llana de la colina
PLAZA_ENTRADA = (41.0, 8.0)  # delante de la puerta sur
HANGAR = (42.0, 22.0)        # la plataforma del Albatros II, al este de la cima
ALDEA = (67.0, -2.0)         # la plaza de la aldea, en los prados del norte
EMBARCADERO = (65.5, 30.0)   # en la costa del este
CAMINO_ALDEA = [(41.3, 4.3), (43.0, 0.5), (44.6, -1.5), (47.0, -5.0), (50.0, -8.0), (53.5, -9.5), (57.5, -9.0),
                (61.0, -7.0), (64.0, -4.5)]
CAMINO_HANGAR = [(41.2, 11.7), (41.7, 14.5), (42.0, 16.8)]
CAMINO_EMBARCADERO = [(67.0, 4.0), (66.8, 10.0), (66.5, 16.0), (66.2, 22.0), (65.8, 27.0)]


def direccion(lat, lon):
    return ac.direccion(lat, lon)


def distancia(a, b):
    """Metros (sobre el suelo) entre dos puntos (lat, lon)."""
    return direccion(*a).angle(direccion(*b)) * R_SUELO


def desplazar(lat, lon, este, norte):
    """El punto a `este` y `norte` metros de (lat, lon)."""
    return (lat + math.degrees(norte / R_SUELO),
            lon + math.degrees(este / (R_SUELO * max(0.2, math.cos(math.radians(lat))))))


class Hogar(ac.Vestido):
    def __init__(self):
        # Amanecer cálido: la luz ambiente un poco dorada.
        super().__init__(MUNDO, LUZ, SCRIPTS, ambiente=(1.35, "#F2DCC0"), color_vivas=VIVA)
        self.p = self.planeta
        self.rng = random.Random(SEMILLA)
        self.ocupado = []  # (lat, lon, radio en m): donde no crece nada suelto
        # Las piedras de las vitrinas "piedra", aparte (Fase 10E): en el Hogar de antes aún no han llegado.
        self.vitrinas_llenas = ac.Malla()

    # ---- Piezas pequeñas ------------------------------------------------------------------------

    def reservar(self, punto, radio):
        self.ocupado.append((punto[0], punto[1], radio))

    def libre(self, punto, margen=0.0):
        return all(distancia(punto, (la, lo)) > r + margen for la, lo, r in self.ocupado)

    def anillo_suelo(self, lugar, r, grosor, z, color, lados=32):
        """Aro tumbado (en el plano del suelo)."""
        self.vista.pieza(color, ac.toro(r, grosor, lados, 4), lugar.m((0, 0, z), (math.pi / 2, 0, 0)))

    def disco(self, lugar, r, z, alto, color, lados=24, x=0.0, y=0.0, solido=False):
        m = lugar.m((x, y, z + alto / 2), escala=(1, 1, alto))
        if solido:
            self.solido(color, ac.cilindro(r, lados), m)
        else:
            self.vista.pieza(color, ac.cilindro(r, lados), m)

    def farol(self, lugar, x, y, z=0.0, alto=2.3):
        """Farol cálido: poste de madera curvado arriba, con su farolillo de tela."""
        self.solido(MADERA_OSCURA, ac.cilindro(0.07, 6), lugar.m((x, y, z + alto / 2), escala=(1, 1, alto)))
        self.vista.pieza(MADERA_OSCURA, ac.arco(0.25, 0.05, 0, math.pi / 2, 5, 4),
                         lugar.m((x - 0.25, y, z + alto)))
        self.vista.pieza(TELA_MOSTAZA, ac.torno([(0.0, -0.32), (0.16, -0.26), (0.19, -0.12), (0.12, 0.0), (0.0, 0.02)], 8),
                         lugar.m((x - 0.25, y, z + alto + 0.2)))
        self.luces.pieza(LUZ, ac.bola(0.1, 1), lugar.m((x - 0.25, y, z + alto + 0.02)))

    def farol_vivo(self, lugar, x, y, z=0.0, alto=1.6):
        """Farol vivo: un tallo de musgo que se dobla y un bulbo de luz verde azulada, con dos hojas."""
        self.solido(MUSGO_OSCURO, ac.cilindro(0.05, 6), lugar.m((x, y, z + alto * 0.4), escala=(1, 1, alto * 0.8)))
        self.vista.pieza(MUSGO_OSCURO, ac.arco(0.18, 0.045, 0, math.pi * 0.6, 5, 4), lugar.m((x - 0.18, y, z + alto * 0.8)))
        self.vivas.pieza(VIVA, ac.torno([(0.0, -0.2), (0.12, -0.14), (0.14, 0.0), (0.08, 0.1), (0.0, 0.12)], 8),
                         lugar.m((x - 0.24, y, z + alto * 0.8 + 0.06)))
        for lado in (-1, 1):
            self.vista.pieza(HOJA, ac.bola(0.12, 1), lugar.m((x + 0.08 * lado, y, z + 0.25), (0, 0.6 * lado, 0), (1.6, 0.5, 0.3)))

    def cojin(self, lugar, x, y, z, color, r=0.32):
        self.vista.pieza(color, ac.bola(r, 2), lugar.m((x, y, z + r * 0.35), escala=(1, 1, 0.42)))
        self.vista.pieza(MADERA_CLARA, ac.bola(0.04, 1), lugar.m((x, y, z + r * 0.72)))

    def mesa_redonda(self, lugar, x, y, z, r=0.7, alto=0.45, color=MADERA):
        self.solido(color, ac.cilindro(r, 14), lugar.m((x, y, z + alto - 0.04), escala=(1, 1, 0.08)))
        self.vista.pieza(MADERA_OSCURA, ac.torno([(r * 0.95, alto - 0.08), (r * 0.25, alto - 0.2), (0.12, alto * 0.4), (0.3, 0.02), (0.0, 0.0)], 10),
                         lugar.m((x, y, z)))
        self.col.pieza(ac.cilindro(0.25, 6), lugar.m((x, y, z + alto / 2), escala=(1, 1, alto)))

    def libros(self, lugar, x, y, z, ancho, rot, fondo=0.22):
        """Una fila de lomos de colores, de alturas distintas, a lo largo de X local (girada `rot`)."""
        colores = (TELA_ROJA, TELA_AZUL, TELA_VERDE, OCRE, TELA_MOSTAZA, MADERA_CLARA, TELA_ROSA, CREMA_SOMBRA)
        pos = -ancho / 2
        c, s = math.cos(rot), math.sin(rot)
        while pos < ancho / 2 - 0.05:
            grueso = self.rng.uniform(0.04, 0.09)
            alto = self.rng.uniform(0.18, 0.3)
            px, py = x + c * (pos + grueso / 2), y + s * (pos + grueso / 2)
            inclin = self.rng.choice((0, 0, 0, 0.18))
            self.vista.pieza(self.rng.choice(colores), ac.caja,
                             lugar.m((px, py, z + alto / 2), (0, inclin, rot), (grueso, fondo, alto)))
            pos += grueso + 0.005

    def taza(self, lugar, x, y, z, color=LOZA):
        self.vista.pieza(color, ac.torno([(0.0, 0.0), (0.035, 0.0), (0.045, 0.07), (0.04, 0.08), (0.0, 0.075)], 8),
                         lugar.m((x, y, z)))

    def papel(self, lugar, x, y, z, rot=0.0, ancho=0.28, largo=0.36, lineas=4):
        self.vista.pieza(PAPEL, ac.caja, lugar.m((x, y, z + 0.006), (0, 0, rot), (ancho, largo, 0.012)))
        for k in range(lineas):
            off = -largo / 2 + 0.07 + k * (largo - 0.12) / max(1, lineas - 1)
            self.vista.pieza(TINTA, ac.caja, lugar.m((x - math.sin(rot) * off, y + math.cos(rot) * off, z + 0.014), (0, 0, rot),
                                                     (ancho * self.rng.uniform(0.5, 0.8), 0.01, 0.004)))

    # ---- Edificios -----------------------------------------------------------------------------

    def muro_redondo(self, lugar, r, alto, color, puertas=(), ventanas=(), z0=0.0, grosor=0.35,
                     alto_puerta=2.6, ventana=(1.3, 2.4), marco=MADERA):
        """Muro circular de piezas, con huecos de puerta (ángulo°, ancho m) y ventanas (ángulo°, ancho m).
        Las puertas y ventanas llevan marco de madera por las dos caras."""
        n = max(14, int(2 * math.pi * r / 0.8))
        paso = 2 * math.pi / n
        largo = 2 * r * math.sin(paso / 2) * 1.06

        def hueco(a, lista):
            for ang, ancho in lista:
                d = abs((a - math.radians(ang) + math.pi) % (2 * math.pi) - math.pi)
                if d * r < ancho / 2:
                    return True
            return False

        for i in range(n):
            a = (i + 0.5) * paso
            x, y = math.cos(a) * r, math.sin(a) * r
            if hueco(a, puertas):
                h = alto - alto_puerta
                self.solido(color, ac.caja, lugar.m((x, y, z0 + alto_puerta + h / 2), (0, 0, a), (grosor, largo, h)))
            elif hueco(a, ventanas):
                lo, hi = ventana
                self.solido(color, ac.caja, lugar.m((x, y, z0 + lo / 2), (0, 0, a), (grosor, largo, lo)))
                self.solido(color, ac.caja, lugar.m((x, y, z0 + (hi + alto) / 2), (0, 0, a), (grosor, largo, alto - hi)))
            else:
                self.solido(color, ac.caja, lugar.m((x, y, z0 + alto / 2), (0, 0, a), (grosor, largo, alto)))
        # Zócalo y cornisa: dos bandas que recorren el muro.
        for z, alto_banda, col in ((z0 + 0.12, 0.24, CREMA_SOMBRA), (z0 + alto - 0.1, 0.2, MADERA)):
            for i in range(n):
                a = (i + 0.5) * paso
                if z < z0 + alto_puerta and hueco(a, puertas):
                    continue
                for cara in (-1, 1):
                    rr = r + cara * (grosor / 2 + 0.02)
                    self.vista.pieza(col, ac.caja, lugar.m((math.cos(a) * rr, math.sin(a) * rr, z), (0, 0, a),
                                                           (0.04, largo * rr / r, alto_banda)))
        def real(lista):
            """Cada hueco tal como queda (centro en rad, medio ancho en rad): los muros van a trozos enteros."""
            huecos = []
            for ang, ancho in lista:
                c = math.radians(ang)
                fuera = [((i + 0.5) * paso - c + math.pi) % (2 * math.pi) - math.pi for i in range(n)
                         if hueco((i + 0.5) * paso, [(ang, ancho)])]
                if fuera:
                    lo, hi = min(fuera) - paso / 2, max(fuera) + paso / 2
                    huecos.append((c + (lo + hi) / 2, (hi - lo) / 2))
            return huecos

        for a, medio in real(puertas):
            for cara in (-1, 1):
                rr = r + cara * (grosor / 2 + 0.04)
                for lado in (-1, 1):
                    # Las jambas, justo en el borde del muro: tapan la rendija entre muro y hueco.
                    b = a + lado * medio
                    self.vista.pieza(marco, ac.caja, lugar.m((math.cos(b) * rr, math.sin(b) * rr, z0 + alto_puerta / 2),
                                                             (0, 0, b), (0.08, 0.18, alto_puerta)))
                self.vista.pieza(marco, ac.caja, lugar.m((math.cos(a) * rr, math.sin(a) * rr, z0 + alto_puerta + 0.08),
                                                         (0, 0, a), (0.08, 2 * medio * r + 0.3, 0.16)))
        for a, medio in real(ventanas):
            ancho = 2 * medio * r
            lo, hi = ventana
            for cara in (-1, 1):
                rr = r + cara * (grosor / 2 + 0.03)
                m = lugar.m((math.cos(a) * rr, math.sin(a) * rr, z0 + (lo + hi) / 2), (0, 0, a - math.pi / 2),
                            (ancho / 2 / 0.5, 1, (hi - lo) / 2 / 0.5))
                self.vista.pieza(marco, ac.toro(0.5, 0.05, 16, 4), m)
            # Cruz de la ventana.
            m = lugar.m((math.cos(a) * r, math.sin(a) * r, z0 + (lo + hi) / 2), (0, 0, a), (0.05, ancho * 0.9, 0.05))
            self.vista.pieza(marco, ac.caja, m)
            m = lugar.m((math.cos(a) * r, math.sin(a) * r, z0 + (lo + hi) / 2), (0, 0, a), (0.05, 0.05, (hi - lo) * 0.9))
            self.vista.pieza(marco, ac.caja, m)

    def techo_tela(self, lugar, r, z, alto, colores, gajos=12, linterna=True, costillas=MADERA):
        """Cúpula de tela cosida en gajos de colores sobre costillas de madera, con alero y, arriba, una linterna."""
        for g in range(gajos):
            d0, d1 = 2 * math.pi * g / gajos, 2 * math.pi * (g + 1) / gajos
            self.vista.pieza(colores[g % len(colores)], ac.cupula(r, alto, lados=3, anillos=7, desde=d0, hasta=d1),
                             lugar.m((0, 0, z)))
            self.vista.pieza(costillas, ac.arco(r + 0.02, 0.06, 0, math.pi / 2, 8, 4),
                             lugar.m((0, 0, z), (0, 0, d0), (1, 1, alto / r)))
            # Pespuntes: un cordón a media altura de cada gajo.
            t = math.radians(35)
            mid = (d0 + d1) / 2
            self.vista.pieza(CREMA_SOMBRA, ac.caja,
                             lugar.m((math.cos(mid) * r * math.cos(t), math.sin(mid) * r * math.cos(t), z + alto * math.sin(t) + 0.02),
                                     (0, -t * 1.1, mid), (0.03, 2 * math.pi * r * math.cos(t) / gajos * 0.9, 0.03)))
        self.vista.pieza(costillas, ac.toro(r + 0.05, 0.1, max(24, gajos * 3), 5), lugar.m((0, 0, z + 0.02), (math.pi / 2, 0, 0)))
        if linterna:
            top = z + alto
            self.vista.pieza(MADERA, ac.cilindro(r * 0.12, 10), lugar.m((0, 0, top + 0.05), escala=(1, 1, 0.3)))
            self.luces.pieza(LUZ, ac.cilindro(r * 0.1, 10), lugar.m((0, 0, top + 0.28), escala=(1, 1, 0.25)))
            self.vista.pieza(OCRE_OSCURO, ac.cono(r * 0.16, 0.0, 10), lugar.m((0, 0, top + 0.6), escala=(1, 1, 0.45)))
            self.vista.pieza(LATON, ac.bola(0.1, 1), lugar.m((0, 0, top + 0.86)))

    def zocalo(self, lugar, r, top, color=PIEDRA, falda=0.85, subida=0.5, hondo=2.4):
        """Base redonda de piedra con la cara de arriba en `top` y una falda en cuesta (unos 30°) alrededor: quien
        anda no sube escalones de más de 10 cm, pero sí cuestas, así que se sube a cualquier suelo alto por donde
        sea. Lo de abajo queda enterrado."""
        self.solido(color, ac.torno([(0.0, top - hondo), (r + falda, top - hondo), (r + falda, top - subida), (r, top), (0.0, top)], 28),
                    lugar.m((0, 0, 0)))

    def sala(self, lugar, r, alto, color_muro, colores_techo, puertas, ventanas, alto_techo=None, suelo=CREMA_SOMBRA,
             gajos=12, top=0.3, ventana=(1.3, 2.4)):
        """Una sala redonda completa: zócalo de piedra con su falda, suelo, muro con huecos y cúpula de tela."""
        self.zocalo(lugar, r + 0.55, top)
        self.vista.pieza(PIEDRA_CLARA, ac.cilindro(r + 0.6, 24), lugar.m((0, 0, top - 0.06), escala=(1, 1, 0.1)))
        self.vista.pieza(suelo, ac.cilindro(r - 0.1, 24), lugar.m((0, 0, top + 0.01), escala=(1, 1, 0.02)))
        self.muro_redondo(lugar, r, alto, color_muro, puertas, ventanas, z0=top, ventana=ventana)
        self.techo_tela(lugar, r + 0.45, top + alto, alto_techo or r * 0.7, colores_techo, gajos)

    def cordon(self, lugar, x, y, abajo, base_cupula, radio_cupula, alto_cupula):
        """Cordón de una lámpara colgada, desde su remate (`abajo`) hasta la tela de la cúpula sobre (x, y)."""
        rho = min(math.hypot(x, y), radio_cupula * 0.99)
        arriba = base_cupula + alto_cupula * math.sqrt(1 - (rho / radio_cupula) ** 2)
        self.vista.pieza(MADERA_OSCURA, ac.cilindro(0.015, 4), lugar.m((x, y, (abajo + arriba) / 2), escala=(1, 1, arriba - abajo)))

    def pasillo(self, a, b, ancho=2.2, alto=2.7, colores=(CREMA, OCRE)):
        """Pasillo cubierto entre dos puertas (puntos del suelo, en el marco del mundo): suelo, aros de madera y lona."""
        a, b = Vector(a), Vector(b)
        self.solido(PIEDRA_CLARA, ac.caja, ac.caja_entre(a, b, ancho + 0.3, 0.3))
        eje = (b - a)
        largo = eje.length
        y = eje.normalized()
        arriba = ((a + b) / 2).normalized()
        x = y.cross(arriba).normalized()
        z = x.cross(y).normalized()

        def marco(t):
            o = a.lerp(b, t)
            return ac.Lugar(Matrix((
                (x.x, y.x, z.x, o.x), (x.y, y.y, z.y, o.y), (x.z, y.z, z.z, o.z), (0, 0, 0, 1))))

        radio = ancho / 2 + 0.15
        base = alto - radio
        for k in range(4):
            m = marco(0.1 + 0.8 * k / 3)
            self.vista.pieza(MADERA, ac.arco(radio, 0.07, 0, math.pi, 10, 4), m.m((0, 0, base)))
            for lado in (-1, 1):
                self.solido(MADERA, ac.cilindro(0.07, 6), m.m((lado * radio, 0, base / 2), escala=(1, 1, base)))
        medio = marco(0.5)
        tiras = 8
        for k in range(tiras):
            t = math.pi * (k + 0.5) / tiras
            ancho_tira = 2 * radio * math.sin(math.pi / tiras / 2) * 1.15
            self.solido(colores[k % len(colores)], ac.caja,
                        medio.m((math.cos(t) * (radio + 0.05), 0, base + math.sin(t) * (radio + 0.05)),
                                (0, -t, 0), (0.04, largo, ancho_tira)))
        for lado in (-1, 1):
            self.solido(colores[0], ac.caja, medio.m((lado * (radio + 0.05), 0, base / 2), escala=(0.04, largo, base)))

    # ---- El Instituto --------------------------------------------------------------------------

    def instituto(self):
        lat, lon = INSTITUTO
        self.reservar(INSTITUTO, 24)
        sala = self.p.lugar(lat, lon, rumbo=0)
        top = 0.3
        R = 6.5
        self.sala(sala, R, 3.6, CREMA, (CREMA, OCRE), puertas=((-90, 2.4), (180, 2.0), (0, 2.0), (90, 2.0)),
                  ventanas=((45, 1.1), (135, 1.1), (-45, 1.1), (-135, 1.1), (20, 0.9), (160, 0.9), (-20, 0.9), (-160, 0.9)),
                  alto_techo=4.6, gajos=16, top=top)
        self.sala_de_fragmentos(sala, top, R)
        # Las tres alas, cada una en su sitio sobre la esfera.
        oeste = self.p.lugar(*desplazar(lat, lon, -14.0, 0.0), rumbo=0)
        este = self.p.lugar(*desplazar(lat, lon, 13.5, 0.0), rumbo=0)
        norte = self.p.lugar(*desplazar(lat, lon, 0.0, 12.5), rumbo=0)
        self.aula(oeste, top)
        self.taller(este, top)
        self.despacho(norte, top)
        # Pasillos de puerta a puerta.
        z = top + 0.0
        self.pasillo(sala.base @ Vector((-R - 0.2, 0, z - 0.15)), oeste.base @ Vector((5.0 + 0.2, 0, z - 0.15)))
        self.pasillo(sala.base @ Vector((R + 0.2, 0, z - 0.15)), este.base @ Vector((-5.5 - 0.2, 0, z - 0.15)),
                     colores=(CREMA, TELA_AZUL))
        self.pasillo(sala.base @ Vector((0, R + 0.2, z - 0.15)), norte.base @ Vector((0, -4.5 - 0.2, z - 0.15)),
                     colores=(CREMA, TELA_ROJA))
        self.entrada(sala, top, R)

    def sala_de_fragmentos(self, sala, top, R):
        """La rotonda: mosaico de aros en el suelo, el fragmento grande en el centro con su cordón, seis vitrinas,
        lámparas colgadas y bancos."""
        for r, col in ((5.6, CREMA), (4.2, OCRE), (2.9, CREMA_SOMBRA), (1.6, MUSGO)):
            self.vista.pieza(col, ac.cilindro(r, 28), sala.m((0, 0, top + 0.025 + (6 - r) * 0.002), escala=(1, 1, 0.02)))
        for r in (4.9, 3.55, 2.25):
            self.anillo_suelo(sala, r, 0.04, top + 0.045, MADERA_OSCURA, 40)
        # El fragmento más grande hasta hoy, sobre un pedestal redondo, con dos mordidas.
        self.vista.pieza(MADERA_OSCURA, ac.torno([(0.0, 0.0), (0.9, 0.0), (0.95, 0.15), (0.7, 0.25), (0.65, 0.75), (0.85, 0.85), (0.0, 0.85)], 16),
                         sala.m((0, 0, top)))
        self.col.pieza(ac.cilindro(0.88, 10), sala.m((0, 0, top + 0.425), escala=(1, 1, 0.85)))
        # Las mordidas dan hacia la puerta sur, para que se vean al entrar.
        self.vista.pieza(ARENISCA, ac.fragmento([((0.3, -0.55, 0.45), 0.55), ((-0.62, -0.25, -0.15), 0.42)], 6),
                         sala.m((0, 0, top + 1.45), (0, 0, 0.25), (1.3, 0.55, 1.2)))
        self.anillo_suelo(sala, 1.7, 0.025, top + 0.75, TELA_ROJA, 28)
        for k in range(6):
            a = 2 * math.pi * k / 6 + 0.3
            self.solido(LATON, ac.cilindro(0.04, 6), sala.m((math.cos(a) * 1.7, math.sin(a) * 1.7, top + 0.4), escala=(1, 1, 0.8)))
            self.vista.pieza(LATON, ac.bola(0.06, 1), sala.m((math.cos(a) * 1.7, math.sin(a) * 1.7, top + 0.82)))
        # Vitrinas entre las puertas.
        vitrinas = [(45, "bordes"), (135, "simbolo"), (-45, "piedra"), (-135, "piedra"), (20, "piedra"), (160, "piedra"),
                    (-20, "piedra"), (-160, "piedra")]
        for ang, cual in vitrinas:
            a = math.radians(ang)
            x, y = math.cos(a) * (R - 1.2), math.sin(a) * (R - 1.2)
            self.vitrina(sala, x, y, top, a + math.pi, cual)
        # Lámparas colgadas de la cúpula.
        for k in range(4):
            a = 2 * math.pi * k / 4 + math.pi / 4
            x, y = math.cos(a) * 3.3, math.sin(a) * 3.3
            self.cordon(sala, x, y, top + 3.38, top + 3.6, R + 0.45, 4.6)
            self.vista.pieza(TELA_MOSTAZA, ac.torno([(0.0, -0.3), (0.25, -0.24), (0.3, -0.08), (0.18, 0.05), (0.0, 0.08)], 10),
                             sala.m((x, y, top + 3.3)))
            self.luces.pieza(LUZ, ac.bola(0.13, 1), sala.m((x, y, top + 3.1)))
        # Dos bancos curvos para mirar el fragmento.
        for a0 in (math.radians(-60), math.radians(-120)):
            for k in range(3):
                a = a0 + (k - 1) * 0.18
                self.solido(MADERA, ac.caja, sala.m((math.cos(a) * 3.0, math.sin(a) * 3.0, top + 0.45), (0, 0, a), (0.45, 0.6, 0.08)))
            self.vista.pieza(MADERA_OSCURA, ac.caja, sala.m((math.cos(a0) * 3.0, math.sin(a0) * 3.0, top + 0.22), (0, 0, a0), (0.35, 0.3, 0.44)))

    def vitrina(self, sala, x, y, top, mira, cual):
        """Pedestal de madera con su fragmento, un marco de latón y una cartela. `mira`: hacia dónde da (rad)."""
        self.solido(MADERA, ac.caja, sala.m((x, y, top + 0.45), (0, 0, mira), (0.65, 0.9, 0.9)))
        self.vista.pieza(MADERA_OSCURA, ac.caja, sala.m((x, y, top + 0.92), (0, 0, mira), (0.75, 1.0, 0.06)))
        for dx, dy in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
            px = x + math.cos(mira) * dx * 0.33 - math.sin(mira) * dy * 0.46
            py = y + math.sin(mira) * dx * 0.33 + math.cos(mira) * dy * 0.46
            self.vista.pieza(LATON, ac.cilindro(0.02, 4), sala.m((px, py, top + 1.35), escala=(1, 1, 0.8)))
        self.vista.pieza(LATON, ac.caja, sala.m((x, y, top + 1.75), (0, 0, mira), (0.7, 0.96, 0.03)))
        fx, fy = x + math.cos(mira) * 0.4, y + math.sin(mira) * 0.4
        self.vista.pieza(PAPEL, ac.caja, sala.m((fx, fy, top + 0.97), (0.3, 0, mira + math.pi / 2), (0.24, 0.02, 0.12)))
        if cual == "bordes":
            # Dos piedras con el borde cortado en curva perfecta: lo que el Instituto no sabe explicar.
            for k, lado in enumerate((-0.2, 0.22)):
                px, py = x - math.sin(mira) * lado, y + math.cos(mira) * lado
                self.vista.pieza(ARENISCA if k == 0 else ARENISCA_SOMBRA,
                                 ac.fragmento([((0.6, 0.0, 0.6), 0.75)], 4),
                                 sala.m((px, py, top + 1.1), (0, 0, mira + k * 1.2), (0.3, 0.26, 0.3)))
            self.marca("INT_vitrina_bordes", sala, (x + math.cos(mira) * 0.85, y + math.sin(mira) * 0.85, top + 1.2))
        elif cual == "simbolo":
            self.simbolo_partido(sala, x, y, top + 0.95, mira)
            self.marca("INT_simbolo_partido", sala, (x + math.cos(mira) * 0.85, y + math.sin(mira) * 0.85, top + 1.2))
        else:
            cortes = [((self.rng.uniform(-0.6, 0.6), self.rng.uniform(-0.4, 0.4), 0.6), self.rng.uniform(0.4, 0.7))]
            self.vitrinas_llenas.pieza(self.rng.choice((ARENISCA, ARENISCA_SOMBRA, PIEDRA_CLARA)), ac.fragmento(cortes, 3),
                                       sala.m((x, y, top + 1.12), (0, 0, mira + self.rng.uniform(-0.5, 0.5)),
                                              (self.rng.uniform(0.3, 0.45), 0.25, self.rng.uniform(0.25, 0.4))))

    def simbolo_partido(self, sala, x, y, z, mira):
        """Losa de los Ausentes con la mitad de abajo de un anillo de marcas de reloj, cortada arriba en curva:
        la otra mitad sigue en una pared de las Mordidas de Cicatriz (arte_cicatriz.py, `mordida_con_pared`)."""
        frente = Vector((math.cos(mira), math.sin(mira), 0))
        lado = Vector((-math.sin(mira), math.cos(mira), 0))
        self.vista.pieza(ARENISCA, ac.fragmento([((0.0, 0.0, 0.95), 0.6)], 5),
                         sala.m((x, y, z + 0.33), (0, 0, mira + math.pi / 2), (0.62, 0.14, 0.62)))
        radio = 0.24
        cx, cy, cz = x + frente.x * 0.08, y + frente.y * 0.08, z + 0.6
        for k in range(8, 17):
            a = math.pi * k / 8
            largo = 0.1 if k % 2 == 0 else 0.055
            px = cx + lado.x * math.cos(a) * radio
            py = cy + lado.y * math.cos(a) * radio
            pz = cz + math.sin(a) * radio
            self.vista.pieza(PIZARRA_AUSENTES, ac.caja, sala.m((px, py, pz), (0, math.pi / 2 - a, mira + math.pi / 2), (0.028, 0.02, largo)))
        self.vista.pieza(PIZARRA_AUSENTES, ac.caja, sala.m((cx, cy, cz + 0.005), (0, 0, mira + math.pi / 2), (0.55, 0.02, 0.014)))

    def aula(self, lugar, top):
        """El aula de la Maestra: estanterías curvas, pizarra con glifos, mesas bajas con cojines y su mesa con la
        ficha de riego, la tetera y su lámpara."""
        R = 5.0
        self.sala(lugar, R, 3.1, CREMA, (MUSGO, CREMA), puertas=((0, 2.0),),
                  ventanas=((50, 1.0), (-50, 1.0), (180, 1.1)), alto_techo=3.4, gajos=12, top=top)
        self.vista.pieza(TELA_ROJA, ac.cilindro(2.2, 20), lugar.m((0.4, 0, top + 0.035), escala=(1, 1, 0.01)))
        self.anillo_suelo(lugar, 2.2, 0.035, top + 0.04, TELA_MOSTAZA, 30)
        # Estanterías curvas pegadas al muro.
        for a0, a1 in ((100, 160), (200, 260)):
            for k in range(int((a1 - a0) / 15)):
                a = math.radians(a0 + 7.5 + k * 15)
                r = R - 0.55
                x, y = math.cos(a) * r, math.sin(a) * r
                self.solido(MADERA, ac.caja, lugar.m((x, y, top + 1.1), (0, 0, a), (0.45, 1.2, 2.2)))
                for z in (0.25, 0.75, 1.25, 1.75):
                    self.libros(lugar, x - math.cos(a) * 0.24, y - math.sin(a) * 0.24, top + z, 1.05, a + math.pi / 2)
        # La pizarra con glifos de los Ausentes copiados con tiza.
        a = math.radians(70)
        r = R - 0.25
        px, py = math.cos(a) * r, math.sin(a) * r
        self.vista.pieza(MADERA_OSCURA, ac.caja, lugar.m((px, py, top + 1.7), (0, 0, a), (0.08, 2.0, 1.25)))
        self.vista.pieza(PIZARRA, ac.caja, lugar.m((px - math.cos(a) * 0.05, py - math.sin(a) * 0.05, top + 1.7), (0, 0, a), (0.04, 1.85, 1.1)))
        for fila in range(3):
            for k in range(7):
                off = -0.75 + k * 0.25
                gx = px - math.cos(a) * 0.08 - math.sin(a) * off
                gy = py - math.sin(a) * 0.08 + math.cos(a) * off
                largo = 0.16 if (k + fila) % 3 == 0 else 0.09
                self.vista.pieza(TIZA, ac.caja, lugar.m((gx, gy, top + 2.05 - fila * 0.33), (0.4 * (k % 2), 0, a), (0.01, 0.03, largo)))
            self.vista.pieza(TIZA, ac.toro(0.09, 0.012, 10, 3),
                             lugar.m((px - math.cos(a) * 0.08 + math.sin(a) * 0.85, py - math.sin(a) * 0.08 - math.cos(a) * 0.85,
                                      top + 2.05 - fila * 0.33), (0, 0, a - math.pi / 2)))
        # Mesas bajas con cojines.
        for mx, my in ((-1.2, 1.4), (-1.6, -1.2), (0.9, -2.2)):
            self.mesa_redonda(lugar, mx, my, top, 0.6, 0.42)
            for k in range(4):
                b = math.pi / 4 + k * math.pi / 2
                self.cojin(lugar, mx + math.cos(b) * 0.9, my + math.sin(b) * 0.9, top,
                           (TELA_ROJA, TELA_AZUL, TELA_VERDE, TELA_MOSTAZA)[k])
            self.vista.pieza(PAPEL, ac.caja, lugar.m((mx + 0.1, my, top + 0.43), (0, 0, 0.4), (0.3, 0.22, 0.02)))
        # La mesa de la Maestra, de cara a la puerta, con la ficha de riego.
        dx, dy = 1.9, 1.6
        self.solido(MADERA, ac.caja, lugar.m((dx, dy, top + 0.72), (0, 0, -0.5), (1.5, 0.75, 0.08)))
        for ex, ey in ((-0.65, -0.3), (-0.65, 0.3), (0.65, -0.3), (0.65, 0.3)):
            c, s = math.cos(-0.5), math.sin(-0.5)
            self.solido(MADERA_OSCURA, ac.cilindro(0.04, 6), lugar.m((dx + c * ex - s * ey, dy + s * ex + c * ey, top + 0.36), escala=(1, 1, 0.72)))
        self.papel(lugar, dx - 0.25, dy - 0.05, top + 0.76, -0.4, 0.3, 0.4, 6)
        self.vista.pieza(TELA_VERDE, ac.caja, lugar.m((dx + 0.35, dy + 0.15, top + 0.79), (0, 0, -0.2), (0.32, 0.24, 0.06)))
        self.vista.pieza(LOZA, ac.torno([(0.0, 0.0), (0.09, 0.01), (0.11, 0.08), (0.08, 0.15), (0.03, 0.17), (0.0, 0.18)], 10),
                         lugar.m((dx + 0.5, dy - 0.15, top + 0.76)))
        self.vista.pieza(LOZA, ac.cilindro(0.015, 4), lugar.m((dx + 0.62, dy - 0.15, top + 0.87), (0, 0.9, 0), (1, 1, 0.12)))
        self.taza(lugar, dx + 0.25, dy - 0.3, top + 0.76)
        self.vista.pieza(MADERA_OSCURA, ac.cilindro(0.02, 4), lugar.m((dx - 0.55, dy + 0.2, top + 0.98), escala=(1, 1, 0.45)))
        self.vista.pieza(TELA_MOSTAZA, ac.cono(0.16, 0.06, 10), lugar.m((dx - 0.55, dy + 0.2, top + 1.22), escala=(1, 1, 0.16)))
        self.luces.pieza(LUZ, ac.bola(0.06, 1), lugar.m((dx - 0.55, dy + 0.2, top + 1.12)))
        self.marca("INT_ficha", lugar, (dx - 0.55, dy - 0.75, top + 1.15))
        # La Maestra, detrás de su mesa, mirando a la sala.
        self.ool("maestra", "maestra", lugar, dx + 0.35, dy + 0.7, top, (0.0, 0.0), 11, "INT_maestra")
        # Plantas de musgo con brotes vivos.
        for a in (math.radians(20), math.radians(-20)):
            x, y = math.cos(a) * (R - 0.6), math.sin(a) * (R - 0.6)
            self.vista.pieza(OCRE_OSCURO, ac.torno([(0.0, 0.0), (0.22, 0.0), (0.28, 0.35), (0.3, 0.4), (0.0, 0.4)], 10), lugar.m((x, y, top)))
            self.vista.pieza(MUSGO, ac.bola(0.3, 2), lugar.m((x, y, top + 0.48), escala=(1, 1, 0.7)))
            self.vivas.pieza(VIVA, ac.bola(0.04, 1), lugar.m((x + 0.1, y, top + 0.66)))

    def taller(self, lugar, top):
        """El taller de la Puerta pequeña: el anillo del tamaño de una mano en su soporte, cables a un armario de
        diales, el aro grande de las pruebas menores, herramientas, frascos y un diagrama de tiza en el suelo."""
        R = 5.5
        self.sala(lugar, R, 3.1, CREMA, (TELA_AZUL, CREMA), puertas=((180, 2.0), (-30, 2.0)),
                  ventanas=((60, 1.0), (120, 1.0), (-110, 1.0)), alto_techo=3.6, gajos=12, top=top)
        # Diagrama de tiza: aros concéntricos alrededor de la mesa.
        for r in (1.6, 2.2):
            self.anillo_suelo(lugar, r, 0.02, top + 0.03, TIZA, 36)
        for k in range(12):
            a = 2 * math.pi * k / 12
            self.vista.pieza(TIZA, ac.caja, lugar.m((math.cos(a) * 1.9, math.sin(a) * 1.9, top + 0.03), (0, 0, a), (0.5 if k % 3 == 0 else 0.25, 0.03, 0.01)))
        # La mesa grande y el anillo pequeño en su soporte.
        self.mesa_redonda(lugar, 0, 0, top, 1.1, 0.9, MADERA_CLARA)
        self.vista.pieza(LATON, ac.cilindro(0.15, 10), lugar.m((0, 0, top + 0.93), escala=(1, 1, 0.05)))
        self.vista.pieza(MADERA_OSCURA, ac.caja, lugar.m((0, 0, top + 1.0), escala=(0.06, 0.06, 0.14)))
        self.vista.pieza(LATON, ac.toro(0.11, 0.018, 20, 5), lugar.m((0, 0, top + 1.18)))
        for lado in (-1, 1):
            self.vista.pieza(PIZARRA, ac.caja, lugar.m((lado * 0.13, 0, top + 1.1), escala=(0.03, 0.05, 0.12)))
        # Cables del anillo al armario de diales.
        armario = (math.cos(math.radians(150)) * (R - 0.7), math.sin(math.radians(150)) * (R - 0.7))
        puntos = [Vector((0.12, 0.0, top + 1.1)), Vector((0.6, 0.5, top + 0.95)), Vector((armario[0] * 0.5, armario[1] * 0.6, top + 0.05)),
                  Vector((armario[0] * 0.9, armario[1] * 0.9, top + 0.05)), Vector((armario[0], armario[1], top + 0.8))]
        for i in range(len(puntos) - 1):
            a, b = lugar.base @ puntos[i], lugar.base @ puntos[i + 1]
            self.vista.pieza(TINTA, ac.caja, ac.caja_entre(a, b, 0.03, 0.03))
        ang = math.radians(150)
        self.solido(MADERA_OSCURA, ac.caja, lugar.m((armario[0], armario[1], top + 0.9), (0, 0, ang), (0.5, 1.2, 1.8)))
        for k in range(6):
            dz = 1.3 if k < 3 else 0.9
            off = -0.35 + (k % 3) * 0.35
            px = armario[0] - math.cos(ang) * 0.26 - math.sin(ang) * off
            py = armario[1] - math.sin(ang) * 0.26 + math.cos(ang) * off
            self.vista.pieza(LOZA, ac.cilindro(0.11, 10), lugar.m((px, py, top + dz), (0, math.pi / 2, ang), (1, 1, 0.04)))
            self.vista.pieza(TINTA, ac.caja, lugar.m((px - math.cos(ang) * 0.02, py - math.sin(ang) * 0.02, top + dz + 0.03), (0.6 * k, 0, ang), (0.01, 0.015, 0.09)))
        self.luces.pieza(LUZ, ac.bola(0.035, 1), lugar.m((armario[0] - math.cos(ang) * 0.27, armario[1] - math.sin(ang) * 0.27, top + 1.6)))
        # El aro grande de las pruebas menores, con su cordón de aviso.
        a = math.radians(70)
        ax, ay = math.cos(a) * 3.4, math.sin(a) * 3.4
        self.solido(MADERA_OSCURA, ac.caja, lugar.m((ax, ay, top + 0.15), (0, 0, a), (0.9, 0.5, 0.3)))
        for lado in (-1, 1):
            self.vista.pieza(MADERA, ac.caja, lugar.m((ax - math.sin(a) * lado * 0.95, ay + math.cos(a) * lado * 0.95, top + 0.9), (0, 0, a), (0.12, 0.12, 1.4)))
        self.vista.pieza(LATON, ac.toro(0.9, 0.06, 32, 6), lugar.m((ax, ay, top + 1.45), (0, 0, a + math.pi / 2)))
        for k in range(12):
            b = 2 * math.pi * k / 12
            self.vista.pieza(PIZARRA, ac.caja, lugar.m((ax + math.cos(a) * 0.0 + math.cos(b) * 0.9 * -math.sin(a), ay + math.cos(b) * 0.9 * math.cos(a), top + 1.45 + math.sin(b) * 0.9),
                                                       (0, -b, a + math.pi / 2), (0.05, 0.14, 0.05)))
        for k in range(5):
            b = a + (k - 2) * 0.28
            self.solido(LATON, ac.cilindro(0.03, 6), lugar.m((math.cos(b) * 2.3, math.sin(b) * 2.3, top + 0.4), escala=(1, 1, 0.8)))
        self.vista.pieza(TELA_ROJA, ac.arco(2.3, 0.02, -a - 0.56, -a + 0.56, 10, 3), lugar.m((0, 0, top + 0.78), (math.pi / 2, 0, 0)))
        # Pared de herramientas y estantes con frascos.
        a = math.radians(-80)
        r = R - 0.3
        wx, wy = math.cos(a) * r, math.sin(a) * r
        self.vista.pieza(MADERA_CLARA, ac.caja, lugar.m((wx, wy, top + 1.6), (0, 0, a), (0.05, 2.2, 1.2)))
        for k in range(7):
            off = -0.9 + k * 0.3
            hx, hy = wx - math.cos(a) * 0.06 - math.sin(a) * off, wy - math.sin(a) * 0.06 + math.cos(a) * off
            largo = self.rng.uniform(0.25, 0.5)
            self.vista.pieza(self.rng.choice((PIEDRA_OSCURA, LATON, MADERA_OSCURA)), ac.caja,
                             lugar.m((hx, hy, top + 1.6), (0, self.rng.uniform(-0.3, 0.3), a), (0.03, 0.05, largo)))
        for a_est in (math.radians(20), math.radians(-150)):
            r = R - 0.5
            ex, ey = math.cos(a_est) * r, math.sin(a_est) * r
            self.solido(MADERA, ac.caja, lugar.m((ex, ey, top + 0.9), (0, 0, a_est), (0.4, 1.2, 1.8)))
            for z in (0.5, 1.0, 1.5):
                for k in range(4):
                    off = -0.4 + k * 0.27
                    jx, jy = ex - math.cos(a_est) * 0.05 - math.sin(a_est) * off, ey - math.sin(a_est) * 0.05 + math.cos(a_est) * off
                    color = self.rng.choice((LOZA, MUSGO_CLARO, TELA_AZUL, OCRE))
                    self.vista.pieza(color, ac.torno([(0.0, 0.0), (0.07, 0.0), (0.08, 0.12), (0.05, 0.16), (0.05, 0.19), (0.0, 0.19)], 8),
                                     lugar.m((jx, jy, top + z + 0.02)))
        # Cajas y una lámpara.
        for cx, cy, s in ((-3.2, -3.0, 0.7), (-2.6, -3.6, 0.5), (-3.7, -2.2, 0.55)):
            self.solido(MADERA_CLARA, ac.caja, lugar.m((cx, cy, top + s / 2), (0, 0, 0.3 * cx), (s, s, s)))
            self.vista.pieza(MADERA_OSCURA, ac.caja, lugar.m((cx, cy, top + s / 2), (0, 0, 0.3 * cx), (s * 1.02, s * 0.15, s * 1.02)))
        self.cordon(lugar, 0, 0, top + 2.23, top + 3.1, R + 0.45, 3.6)
        self.vista.pieza(TELA_AZUL, ac.torno([(0.0, -0.3), (0.3, -0.22), (0.35, -0.05), (0.2, 0.06), (0.0, 0.08)], 10), lugar.m((0, 0, top + 2.15)))
        self.luces.pieza(LUZ, ac.bola(0.14, 1), lugar.m((0, 0, top + 1.95)))
        self.marca("INT_mesa_puerta", lugar, (-1.25, -0.6, top + 1.2))
        # El técnico, al otro lado de la mesa, con el anillo delante.
        self.ool("tecnico", "tecnico", lugar, 0.95, 1.3, top, (0.0, 0.0), 13, "INT_tecnico")

    def despacho(self, lugar, top):
        """El despacho de la Directora: la ventana redonda grande, su mesa curva con el informe y un planetario de
        latón de Hogar y la Luna, el mapa de Hogar, un armario y una planta."""
        R = 4.5
        # La ventana redonda grande da al norte; las otras dos, más altas que en las demás salas.
        self.sala(lugar, R, 3.0, CREMA, (TELA_ROJA, CREMA), puertas=((-90, 2.0),),
                  ventanas=((90, 2.0), (150, 1.0), (30, 1.0)), alto_techo=3.2, gajos=10, top=top, ventana=(0.75, 2.75))
        self.vista.pieza(LATON, ac.toro(0.92, 0.03, 24, 4), lugar.m((0, R - 0.5, top + 1.75)))
        self.vista.pieza(TELA_ROJA, ac.caja, lugar.m((0, R - 0.3, top + 2.85), escala=(2.4, 0.05, 0.22)))
        # La mesa curva, de espaldas a la ventana.
        for k in range(5):
            b = math.radians(60 + k * 15)
            self.solido(MADERA, ac.caja, lugar.m((math.cos(b) * 2.2, math.sin(b) * 2.2, top + 0.76), (0, 0, b), (0.75, 0.6, 0.08)))
            self.vista.pieza(MADERA_OSCURA, ac.caja, lugar.m((math.cos(b) * 2.2, math.sin(b) * 2.2, top + 0.36), (0, 0, b), (0.5, 0.55, 0.72)))
        # El informe, encuadernado y con su cinta roja.
        ix, iy = math.cos(math.radians(80)) * 2.0, math.sin(math.radians(80)) * 2.0
        self.vista.pieza(TELA_VERDE, ac.caja, lugar.m((ix, iy, top + 0.83), (0, 0, 0.3), (0.32, 0.42, 0.05)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((ix, iy, top + 0.86), (0, 0, 0.3), (0.3, 0.4, 0.02)))
        self.vista.pieza(TELA_ROJA, ac.caja, lugar.m((ix, iy, top + 0.875), (0, 0, 0.3), (0.03, 0.42, 0.01)))
        self.papel(lugar, ix + 0.45, iy - 0.2, top + 0.8, 0.8)
        self.papel(lugar, ix + 0.5, iy - 0.25, top + 0.812, 0.5)
        # Planetario: Hogar y la Luna en sus brazos de latón.
        ox, oy = math.cos(math.radians(110)) * 2.15, math.sin(math.radians(110)) * 2.15
        self.vista.pieza(LATON, ac.cilindro(0.12, 10), lugar.m((ox, oy, top + 0.82), escala=(1, 1, 0.04)))
        self.vista.pieza(LATON, ac.cilindro(0.015, 4), lugar.m((ox, oy, top + 0.97), escala=(1, 1, 0.3)))
        self.vista.pieza(MUSGO, ac.bola(0.09, 2), lugar.m((ox, oy, top + 1.13)))
        self.vista.pieza(LATON, ac.caja, lugar.m((ox + 0.12, oy, top + 1.13), escala=(0.24, 0.012, 0.012)))
        self.vista.pieza(PIEDRA_CLARA, ac.bola(0.035, 1), lugar.m((ox + 0.25, oy, top + 1.13)))
        # La silla de la Directora.
        self.cojin(lugar, 0, 1.4, top + 0.42, TELA_ROJA, 0.34)
        self.solido(MADERA_OSCURA, ac.cilindro(0.3, 10), lugar.m((0, 1.4, top + 0.21), escala=(1, 1, 0.42)))
        # El mapa de Hogar en la pared y un armario.
        a = math.radians(200)
        mx, my = math.cos(a) * (R - 0.25), math.sin(a) * (R - 0.25)
        self.vista.pieza(MADERA, ac.caja, lugar.m((mx, my, top + 1.7), (0, 0, a), (0.06, 1.5, 1.0)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((mx - math.cos(a) * 0.04, my - math.sin(a) * 0.04, top + 1.7), (0, 0, a), (0.02, 1.38, 0.88)))
        self.vista.pieza(TELA_AZUL, ac.cilindro(0.28, 12), lugar.m((mx - math.cos(a) * 0.06, my - math.sin(a) * 0.06, top + 1.72), (0, math.pi / 2, a), (1, 1, 0.01)))
        self.vista.pieza(MUSGO, ac.cilindro(0.2, 9), lugar.m((mx - math.cos(a) * 0.065, my - math.sin(a) * 0.065, top + 1.75), (0, math.pi / 2, a), (1, 1.2, 0.01)))
        a = math.radians(-20)
        self.solido(MADERA_OSCURA, ac.caja, lugar.m((math.cos(a) * (R - 0.5), math.sin(a) * (R - 0.5), top + 0.9), (0, 0, a), (0.5, 1.1, 1.8)))
        self.libros(lugar, math.cos(a) * (R - 0.75), math.sin(a) * (R - 0.75), top + 1.82, 0.95, a + math.pi / 2)
        a = math.radians(-150)
        px, py = math.cos(a) * (R - 0.7), math.sin(a) * (R - 0.7)
        self.vista.pieza(OCRE_OSCURO, ac.torno([(0.0, 0.0), (0.25, 0.0), (0.32, 0.45), (0.0, 0.45)], 10), lugar.m((px, py, top)))
        self.vista.pieza(MUSGO_OSCURO, ac.bola(0.45, 2), lugar.m((px, py, top + 0.85), escala=(1, 1, 1.2)))
        for k in range(3):
            self.vivas.pieza(VIVA, ac.bola(0.04, 1), lugar.m((px + 0.2 * math.cos(k * 2.1), py + 0.2 * math.sin(k * 2.1), top + 1.2 + 0.1 * k)))
        self.vista.pieza(TELA_MOSTAZA, ac.cilindro(1.3, 16), lugar.m((0, 0.3, top + 0.03), escala=(1, 1, 0.01)))
        self.marca("INT_informe_deuda", lugar, (ix, iy - 0.75, top + 1.15))
        # La Directora, entre su mesa y la ventana de la Luna, mirando a la puerta.
        self.ool("directora", "directora", lugar, -0.7, 2.95, top, (0.0, -4.5), 12, "INT_directora")

    def entrada(self, sala, top, R):
        """El pórtico de la puerta sur (postes, toldo curvo y el emblema del Instituto) y la plaza de entrada."""
        for lado in (-1, 1):
            self.solido(MADERA, ac.cilindro(0.14, 8), sala.m((lado * 1.6, -R - 1.6, top + 1.5), escala=(1, 1, 3.0)))
            self.vista.pieza(LATON, ac.bola(0.16, 1), sala.m((lado * 1.6, -R - 1.6, top + 3.05)))
        for k in range(6):
            t = math.pi * (k + 0.5) / 6
            self.vista.pieza((TELA_MOSTAZA, CREMA)[k % 2], ac.caja,
                             sala.m((math.cos(t) * 1.7, -R - 0.9, top + 2.7 + math.sin(t) * 0.5),
                                    (0, -math.atan2(math.sin(t) * 0.5, math.cos(t) * 1.7), 0), (0.04, 1.8, 1.0)))
        # El emblema: un aro con musgo y una chispa de luz viva, sobre la puerta.
        self.vista.pieza(LATON, ac.toro(0.45, 0.06, 20, 5), sala.m((0, -R - 0.25, top + 3.15)))
        self.vista.pieza(MUSGO, ac.cilindro(0.38, 16), sala.m((0, -R - 0.22, top + 3.15), (math.pi / 2, 0, 0), (1, 1, 0.05)))
        self.vivas.pieza(VIVA, ac.bola(0.08, 1), sala.m((0, -R - 0.3, top + 3.15)))
        # La plaza de entrada.
        plaza = self.p.lugar(*PLAZA_ENTRADA, rumbo=0, apoyo=5.5, tomar=ac.media)
        self.reservar(PLAZA_ENTRADA, 8)
        pt = 0.15
        self.zocalo(plaza, 5.8, pt)
        self.vista.pieza(PIEDRA_CLARA, ac.cilindro(5.6, 28), plaza.m((0, 0, pt + 0.005), escala=(1, 1, 0.02)))
        for r, col in ((4.2, OCRE), (2.6, CREMA_SOMBRA)):
            self.anillo_suelo(plaza, r, 0.06, pt + 0.02, col, 36)
        # Huerto redondo de musgo con brotes vivos en el centro.
        self.solido(MADERA, ac.cilindro(1.3, 16), plaza.m((0, 0, pt + 0.2), escala=(1, 1, 0.4)))
        self.vista.pieza(MUSGO, ac.bola(1.25, 2), plaza.m((0, 0, pt + 0.4), escala=(1, 1, 0.3)))
        for k in range(7):
            b = 2 * math.pi * k / 7
            self.vivas.pieza(VIVA, ac.bola(0.05, 1), plaza.m((math.cos(b) * 0.7, math.sin(b) * 0.7, pt + 0.62)))
            self.vista.pieza(FLORES[k % len(FLORES)], ac.bola(0.07, 1), plaza.m((math.cos(b + 0.4) * 1.0, math.sin(b + 0.4) * 1.0, pt + 0.58)))
        for lado in (-1, 1):
            self.banco(plaza, lado * 3.6, -0.5, pt, math.pi / 2 * lado)
            self.farol(plaza, lado * 4.6, 2.2, pt)
            self.farol_vivo(plaza, lado * 4.4, -2.8, pt)
        # El tablón de avisos.
        self.solido(MADERA, ac.caja, plaza.m((-3.3, -3.9, pt + 0.9), (0, 0, 0.5), (0.1, 0.1, 1.8)))
        self.solido(MADERA, ac.caja, plaza.m((-2.1, -4.4, pt + 0.9), (0, 0, 0.5), (0.1, 0.1, 1.8)))
        self.vista.pieza(MADERA_CLARA, ac.caja, plaza.m((-2.7, -4.15, pt + 1.35), (0, 0, 0.5), (1.4, 0.05, 0.8)))
        for k in range(4):
            self.vista.pieza(PAPEL, ac.caja, plaza.m((-3.15 + k * 0.3, -4.1 + k * 0.13, pt + 1.35 + 0.12 * (k % 2)), (0, 0.08 * (k - 1.5), 0.5),
                                                     (0.24, 0.02, 0.3)))
        self.marca("SPAWN_Instituto", plaza, (0, 3.2, pt + 1.0), rumbo=0)  # entre el huerto y la puerta, mirándola

    def ool(self, nombre, variante, lugar, x, y, z, hacia, semilla, marca=None):
        """Un Ool de pie en (x, y, z) del lugar, mirando hacia el punto `hacia` (x, y): su objeto OOL_<nombre> con
        lo que brilla en OOL_<nombre>_Luz (el juego los hace respirar y girarse), una columna para no atravesarlo
        y, si habla, su marca INT_ delante de la cara."""
        dx, dy = hacia[0] - x, hacia[1] - y
        giro = math.atan2(-dx, dy)
        vista, vivas = ac.Malla(), ac.Malla()
        ool.construir(vista, vivas, ac.Lugar(Matrix.Identity(4)), variante, semilla)
        paleta = bpy.data.materials.get(f"M_Paleta_{MUNDO}")
        cuerpo, _ = ac.objeto_suelto(self.p, f"OOL_{nombre}", vista, paleta, lugar.base @ ac.matriz((x, y, z), (0, 0, giro)))
        luz, _ = ac.objeto(self.p, f"OOL_{nombre}_Luz", vivas, ac.material_luces(f"M_LucesVivas_{MUNDO}", VIVA))
        luz.parent = cuerpo
        self.col.pieza(ac.cilindro(0.42, 8), lugar.m((x, y, z + 0.8), escala=(1, 1, 1.6)))
        if marca:
            norma = math.hypot(dx, dy) or 1.0
            self.marca(marca, lugar, (x + dx / norma * 0.45, y + dy / norma * 0.45, z + 1.3))

    def banco(self, lugar, x, y, z, rot):
        self.solido(MADERA, ac.caja, lugar.m((x, y, z + 0.45), (0, 0, rot), (1.6, 0.45, 0.08)))
        self.vista.pieza(MADERA_OSCURA, ac.caja, lugar.m((x, y, z + 0.22), (0, 0, rot), (1.3, 0.35, 0.44)))
        c, s = math.cos(rot), math.sin(rot)
        self.vista.pieza(MADERA, ac.caja, lugar.m((x - s * 0.22, y + c * 0.22, z + 0.75), (-0.25, 0, rot), (1.6, 0.06, 0.4)))

    # ---- El hangar -----------------------------------------------------------------------------

    def hangar(self):
        """La plataforma redonda del Albatros II, con su aro pintado y sus luces, y el cobertizo de la mecánica:
        tres arcos de madera con lona, banco de trabajo, herramientas, barriles, una grúa y la manga de viento."""
        lugar = self.p.lugar(*HANGAR, rumbo=0, apoyo=6.5, tomar=ac.media)
        self.reservar(HANGAR, 12)
        top = 0.3
        self.zocalo(lugar, 6.6, top, hondo=3.0)
        self.vista.pieza(PIEDRA_CLARA, ac.cilindro(6.4, 28), lugar.m((0, 0, top + 0.005), escala=(1, 1, 0.02)))
        self.anillo_suelo(lugar, 4.2, 0.18, top + 0.02, OCRE, 40)
        self.anillo_suelo(lugar, 2.0, 0.06, top + 0.02, CREMA, 32)
        for k in range(8):
            a = 2 * math.pi * k / 8
            self.vista.pieza(OCRE, ac.caja, lugar.m((math.cos(a) * 5.4, math.sin(a) * 5.4, top + 0.02), (0, 0, a), (0.9, 0.18, 0.02)))
        for k in range(4):
            a = 2 * math.pi * k / 4 + math.pi / 4
            x, y = math.cos(a) * 6.1, math.sin(a) * 6.1
            self.solido(PIEDRA_OSCURA, ac.cilindro(0.18, 8), lugar.m((x, y, top + 0.15), escala=(1, 1, 0.3)))
            self.luces.pieza(LUZ, ac.bola(0.12, 1), lugar.m((x, y, top + 0.36), escala=(1, 1, 0.6)))
        # El cobertizo, al norte de la plataforma.
        cob = self.p.lugar(*desplazar(*HANGAR, 0.0, 9.0), rumbo=0, apoyo=3.5, tomar=ac.media)
        ct = 0.1
        self.solido(PIEDRA, ac.caja, cob.m((0, 0, ct - 0.8), escala=(7.0, 4.2, 1.6)))
        self.rampa(cob, 0, -2.1, ct, 0, -1, PIEDRA_CLARA, ancho=6.8)
        self.vista.pieza(MADERA_CLARA, ac.caja, cob.m((0, 0, ct + 0.01), escala=(6.8, 4.0, 0.02)))
        for k, x in enumerate((-3.0, 0.0, 3.0)):
            self.vista.pieza(MADERA, ac.arco(2.1, 0.1, 0, math.pi, 12, 5), cob.m((x, 0.4, ct + 1.2), (0, 0, math.pi / 2), (1, 1, 1.2)))
            for lado in (-1, 1):
                self.solido(MADERA, ac.cilindro(0.1, 6), cob.m((x, 0.4 + lado * 2.1, ct + 0.6), escala=(1, 1, 1.2)))
        for k in range(9):
            t = math.pi * (k + 0.5) / 9
            self.vista.pieza((CREMA, TELA_VERDE, CREMA)[k % 3], ac.caja,
                             cob.m((0, 0.4 + math.cos(t) * 2.2, ct + 1.2 + math.sin(t) * 2.2 * 1.2), (t, 0, 0),
                                   (6.6, 0.04, 0.95)))
        self.solido(MADERA_OSCURA, ac.caja, cob.m((0, 2.1, ct + 1.3), escala=(6.4, 0.1, 2.6)))
        # Banco de trabajo, tablero de herramientas y trastos.
        self.solido(MADERA, ac.caja, cob.m((-1.0, 1.55, ct + 0.88), escala=(3.0, 0.8, 0.08)))
        for ex in (-2.4, 0.4):
            self.solido(MADERA_OSCURA, ac.caja, cob.m((ex, 1.55, ct + 0.44), escala=(0.1, 0.7, 0.88)))
        self.vista.pieza(MADERA_CLARA, ac.caja, cob.m((-1.0, 2.0, ct + 1.6), escala=(2.8, 0.04, 0.9)))
        for k in range(9):
            largo = self.rng.uniform(0.2, 0.45)
            self.vista.pieza(self.rng.choice((PIEDRA_OSCURA, LATON, MADERA_OSCURA, TELA_ROJA)), ac.caja,
                             cob.m((-2.2 + k * 0.3, 1.95, ct + 1.6), (0, self.rng.uniform(-0.3, 0.3), 0), (0.05, 0.03, largo)))
        self.vista.pieza(LATON, ac.cilindro(0.12, 10), cob.m((-1.6, 1.5, ct + 1.0), escala=(1, 1, 0.16)))
        self.vista.pieza(PIEDRA_OSCURA, ac.caja, cob.m((-0.3, 1.5, ct + 0.98), (0, 0, 0.3), (0.4, 0.25, 0.12)))
        self.taza(cob, 0.15, 1.4, ct + 0.92)
        for bx, by, col in ((2.2, 1.4, TELA_ROJA), (2.75, 1.1, OCRE), (2.5, 0.4, TELA_AZUL)):
            self.vista.pieza(col, ac.torno([(0.0, 0.0), (0.3, 0.0), (0.34, 0.15), (0.35, 0.45), (0.34, 0.75), (0.3, 0.9), (0.0, 0.9)], 10),
                             cob.m((bx, by, ct)))
            self.col.pieza(ac.cilindro(0.35, 8), cob.m((bx, by, ct + 0.45), escala=(1, 1, 0.9)))
            self.vista.pieza(MADERA_OSCURA, ac.toro(0.345, 0.02, 12, 3), cob.m((bx, by, ct + 0.25), (math.pi / 2, 0, 0)))
            self.vista.pieza(MADERA_OSCURA, ac.toro(0.345, 0.02, 12, 3), cob.m((bx, by, ct + 0.65), (math.pi / 2, 0, 0)))
        for cx, cy, s in ((-2.6, 0.3, 0.6), (-2.1, -0.4, 0.45)):
            self.solido(MADERA_CLARA, ac.caja, cob.m((cx, cy, ct + s / 2), (0, 0, 0.4), (s, s, s)))
        self.farol(cob, 3.2, -0.9, ct)
        # La mecánica, delante de su banco, mirando a la plataforma.
        self.ool("mecanica", "mecanica", cob, 0.7, 0.6, ct, (0.7, -4.0), 14, "INT_mecanica")
        # La grúa y la manga de viento, del lado de la plataforma.
        self.solido(MADERA_OSCURA, ac.cilindro(0.14, 8), lugar.m((-4.8, 5.4, top + 2.4), escala=(1, 1, 4.8)))
        self.vista.pieza(MADERA_OSCURA, ac.caja, lugar.m((-3.6, 5.0, top + 4.7), (0, 0, -0.35), (2.6, 0.18, 0.18)))
        self.vista.pieza(TINTA, ac.cilindro(0.015, 4), lugar.m((-2.5, 4.6, top + 4.0), escala=(1, 1, 1.4)))
        self.vista.pieza(LATON, ac.arco(0.14, 0.03, math.pi, 2.4 * math.pi, 8, 3), lugar.m((-2.5, 4.6, top + 3.25)))
        self.solido(MADERA, ac.cilindro(0.07, 6), lugar.m((5.6, 4.0, top + 2.5), escala=(1, 1, 5.0)))
        for k in range(4):
            self.vista.pieza((TELA_ROJA, CREMA)[k % 2], ac.cono(0.22 - k * 0.035, 0.22 - (k + 1) * 0.035, 10),
                             lugar.m((5.6 + 0.25 + k * 0.42, 4.0, top + 4.7 - k * 0.08), (0, math.pi / 2 + 0.2, 0), (1, 1, 0.42)))
        self.marca("PARK_Hangar", lugar, (0, 0, top))

    # ---- La aldea ------------------------------------------------------------------------------

    def casa(self, lugar, semilla, puerta_abierta=False):
        """Casa de los Ool: cuerpo de barro claro en forma de bulbo, puerta redonda, ventanas con luz, techo de tela
        acolchada en gajos, chimenea y un huerto de musgo con su valla de varas. Mira hacia +Y."""
        rng = random.Random(semilla)
        r = rng.uniform(2.4, 3.0)
        alto = rng.uniform(2.6, 3.1)
        muro = rng.choice((CREMA, CREMA, "#E8D8B8", "#F0DCC0"))
        techo = rng.choice(((TELA_ROJA, TELA_MOSTAZA), (TELA_AZUL, CREMA), (TELA_VERDE, OCRE), (TELA_ROSA, CREMA), (OCRE, TELA_ROJA)))
        perfil = [(0.0, -0.6), (r * 0.98, -0.6), (r * 1.02, 0.4), (r * 1.06, alto * 0.45), (r, alto * 0.85), (r * 0.94, alto)]
        if puerta_abierta:
            self.casa_por_dentro(lugar, r, alto, muro, techo)
        else:
            self.vista.pieza(muro, ac.torno(perfil + [(0.0, alto)], 16), lugar.m((0, 0, 0)))
            self.col.pieza(ac.cilindro(r, 10), lugar.m((0, 0, alto / 2), escala=(1, 1, alto)))
            # Puerta redonda de tablas, con su aro y su pomo (por fuera del abombado del muro).
            cara = r * 1.08
            self.vista.pieza(MADERA, ac.cilindro(0.75, 14), lugar.m((0, cara, 1.0), (math.pi / 2, 0, 0), (1, 1.35, 0.12)))
            for k in range(4):
                self.vista.pieza(MADERA_OSCURA, ac.caja, lugar.m((-0.45 + k * 0.3, cara + 0.07, 1.0), escala=(0.03, 0.02, 1.8)))
            self.vista.pieza(MADERA_OSCURA, ac.toro(0.78, 0.06, 18, 4), lugar.m((0, cara + 0.04, 1.0), escala=(1, 1, 1.35)))
            self.vista.pieza(LATON, ac.bola(0.05, 1), lugar.m((0.42, cara + 0.1, 0.95)))
            for b in (math.radians(35), math.radians(145), math.radians(-60)):
                vx, vy = math.cos(b) * r * 1.08, math.sin(b) * r * 1.08
                self.luces.pieza(LUZ, ac.cilindro(0.32, 10), lugar.m((vx, vy, alto * 0.55), (0, math.pi / 2, b), (1.3, 1, 0.05)))
                self.vista.pieza(MADERA, ac.toro(0.34, 0.05, 14, 4), lugar.m((vx, vy, alto * 0.55), (0, 0, b - math.pi / 2), (1, 1, 1.3)))
            self.techo_tela(lugar, r + 0.35, alto - 0.05, rng.uniform(1.6, 2.2), techo, gajos=10, linterna=False)
            self.vista.pieza(MADERA, ac.cono(0.12, 0.0, 8), lugar.m((0, 0, alto + 1.9), escala=(1, 1, 0.5)))
        # Chimenea de barro con su sombrerete.
        cx, cy = -r * 0.45, -r * 0.3
        self.vista.pieza(muro, ac.cilindro(0.25, 8), lugar.m((cx, cy, alto + 1.0), escala=(1, 1, 2.0)))
        self.vista.pieza(OCRE_OSCURO, ac.cono(0.4, 0.05, 8), lugar.m((cx, cy, alto + 2.15), escala=(1, 1, 0.3)))
        # Huerto de musgo con valla de varas, detrás de la casa.
        hx, hy = rng.choice((-1, 1)) * 1.4, -(r + 1.9)
        self.solido(MADERA, ac.cilindro(1.1, 14), lugar.m((hx, hy, 0.15), escala=(1, 1, 0.3)))
        self.vista.pieza(MUSGO, ac.bola(1.05, 2), lugar.m((hx, hy, 0.3), escala=(1, 1, 0.25)))
        for k in range(6):
            b = 2 * math.pi * k / 6 + rng.uniform(0, 0.5)
            self.vivas.pieza(VIVA, ac.bola(0.045, 1), lugar.m((hx + math.cos(b) * 0.6, hy + math.sin(b) * 0.6, 0.5)))
            self.vista.pieza(HOJA, ac.cono(0.08, 0.0, 5), lugar.m((hx + math.cos(b + 0.5) * 0.4, hy + math.sin(b + 0.5) * 0.4, 0.55), escala=(1, 1, 0.3)))
        for k in range(10):
            b = 2 * math.pi * k / 10
            self.vista.pieza(MADERA_OSCURA, ac.cilindro(0.03, 4), lugar.m((hx + math.cos(b) * 1.45, hy + math.sin(b) * 1.45, 0.35),
                                                                        (rng.uniform(-0.1, 0.1), 0, 0), (1, 1, 0.7)))
        self.vista.pieza(MADERA_OSCURA, ac.toro(1.45, 0.025, 20, 3), lugar.m((hx, hy, 0.55), (math.pi / 2, 0, 0)))

    def casa_por_dentro(self, lugar, r, alto, muro, techo):
        """La casa del explorador, que se puede recorrer: cama con su colcha remendada, mesa con el cuaderno y la
        lámpara, estante con la maqueta del Albatros II y un mapa de la Luna en la pared."""
        R = r + 0.4
        self.sala(lugar, R, alto, muro, techo, puertas=((90, 1.8),), ventanas=((20, 0.9), (160, 0.9), (-90, 1.0)),
                  alto_techo=2.0, gajos=10, top=0.2)
        top = 0.2
        # Cama.
        bx, by = -R + 1.3, -0.6
        self.solido(MADERA, ac.caja, lugar.m((bx, by, top + 0.22), escala=(1.1, 2.0, 0.44)))
        self.vista.pieza(CREMA, ac.caja, lugar.m((bx, by, top + 0.5), escala=(1.0, 1.9, 0.14)))
        for k in range(6):
            self.vista.pieza((TELA_ROJA, TELA_AZUL, TELA_MOSTAZA, TELA_VERDE, TELA_ROSA, OCRE)[k], ac.caja,
                             lugar.m((bx + (k % 2 - 0.5) * 0.5, by - 0.35 + (k // 2) * 0.45, top + 0.585), escala=(0.5, 0.45, 0.03)))
        self.vista.pieza(LOZA, ac.bola(0.25, 2), lugar.m((bx, by + 0.75, top + 0.62), escala=(1.4, 0.8, 0.4)))
        # Mesa, silla, cuaderno, lámpara y tazón.
        mx, my = R - 1.3, -0.9
        self.solido(MADERA_CLARA, ac.caja, lugar.m((mx, my, top + 0.74), escala=(0.9, 1.3, 0.06)))
        for ex in (-0.38, 0.38):
            for ey in (-0.55, 0.55):
                self.solido(MADERA_OSCURA, ac.cilindro(0.035, 5), lugar.m((mx + ex, my + ey, top + 0.36), escala=(1, 1, 0.72)))
        self.papel(lugar, mx, my - 0.2, top + 0.77, 0.2)
        self.vista.pieza(TELA_AZUL, ac.caja, lugar.m((mx + 0.15, my + 0.25, top + 0.8), (0, 0, -0.3), (0.26, 0.34, 0.05)))
        self.vista.pieza(MADERA_OSCURA, ac.cilindro(0.02, 4), lugar.m((mx - 0.3, my + 0.45, top + 0.98), escala=(1, 1, 0.45)))
        self.vista.pieza(TELA_MOSTAZA, ac.cono(0.15, 0.05, 10), lugar.m((mx - 0.3, my + 0.45, top + 1.22), escala=(1, 1, 0.15)))
        self.luces.pieza(LUZ, ac.bola(0.055, 1), lugar.m((mx - 0.3, my + 0.45, top + 1.12)))
        self.taza(lugar, mx + 0.3, my - 0.45, top + 0.77, TELA_MOSTAZA)
        self.cojin(lugar, mx - 0.85, my, top, TELA_VERDE, 0.32)
        # Estante con la maqueta del Albatros II.
        sx, sy = 0.0, -R + 0.4
        self.solido(MADERA, ac.caja, lugar.m((sx, sy, top + 1.2), escala=(1.4, 0.3, 0.05)))
        self.solido(MADERA, ac.caja, lugar.m((sx, sy, top + 0.7), escala=(1.4, 0.3, 0.05)))
        self.libros(lugar, sx - 0.25, sy, top + 0.72, 0.8, 0.0, 0.2)
        self.vista.pieza(CREMA, ac.bola(0.15, 2), lugar.m((sx + 0.35, sy, top + 1.38), escala=(1.6, 1.0, 0.9)))
        self.vista.pieza(TELA_VERDE, ac.caja, lugar.m((sx + 0.35, sy, top + 1.38), escala=(0.5, 0.31, 0.03)))
        self.vista.pieza("#BFE4EC", ac.bola(0.08, 1), lugar.m((sx + 0.55, sy, top + 1.43)))
        self.vista.pieza(MADERA_OSCURA, ac.cilindro(0.01, 4), lugar.m((sx + 0.35, sy, top + 1.3), escala=(1, 1, 0.1)))
        # El mapa de la Luna, con sus cráteres, clavado en la pared.
        a = math.radians(200)
        px, py = math.cos(a) * (R - 0.22), math.sin(a) * (R - 0.22)
        self.vista.pieza(PAPEL, ac.caja, lugar.m((px, py, top + 1.6), (0, 0, a), (0.02, 0.8, 0.8)))
        self.vista.pieza("#8A94A6", ac.cilindro(0.3, 14), lugar.m((px - math.cos(a) * 0.02, py - math.sin(a) * 0.02, top + 1.6), (0, math.pi / 2, a), (1, 1, 0.01)))
        for k in range(4):
            b = k * 1.7
            self.vista.pieza("#4E5666", ac.cilindro(0.05 + 0.02 * k, 8),
                             lugar.m((px - math.cos(a) * 0.03 - math.sin(a) * 0.15 * math.cos(b), py - math.sin(a) * 0.03 + math.cos(a) * 0.15 * math.cos(b),
                                      top + 1.6 + 0.15 * math.sin(b)), (0, math.pi / 2, a), (1, 1, 0.01)))
        self.vista.pieza(TELA_ROJA, ac.bola(0.025, 1), lugar.m((px - math.cos(a) * 0.04, py - math.sin(a) * 0.04, top + 1.72)))
        self.vista.pieza(TELA_ROJA, ac.cilindro(1.0, 14), lugar.m((0.2, 0.2, top + 0.03), escala=(1, 1, 0.01)))
        self.vista.pieza(TELA_MOSTAZA, ac.cilindro(0.7, 14), lugar.m((0.2, 0.2, top + 0.04), escala=(1, 1, 0.01)))
        self.cordon(lugar, 0, 0, alto + 0.01, 0.2 + alto, R + 0.45, 2.0)
        self.vista.pieza(TELA_MOSTAZA, ac.torno([(0.0, -0.22), (0.2, -0.16), (0.24, -0.04), (0.14, 0.04), (0.0, 0.06)], 10), lugar.m((0, 0, alto - 0.05)))
        self.luces.pieza(LUZ, ac.bola(0.1, 1), lugar.m((0, 0, alto - 0.22)))

    def aldea(self):
        """La plaza con el árbol de musgo, el pozo y los bancos; las casas en corro mirando a la plaza (la del
        explorador, al sureste, se puede recorrer); el taller de telas y las cuerdas con ropa remendada."""
        lat, lon = ALDEA
        plaza = self.p.lugar(lat, lon, rumbo=0, apoyo=6.0, tomar=ac.media)
        self.reservar(ALDEA, 9)
        pt = 0.1
        self.zocalo(plaza, 6.4, pt)
        self.vista.pieza(PIEDRA_CLARA, ac.cilindro(6.2, 28), plaza.m((0, 0, pt + 0.005), escala=(1, 1, 0.02)))
        for r in (5.0, 3.4):
            self.anillo_suelo(plaza, r, 0.07, pt + 0.02, OCRE if r > 4 else CREMA_SOMBRA, 40)
        self.arbol_de_musgo(plaza, pt)
        # El pozo.
        wx, wy = 3.6, 2.4
        self.vista.pieza(PIEDRA, ac.torno([(0.0, 0.0), (0.85, 0.0), (0.9, 0.7), (0.75, 0.75), (0.0, 0.75)], 14), plaza.m((wx, wy, pt)))
        self.col.pieza(ac.cilindro(0.9, 10), plaza.m((wx, wy, pt + 0.375), escala=(1, 1, 0.75)))
        self.vista.pieza("#2A4A6A", ac.cilindro(0.72, 14), plaza.m((wx, wy, pt + 0.7), escala=(1, 1, 0.02)))
        for lado in (-1, 1):
            self.vista.pieza(MADERA, ac.cilindro(0.06, 6), plaza.m((wx + lado * 0.8, wy, pt + 1.2), escala=(1, 1, 1.0)))
        self.vista.pieza(MADERA, ac.cilindro(0.07, 8), plaza.m((wx, wy, pt + 1.6), (0, math.pi / 2, 0), (1, 1, 1.8)))
        self.vista.pieza(TELA_ROJA, ac.cono(1.1, 0.1, 8), plaza.m((wx, wy, pt + 1.95), escala=(1, 1, 0.5)))
        self.vista.pieza(MADERA_OSCURA, ac.torno([(0.0, 0.0), (0.14, 0.0), (0.16, 0.2), (0.0, 0.2)], 8), plaza.m((wx + 0.3, wy, pt + 0.95)))
        for k in range(4):
            b = math.pi / 4 + k * math.pi / 2
            self.banco(plaza, math.cos(b) * 5.6, math.sin(b) * 5.6, pt, b + math.pi / 2)
        for k in range(6):
            b = 2 * math.pi * k / 6
            if k % 2 == 0:
                self.farol(plaza, math.cos(b) * 6.6, math.sin(b) * 6.6, pt)
            else:
                self.farol_vivo(plaza, math.cos(b) * 6.6, math.sin(b) * 6.6, pt)
        # Las casas.
        # Siete casas, la del explorador al sureste y el taller de telas al este; el hueco del suroeste es
        # por donde llega el camino del Instituto.
        angulos = [20, 54, 88, 122, 156, 190, 224]
        for k, ang in enumerate(angulos):
            self.casa_en(ang, 14.5 + (k % 2) * 1.5, 100 + k)
        self.casa_en(-45, 14.5, 7, puerta_abierta=True)
        self.taller_de_telas(plaza)
        # Vecinos que han salido a la plaza a verte despegar.
        self.ool("vecino_pozo", "vecino_1", plaza, 2.5, 1.1, pt, (0.5, -4.0), 21, "INT_pozo")
        self.ool("vecina_arbol", "vecino_2", plaza, -2.4, -1.4, pt, (-4.0, -6.0), 22, "INT_arbol")
        self.ool("cria", "cria_1", plaza, 1.3, -2.5, pt, (-0.5, -7.0), 23, "INT_cria")

    def casa_en(self, angulo, distancia_m, semilla, puerta_abierta=False):
        lat, lon = ALDEA
        a = math.radians(angulo)
        punto = desplazar(lat, lon, math.cos(a) * distancia_m, math.sin(a) * distancia_m)
        hacia = self.p.rumbo_hacia(*punto, direccion(lat, lon))
        if puerta_abierta:
            # La que se recorre se apoya en lo más alto, para que el suelo de dentro no quede bajo la hierba, con
            # una rampa hasta la puerta y un farol vivo al lado.
            lugar = self.p.lugar(*punto, rumbo=hacia, apoyo=3.4, tomar=max)
            self.reservar(punto, 6.5)
            self.casa(lugar, semilla, puerta_abierta)
            self.rampa(lugar, 0, 3.6, 0.2, 0, 1, PIEDRA_CLARA, ancho=1.8)
            self.farol_vivo(lugar, 1.4, 3.8, 0.0)
            return
        lugar = self.p.lugar(*punto, rumbo=hacia, apoyo=3.0, hundir=0.15)
        self.reservar(punto, 6.5)
        self.casa(lugar, semilla, puerta_abierta)

    def arbol_de_musgo(self, plaza, pt):
        """El árbol grande de la plaza: tronco retorcido, copa de bolas de musgo con frutos de luz viva y un banco
        redondo alrededor."""
        self.vista.pieza(MADERA_OSCURA, ac.torno([(1.0, 0.0), (0.7, 0.4), (0.55, 1.5), (0.6, 2.6), (0.75, 3.4), (0.4, 4.2), (0.0, 4.4)], 12),
                         plaza.m((0, 0, pt)))
        self.col.pieza(ac.cilindro(0.6, 8), plaza.m((0, 0, pt + 2.0), escala=(1, 1, 4.0)))
        for k in range(5):
            b = 2 * math.pi * k / 5
            self.vista.pieza(MADERA_OSCURA, ac.caja, plaza.m((math.cos(b) * 0.9, math.sin(b) * 0.9, pt + 3.4 + 0.3 * (k % 2)),
                                                             (0, 0.9, b), (0.22, 0.22, 1.6)))
        copas = [(0.0, 0.0, 5.0, 2.2), (1.7, 0.6, 4.4, 1.6), (-1.5, 1.0, 4.6, 1.7), (0.4, -1.8, 4.3, 1.5), (-0.8, -1.2, 5.3, 1.4),
                 (1.2, -0.9, 5.4, 1.3)]
        for k, (x, y, z, r) in enumerate(copas):
            self.vista.pieza((MUSGO, MUSGO_OSCURO, HOJA, MUSGO_CLARO)[k % 4], ac.bola(r, 2), plaza.m((x, y, pt + z), escala=(1, 1, 0.85)))
            for j in range(5):
                b = 2 * math.pi * j / 5 + k
                c = math.radians(self.rng.uniform(-20, 30))
                self.vivas.pieza(VIVA, ac.bola(0.09, 1), plaza.m((x + math.cos(b) * math.cos(c) * r, y + math.sin(b) * math.cos(c) * r,
                                                                 pt + z + math.sin(c) * r * 0.85)))
        for k in range(12):
            b = 2 * math.pi * (k + 0.5) / 12
            self.solido(MADERA, ac.caja, plaza.m((math.cos(b) * 1.9, math.sin(b) * 1.9, pt + 0.45), (0, 0, b), (0.5, 1.0, 0.08)))
        for k in range(6):
            b = 2 * math.pi * k / 6
            self.vista.pieza(MADERA_OSCURA, ac.caja, plaza.m((math.cos(b) * 1.9, math.sin(b) * 1.9, pt + 0.22), (0, 0, b), (0.3, 0.3, 0.44)))

    def taller_de_telas(self, plaza):
        """El taller de telas al aire libre: un telar con su tela a medias, rollos de colores y cuerdas con ropa
        remendada entre postes."""
        lat, lon = ALDEA
        a = math.radians(-5)
        punto = desplazar(lat, lon, math.cos(a) * 15.0, math.sin(a) * 15.0)
        hacia = self.p.rumbo_hacia(*punto, direccion(lat, lon))
        lugar = self.p.lugar(*punto, rumbo=hacia, apoyo=3.5, tomar=ac.media)
        self.reservar(punto, 6)
        top = 0.15
        self.solido(MADERA_CLARA, ac.caja, lugar.m((0, 0, top - 0.3), escala=(6.0, 4.0, 0.6)))
        for x in (-2.8, 2.8):
            for y in (-1.8, 1.8):
                self.solido(MADERA, ac.cilindro(0.1, 6), lugar.m((x, y, top + 1.4), escala=(1, 1, 2.8)))
        self.rampa(lugar, 0, 2.0, top, 0, 1, MADERA_CLARA, ancho=5.0)
        # Toldo de tiras cosidas de colores.
        for k in range(7):
            self.vista.pieza((TELA_ROJA, CREMA, TELA_MOSTAZA, CREMA, TELA_AZUL, CREMA, TELA_VERDE)[k], ac.caja,
                             lugar.m((0, -1.8 + k * 0.6, top + 2.85 + 0.12 * math.sin(k * 1.3)), (0.1 * math.sin(k), 0, 0), (6.2, 0.62, 0.05)))
        # El telar.
        tx, ty = -1.0, 0.6
        for lado in (-1, 1):
            self.solido(MADERA_OSCURA, ac.caja, lugar.m((tx + lado * 0.8, ty, top + 0.8), escala=(0.1, 0.8, 1.6)))
        for z in (0.5, 1.5):
            self.vista.pieza(MADERA, ac.cilindro(0.06, 8), lugar.m((tx, ty, top + z), (0, math.pi / 2, 0), (1, 1, 1.7)))
        self.vista.pieza(TELA_ROJA, ac.caja, lugar.m((tx, ty + 0.05, top + 0.85), (0.35, 0, 0), (1.4, 0.02, 0.75)))
        for k in range(9):
            self.vista.pieza(TELA_MOSTAZA, ac.caja, lugar.m((tx - 0.65 + k * 0.16, ty - 0.05, top + 1.25), (0.35, 0, 0), (0.02, 0.01, 0.55)))
        # La tejedora, detrás del telar, de cara a la plaza.
        self.ool("tejedora", "vecino_3", lugar, tx, ty - 0.85, top, (tx, 6.0), 24, "INT_tejedora")
        # Rollos de tela.
        for k, col in enumerate((TELA_AZUL, TELA_ROSA, OCRE, TELA_VERDE)):
            self.vista.pieza(col, ac.cilindro(0.2, 10), lugar.m((1.6, -1.0 + k * 0.45, top + 0.22), (math.pi / 2, 0, 0.1 * k), (1, 1, 1.2)))
        # Cuerda con ropa tendida, hacia fuera.
        p0, p1 = (3.0, -1.2), (6.5, -2.4)
        for px, py in (p0, p1):
            self.solido(MADERA, ac.cilindro(0.07, 6), lugar.m((px, py, top + 1.0), escala=(1, 1, 2.0)))
        self.vista.pieza(TINTA, ac.caja, ac.caja_entre(lugar.base @ Vector((p0[0], p0[1], top + 1.85)), lugar.base @ Vector((p1[0], p1[1], top + 1.85)), 0.015, 0.015))
        for k in range(5):
            t = (k + 0.5) / 5
            px, py = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t
            col = (TELA_ROJA, TELA_AZUL, TELA_MOSTAZA, TELA_ROSA, TELA_VERDE)[k]
            rot = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
            self.vista.pieza(col, ac.caja, lugar.m((px, py, top + 1.5), (0, 0, rot), (0.5, 0.02, 0.6)))
            self.vista.pieza(CREMA, ac.caja, lugar.m((px + 0.05, py, top + 1.45), (0, 0, rot), (0.14, 0.025, 0.14)))

    def embarcadero(self):
        """Un muelle de tablas en la costa del este, con dos barcas redondas y un farol al final."""
        lat, lon = EMBARCADERO
        lugar = self.p.lugar(lat, lon, rumbo=90, apoyo=1.0)
        self.reservar(EMBARCADERO, 6)
        base = self.p.suelo(lat, lon).length
        mar = 120 * (1 + (0.42 * 2 - 1) * 0.05)
        top = (mar + 0.9) - base
        largo = 11.0
        self.rampa(lugar, 0, -0.25, top + 0.05, 0, -1, MADERA, ancho=2.0)
        for k in range(int(largo / 0.5)):
            y = k * 0.5
            self.solido((MADERA, MADERA_CLARA)[k % 2], ac.caja, lugar.m((0, y, top), escala=(2.0, 0.45, 0.1)))
        for k in range(5):
            y = k * 2.6
            for lado in (-1, 1):
                self.solido(MADERA_OSCURA, ac.cilindro(0.1, 6), lugar.m((lado * 0.95, y, top - 1.2), escala=(1, 1, 2.6)))
        for lado, col in ((-1, TELA_AZUL), (1, TELA_ROJA)):
            bx, by = lado * 2.4, 6.0 + lado
            self.vista.pieza(MADERA, ac.torno([(0.0, -0.35), (0.8, -0.25), (1.0, 0.1), (1.05, 0.2), (0.0, 0.2)], 12),
                             lugar.m((bx, by, top - 0.55), escala=(1.0, 1.5, 1.0)))
            self.vista.pieza(col, ac.toro(1.0, 0.07, 16, 4), lugar.m((bx, by, top - 0.36), (math.pi / 2, 0, 0), (1, 1, 1.5)))
            self.vista.pieza(MADERA_CLARA, ac.caja, lugar.m((bx, by, top - 0.45), escala=(1.6, 0.25, 0.06)))
        self.farol(lugar, 0.8, largo - 0.4, top + 0.05)
        # El pescador, al final del muelle, mirando a quien llega.
        self.ool("pescador", "vecino_4", lugar, -0.3, largo - 1.6, top + 0.05, (-0.3, 0.0), 25, "INT_pescador")

    # ---- Caminos y vegetación ------------------------------------------------------------------

    def camino(self, puntos, cada=1.15, faroles=9.0):
        """Losas planas a lo largo de una línea de puntos (lat, lon), con faroles cálidos y vivos alternos."""
        recorrido = 0.0
        ultimo_farol = -faroles / 2
        n_farol = 0
        for (la0, lo0), (la1, lo1) in zip(puntos[:-1], puntos[1:]):
            tramo = distancia((la0, lo0), (la1, lo1))
            pasos = max(1, int(tramo / cada))
            for k in range(pasos):
                t = k / pasos
                la, lo = la0 + (la1 - la0) * t, lo0 + (lo1 - lo0) * t
                lugar = self.p.lugar(la, lo, rumbo=self.rng.uniform(0, 360), apoyo=0.45, tomar=ac.media)
                r = self.rng.uniform(0.42, 0.55)
                self.solido(self.rng.choice((PIEDRA_CLARA, PIEDRA, CREMA_SOMBRA)), ac.cilindro(r, 7),
                            lugar.m((self.rng.uniform(-0.1, 0.1), 0, -0.05), escala=(1.0, self.rng.uniform(0.75, 1.0), 0.22)))
                self.ocupado.append((la, lo, 1.4))
                if recorrido - ultimo_farol >= faroles:
                    ultimo_farol = recorrido
                    rumbo = self.p.rumbo_hacia(la, lo, direccion(la1, lo1))
                    lado = self.p.lugar(la, lo, rumbo=rumbo, apoyo=0.3, tomar=ac.media)
                    if n_farol % 2 == 0:
                        self.farol(lado, 1.3, 0, -0.05)
                    else:
                        self.farol_vivo(lado, 1.2, 0, -0.05)
                    n_farol += 1
                recorrido += tramo / pasos

    def tierra(self, punto):
        """Metros sobre el mar (negativo: agua)."""
        mar = 120 * (1 + (0.42 * 2 - 1) * 0.05)
        return self.p.suelo(*punto).length - mar

    def arbol(self, punto, s):
        lugar = self.p.lugar(*punto, rumbo=self.rng.uniform(0, 360), apoyo=0.5, hundir=0.25)
        alto = 3.2 * s
        self.vista.pieza(MADERA_OSCURA, ac.torno([(0.35 * s, 0.0), (0.27 * s, alto * 0.35), (0.2 * s, alto * 0.75), (0.13 * s, alto)], 7),
                         lugar.m((0, 0, 0)))
        self.col.pieza(ac.cilindro(0.28 * s, 6), lugar.m((0, 0, alto / 2), escala=(1, 1, alto)))
        colores = self.rng.choice(((MUSGO, MUSGO_OSCURO), (HOJA, MUSGO_CLARO), (MUSGO_OSCURO, HOJA), ("#7AA05A", MUSGO)))
        brilla = self.rng.random() < 0.35
        for k in range(self.rng.randint(3, 5)):
            b = self.rng.uniform(0, 2 * math.pi)
            d = self.rng.uniform(0.2, 0.9) * s
            r = self.rng.uniform(0.9, 1.4) * s
            z = alto + self.rng.uniform(-0.2, 0.9) * s
            self.vista.pieza(colores[k % 2], ac.bola(r, 2), lugar.m((math.cos(b) * d, math.sin(b) * d, z), escala=(1, 1, 0.82)))
            if brilla:
                for j in range(3):
                    c = self.rng.uniform(0, 2 * math.pi)
                    self.vivas.pieza(VIVA, ac.bola(0.07 * s, 1),
                                     lugar.m((math.cos(b) * d + math.cos(c) * r * 0.95, math.sin(b) * d + math.sin(c) * r * 0.95, z - r * 0.2)))

    def mata(self, punto):
        lugar = self.p.lugar(*punto, rumbo=self.rng.uniform(0, 360), apoyo=0.3, hundir=0.15)
        color = self.rng.choice((MUSGO, HOJA, MUSGO_OSCURO, "#7AA05A"))
        for k in range(self.rng.randint(2, 3)):
            r = self.rng.uniform(0.35, 0.7)
            self.vista.pieza(color, ac.bola(r, 1), lugar.m((self.rng.uniform(-0.4, 0.4), self.rng.uniform(-0.4, 0.4), r * 0.5), escala=(1, 1, 0.75)))
        if self.rng.random() < 0.4:
            self.vista.pieza(self.rng.choice(FLORES), ac.bola(0.07, 1), lugar.m((0.2, 0.1, 0.8)))

    def musgo(self, punto):
        lugar = self.p.lugar(*punto, rumbo=self.rng.uniform(0, 360), apoyo=0.4, hundir=0.1)
        r = self.rng.uniform(0.5, 1.1)
        self.vista.pieza(self.rng.choice((MUSGO_CLARO, MUSGO, "#88B058")), ac.bola(r, 2), lugar.m((0, 0, 0), escala=(1, 0.8, 0.35)))
        for k in range(self.rng.randint(1, 4)):
            b = self.rng.uniform(0, 2 * math.pi)
            self.vivas.pieza(VIVA, ac.bola(0.035, 1), lugar.m((math.cos(b) * r * 0.5, math.sin(b) * r * 0.4, r * 0.3)))

    def roca(self, punto):
        lugar = self.p.lugar(*punto, rumbo=self.rng.uniform(0, 360), apoyo=0.4, hundir=0.2)
        r = self.rng.uniform(0.3, 0.9)
        self.solido(self.rng.choice((PIEDRA, PIEDRA_OSCURA, PIEDRA_CLARA)), ac.bola(r, 1),
                    lugar.m((0, 0, r * 0.3), (self.rng.uniform(0, 1), 0, 0), (1.0, self.rng.uniform(0.6, 1.0), self.rng.uniform(0.5, 0.8))))

    def flor(self, punto):
        lugar = self.p.lugar(*punto, rumbo=self.rng.uniform(0, 360))
        alto = self.rng.uniform(0.25, 0.5)
        self.vista.pieza(HOJA, ac.cilindro(0.015, 4), lugar.m((0, 0, alto / 2), escala=(1, 1, alto)))
        self.vista.pieza(self.rng.choice(FLORES), ac.bola(self.rng.uniform(0.05, 0.08), 1), lugar.m((0, 0, alto)))

    def vegetacion(self):
        """Árboles, matas, musgo, rocas y flores en la tierra de alrededor (no en el mar, ni en caminos ni casas)."""
        cuantos = (("arbol", 55), ("mata", 110), ("musgo", 70), ("roca", 40), ("flor", 220))
        for tipo, n in cuantos:
            puestos, intentos = 0, 0
            while puestos < n and intentos < n * 40:
                intentos += 1
                punto = (self.rng.uniform(26, 80), self.rng.uniform(-40, 34))
                altura = self.tierra(punto)
                if altura < 0.35:
                    continue
                margen = {"arbol": 2.5, "mata": 0.8, "musgo": 0.8, "roca": 0.6, "flor": 0.2}[tipo]
                if not self.libre(punto, margen):
                    continue
                if tipo == "arbol":
                    self.arbol(punto, self.rng.uniform(0.8, 1.35))
                    self.reservar(punto, 1.6)
                elif tipo == "mata":
                    self.mata(punto)
                    self.reservar(punto, 0.6)
                elif tipo == "musgo":
                    self.musgo(punto)
                elif tipo == "roca":
                    self.roca(punto)
                    self.reservar(punto, 0.7)
                else:
                    self.flor(punto)
                puestos += 1

    # ---- Todo ----------------------------------------------------------------------------------

    def lugares(self):
        ac.borrar(["hogar_FragmentosVitrinas"])
        self.instituto()
        # En coordenadas del mundo: su origen es el del planeta.
        ac.objeto_suelto(self.p, "hogar_FragmentosVitrinas", self.vitrinas_llenas,
                         bpy.data.materials.get(f"M_Paleta_{MUNDO}"), ac.matriz())
        self.hangar()
        self.aldea()
        self.embarcadero()
        self.camino(CAMINO_ALDEA)
        self.camino(CAMINO_HANGAR, faroles=99)
        self.camino(CAMINO_EMBARCADERO)
        self.vegetacion()


Hogar().ejecutar()

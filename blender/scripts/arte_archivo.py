# Viste el Archivo (CONTEXTO_PLANETAS.md §4): un cañón-biblioteca ecuatorial en un mundo denso y silencioso.
# Torres de estanterías contra las paredes, una rampa desde el borde, puentes que lo cruzan, la Gran Nave de
# lectura, el Índice con su hueco censurado, la Sala de Relojes, el escritorio del archivista con las cartas,
# la bóveda de la Ranura (el haz de la Brasa solo aparece durante el evento `ranura_luz`, 4:00–5:30) y el
# Fondo del Cañón, con sus registros sellados detrás de una reja.
#
# Gramática de los Ausentes (🟡): anillos y estratos; aquí en azul acero, gris perla y oro apagado.
# Uso: blender -b blender/archivo.blend --python-exit-code 1 --python blender/scripts/arte_archivo.py
import json
import math
import os
import sys

import bpy
from mathutils import Vector

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "archivo"
SISTEMA = os.path.join(os.path.dirname(os.path.dirname(SCRIPTS)), "web", "src", "data", "sistema.json")

ACERO = "#4A6680"
ACERO_OSCURO = "#33475C"
PERLA = "#C8CCD0"
MARFIL = "#EEE6D2"
ORO = "#A88A4A"
SOMBRA = "#22303E"
PIEDRA = "#8A8F98"
TABLILLA = "#B8A884"
PAPEL = "#EDE4CC"
LUZ = "#FFD9A0"

PARED = 5.6      # latitud (grados) de las estanterías: aún en el suelo plano, junto a la pared
BORDE = 9.6      # latitud del borde de arriba


def brasa_en_archivo():
    """Dirección de la Brasa en el marco del Archivo (rotación bloqueada), en ejes de Blender."""
    with open(SISTEMA, encoding="utf-8") as f:
        datos = json.load(f)
    archivo = next(c for c in datos["cuerpos"] if c["mundo"] == MUNDO)
    c = float(archivo.get("faseRotacion", 0))
    return Vector((-math.cos(c), math.sin(c), 0.0))


class Archivo(ac.Vestido):
    def __init__(self):
        # Luz fría de biblioteca: dentro del cañón la Brasa casi no entra.
        super().__init__(MUNDO, LUZ, SCRIPTS, ambiente=(1.8, "#8FA4C4"))
        self.p = self.planeta

    def alto_suelo(self, lat, lon):
        return self.p.suelo(lat, lon).length

    def punto(self, lat, lon, alto):
        """Punto a `alto` metros sobre el terreno."""
        d = ac.direccion(lat, lon)
        return d * (self.alto_suelo(lat, lon) + alto)

    def candil(self, lat, lon):
        lugar = self.p.lugar(lat, lon)
        self.solido(ACERO_OSCURO, ac.cilindro(0.06, 6), lugar.m((0, 0, 0.8), escala=(1, 1, 1.6)))
        self.vista.pieza(ORO, ac.toro(0.16, 0.03, 8, 4), lugar.m((0, 0, 1.72)))
        self.luces.pieza(LUZ, ac.bola(0.11, 1), lugar.m((0, 0, 1.72)))

    # ---- El cañón -----------------------------------------------------------------------------

    def estanterias(self):
        """Torres de estanterías talladas contra las dos paredes, de un extremo de la biblioteca al otro."""
        for lon in range(-81, 90, 9):
            if 92 <= abs(lon):
                continue
            for lado in (-1, 1):
                lugar = self.p.lugar(lado * PARED, lon, rumbo=0 if lado < 0 else 180, hundir=0.2)
                self.solido(PERLA, ac.caja, lugar.m((0, -0.3, 4.5), escala=(2.6, 0.7, 9.0)))
                # Cada balda es una sola pieza: el lomo de las tablillas (oro una de cada tres).
                for k in range(5):
                    z = 1.3 + k * 1.7
                    self.vista.pieza(TABLILLA if (lon + k) % 3 else ORO, ac.caja,
                                     lugar.m((0, 0.08, z), escala=(2.2, 0.06, 1.0)))

    def rampa(self):
        """Del borde norte al suelo, pegada a la pared; con barandilla del lado del vacío."""
        lat = 8.0
        arriba = self.punto(BORDE + 0.4, -22, 0.15)
        arriba = ac.direccion(lat, -22) * arriba.length
        abajo = self.punto(2.5, 4, 0.15)
        abajo = ac.direccion(lat - 3.0, 4) * abajo.length
        self.solido(PIEDRA, ac.caja, ac.caja_entre(arriba, abajo, 3.2, 0.4))
        for k in range(9):
            f = k / 8
            p = arriba.lerp(abajo, f)
            lado = ac.direccion(lat - 3.0 * f - 1.3, -22 + 26 * f)
            poste = lado * p.length
            self.vista.pieza(ACERO_OSCURO, ac.caja, ac.caja_entre(poste, poste + p.normalized() * 1.0, 0.08, 0.08))
        rellano = self.p.lugar(BORDE + 1.4, -24, apoyo=2, tomar=ac.media)
        self.solido(PIEDRA, ac.caja, rellano.m((0, 0, -0.3), escala=(4, 4, 0.8)))

    def puentes(self):
        for lon in (-48, 27, 70):
            norte = self.punto(BORDE + 0.6, lon, 0.1)
            sur = self.punto(-BORDE - 0.6, lon, 0.1)
            self.solido(PIEDRA, ac.caja, ac.caja_entre(norte, sur, 2.6, 0.45))
            for x in (-1.25, 1.25):
                lado = Vector((0, 0, 0))
                medio = (norte + sur) / 2
                eje = (sur - norte).normalized().cross(medio.normalized()).normalized() * x
                lado = eje + medio.normalized() * 0.55
                self.vista.pieza(ACERO, ac.caja, ac.caja_entre(norte + lado, sur + lado, 0.08, 0.08))

    def enlosado(self):
        """Losas claras en el suelo de la biblioteca (de la rampa a las cartas); el Fondo queda oscuro."""
        for lon in range(-24, 53, 4):
            lugar = self.p.lugar(0, lon + 2, rumbo=90, apoyo=3.0, tomar=ac.media)
            self.vista.pieza(PERLA if (lon // 4) % 2 else MARFIL, ac.caja, lugar.m((0, 0, 0.02), escala=(7.0, 3.95, 0.08)))

    def arcos(self):
        """Dos grandes anillos de pie que marcan la entrada de la Gran Nave."""
        for lon in (-14, 9):
            lugar = self.p.lugar(0, lon, rumbo=90)
            self.solido(PERLA, ac.toro(6.2, 0.45, 24, 5), lugar.m((0, 0, 5.4)), ac.toro(6.2, 0.45, 16, 4))
            self.vista.pieza(ORO, ac.toro(5.6, 0.12, 24, 4), lugar.m((0, 0, 5.4)))
            for x in (-5.4, 5.4):
                self.solido(ACERO_OSCURO, ac.caja, lugar.m((x, 0, 0.4), escala=(1.4, 1.4, 0.8)))

    # ---- Lugares ------------------------------------------------------------------------------

    def gran_nave(self):
        for lon in (-8, -3, 2):
            for lat in (-2.2, 2.2):
                lugar = self.p.lugar(lat, lon, rumbo=90)
                self.solido(ACERO_OSCURO, ac.caja, lugar.m((0, 0, 0.75), escala=(1.0, 2.6, 0.1)))
                for y in (-1.0, 1.0):
                    self.solido(ACERO, ac.caja, lugar.m((0, y, 0.37), escala=(0.8, 0.12, 0.75)))
                for y in (-0.6, 0.2, 0.9):
                    self.vista.pieza(TABLILLA, ac.caja, lugar.m((0.1, y, 0.82), (0, 0, 0.2 * y), (0.35, 0.25, 0.03)))
                for x in (-0.85, 0.85):
                    self.solido(PIEDRA, ac.caja, lugar.m((x, 0, 0.25), escala=(0.35, 2.4, 0.5)))
        atril = self.p.lugar(0, -11, rumbo=90)
        self.solido(ACERO_OSCURO, ac.cilindro(0.15, 8), atril.m((0, 0, 0.55), escala=(1, 1, 1.1)))
        self.vista.pieza(ACERO, ac.caja, atril.m((0, 0, 1.15), (-0.45, 0, 0), (0.8, 0.55, 0.06)))
        self.vista.pieza(PAPEL, ac.caja, atril.m((0, -0.02, 1.2), (-0.45, 0, 0), (0.6, 0.4, 0.04)))
        self.marca("INT_informe_oficial", atril, (0, -0.4, 1.3))

    def indice(self):
        """Muro de registros: una rejilla de placas con tres columnas vacías en medio."""
        lugar = self.p.lugar(PARED - 0.3, 20, rumbo=180, hundir=0.2)
        self.solido(ACERO_OSCURO, ac.caja, lugar.m((0, -0.4, 3.6), escala=(9.0, 0.6, 7.2)))
        for col in range(11):
            vacia = 4 <= col <= 6
            for fila in range(7):
                x = -4.0 + col * 0.8
                z = 0.8 + fila * 0.9
                if vacia:
                    self.vista.pieza(SOMBRA, ac.caja, lugar.m((x, -0.08, z), escala=(0.66, 0.04, 0.74)))
                else:
                    self.vista.pieza(MARFIL if (col + fila) % 4 else ORO, ac.caja,
                                     lugar.m((x, -0.06, z), escala=(0.62, 0.06, 0.7)))
        self.vista.pieza(ORO, ac.caja, lugar.m((0, -0.05, 7.0), escala=(8.6, 0.06, 0.14)))
        self.marca("INT_indice", lugar, (0, 1.2, 1.6))

    def sala_relojes(self):
        """Media corona de muro cubierta de relojes, cada uno con su etiqueta (uno no tiene)."""
        centro = self.p.lugar(-1.0, -32, rumbo=180)
        for k in range(9):
            a = math.radians(-80 + k * 20)
            x, y = math.sin(a) * 6.0, math.cos(a) * 6.0
            self.solido(PERLA, ac.caja, centro.m((x, y, 2.2), (0, 0, -a), (2.2, 0.5, 4.4)))
            for fila in range(2):
                z = 1.5 + fila * 1.3
                hacia = Vector((x, y, 0)).normalized() * -0.28
                pos = (x + hacia.x, y + hacia.y, z)
                ritmo = (k * 3 + fila) * 0.7
                self.vista.pieza(ACERO_OSCURO, ac.cilindro(0.34, 8), centro.m(pos, (math.pi / 2, 0, -a), (1, 1, 0.06)))
                self.vista.pieza(MARFIL, ac.cilindro(0.28, 8), centro.m((pos[0] + hacia.x * 0.15, pos[1] + hacia.y * 0.15, z), (math.pi / 2, 0, -a), (1, 1, 0.04)))
                self.vista.pieza(SOMBRA, ac.caja, centro.m((pos[0] + hacia.x * 0.25, pos[1] + hacia.y * 0.25, z + 0.08 * math.cos(ritmo)), (0, ritmo, -a), (0.03, 0.02, 0.2)))
                sin_nombre = k == 6 and fila == 0
                self.vista.pieza(SOMBRA if sin_nombre else ORO, ac.caja,
                                 centro.m((pos[0] + hacia.x * 0.15, pos[1] + hacia.y * 0.15, z - 0.46), (0, 0, -a), (0.4, 0.03, 0.1)))
        # Reloj grande en el centro, sobre un pedestal.
        self.solido(PIEDRA, ac.cilindro(0.5, 10), centro.m((0, 0, 0.6), escala=(1, 1, 1.2)))
        # De cara a quien entra (el toro mira a lo largo de Y): esfera, aro y una sola aguja.
        self.vista.pieza(MARFIL, ac.cilindro(0.82, 12), centro.m((0, 0, 2.1), (math.pi / 2, 0, 0), (1, 1, 0.06)))
        self.vista.pieza(ORO, ac.toro(0.9, 0.08, 20, 4), centro.m((0, 0, 2.1)))
        self.vista.pieza(SOMBRA, ac.caja, centro.m((0.15, 0.06, 2.3), (0, 0.6, 0), (0.05, 0.03, 0.55)))
        self.marca("INT_sala_relojes", centro, (0, 1.5, 1.6))

    def escritorio(self):
        lugar = self.p.lugar(-3.4, 38, rumbo=0)
        self.solido(ACERO_OSCURO, ac.caja, lugar.m((0, 0, 0.75), escala=(1.6, 0.8, 0.08)))
        for x in (-0.7, 0.7):
            self.solido(ACERO_OSCURO, ac.caja, lugar.m((x, 0, 0.37), escala=(0.08, 0.7, 0.75)))
        self.solido(ACERO, ac.caja, lugar.m((0, -0.75, 0.45), escala=(0.5, 0.5, 0.08)))
        self.vista.pieza(ACERO, ac.caja, lugar.m((0, -1.0, 0.8), escala=(0.5, 0.08, 0.7)))
        for k in range(4):
            self.vista.pieza(PAPEL, ac.caja, lugar.m((-0.4 + 0.25 * k, 0.05, 0.8 + 0.01 * k), (0, 0, 0.3 * k), (0.3, 0.22, 0.01)))
        self.vista.pieza(TABLILLA, ac.caja, lugar.m((0.55, 0.2, 0.92), escala=(0.3, 0.22, 0.25)))
        self.vista.pieza(ACERO_OSCURO, ac.cilindro(0.03, 6), lugar.m((-0.6, 0.25, 1.0), escala=(1, 1, 0.5)))
        self.luces.pieza(LUZ, ac.cono(0.14, 0.05, 8), lugar.m((-0.6, 0.25, 1.28), escala=(1, 1, 0.12)))
        self.marca("INT_escritorio", lugar, (0, -0.5, 1.2))

    def cartas(self):
        """Mesa con un casillero de cartas: las que contestan antes de haber sido enviadas."""
        lugar = self.p.lugar(-3.4, 44, rumbo=0)
        self.solido(ACERO_OSCURO, ac.caja, lugar.m((0, 0, 0.75), escala=(1.4, 0.7, 0.08)))
        for x in (-0.6, 0.6):
            self.solido(ACERO_OSCURO, ac.caja, lugar.m((x, 0, 0.37), escala=(0.08, 0.6, 0.75)))
        self.solido(PERLA, ac.caja, lugar.m((0, 0.25, 1.25), escala=(1.3, 0.3, 0.9)))
        for col in range(5):
            for fila in range(3):
                x = -0.5 + col * 0.25
                z = 0.95 + fila * 0.28
                self.vista.pieza(SOMBRA, ac.caja, lugar.m((x, 0.1, z), escala=(0.2, 0.04, 0.22)))
                if (col + fila) % 2 == 0:
                    self.vista.pieza(PAPEL, ac.caja, lugar.m((x, 0.08, z - 0.04), escala=(0.16, 0.03, 0.12)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((-0.2, -0.1, 0.8), (0, 0, 0.4), (0.24, 0.16, 0.01)))
        self.marca("INT_cartas", lugar, (0, -0.6, 1.2))

    def ranura(self):
        """Bóveda sobre el cañón con una rendija: a las 4:00 la Brasa cae por ella sobre una tablilla."""
        tablilla = self.p.lugar(0, 100, rumbo=90)
        self.solido(PIEDRA, ac.cilindro(0.4, 8), tablilla.m((0, 0, 0.5), escala=(1, 1, 1.0)))
        self.vista.pieza(TABLILLA, ac.caja, tablilla.m((0, 0, 1.06), (-0.3, 0, 0), (0.6, 0.45, 0.05)))
        foco = tablilla.base @ Vector((0, 0, 1.1))
        brasa = brasa_en_archivo()
        techo = self.alto_suelo(BORDE + 1, 100) + 0.3
        # Distancia por el haz hasta la altura de la bóveda: |foco + t·brasa| = techo.
        b = foco.dot(brasa)
        t = -b + math.sqrt(b * b - foco.length_squared + techo * techo)
        rendija = foco + brasa * t
        lon_rendija = math.degrees(math.atan2(rendija.y, rendija.x))
        for lon in range(90, 112, 2):
            if abs(lon + 1 - lon_rendija) < 1.4:
                continue  # la rendija
            norte = ac.direccion(BORDE + 0.5, lon + 1) * techo
            sur = ac.direccion(-BORDE - 0.5, lon + 1) * techo
            self.solido(ACERO_OSCURO, ac.caja, ac.caja_entre(norte, sur, 2.2, 0.5))
        haz = ac.Malla()
        haz.pieza(LUZ, ac.caja, ac.caja_entre(rendija, foco, 0.35, 0.12))
        haz.pieza(LUZ, ac.cilindro(0.45, 12), tablilla.m((0, 0, 1.1), escala=(1, 1, 0.01)))
        mat = ac.material_luces("M_Haz_archivo", LUZ)
        obj, _ = ac.objeto(self.p, "EVT_ranura_luz_Haz", haz, mat)
        obj["event"] = "ranura_luz"
        self.marca("INT_ranura_luz", tablilla, (0, -0.5, 1.25))

    def fondo(self):
        """La zona oscura: una reja con paso y, detrás, cofres sellados de registros cerrados."""
        reja = self.p.lugar(0, -90, rumbo=90)
        for k in range(-7, 8):
            if abs(k) <= 1:
                continue  # paso estrecho
            self.solido(ACERO_OSCURO, ac.cilindro(0.06, 6), reja.m((k * 0.65, 0, 2.0), escala=(1, 1, 4.0)))
        self.vista.pieza(ACERO_OSCURO, ac.caja, reja.m((0, 0, 4.0), escala=(9.4, 0.12, 0.12)))
        for lat, lon in ((1.5, -97), (-1.5, -99), (0.5, -103), (-2.0, -104)):
            cofre = self.p.lugar(lat, lon, rumbo=90 + lon)
            self.solido(SOMBRA, ac.caja, cofre.m((0, 0, 0.4), escala=(1.2, 0.8, 0.8)))
            self.vista.pieza(ORO, ac.cilindro(0.1, 8), cofre.m((0, -0.41, 0.5), (math.pi / 2, 0, 0), (1, 1, 0.02)))
        principal = self.p.lugar(0, -100, rumbo=90)
        self.solido(SOMBRA, ac.caja, principal.m((0, 0, 0.5), escala=(1.4, 1.0, 1.0)))
        self.vista.pieza(ORO, ac.caja, principal.m((0, -0.51, 0.6), escala=(0.5, 0.02, 0.3)))
        self.marca("INT_fondo_canon", principal, (0, -1.0, 1.2))

    def lugares(self):
        self.estanterias()
        self.rampa()
        self.puentes()
        self.arcos()
        self.gran_nave()
        self.indice()
        self.sala_relojes()
        self.escritorio()
        self.cartas()
        self.ranura()
        self.fondo()
        for lon in range(-60, 91, 20):
            self.candil(-4.0 if lon % 40 else 4.0, lon)
        self.enlosado()
        borde = self.p.lugar(BORDE + 3.0, -26)
        self.marca("SPAWN_Borde", borde, (0, 0, 1.0))


Archivo().ejecutar()

# Viste Umbral (CONTEXTO_PLANETAS.md §3) sobre su planeta base: La Boca en su meseta con la placa, el Muelle de
# Envíos, la caseta del turno, el Mirador del Ocaso, el Aula y las seis Casas, con farolas ámbar entre ellos.
# Recoloca las marcas INT_/SPAWN_/TRIG_ de blender/marcas/umbral.json sobre los objetos (la placa en su
# pedestal, la carta en el banco…) y las vuelve a poner con marcas.py.
#
# Gramática de los Ausentes (🟡, plan de la Fase 6): anillos y estratos. Arcos y anillos concéntricos, muros en
# capas horizontales y marcas de reloj como ornamento; arenisca clara y metal pizarra; luz ámbar.
#
# Uso: blender -b blender/umbral.blend --python-exit-code 1 --python blender/scripts/arte_umbral.py
#      (deja el .blend guardado; luego `npm run modelos -- umbral` desde web/)
import json
import math
import os
import runpy
import sys

import bpy
from mathutils import Vector

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "umbral"
REPO = os.path.dirname(os.path.dirname(SCRIPTS))
MARCAS = os.path.join(REPO, "blender", "marcas", f"{MUNDO}.json")
SISTEMA = os.path.join(REPO, "web", "src", "data", "sistema.json")

# Paleta de Umbral (ámbar, ocre, arena, violeta oscuro, azul hielo, roca) y de los Ausentes.
ARENISCA = "#D8C49A"
ARENISCA_SOMBRA = "#B8A27A"
ROCA = "#7A6A5E"
OCRE = "#B87A3A"
AMBAR = "#E0A040"
PIZARRA = "#3A3A48"
VIOLETA = "#3A2850"
LOZA = "#E8E0D0"
PAN = "#C88A40"
FRUTA = "#A04030"
PAPEL = "#EDE4CC"
TELA = "#6A4A5A"
LUZ = "#FFC070"


def brasa_en_umbral():
    """Dirección de la Brasa en el marco de Umbral (fija: rotación bloqueada), en ejes de Blender."""
    with open(SISTEMA, encoding="utf-8") as f:
        datos = json.load(f)
    umbral = next(c for c in datos["cuerpos"] if c["mundo"] == MUNDO)
    c = float(umbral.get("faseRotacion", 0))
    # En glTF (Y arriba) la Brasa queda en (−cos c, 0, −sin c); en Blender (Z arriba) es (−cos c, sin c, 0).
    return Vector((-math.cos(c), math.sin(c), 0.0))


class Umbral:
    def __init__(self):
        self.planeta = ac.Planeta(MUNDO)
        self.vista = ac.Malla()
        self.luces = ac.Malla()
        self.col = ac.Colisiones()
        self.marcas = {}

    # Piezas que se ven y además se pisan o chocan.
    def solido(self, color, crear, m, crear_col=None):
        self.vista.pieza(color, crear, m)
        self.col.pieza(crear_col or crear, m)

    def farola(self, lugar, x, y, z=0.0):
        self.solido(PIZARRA, ac.cilindro(0.07, 6), lugar.m((x, y, z + 1.2), escala=(1, 1, 2.4)))
        self.vista.pieza(PIZARRA, ac.cilindro(0.16, 6), lugar.m((x, y, z + 2.42), escala=(1, 1, 0.06)))
        self.luces.pieza(LUZ, ac.bola(0.15, 1), lugar.m((x, y, z + 2.6)))

    def marca(self, nombre, lugar, pos):
        self.marcas[nombre] = lugar.base @ Vector(pos)

    # ---- Lugares -------------------------------------------------------------------------------

    def la_boca(self):
        """Meseta baja con el anillo apagado, su grieta de luz y la placa de inauguración."""
        meseta = self.planeta.lugar(8, 22.5, rumbo=90, apoyo=8.5, tomar=ac.media)
        top = 0.35
        self.solido(ARENISCA_SOMBRA, ac.cilindro(8.5, 14), meseta.m((0, 0, top - 1.4), escala=(1, 1, 2.8)))
        self.vista.pieza(ARENISCA, ac.cilindro(8.1, 14), meseta.m((0, 0, top + 0.02), escala=(1, 1, 0.04)))
        # Escalones de estratos alrededor del anillo.
        for k, r in enumerate((4.6, 3.8)):
            self.solido(ARENISCA_SOMBRA if k == 0 else ARENISCA, ac.cilindro(r, 14),
                        meseta.m((0, 3.6, top + 0.12 + k * 0.24), escala=(1, 1, 0.24)))
        suelo = top + 0.48
        centro = suelo + 3.9
        anillo = (0, 3.6, centro)
        self.solido(ARENISCA, ac.toro(3.6, 0.48, 32, 6), meseta.m(anillo), ac.toro(3.6, 0.5, 16, 4))
        self.vista.pieza(PIZARRA, ac.toro(3.02, 0.17, 32, 5), meseta.m(anillo))
        # Marcas de reloj en la cara del anillo.
        for k in range(12):
            a = 2 * math.pi * k / 12
            largo = 0.55 if k % 3 == 0 else 0.32
            pos = (math.cos(a) * 3.6, 3.6 - 0.42, centro + math.sin(a) * 3.6)
            self.vista.pieza(AMBAR if k % 3 == 0 else PIZARRA, ac.caja,
                             meseta.m(pos, (0, math.pi / 2 - a, 0), (0.12, 0.1, largo)))
        for lado in (-1, 1):
            self.solido(ROCA, ac.caja, meseta.m((lado * 2.4, 3.6, suelo + 0.45), escala=(1.4, 1.6, 0.9)))
        # La grieta de luz, apenas un hilo.
        self.luces.pieza(LUZ, ac.caja, meseta.m((0.15, 3.6, centro), (0, 0.08, 0), (0.07, 0.04, 5.8)))
        # Placa de inauguración, mirando a quien llega.
        self.solido(ROCA, ac.caja, meseta.m((-3.0, 0.4, top + 0.55), escala=(0.7, 0.45, 1.1)))
        self.vista.pieza(PIZARRA, ac.caja, meseta.m((-3.0, 0.15, top + 1.2), (-0.5, 0, 0), (0.9, 0.08, 0.6)))
        self.vista.pieza(AMBAR, ac.caja, meseta.m((-3.0, 0.1, top + 1.22), (-0.5, 0, 0), (0.7, 0.06, 0.04)))
        for x in (-6.5, 6.5):
            self.farola(meseta, x, -2.5, top)
        self.marca("SPAWN_LaBoca", meseta, (0, -4.2, top + 1.0))
        self.marca("INT_boca", meseta, (0, 1.6, suelo + 1.4))
        self.marca("INT_placa_inauguracion", meseta, (-3.0, -0.1, top + 1.25))
        self.marca("TRIG_LaBoca_Destello", meseta, (0, 3.6, centro))

    def muelle(self):
        """Plataforma de carga: cajas, una grúa y el atril con el registro de envíos."""
        lugar = self.planeta.lugar(-5, 40, rumbo=300, apoyo=6, tomar=ac.media)
        top = 0.25
        self.solido(ARENISCA_SOMBRA, ac.caja, lugar.m((0, 0, top - 1.5), escala=(11, 8, 3.0)))
        self.vista.pieza(ARENISCA, ac.caja, lugar.m((0, 0, top + 0.02), escala=(10.6, 7.6, 0.04)))
        cajas = ((2.5, 1.5, 1.2), (3.6, 1.6, 1.0), (2.9, 1.5, 1.0, 1.1), (3.2, 2.9, 1.3), (-1.0, 2.8, 1.1), (4.0, -1.5, 0.9))
        for c in cajas:
            x, y, lado = c[0], c[1], c[2]
            z = top + lado / 2 + (c[3] if len(c) > 3 else 0)
            self.solido(OCRE if (x + y) % 2 < 1 else ROCA, ac.caja, lugar.m((x, y, z), (0, 0, 0.1 * x), (lado, lado, lado)))
            self.vista.pieza(PIZARRA, ac.caja, lugar.m((x, y, z), (0, 0, 0.1 * x), (lado * 1.02, lado * 0.2, lado * 1.02)))
        # Grúa: poste y brazo con el gancho.
        self.solido(PIZARRA, ac.cilindro(0.22, 8), lugar.m((-4.0, 2.6, top + 2.6), escala=(1, 1, 5.2)))
        self.vista.pieza(PIZARRA, ac.caja, lugar.m((-2.4, 2.6, top + 5.1), escala=(3.6, 0.25, 0.25)))
        self.vista.pieza(ROCA, ac.cilindro(0.02, 4), lugar.m((-0.8, 2.6, top + 4.2), escala=(1, 1, 1.8)))
        self.vista.pieza(AMBAR, ac.toro(0.18, 0.04, 8, 4), lugar.m((-0.8, 2.6, top + 3.2)))
        # Atril con el registro de envíos, en el borde que mira a La Boca.
        self.solido(PIZARRA, ac.cilindro(0.1, 6), lugar.m((-3.2, -2.8, top + 0.55), escala=(1, 1, 1.1)))
        self.vista.pieza(ROCA, ac.caja, lugar.m((-3.2, -2.8, top + 1.12), (-0.4, 0, 0), (0.7, 0.5, 0.06)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((-3.2, -2.82, top + 1.17), (-0.4, 0, 0), (0.5, 0.36, 0.05)))
        for x in (-5.0, 5.0):
            self.farola(lugar, x, -3.5, top)
        self.marca("INT_registro_envios", lugar, (-3.2, -3.0, top + 1.25))

    def caseta(self):
        """Caseta del turno: un tambor con mostrador hacia fuera, dos relojes en la pared y el cuaderno."""
        lugar = self.planeta.lugar(3, 60, rumbo=270, apoyo=2.2, hundir=0.2)
        self.solido(ARENISCA, ac.cilindro(1.7, 10), lugar.m((0, 0, 1.3), escala=(1, 1, 3.0)))
        for z in (0.9, 1.9):
            self.vista.pieza(PIZARRA, ac.cilindro(1.74, 10), lugar.m((0, 0, z), escala=(1, 1, 0.1)))
        self.vista.pieza(OCRE, ac.cono(2.1, 0.3, 10), lugar.m((0, 0, 3.15), escala=(1, 1, 0.7)))
        self.solido(ROCA, ac.caja, lugar.m((0, 1.95, 1.0), escala=(1.5, 0.55, 0.08)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((0.15, 2.0, 1.06), (0, 0, 0.2), (0.32, 0.24, 0.04)))
        # Reloj de Umbral y reloj del Archivo, uno junto al otro.
        for x, aguja in ((-0.45, 0.4), (0.45, 1.5)):
            self.vista.pieza(PIZARRA, ac.cilindro(0.34, 12), lugar.m((x, 1.68, 2.15), (math.pi / 2, 0, 0), (1, 1, 0.06)))
            self.vista.pieza(LOZA, ac.cilindro(0.28, 12), lugar.m((x, 1.72, 2.15), (math.pi / 2, 0, 0), (1, 1, 0.04)))
            self.vista.pieza(PIZARRA, ac.caja, lugar.m((x + 0.1 * math.sin(aguja), 1.75, 2.15 + 0.1 * math.cos(aguja)), (0, aguja, 0), (0.04, 0.02, 0.22)))
        self.farola(lugar, 2.4, 1.2)
        self.marca("INT_cuaderno_turno", lugar, (0.1, 2.15, 1.2))

    def mirador(self):
        """Terraza frente a la Brasa, que aquí toca el horizonte: banco de piedra, dos tazas y la carta."""
        lat, lon = 24, 10
        rumbo = self.planeta.rumbo_hacia(lat, lon, brasa_en_umbral())
        lugar = self.planeta.lugar(lat, lon, rumbo=rumbo, apoyo=3.5, tomar=ac.media)
        top = 0.3
        self.solido(ARENISCA_SOMBRA, ac.cilindro(3.6, 12), lugar.m((0, 0, top - 1.2), escala=(1, 1, 2.4)))
        # Pretil bajo en arco, del lado de la Brasa.
        for k in range(-3, 4):
            a = math.radians(k * 18)
            self.solido(ARENISCA, ac.caja, lugar.m((math.sin(a) * 3.3, math.cos(a) * 3.3, top + 0.35), (0, 0, -a), (1.05, 0.3, 0.7)))
        self.solido(ARENISCA, ac.caja, lugar.m((0, 0.3, top + 0.45), escala=(2.2, 0.55, 0.12)))
        for x in (-0.8, 0.8):
            self.solido(ROCA, ac.caja, lugar.m((x, 0.3, top + 0.2), escala=(0.3, 0.45, 0.4)))
        for x in (-0.75, 0.75):
            self.vista.pieza(LOZA, ac.cilindro(0.06, 8), lugar.m((x, 0.3, top + 0.56), escala=(1, 1, 0.1)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((0.05, 0.25, top + 0.52), (0, 0, 0.3), (0.26, 0.18, 0.015)))
        self.farola(lugar, -2.6, -1.6, top)
        self.marca("INT_carta_mirador", lugar, (0.05, 0.1, top + 0.7))

    def aula(self):
        """Sala abierta por delante: bancos en filas y la pared del fondo llena de inscripciones."""
        lugar = self.planeta.lugar(-15, 110, rumbo=200, apoyo=4.5, hundir=0.3)
        alto = 3.2
        self.solido(ARENISCA, ac.caja, lugar.m((0, 2.6, alto / 2), escala=(6.4, 0.4, alto)))
        for lado in (-1, 1):
            self.solido(ARENISCA, ac.caja, lugar.m((lado * 3.0, 0.2, alto / 2), escala=(0.4, 5.2, alto)))
        self.solido(OCRE, ac.caja, lugar.m((0, 0.4, alto + 0.12), escala=(6.8, 5.8, 0.24)))
        for z in (1.0, 2.2):
            self.vista.pieza(ARENISCA_SOMBRA, ac.caja, lugar.m((0, 2.38, z), escala=(6.3, 0.06, 0.12)))
        self.vista.pieza(ARENISCA, ac.caja, lugar.m((0, 0.2, 0.05), escala=(5.8, 4.8, 0.1)))
        for fila in range(3):
            self.solido(ROCA, ac.caja, lugar.m((0, -1.4 + fila * 1.0, 0.25), escala=(3.6, 0.35, 0.4)))
        # Inscripciones: números y horas, en filas de marcas de reloj.
        self.vista.pieza(PIZARRA, ac.caja, lugar.m((0, 2.36, 1.6), escala=(3.6, 0.04, 1.2)))
        for fila in range(3):
            for k in range(9):
                largo = 0.28 if (k + fila) % 3 == 0 else 0.16
                self.vista.pieza(AMBAR if k % 4 == 0 else LOZA, ac.caja,
                                 lugar.m((-1.5 + k * 0.38, 2.33, 1.95 - fila * 0.35), (0, 0.4 * (k % 2), 0), (0.05, 0.02, largo)))
        self.farola(lugar, -3.8, -2.6)
        self.marca("INT_aula", lugar, (0.2, 1.7, 1.5))

    def casa(self, lugar, aviso=False):
        self.solido(ARENISCA, ac.cilindro(2.2, 10), lugar.m((0, 0, 1.2), escala=(1, 1, 2.8)))
        self.vista.pieza(PIZARRA, ac.cilindro(2.24, 10), lugar.m((0, 0, 1.9), escala=(1, 1, 0.1)))
        self.vista.pieza(OCRE, ac.cono(2.7, 0.2, 10), lugar.m((0, 0, 3.15), escala=(1, 1, 1.1)))
        self.vista.pieza(VIOLETA, ac.caja, lugar.m((0, 2.18, 1.0), escala=(0.95, 0.1, 1.9)))
        self.vista.pieza(ARENISCA_SOMBRA, ac.toro(0.55, 0.08, 10, 4), lugar.m((0, 2.22, 1.9)))
        if aviso:
            self.vista.pieza(PAPEL, ac.caja, lugar.m((0.2, 2.25, 1.35), escala=(0.32, 0.02, 0.42)))
        # La mesa servida, delante de la puerta: platos, tazas, pan y fruta.
        self.solido(ROCA, ac.caja, lugar.m((0, 3.3, 0.72), escala=(1.4, 0.8, 0.08)))
        for x in (-0.5, 0.5):
            self.solido(ROCA, ac.caja, lugar.m((x, 3.3, 0.36), escala=(0.1, 0.6, 0.7)))
        self.vista.pieza(TELA, ac.caja, lugar.m((0, 3.3, 0.77), escala=(1.2, 0.3, 0.01)))
        for x in (-0.45, 0.0, 0.45):
            self.vista.pieza(LOZA, ac.cilindro(0.14, 8), lugar.m((x, 3.1, 0.78), escala=(1, 1, 0.02)))
        self.vista.pieza(PAN, ac.bola(0.1, 1), lugar.m((-0.45, 3.1, 0.84), escala=(1.3, 1, 0.6)))
        self.vista.pieza(FRUTA, ac.bola(0.06, 1), lugar.m((0.45, 3.1, 0.84)))
        self.vista.pieza(LOZA, ac.cilindro(0.05, 6), lugar.m((0.3, 3.5, 0.82), escala=(1, 1, 0.1)))

    def casas(self):
        """Seis casas en corro alrededor de una plaza con un reloj de sol de anillo."""
        lat, lon = 5, 150
        plaza = self.planeta.lugar(lat, lon, apoyo=2.0)
        self.solido(ROCA, ac.cilindro(0.35, 8), plaza.m((0, 0, 0.8), escala=(1, 1, 1.6)))
        self.vista.pieza(PIZARRA, ac.toro(0.6, 0.06, 16, 4), plaza.m((0, 0, 1.9), (0, 0, 0.3)))
        self.vista.pieza(AMBAR, ac.caja, plaza.m((0, 0, 1.9), (0, 0.6, 0), (0.04, 0.04, 1.1)))
        distancia = 9.0
        for k in range(6):
            a = 2 * math.pi * k / 6 + 0.3
            dlat = math.degrees(distancia * math.cos(a) / self.planeta.radio)
            dlon = math.degrees(distancia * math.sin(a) / self.planeta.radio) / math.cos(math.radians(lat))
            hacia = self.planeta.rumbo_hacia(lat + dlat, lon + dlon, ac.direccion(lat, lon))
            lugar = self.planeta.lugar(lat + dlat, lon + dlon, rumbo=hacia, apoyo=2.4, hundir=0.3)
            self.casa(lugar, aviso=(k == 0))
            if k == 0:
                self.marca("INT_casas", lugar, (0.2, 2.6, 1.35))
            if k % 2 == 0:
                self.farola(lugar, 2.3, 2.6)

    # ---- Resultado -----------------------------------------------------------------------------

    def construir(self):
        ac.borrar([f"{MUNDO}_Lugares", f"{MUNDO}_Luces", f"COL_{MUNDO}_Lugares"])
        self.la_boca()
        self.muelle()
        self.caseta()
        self.mirador()
        self.aula()
        self.casas()
        paleta = bpy.data.materials.get(f"M_Paleta_{MUNDO}")
        _, tris = ac.objeto(self.planeta, f"{MUNDO}_Lugares", self.vista, paleta)
        _, tris_luz = ac.objeto(self.planeta, f"{MUNDO}_Luces", self.luces, ac.material_luces(f"M_Luces_{MUNDO}", LUZ))
        ac.colisiones(self.planeta, f"COL_{MUNDO}_Lugares", self.col)
        print(f"{MUNDO}: lugares {tris} triángulos, luces {tris_luz}")

    def escribir_marcas(self):
        """Lleva las marcas a sus objetos: latitud, longitud y altura sobre el terreno."""
        with open(MARCAS, encoding="utf-8") as f:
            datos = json.load(f)
        for marca in datos:
            punto = self.marcas.get(marca["nombre"])
            if punto is None:
                continue
            d = punto.normalized()
            lat = math.degrees(math.asin(max(-1.0, min(1.0, d.z))))
            lon = math.degrees(math.atan2(d.y, d.x))
            suelo = self.planeta.suelo(lat, lon).length
            marca["lat"], marca["lon"] = round(lat, 3), round(lon, 3)
            marca["alto"] = round(punto.length - suelo, 3)
        with open(MARCAS, "w", encoding="utf-8", newline="\n") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
            f.write("\n")


def main():
    umbral = Umbral()
    umbral.construir()
    umbral.escribir_marcas()
    sys.argv = [sys.argv[0], "--", MUNDO]
    runpy.run_path(os.path.join(SCRIPTS, "marcas.py"), run_name="__main__")
    bpy.ops.wm.save_mainfile()
    print("Guardado", bpy.data.filepath)


main()

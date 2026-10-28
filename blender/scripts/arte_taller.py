# Viste el Taller (CONTEXTO_PLANETAS.md §5): un planeta diminuto de talleres donde las máquinas siguen
# trabajando para nadie. La Nave de Montaje (cinta con anillos a medio hacer y brazos que no paran), la maqueta
# del núcleo que solo se pone en marcha con la secuencia de las 7:00, la Cuna vacía del Contrapeso con su nota,
# el banco del manual, la Pista de Pruebas (un anillo elevado alrededor del casquete norte), los Dormitorios con
# los diarios de los gemelos y la Cabina de Control.
#
# Gramática de los Ausentes (🟡): anillos y estratos; aquí en blanco, naranja, cian y gris acero.
# Piezas que giran: objetos ANIM_ (propiedad `spin`, rad/s; con `event`, solo durante ese evento).
# Uso: blender -b blender/taller.blend --python-exit-code 1 --python blender/scripts/arte_taller.py
import math
import os
import sys

import bpy
from mathutils import Vector

SCRIPTS = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else r"D:\Proyectos\Juego\blender\scripts"
sys.path.insert(0, SCRIPTS)
import arte_comun as ac  # noqa: E402

MUNDO = "taller"
SECUENCIA = "secuencia_fabrica"

BLANCO = "#EEEEEA"
BLANCO_SOMBRA = "#C8CCCC"
NARANJA = "#E07830"
CIAN = "#40C0D0"
ACERO = "#6A7480"
OSCURO = "#2A2E34"
PAPEL = "#F2EEE2"
MANTA = "#3A8A9A"
LUZ = "#E8F6FF"


class Taller(ac.Vestido):
    def __init__(self):
        # Luz blanca y algo fría: un taller limpio bajo días de tres minutos.
        super().__init__(MUNDO, LUZ, SCRIPTS, ambiente=(1.15, "#A0AAB4"))
        self.p = self.planeta
        self.paleta = bpy.data.materials.get(f"M_Paleta_{MUNDO}")
        # Las pantallas brillan en cian (el material emisivo no toma el color de cada cara).
        self.pantallas = ac.Malla()

    def foco(self, lugar, x, y, z=0.0, alto=2.6):
        self.solido(OSCURO, ac.cilindro(0.07, 6), lugar.m((x, y, z + alto / 2), escala=(1, 1, alto)))
        self.vista.pieza(ACERO, ac.caja, lugar.m((x, y + 0.2, z + alto), escala=(0.2, 0.5, 0.1)))
        self.luces.pieza(LUZ, ac.caja, lugar.m((x, y + 0.3, z + alto - 0.06), escala=(0.16, 0.3, 0.02)))

    def pieza_que_gira(self, nombre, lugar, pos, construir, spin, evento=None):
        """Crea un objeto ANIM_ con su origen en `pos` (del lugar) y la geometría que dibuja `construir`."""
        malla = ac.Malla()
        construir(malla)
        props = {"spin": float(spin)}
        if evento:
            props["event"] = evento
        ac.objeto_suelto(self.p, f"ANIM_{nombre}", malla, self.paleta, lugar.m(pos), props)

    # ---- Lugares ------------------------------------------------------------------------------

    def nave_montaje(self):
        nave = self.p.lugar(8, 2, rumbo=0, apoyo=7, tomar=ac.media)
        top = 0.3
        self.solido(BLANCO_SOMBRA, ac.caja, nave.m((0, 0, top - 1.0), escala=(9, 16, 2.0)))
        # Arcos de anillo que cubren la nave (medio hundidos en el suelo).
        for y in (-6, 0, 6):
            self.solido(ACERO, ac.toro(4.6, 0.25, 24, 4), nave.m((0, y, top)), ac.toro(4.6, 0.25, 12, 4))
            self.vista.pieza(NARANJA, ac.toro(4.6, 0.27, 24, 4), nave.m((0, y, top), escala=(1, 0.3, 1)))
        # La cinta con los anillos que nadie recogerá.
        self.solido(OSCURO, ac.caja, nave.m((0, 0, top + 0.45), escala=(1.4, 14, 0.9)))
        for k in range(14):
            self.vista.pieza(NARANJA if k % 2 else ACERO, ac.caja, nave.m((0, -6.5 + k, top + 0.92), escala=(1.3, 0.12, 0.04)))
        for y in (-5, -2, 1, 4):
            self.vista.pieza(BLANCO, ac.toro(0.55, 0.1, 16, 4), nave.m((0, y, top + 1.6)))
            self.vista.pieza(NARANJA, ac.caja, nave.m((0, y, top + 0.98), escala=(0.3, 0.3, 0.1)))

        def brazo(m):
            m.pieza(ACERO, ac.cilindro(0.18, 8), ac.matriz((0, 0, 0.6), escala=(1, 1, 1.2)))
            m.pieza(NARANJA, ac.caja, ac.matriz((0.9, 0, 1.25), escala=(1.9, 0.22, 0.22)))
            m.pieza(OSCURO, ac.caja, ac.matriz((1.75, 0, 0.95), escala=(0.12, 0.12, 0.6)))
            m.pieza(CIAN, ac.caja, ac.matriz((1.75, 0, 0.62), escala=(0.3, 0.08, 0.1)))

        for k, (x, y) in enumerate(((-2.2, -4.5), (2.2, -1.5), (-2.2, 1.5), (2.2, 4.5))):
            self.solido(OSCURO, ac.cilindro(0.45, 10), nave.m((x, y, top + 0.3), escala=(1, 1, 0.6)))
            self.pieza_que_gira(f"brazo_{k}", nave, (x, y, top + 0.6), brazo, 0.5 if k % 2 else -0.4)
        for x in (-4, 4):
            self.foco(nave, x, -7.5, top)
        self.marca("SPAWN_Montaje", nave, (0, -11.5, top + 1.0))
        self.marca("INT_montaje", nave, (0, -7.6, top + 1.6))
        self.maqueta(nave, top)

    def maqueta(self, nave, top):
        """Maqueta del núcleo al fondo de la nave: con la secuencia de las 7:00 gira y se enciende."""
        y = 10.5
        self.solido(BLANCO_SOMBRA, ac.cilindro(2.2, 12), nave.m((0, y, top + 0.2), escala=(1, 1, 0.4)))
        self.solido(ACERO, ac.toro(1.7, 0.18, 20, 4), nave.m((0, y, top + 2.1)), ac.toro(1.7, 0.2, 10, 4))

        def nucleo(m):
            m.pieza(OSCURO, ac.cilindro(0.55, 10), ac.matriz((0, 0, 0.9), escala=(1, 1, 1.8)))
            for k in range(4):
                a = k * math.pi / 2
                m.pieza(NARANJA, ac.caja, ac.matriz((math.cos(a) * 0.75, math.sin(a) * 0.75, 0.9), (0, 0, a), (0.35, 0.12, 1.2)))
            m.pieza(BLANCO, ac.toro(0.95, 0.06, 16, 4), ac.matriz((0, 0, 1.6), (math.pi / 2, 0, 0)))

        self.pieza_que_gira("maqueta_nucleo", nave, (0, y, top + 0.4), nucleo, 1.6, SECUENCIA)
        luces = ac.Malla()
        for k in range(8):
            a = 2 * math.pi * k / 8
            luces.pieza(CIAN, ac.bola(0.09, 1), ac.matriz((math.cos(a) * 2.0, math.sin(a) * 2.0, 0.5)))
        luces.pieza(CIAN, ac.toro(1.7, 0.2, 20, 4), ac.matriz((0, 0, 2.1)))
        ac.objeto_suelto(self.p, f"EVT_{SECUENCIA}_Luces", luces, ac.material_luces("M_Secuencia_taller", CIAN),
                         nave.m((0, y, top)), {"event": SECUENCIA})
        self.solido(OSCURO, ac.caja, nave.m((0, y - 3.4, top + 0.5), escala=(3.0, 0.1, 1.0)))
        self.marca("INT_secuencia", nave, (0, y - 4.2, top + 1.6))

    def cuna(self):
        """El pedestal vacío del Contrapeso: dos soportes curvos, cables sueltos, la placa y la nota."""
        lugar = self.p.lugar(-15, 41, rumbo=200, apoyo=3, tomar=ac.media)
        top = 0.25
        self.solido(BLANCO_SOMBRA, ac.cilindro(3.2, 12), lugar.m((0, 0, top - 0.6), escala=(1, 1, 1.2)))
        self.vista.pieza(NARANJA, ac.toro(3.0, 0.05, 24, 4), lugar.m((0, 0, top + 0.01), (math.pi / 2, 0, 0)))
        for x in (-0.9, 0.9):
            self.solido(ACERO, ac.toro(0.9, 0.16, 16, 4), lugar.m((x, 0, top + 0.3), (0, 0, math.pi / 2)))
        for k, (x, y, giro) in enumerate(((0.3, 1.3, 0.4), (-0.6, 1.6, -0.9), (1.4, -1.0, 1.7))):
            self.vista.pieza(OSCURO if k % 2 else NARANJA, ac.cilindro(0.06, 6),
                             lugar.m((x, y, top + 0.07), (math.pi / 2, 0, giro), (1, 1, 1.8)))
        self.solido(ACERO, ac.cilindro(0.06, 6), lugar.m((-2.0, 1.6, top + 0.55), escala=(1, 1, 1.1)))
        self.vista.pieza(OSCURO, ac.caja, lugar.m((-2.0, 1.55, top + 1.15), (-0.5, 0, 0), (0.6, 0.06, 0.35)))
        self.vista.pieza(PAPEL, ac.caja, lugar.m((0.9, -0.62, top + 0.55), (math.pi / 2, 0, 0), (0.25, 0.3, 0.01)))
        self.foco(lugar, 2.6, 1.6, top)
        self.marca("INT_cuna", lugar, (-2.0, 2.4, top + 1.3))
        self.marca("INT_nota_cuna", lugar, (0.9, -1.4, top + 0.9))

    def manual(self):
        lugar = self.p.lugar(-21, 49, rumbo=160)
        self.solido(ACERO, ac.caja, lugar.m((0, 0, 0.8), escala=(2.0, 0.8, 0.08)))
        for x in (-0.9, 0.9):
            self.solido(OSCURO, ac.caja, lugar.m((x, 0, 0.4), escala=(0.08, 0.7, 0.8)))
        self.vista.pieza(NARANJA, ac.caja, lugar.m((0, 0, 0.86), (0, 0, 0.1), (0.5, 0.35, 0.04)))
        for k in range(3):
            self.vista.pieza(PAPEL, ac.caja, lugar.m((0.05 * k, 0.02, 0.89 + 0.005 * k), (0, 0, 0.1 + 0.1 * k), (0.42, 0.3, 0.005)))
        self.vista.pieza(OSCURO, ac.caja, lugar.m((0.7, 0.1, 0.9), (0, 0, 0.6), (0.4, 0.08, 0.06)))
        self.marca("INT_manual", lugar, (0, -0.7, 1.2))

    def pista(self):
        """La Pista de Pruebas: un anillo elevado alrededor del casquete norte, con relojes cada tanto."""
        lat = 52
        altura = self.p.radio + 3.2
        radio = altura * math.cos(math.radians(lat))
        z = altura * math.sin(math.radians(lat))
        self.vista.pieza(ACERO, ac.toro(radio, 0.7, 64, 4), ac.matriz((0, 0, z), (math.pi / 2, 0, 0), (1, 1, 0.35)))
        self.vista.pieza(NARANJA, ac.toro(radio, 0.72, 64, 4), ac.matriz((0, 0, z), (math.pi / 2, 0, 0), (1, 1, 0.08)))
        for k in range(8):
            lon = k * 45 + 10
            arriba = ac.direccion(lat, lon) * altura
            suelo = self.p.suelo(lat, lon)
            self.solido(OSCURO, ac.cilindro(0.18, 6), ac.caja_entre(suelo, arriba, 1, 1) @ ac.matriz(rot=(-math.pi / 2, 0, 0)))
            if k % 2 == 0:
                reloj = arriba + ac.direccion(lat, lon) * 0.9
                self.vista.pieza(BLANCO, ac.cilindro(0.35, 10), ac.caja_entre(reloj, reloj + ac.direccion(lat, lon) * 0.08, 1, 1) @ ac.matriz(rot=(-math.pi / 2, 0, 0)))

    def dormitorios(self):
        lugar = self.p.lugar(25, -60, rumbo=150, apoyo=3.5, hundir=0.2)
        alto = 2.6
        self.solido(BLANCO, ac.caja, lugar.m((0, 2.0, alto / 2), escala=(6.4, 0.3, alto)))
        for x in (-3.1, 3.1):
            self.solido(BLANCO, ac.caja, lugar.m((x, 0.4, alto / 2), escala=(0.3, 3.5, alto)))
        self.solido(NARANJA, ac.caja, lugar.m((0, 0.5, alto + 0.1), escala=(6.8, 4.2, 0.2)))
        self.vista.pieza(BLANCO_SOMBRA, ac.caja, lugar.m((0, 0.4, 0.05), escala=(6.0, 3.4, 0.1)))
        for x in (-2.0, 1.4):
            for z in (0.45, 1.5):
                self.solido(OSCURO, ac.caja, lugar.m((x, 1.3, z), escala=(1.0, 1.9, 0.1)))
                self.vista.pieza(BLANCO, ac.caja, lugar.m((x, 1.3, z + 0.1), escala=(0.9, 1.8, 0.12)))
                self.vista.pieza(MANTA if z < 1 else NARANJA, ac.caja, lugar.m((x, 1.0, z + 0.17), escala=(0.92, 1.0, 0.04)))
            for dx in (-0.5, 0.5):
                self.vista.pieza(OSCURO, ac.caja, lugar.m((x + dx, 1.3, 0.95), escala=(0.06, 1.9, 1.9)))
        # Estante con los dos diarios y una mesita con lo personal.
        self.solido(ACERO, ac.caja, lugar.m((-0.4, 1.75, 1.2), escala=(0.9, 0.3, 0.06)))
        for k, color in enumerate((NARANJA, CIAN)):
            self.vista.pieza(color, ac.caja, lugar.m((-0.6 + 0.3 * k, 1.75, 1.36), escala=(0.08, 0.22, 0.28)))
        self.solido(ACERO, ac.caja, lugar.m((2.4, -0.4, 0.6), escala=(0.6, 0.5, 0.06)))
        self.vista.pieza(BLANCO, ac.cilindro(0.05, 6), lugar.m((2.3, -0.4, 0.68), escala=(1, 1, 0.1)))
        self.vista.pieza(OSCURO, ac.caja, lugar.m((2.55, -0.35, 0.72), (0.3, 0, 0), (0.18, 0.02, 0.22)))
        for x in (-2.8, 2.8):
            self.vista.pieza(OSCURO, ac.caja, lugar.m((x, -1.4, 0.3), escala=(0.3, 0.3, 0.6)))
        self.marca("INT_gemelos", lugar, (-0.45, 1.0, 1.4))
        self.marca("INT_dormitorios", lugar, (2.4, -1.1, 1.0))

    def cabina(self):
        """Tambor con un ventanal y la consola: el reloj del Taller frente a los de otros mundos."""
        lugar = self.p.lugar(-5, -30, rumbo=20, apoyo=2.5, hundir=0.2)
        alto = 2.8
        for k in range(9):
            a = math.radians(-120 + k * 30)
            self.solido(BLANCO, ac.caja, lugar.m((math.sin(a) * 2.2, math.cos(a) * 2.2, alto / 2), (0, 0, -a), (1.25, 0.25, alto)))
        self.vista.pieza(NARANJA, ac.cilindro(2.6, 12), lugar.m((0, 0, alto + 0.1), escala=(1, 1, 0.2)))
        self.solido(OSCURO, ac.caja, lugar.m((0, 1.3, 0.5), (0.0, 0, 0), (2.4, 0.6, 1.0)))
        for k, x in enumerate((-0.9, -0.3, 0.3, 0.9)):
            sin_nombre = k == 3
            pantalla = lugar.m((x, 1.55, 1.35), (-0.3, 0, 0), (0.5, 0.04, 0.4))
            if sin_nombre:
                self.vista.pieza("#1E5A64", ac.caja, pantalla)
            else:
                self.pantallas.pieza(CIAN, ac.caja, pantalla)
            self.vista.pieza(OSCURO, ac.caja, lugar.m((x, 1.6, 1.35), (-0.3, 0, 0), (0.56, 0.03, 0.46)))
        self.foco(lugar, -2.8, -1.2)
        self.marca("INT_cabina", lugar, (0, 0.6, 1.4))

    def chimeneas(self):
        for lat, lon in ((40, 40), (-38, -110), (-55, 120)):
            lugar = self.p.lugar(lat, lon, apoyo=1.0)
            self.solido(BLANCO, ac.cilindro(0.7, 8), lugar.m((0, 0, 3.0), escala=(1, 1, 6.0)))
            self.vista.pieza(NARANJA, ac.cilindro(0.75, 8), lugar.m((0, 0, 5.4), escala=(1, 1, 0.6)))
            self.vista.pieza(OSCURO, ac.cilindro(0.55, 8), lugar.m((0, 0, 6.02), escala=(1, 1, 0.05)))

    def lugares(self):
        ac.borrar([f"{MUNDO}_Pantallas"])
        self.nave_montaje()
        self.cuna()
        self.manual()
        self.pista()
        self.dormitorios()
        self.cabina()
        self.chimeneas()
        ac.objeto(self.p, f"{MUNDO}_Pantallas", self.pantallas, ac.material_luces("M_Pantallas_taller", CIAN))


def limpiar_animadas():
    for obj in [o for o in bpy.data.objects if o.name.startswith("ANIM_")]:
        datos = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if datos is not None and datos.users == 0:
            bpy.data.meshes.remove(datos)


limpiar_animadas()
Taller().ejecutar()

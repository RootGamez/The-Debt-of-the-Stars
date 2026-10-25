# Juego de bucle de tiempo

> Título provisional por definir.

Un joven explorador, en su primer vuelo, es arrastrado por un agujero de gusano a un sistema sin vida,
quince minutos antes de que un agujero negro se lo trague todo. Muere y despierta otra vez al principio.
Su único camino a casa pasa por las ruinas de los Ausentes, la civilización que ya investigaba cómo detener
el fenómeno. **Aprender de los muertos para no ser el siguiente.**

- 3D low poly en el navegador, gratis.
- Three.js + TypeScript + Vite; modelado en Blender.
- La relatividad, simplificada, es el lenguaje de los puzzles.

## Documentos
- [`CONTEXTO_HISTORIA.md`](CONTEXTO_HISTORIA.md): historia, reglas del fenómeno, finales.
- [`CONTEXTO_PLANETAS.md`](CONTEXTO_PLANETAS.md): diseño de cada mundo.

## Empezar
Requisitos: Node 20.19 o superior, Blender 5.2 (solo para regenerar modelos).

```bash
cd web
```
```bash
npm install
```
```bash
npm run dev
```

## Estructura
| Carpeta | Contenido |
|---|---|
| `blender/` | Archivos `.blend` de cada mundo, marcas en JSON y scripts de Python |
| `web/` | El juego (Vite + TypeScript + Three.js) |
| `web/public/models/` | Modelos `.glb` exportados desde Blender |

Las órdenes disponibles están en [`CLAUDE.md`](CLAUDE.md).

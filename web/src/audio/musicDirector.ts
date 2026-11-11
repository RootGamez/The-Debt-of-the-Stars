// Qué música suena en cada momento, como lógica pura. Cada mundo principal tiene su pieza, pero con silencios largos:
// tras un rato de calma entra, suena un par de vueltas y se retira (manda el ambiente). Las capas de tensión del
// ciclo (cielo rojo, agujero negro) no se interrumpen mientras dura el evento y mandan sobre la música del mundo.
// Al morir o despertar callan. En pausa el reloj de la música no avanza.

export interface MusicFrame {
  dt: number;
  worldId: string | undefined;
  events: readonly string[];
  phase: 'playing' | 'dying' | 'waking';
  /** El tiempo corre (no hay pausa ni lectura abierta). */
  playing: boolean;
}

export interface MusicChoice {
  /** La pieza que debe sonar, o `undefined` para el silencio. */
  id: string | undefined;
  /** Segundos que debe tardar en entrar o salir. */
  fade?: number;
}

export interface MusicDirector {
  update(frame: MusicFrame): MusicChoice;
}

const WORLD_PIECES: Readonly<Record<string, string>> = {
  umbral: 'music.umbral',
  archivo: 'music.archivo',
  taller: 'music.taller',
  cicatriz: 'music.cicatriz',
};
/** Silencio antes de cada entrada y tiempo que suena (s). Las piezas duran 60 s y se repiten. */
const REST_SECONDS = 70;
const PLAY_SECONDS = 150;
const FADE = 4;
const TENSION_FADE = 6;

export function createMusicDirector(): MusicDirector {
  let clock = 0;
  let lastWorld: string | undefined;

  return {
    update(frame) {
      if (frame.phase !== 'playing') return { id: undefined, fade: 1.5 };
      if (frame.events.includes('agujero_negro'))
        return { id: 'music.agujero_negro', fade: TENSION_FADE };
      if (frame.events.includes('cielo_rojo'))
        return { id: 'music.cielo_rojo', fade: TENSION_FADE };
      if (frame.worldId !== lastWorld) {
        // Al llegar a otro mundo se vuelve a empezar por un rato de calma.
        lastWorld = frame.worldId;
        clock = 0;
      }
      if (frame.playing) clock += frame.dt;
      const piece = frame.worldId ? WORLD_PIECES[frame.worldId] : undefined;
      if (!piece) return { id: undefined, fade: FADE };
      const position = clock % (REST_SECONDS + PLAY_SECONDS);
      return { id: position >= REST_SECONDS ? piece : undefined, fade: FADE };
    },
  };
}

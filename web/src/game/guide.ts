// La guía del prólogo (Fase 9D): avisos cortos, de uno en uno y en su sitio, que enseñan a andar, hablar, usar el
// Registro, ir al hangar, volar a la Luna, posarse y examinar el fragmento. Cada uno se muestra hasta que se hace
// lo que pide y no vuelve. Lógica pura: ui/guideView.ts lo pinta.

export type GuideStep =
  'andar' | 'directora' | 'registro' | 'hangar' | 'apuntar' | 'posarse' | 'fragmento';

/** Lo que la guía necesita saber de la partida en cada momento. */
export interface GuideState {
  /** Metros andados desde que empezó el prólogo. */
  walked: number;
  /** La Directora ya te ha dado la misión. */
  hasMission: boolean;
  /** El Registro tiene algo anotado. */
  knowsSomething: boolean;
  /** Se ha abierto el Registro alguna vez. */
  registryOpened: boolean;
  piloting: boolean;
  /** La nave apunta a la Luna. */
  targetingMoon: boolean;
  /** Distancia (m) a la superficie de la Luna, si se sabe. */
  moonDistance: number | undefined;
  /** Estás a pie en la Luna. */
  onMoon: boolean;
  /** Ya has examinado el fragmento. */
  sawFragment: boolean;
}

/** Desde qué distancia a la Luna (m) se enseña a posarse. */
export const LANDING_FROM = 150;
/** Metros que hay que andar para que la guía dé por aprendido moverse. */
const WALK_LESSON = 4;

/** Si un paso ya está hecho (y no vuelve aunque cambie el estado). */
export function stepDone(step: GuideStep, s: GuideState): boolean {
  switch (step) {
    case 'andar':
      return s.walked >= WALK_LESSON;
    case 'directora':
      return s.hasMission;
    case 'registro':
      return s.registryOpened;
    case 'hangar':
      return s.piloting || s.onMoon;
    case 'apuntar':
      return (
        s.targetingMoon ||
        (s.moonDistance !== undefined && s.moonDistance < LANDING_FROM) ||
        s.onMoon
      );
    case 'posarse':
      return s.onMoon;
    case 'fragmento':
      return s.sawFragment;
  }
}

/** Si a un paso le toca mostrarse ya (lo anterior que lo prepara ha pasado). */
function stepReady(step: GuideStep, s: GuideState): boolean {
  switch (step) {
    case 'andar':
      return true;
    case 'directora':
      return s.walked >= WALK_LESSON;
    case 'registro':
      return s.knowsSomething;
    case 'hangar':
      return s.hasMission;
    case 'apuntar':
      return s.piloting;
    case 'posarse':
      return s.piloting && s.moonDistance !== undefined && s.moonDistance < LANDING_FROM;
    case 'fragmento':
      return s.onMoon;
  }
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  'andar',
  'directora',
  'registro',
  'hangar',
  'apuntar',
  'posarse',
  'fragmento',
];

/** La guía con lo ya aprendido: avanza con el estado y dice qué aviso toca ahora (o ninguno). */
export class Guide {
  private readonly learned = new Set<GuideStep>();

  /** El aviso que toca con este estado; los pasos hechos se apuntan y no vuelven. */
  current(state: GuideState): GuideStep | undefined {
    for (const step of GUIDE_STEPS) {
      if (this.learned.has(step)) continue;
      if (stepDone(step, state)) {
        this.learned.add(step);
        continue;
      }
      if (stepReady(step, state)) return step;
    }
    return undefined;
  }

  get done(): readonly GuideStep[] {
    return GUIDE_STEPS.filter((step) => this.learned.has(step));
  }
}

const KEYS: Record<GuideStep, string> = {
  andar: 'Ratón para mirar · W A S D para andar',
  directora:
    'La Directora te espera en su despacho, al fondo del Instituto. Acércate a quien quieras y pulsa E para hablar',
  registro: 'Lo que aprendes queda en el Registro: ábrelo con Tab',
  hangar:
    'El Albatros II te espera en el hangar, al este del Instituto. Junto a la escotilla, F para subir',
  apuntar: 'T apunta a la Luna · W para ir hacia ella',
  posarse:
    'Frena con X y baja despacio hasta posarte. Con la nave quieta en el suelo, F para bajar',
  fragmento: 'El fragmento está cerca: acércate y examínalo con E',
};

const TOUCH: Record<GuideStep, string> = {
  andar: 'Arrastra para mirar · el mando de la izquierda para andar',
  directora:
    'La Directora te espera en su despacho, al fondo del Instituto. Acércate a quien quieras y toca Hablar',
  registro: 'Lo que aprendes queda en el Registro: ábrelo con su botón',
  hangar:
    'El Albatros II te espera en el hangar, al este del Instituto. Junto a la escotilla, toca Subir',
  apuntar: 'Apunta a la Luna con su botón y avanza hacia ella',
  posarse: 'Frena y baja despacio hasta posarte. Con la nave quieta en el suelo, toca Bajar',
  fragmento: 'El fragmento está cerca: acércate y toca Examinar',
};

export function guideText(step: GuideStep, touch: boolean): string {
  return (touch ? TOUCH : KEYS)[step];
}

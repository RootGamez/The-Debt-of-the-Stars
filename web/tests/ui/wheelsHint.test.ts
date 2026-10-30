import { describe, expect, it } from 'vitest';
import type { WheelsReading } from '../../src/game/counterweightPlay';
import { cradleHint } from '../../src/ui/wheelsBody';

const BASE: WheelsReading = {
  machine: 180,
  counterweight: undefined,
  place: 'bench',
  motorOut: false,
  matched: false,
};

describe('what the cradle says', () => {
  it('asks to take the old motor out first, then waits for the Counterweight', () => {
    expect(cradleHint(BASE)).toContain('motor viejo');
    expect(cradleHint({ ...BASE, motorOut: true })).toContain('espera el Contrapeso');
    expect(cradleHint({ ...BASE, place: 'carried', motorOut: true })).toContain('espera');
  });

  it('asks to match the two clocks while it is in the cradle', () => {
    expect(cradleHint({ ...BASE, place: 'cradle', counterweight: 140 })).toContain(
      'Gira las ruedas',
    );
  });

  it('says what the pulse did', () => {
    expect(cradleHint({ ...BASE, place: 'installed' })).toContain('ya está en el núcleo');
    expect(cradleHint({ ...BASE, place: 'rejected' })).toContain('rechazado');
  });
});

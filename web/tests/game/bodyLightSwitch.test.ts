// La L enciende y apaga la luz del cuerpo; no cuenta repetida, con modificadores ni cuando el juego no la deja.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BODY_LIGHT_KEY, createBodyLightSwitch } from '../../src/game/bodyLightSwitch';

const press = (init: KeyboardEventInit): void => {
  const event = Object.assign(new Event('keydown'), { repeat: false, ...init });
  window.dispatchEvent(event);
};

describe('the body light switch', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('HTMLInputElement', function HTMLInputElement() {});
    vi.stubGlobal('HTMLTextAreaElement', function HTMLTextAreaElement() {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('toggles with L', () => {
    const light = createBodyLightSwitch();
    expect(light.on).toBe(false);
    press({ code: BODY_LIGHT_KEY });
    expect(light.on).toBe(true);
    press({ code: BODY_LIGHT_KEY });
    expect(light.on).toBe(false);
    light.dispose();
  });

  it('ignores other keys, held keys and shortcuts', () => {
    const light = createBodyLightSwitch();
    press({ code: 'KeyK' });
    press({ code: BODY_LIGHT_KEY, repeat: true });
    press({ code: BODY_LIGHT_KEY, ctrlKey: true });
    expect(light.on).toBe(false);
    light.dispose();
  });

  it('does nothing while the game does not allow it, or once disposed', () => {
    let allowed = false;
    const light = createBodyLightSwitch(() => allowed);
    press({ code: BODY_LIGHT_KEY });
    expect(light.on).toBe(false);
    allowed = true;
    light.dispose();
    press({ code: BODY_LIGHT_KEY });
    expect(light.on).toBe(false);
  });
});

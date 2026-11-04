import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import uiScale, { scaleValue } from '../../scripts/postcss-ui-scale';

const run = async (css: string): Promise<string> =>
  (await postcss([uiScale()]).process(css, { from: undefined })).css;

describe('the UI scale PostCSS plugin', () => {
  it('multiplies every px by the UI scale', () => {
    expect(scaleValue('0 0 8px 1px red', 'none')).toBe(
      '0 0 calc(8px * var(--ui-scale, 1)) calc(1px * var(--ui-scale, 1)) red',
    );
  });

  it('also multiplies font sizes by the text scale', async () => {
    const css = await run('a{font-size:14px}');
    expect(css).toContain('calc(14px * var(--ui-scale, 1) * var(--text-scale, 1))');
  });

  it('scales only the size inside the font shorthand', async () => {
    const css = await run('a{font:12px/1.5 monospace}');
    expect(css).toContain('calc(12px * var(--ui-scale, 1) * var(--text-scale, 1))/1.5 monospace');
  });

  it('leaves media queries and url() values alone', async () => {
    const css = await run(
      '@media (max-width: 600px){a{width:10px}} b{background:url("x.svg#a") 4px}',
    );
    expect(css).toContain('@media (max-width: 600px)');
    expect(css).toContain('width:calc(10px');
    expect(css).toContain('url("x.svg#a") 4px');
  });
});

import { describe, expect, it } from 'vitest';
import {
  BoxGeometry,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type WebGLProgramParametersWithUniforms,
  type WebGLRenderer,
} from 'three';
import {
  angleBetween,
  applySkyLight,
  box,
  colliderMesh,
  cylinder,
  direction,
  frameAt,
  headingTowards,
  latLon,
  marker,
  PieceSet,
  pieceMatrix,
  piecesToMeshes,
  rampMatrix,
  scatter,
  sphereTerrain,
  triangleCount,
  uprightRotation,
  type Surface,
} from '../../../src/worlds/procedural/kit';
import { seededRandom } from '../../../src/worlds/procedural/noise';

const flat: Surface = { radius: 50, groundRadius: () => 50 };

describe('directions on the sphere', () => {
  it('round-trips latitude and longitude', () => {
    const { lat, lon } = latLon(direction(24, -130));

    expect(lat).toBeCloseTo(24);
    expect(lon).toBeCloseTo(-130);
    expect(angleBetween(direction(0, 0), direction(0, 90))).toBeCloseTo(Math.PI / 2);
  });
});

describe('frameAt', () => {
  it('puts Z up, +Y towards the heading and the origin on the ground', () => {
    const frame = frameAt(flat, 10, 30, { heading: 90 });
    const up = direction(10, 30);
    const forward = new Vector3().setFromMatrixColumn(frame.base, 1);
    const east = new Vector3(0, 0, 1).cross(up).normalize();

    expect(frame.up().dot(up)).toBeCloseTo(1);
    expect(forward.dot(east)).toBeCloseTo(1);
    expect(frame.point([0, 0, 0]).length()).toBeCloseTo(50);
    expect(frame.point([0, 0, 2]).length()).toBeCloseTo(52);
  });

  it('rests on the lowest or the mean ground of its footprint, minus what it sinks', () => {
    // Un bulto alrededor de lat 0, lon 0.
    const bump: Surface = {
      radius: 50,
      groundRadius: (d) => 50 + 3 * Math.max(0, d.x - 0.995) * 200,
    };
    const lowest = frameAt(bump, 0, 0, { footprint: 6 }).point([0, 0, 0]).length();
    const mean = frameAt(bump, 0, 0, { footprint: 6, ground: 'mean' }).point([0, 0, 0]).length();
    const sunk = frameAt(bump, 0, 0, { footprint: 6, sink: 0.5 }).point([0, 0, 0]).length();

    expect(lowest).toBeLessThan(mean);
    expect(sunk).toBeCloseTo(lowest - 0.5);
  });

  it('can be turned towards any direction with headingTowards', () => {
    const target = direction(0, 120);
    const frame = frameAt(flat, 20, 30, { heading: headingTowards(20, 30, target) });
    const forward = new Vector3().setFromMatrixColumn(frame.base, 1);
    const up = frame.up();
    const towards = target.clone().addScaledVector(up, -target.dot(up)).normalize();

    expect(forward.dot(towards)).toBeCloseTo(1);
  });

  it('works on the poles, where north is undefined', () => {
    expect(frameAt(flat, 90, 0).up().z).toBeCloseTo(1);
  });
});

describe('pieceMatrix', () => {
  it('uses the Blender rotation order (X, then Y, then Z)', () => {
    const p = new Vector3(0, 1, 0).applyMatrix4(
      pieceMatrix([0, 0, 0], [Math.PI / 2, 0, Math.PI / 2]),
    );

    expect(p.z).toBeCloseTo(1);
  });
});

describe('rampMatrix', () => {
  it('lays the top face from the platform edge down into the ground', () => {
    const m = rampMatrix([0, -8, 0.6], [0, -10, 0], 2.4);
    const start = new Vector3(0, -0.5, 0.5).applyMatrix4(m);
    const end = new Vector3(0, 0.5, 0.5).applyMatrix4(m);

    expect(start.distanceTo(new Vector3(0, -8, 0.6))).toBeLessThan(1e-6);
    expect(end.y).toBeLessThan(-10); // se alarga más allá del pie
    expect(end.z).toBeLessThan(0); // y se hunde en el suelo
  });
});

describe('PieceSet', () => {
  it('colours each piece and only collides with what gets in the way', () => {
    const pieces = new PieceSet(1);
    pieces.add('#ff0000', box(), pieceMatrix([0, 0, 0], undefined, [3, 0.4, 2])); // muro
    pieces.add('#ffffff', cylinder(0.06, 8), pieceMatrix([0, 0, 0], undefined, [1, 1, 0.12])); // taza
    pieces.add('#ffffff', box(), pieceMatrix([0, 0, 0], undefined, [1, 1, 1]), 'light', {
      glow: 4,
      vary: 0,
    });
    pieces.add('#000000', box(), pieceMatrix(), 'metal', { solid: false });

    expect(pieces.colliders).toHaveLength(1);
    const light = pieces.parts.light[0]?.getAttribute('color');
    expect(light?.getX(0)).toBeCloseTo(4);
    expect(pieces.colliders[0]?.getAttribute('color')).toBeUndefined();
  });

  it('merges every kind into one named mesh, and colliders into an invisible one', () => {
    const pieces = new PieceSet(1);
    pieces.add('#808080', box(), pieceMatrix());
    pieces.add('#808080', box(), pieceMatrix([2, 0, 0]));
    pieces.add('#808080', box(), pieceMatrix(), 'light');
    const material = new MeshBasicMaterial();
    const meshes = piecesToMeshes(
      pieces,
      { stone: material, metal: material, light: material },
      'x',
    );
    const collider = colliderMesh('COL_x', pieces.colliders);

    expect(meshes.map((m) => m.name)).toEqual(['x_Lugares', 'x_Luces']);
    expect(triangleCount(meshes[0]?.geometry ?? new BoxGeometry())).toBe(24);
    expect(collider.visible).toBe(false);
    expect(triangleCount(collider.geometry)).toBe(24);
  });
});

describe('sphereTerrain', () => {
  it('displaces an icosphere and paints one colour per face', () => {
    const geometry = sphereTerrain({
      radius: 20,
      detail: 4,
      height: (x) => x,
      faceColor: (_x, _y, _z, h) => new Color(h > 0 ? '#ffffff' : '#000000'),
    });
    const position = geometry.getAttribute('position');
    const radii = Array.from({ length: position.count }, (_, i) =>
      new Vector3().fromBufferAttribute(position, i).length(),
    );
    const colors = geometry.getAttribute('color');

    expect(triangleCount(geometry)).toBe(20 * 25);
    expect(Math.min(...radii)).toBeGreaterThan(18.9);
    expect(Math.max(...radii)).toBeLessThan(21.1);
    expect(colors.getX(0)).toBe(colors.getX(2)); // los tres vértices de una cara, igual
  });
});

describe('scatter', () => {
  it('places instances on the ground and makes the big ones solid', () => {
    const { mesh, colliders } = scatter(
      {
        name: 'piedras',
        geometry: box(),
        material: new MeshBasicMaterial(),
        count: 30,
        castShadow: true,
        groundRadius: () => 10,
        solidAbove: 1,
        pick: (d, r) =>
          d.z > 0
            ? { scale: [r() < 0.5 ? 2 : 0.5, 1, 1], sink: 0, color: '#888888', tilt: 0.3 }
            : null,
      },
      seededRandom(3),
    );

    expect(mesh.count).toBe(30);
    expect(mesh.name).toBe('piedras');
    expect(colliders.length).toBeGreaterThan(0);
    expect(colliders.length).toBeLessThan(30);
  });
});

describe('marker', () => {
  it('carries its properties as userData, like the Blender export', () => {
    const up = direction(30, 40);
    const object = marker('INT_x', up.clone().multiplyScalar(5), uprightRotation(up), {
      clue_id: 'x.y',
      kind: 'texto',
    });

    expect(object.name).toBe('INT_x');
    expect(object.userData).toEqual({ clue_id: 'x.y', kind: 'texto' });
    expect(new Vector3(0, 0, 1).applyQuaternion(object.quaternion).dot(up)).toBeCloseTo(1);
  });
});

describe('applySkyLight', () => {
  it('adds the sky fill to the standard shader, keyed apart from plain materials', () => {
    const material = new MeshStandardMaterial();
    applySkyLight(material, new Vector3(1, 0, 0), {
      day: new Color(1, 1, 1),
      ground: new Color(0.5, 0.4, 0.3),
      night: new Color(0.1, 0.1, 0.2),
    });
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <lights_fragment_end>',
    };

    material.onBeforeCompile(
      shader as unknown as WebGLProgramParametersWithUniforms,
      {} as unknown as WebGLRenderer,
    );

    expect(material.customProgramCacheKey()).toBe('sky-light');
    expect(Object.keys(shader.uniforms)).toEqual(['uSkySun', 'uSkyDay', 'uSkyGround', 'uSkyNight']);
    expect(shader.vertexShader).toContain('vSkyDay = smoothstep');
    expect(shader.fragmentShader).toContain('reflectedLight.indirectDiffuse += skyColor');
  });
});

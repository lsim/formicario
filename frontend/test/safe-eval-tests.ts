import { describe, expect, it, beforeEach } from 'vitest';
import { createRestrictedEval } from '@/safe-eval.ts';
import type { AntFunction, AntInfo } from '@/Battle.ts';

describe('safeEval', () => {
  let safeEval: (code: string) => AntFunction;
  beforeEach(() => {
    safeEval = createRestrictedEval();
  });
  it('should not allow access to window', () => {
    expect(() => safeEval('() => window.location.href')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to global', () => {
    expect(() => safeEval('() => global.location.href')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to top', () => {
    expect(() => safeEval('() => top.location.href')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to parent', () => {
    expect(() => safeEval('() => parent.location.href')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to self', () => {
    expect(() => safeEval('() => self.location.href')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to JSON', () => {
    expect(() => safeEval('() => JSON.stringify(42)')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to Math', () => {
    expect(() => safeEval('() => Math.floor(0.5)')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to Date', () => {
    expect(() => safeEval('() => Date.now()')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to fetch', () => {
    expect(() => safeEval('() => fetch()')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to XMLHttpRequest', () => {
    expect(() => safeEval('() => new XMLHttpRequest()')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to setTimeout', () => {
    expect(() => safeEval('() => setTimeout()')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to setInterval', () => {
    expect(() => safeEval('() => setInterval()')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to clearTimeout', () => {
    expect(() => safeEval('() => clearTimeout()')([], { brains: [] }, () => {})).toThrow();
  });

  it('should not allow access to clearInterval', () => {
    expect(() => safeEval('() => clearInterval()')([], { brains: [] }, () => {})).toThrow();
  });

  it('should allow access to Object', () => {
    expect(() =>
      safeEval('() => Object.keys({ foo: "bar" })')([], { brains: [] }, () => {}),
    ).not.toThrow();
  });

  it('should allow access to RegExp', () => {
    expect(() => safeEval('() => new RegExp("foo")')([], { brains: [] }, () => {})).not.toThrow();
  });

  it('should produce a viable ant function', async () => {
    const source = `
      function antBrain(squareData, antInfo) {
        if (!squareData) {
          return {
            name: 'MyAwesomeName',
            color: '#232323',
            brainTemplate: {}
          }
        }

        // All your awesome logic here

        return antInfo.brains[0].random % 5;
      }
      `;
    const antFunc = safeEval(source);
    expect(typeof antFunc).toBe('function');
    const antDescriptor = antFunc(); // Leave empty to get the descriptor
    expect(antDescriptor).toBeTypeOf('object');

    const antState: AntInfo = {
      brains: [{ random: 0 }],
    };
    expect(antFunc([], antState, () => {})).toBe(0);

    const antState2: AntInfo = {
      brains: [{ random: 2 }],
    };

    expect(antFunc([], antState2, () => {})).toBe(2);

    const antState3: AntInfo = {
      brains: [{ random: 14 }],
    };

    expect(antFunc([], antState3, () => {})).toBe(4);
  });
});

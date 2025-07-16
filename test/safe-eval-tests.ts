import { describe, expect, it, beforeEach } from 'vitest';
import { createRestrictedEval } from '@/safe-eval.ts';
import type { AntFunction, AntInfo } from '@/Battle.ts';

describe('safeEval', () => {
  let safeEval: (code: string, teamName: string) => AntFunction;
  beforeEach(() => {
    safeEval = createRestrictedEval();
  });
  it('should not allow access to window', () => {
    expect(() => safeEval('() => window.location.href', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to global', () => {
    expect(() => safeEval('() => global.location.href', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to top', () => {
    expect(() => safeEval('() => top.location.href', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to parent', () => {
    expect(() => safeEval('() => parent.location.href', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to self', () => {
    expect(() => safeEval('() => self.location.href', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to JSON', () => {
    expect(() => safeEval('() => JSON.stringify(42)', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to Math', () => {
    expect(() => safeEval('() => Math.floor(0.5)', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to Date', () => {
    expect(() => safeEval('() => Date.now()', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to fetch', () => {
    expect(() => safeEval('() => fetch()', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to XMLHttpRequest', () => {
    expect(() => safeEval('() => new XMLHttpRequest()', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to setTimeout', () => {
    expect(() => safeEval('() => setTimeout()', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to setInterval', () => {
    expect(() => safeEval('() => setInterval()', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to clearTimeout', () => {
    expect(() => safeEval('() => clearTimeout()', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should not allow access to clearInterval', () => {
    expect(() => safeEval('() => clearInterval()', 'fooTeam')([], { brains: [] })).toThrow();
  });

  it('should allow access to Object', () => {
    expect(() =>
      safeEval('() => Object.keys({ foo: "bar" })', 'fooTeam')([], { brains: [] }),
    ).not.toThrow();
  });

  it('should allow access to RegExp', () => {
    expect(() => safeEval('() => new RegExp("foo")', 'fooTeam')([], { brains: [] })).not.toThrow();
  });

  it('should produce a viable ant function', async () => {
    const source = (await import('../ants/reluctAnt.js?raw')).default;
    const antFunc = safeEval(source, 'fooTeam');
    expect(typeof antFunc).toBe('function');
    const antDescriptor = antFunc(); // Leave empty to get the descriptor
    expect(antDescriptor).toBeTypeOf('object');

    const antState: AntInfo = {
      brains: [{ random: 0 }],
    };
    expect(antFunc([], antState)).toBe(1);

    const antState2: AntInfo = {
      brains: [{ random: 2 }],
    };

    expect(antFunc([], antState2)).toBe(3);

    const antState3: AntInfo = {
      brains: [{ random: 3 }],
    };

    expect(antFunc([], antState3)).toBe(4);
  });
});

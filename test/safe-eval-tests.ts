import { describe, expect, it, beforeEach } from 'vitest';
import { createRestrictedEval } from '../src/safe-eval';

describe('safeEval', () => {
  let safeEval;
  beforeEach(() => {
    safeEval = createRestrictedEval();
  });
  it('should not allow access to window', () => {
    expect(() => safeEval('() => window.location.href')()).toThrow();
  });

  it('should not allow access to global', () => {
    expect(() => safeEval('() => global.location.href')()).toThrow();
  });

  it('should not allow access to top', () => {
    expect(() => safeEval('() => top.location.href')()).toThrow();
  });

  it('should not allow access to parent', () => {
    expect(() => safeEval('() => parent.location.href')()).toThrow();
  });

  it('should not allow access to self', () => {
    expect(() => safeEval('() => self.location.href')()).toThrow();
  });

  it('should not allow access to JSON', () => {
    expect(() => safeEval('() => JSON.stringify(42)')()).toThrow();
  });

  it('should not allow access to Math', () => {
    expect(() => safeEval('() => Math.random()')()).toThrow();
  });

  it('should not allow access to Date', () => {
    expect(() => safeEval('() => Date.now()')()).toThrow();
  });

  it('should not allow access to fetch', () => {
    expect(() => safeEval('() => fetch()')()).toThrow();
  });

  it('should not allow access to XMLHttpRequest', () => {
    expect(() => safeEval('() => new XMLHttpRequest()')()).toThrow();
  });

  it('should not allow access to setTimeout', () => {
    expect(() => safeEval('() => setTimeout()')()).toThrow();
  });

  it('should not allow access to setInterval', () => {
    expect(() => safeEval('() => setInterval()')()).toThrow();
  });

  it('should not allow access to clearTimeout', () => {
    expect(() => safeEval('() => clearTimeout()')()).toThrow();
  });

  it('should not allow access to clearInterval', () => {
    expect(() => safeEval('() => clearInterval()')()).toThrow();
  });

  it('should allow access to Object', () => {
    expect(() => safeEval('() => Object.keys({ foo: "bar" })')()).not.toThrow();
  });

  it('should allow access to RegExp', () => {
    expect(() => safeEval('() => new RegExp("foo")')()).not.toThrow();
  });

  it('should produce a function', () => {
    const foo = safeEval('() => function foo() { return "bar" }')();
    expect(typeof foo).toBe('function');
    expect(foo()).toBe('bar');
  });
});

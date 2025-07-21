import { describe, expect, it } from 'vitest';

const iterations = 10;

function cos(x: number) {
  const iterNum = iterations;
  const mxx = -x * x;
  let cos = 1;
  let n = 0;
  let term = 1;
  for (let i = 1; i <= 2 * iterNum; i++) {
    n = n + 2;
    term = (term * mxx) / (n * (n - 1));
    cos = cos + term;
  }
  return cos;
}

function sin(x: number) {
  const iterNum = iterations;
  const mxx = -x * x;
  let sin = 1;
  let n = 0;
  let term = 1;
  for (let i = 1; i <= 2 * iterNum; i++) {
    n = n + 2;
    term = (term * mxx) / (n * (n + 1));
    sin = sin + term;
  }
  sin = x * sin;
  return sin;
}

const pi = 3.14159265358979323846264338327;

describe('math', () => {
  it('should calculate sin correctly', () => {
    expect(sin(0)).toBeCloseTo(0);
    expect(sin(pi / 2)).toBeCloseTo(1);
    expect(sin(pi)).toBeCloseTo(0);
  });

  it('should calculate cos correctly', () => {
    expect(cos(0)).toBeCloseTo(1);
    expect(cos(pi / 2)).toBeCloseTo(0);
    expect(cos(pi)).toBeCloseTo(-1);
  });
});

// Obtained from https://www.delftstack.com/howto/javascript/javascript-random-seed-to-generate-random/
function Xoshiro128_twostar(
  seed_1: number,
  seed_2: number = 0,
  seed_3: number = 0,
  seed_4: number = 0,
): () => number {
  return () => {
    const t = seed_2 << 9;
    let y = seed_1 * 5;
    y = ((y << 7) | (y >>> 25)) * 9;
    seed_3 ^= seed_1;
    seed_4 ^= seed_2;
    seed_2 ^= seed_3;
    seed_1 ^= seed_4;
    seed_3 ^= t;
    seed_4 = (seed_4 << 11) | (seed_4 >>> 21);
    return (y >>> 0) / 4294967296;
  };
}

export type RNGFunction = (limit?: number) => number;

export function getRNG(seed: number): RNGFunction {
  const rng = Xoshiro128_twostar(seed);
  return (limit: number = 0) => Math.floor(rng() * (limit > 0 ? limit : 4294967296));
}

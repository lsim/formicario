import { hash } from '../src/util.ts';

async function main() {
  const antFiles = Deno.readDir('../ants');

  const hashes: Record<string, string> = {};
  for await (const entry of antFiles) {
    const code = await Deno.readTextFile(`../ants/${entry.name}`);
    const teamName = entry.name.replace(/\.js$/, '');
    hashes[teamName] = await hash(code);
  }

  // Write to typescript file, so deno can import it without bundling
  await Deno.writeTextFile(
    './src/built-in-hashes.ts',
    `export const builtInHashes = ${JSON.stringify(hashes, null, 2)}`,
  );
}

main();

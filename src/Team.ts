export type Team = {
  name: string;
  code: string;
  color?: string;
  brainTemplate?: object;
  status?: 'ok' | 'error';
};

export const blacklist = [
  'CognizAnt', // Not implemented yet
  'ElephAnt', // Doesn't look like it is worth restoring
  'reluctAnt', // Is just a template
  'BlackHole', // Is more of a POC than a real ant
  'Rambo', // Not worth restoring
  'Servant', // Not worth restoring
  'SkyNET', // Failed to fix this single-byte ant
  'Turbo', // Another POC ant that doesn't translate well
  'Square', // Another POC ant that doesn't translate well
  'AntAgonist', // Another single-byte ant I've given up on. Unobfuscated indeed!
  'Smiley', // Translation attempts have failed so far
  'Inkal', // Translation attempts have failed so far to get any movement from this one
];

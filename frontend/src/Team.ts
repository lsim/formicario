export type Team = {
  // The name that comes from the declaration object returned by the AntFunction. Missing if the team has not yet produced a declaration.
  name?: string;
  code: string;
  // The id of the team. Either an uuid or the file name of the built-in team
  id: string;
  color?: string;
  brainTemplate?: object;
  owner?: string;
  status?: 'ok' | 'error';
  lastChanged?: number;
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
  'Tirsdag', // JS-translation won't tick
];

// This is the data we extract by calling the AntFunction without arguments
export type TeamExtract = {
  // The name that comes from the declaration object returned by the AntFunction. Missing if the team has not yet produced a declaration.
  name: string;
  color: string;
  brainTemplate?: object;
  description?: string;
};

export type Team = TeamExtract & {
  // The id of the team. Either an uuid or the file name of the built-in team
  id: string;
  // Username of the team author. If not set, the team was created without an active login. Publish with local user as author
  authorName?: string;
  status?: 'ok' | 'error';
  lastChanged?: number;
  code?: string;
  lamport?: number;
};

export type TeamWithCode = Team & { code: string };

export const blacklist = [
  'CognizAnt', // Not implemented yet
  'ElephAnt', // Doesn't look like it is worth restoring
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

import { User } from './auth/tokens.ts';
import { Err, OkJson } from './util.ts';
import {
  BattleParticipant,
  BattleResult,
  Scores,
} from './shared/BattleResult.ts';
import { kv } from './kv.ts';
import { broadcast } from './subscription.ts';
import { getPublications } from './publications.ts';

import { builtInHashes } from './built-in-hashes.ts';

async function getTeamsWithScores() {
  const kvResults = kv.list<BattleResult>({ prefix: ['battle-results'] });

  const teamsWithScores: Scores = {};

  for await (const entry of kvResults) {
    const battleResult = entry.value;
    for (const participant of battleResult.participants) {
      const teamId = participant.teamId;
      if (!teamsWithScores[teamId]) {
        teamsWithScores[teamId] = {
          numWins: 0,
          numLosses: 0,
          numBeatenTeams: 0,
          avgWinTurns: 0,
          name: participant.teamName,
          color: participant.teamColor,
          winLossRatio: 0,
        };
      }

      if (battleResult.winnerId === teamId) {
        teamsWithScores[teamId].numWins++;
        teamsWithScores[teamId].numBeatenTeams +=
          battleResult.participants.length - 1;
        teamsWithScores[teamId].avgWinTurns =
          ((teamsWithScores[teamId].avgWinTurns || battleResult.durationTurns) +
            battleResult.durationTurns) /
          2;
      } else {
        teamsWithScores[teamId].numLosses++;
      }
      teamsWithScores[teamId].winLossRatio = teamsWithScores[teamId].numWins /
        (teamsWithScores[teamId].numWins + teamsWithScores[teamId].numLosses);
    }
  }
  return OkJson(teamsWithScores);
}

// async function getBattleResults() {
//   const kvResults = kv.list<BattleResult>({ prefix: ['battle-results'] });
//
//   const results = [];
//   for await (const entry of kvResults) {
//     const b = entry.value;
//     results.push(b);
//   }
//
//   return OkJson(results);
// }

async function verifyParticipants(result: BattleResult) {
  const publications = await getPublications();
  for (const participant of result.participants) {
    const builtInHash = builtInHashes[participant.teamId];
    if (builtInHash) {
      if (builtInHash !== participant.codeHash) {
        throw Error(
          `Built-in team ${participant.teamId} has invalid code hash`,
        );
      }
      continue;
    }
    const publication = publications.find((p) => p.id === participant.teamId);
    if (!publication) {
      throw Error(
        `No publication found for team ${participant.teamId}. Make sure to publish all participants before ranked battles`,
      );
    }
    if (
      publication.lamport !== participant.lamport
    ) {
      throw Error(
        `A newer version exists for ${publication.name}. Pull the latest changes before ranked battles`,
      );
    }
    if (publication.codeHash !== participant.codeHash) {
      throw Error(
        `Code hash mismatch for ${publication.name}. Make sure to publish all local changes before ranked battles`,
      );
    }
  }
}

async function postBattleResult(result: BattleResult) {
  if (!result.isValid()) return Err('Invalid battle result received', 500);

  // TODO: We should validate that the codeHash matches the one for the team with the given lamport (so ne-er-do-wells don't gimp opponents before beating them)
  if (!result.id) result.id = crypto.randomUUID();
  const kvKey = ['battle-results', result.id];

  try {
    await verifyParticipants(result);
  } catch (e) {
    console.error('Error verifying participants', e);
    return Err(
      'One ore more participants failed ranked battle verification: ' +
        e.message,
      500,
      'json',
    );
  }

  await kv.set(kvKey, result);

  broadcast({
    type: 'battle-results-updated',
  });

  return OkJson({ id: result.id });
}

// PUT: Add new battle result
// GET: Get all battle results (within a time window?)
export async function handleRankingsRequest(
  request: Request,
  user: User | null,
) {
  try {
    if (request.method === 'GET') {
      return getTeamsWithScores();
    } else if (request.method === 'POST') {
      if (!user) return Err('Not authorized', 401);
      const json = await request.json();
      const participants = json.participants.map((p) =>
        new BattleParticipant(
          p.teamId,
          p.teamName,
          p.teamColor,
          p.lamport,
          p.codeHash,
        )
      );
      const battleResult = new BattleResult(
        participants,
        json.durationTurns,
        json.timestamp,
        json.winnerId,
      );
      battleResult.id = json.id;
      return postBattleResult(battleResult);
    }
  } catch (e) {
    return Err('Internal server error: ' + e.stack, 500);
  }
}

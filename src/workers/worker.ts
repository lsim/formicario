import { parse } from 'espree';
import type { Program } from 'estree';
import { walk } from 'estree-walker';

import type { GameSpec } from '@/GameSpec.ts';
import type { ITeam } from '@/Team.ts';

import { createRestrictedEval, shadowedGlobals } from '@/safe-eval.ts';
import { Battle } from '@/Battle.ts';
import type { AntFunction } from '@/Battle.ts';
import { getRNG } from '@/prng.ts';

onmessage = (e) => {
  console.log('Worker received message', e.data);
  if (e.data?.type === 'run-game') {
    run(e.data.game);
  }
  postMessage('Hello from the worker thread');
};

// Static analysis for obvious violations
function auditParticipant(participant: string) {
  const ast = parse(participant) as Program;

  walk(ast, {
    enter(node) {
      if (node.type === 'Identifier') {
        if (shadowedGlobals.includes(node.name)) {
          throw new Error(`Participant code tried to access global ${node.name}`);
        }
      }
    },
  });
}

const safeEval = createRestrictedEval();

function instantiateParticipant(team: ITeam) {
  auditParticipant(team.code);
  return safeEval(team.code) as AntFunction;
}

function run(game: GameSpec) {
  game.rng = getRNG(game.seed);
  const participantFunctions = game.teams.map(instantiateParticipant);

  const battle = new Battle(game, participantFunctions);
}

import { parse } from 'espree';
import type { Program } from 'estree';
import { walk } from 'estree-walker';

import type { GameSpec } from '@/GameSpec.ts';

import { createRestrictedEval, shadowedGlobals } from '@/safe-eval.ts';
import { Battle } from '@/Battle.ts';
import type { AntFunction } from '@/Battle.ts';
import { getRNG } from '@/prng.ts';
import type { WorkerCommand } from '@/workers/WorkerCommand.ts';

// TODO: We need to set up a stream of status messages back to the UI
onmessage = (e) => {
  const command: WorkerCommand = e.data as WorkerCommand;
  console.log('Worker received message', command);
  if (command?.type === 'run-game') {
    run(command.game);
  }
  postMessage('Hello from the worker thread');
};

// Static analysis for obvious violations
function auditParticipant(teamCode: string) {
  const ast = parse(teamCode) as Program;

  walk(ast, {
    enter(node) {
      if (node.type === 'Identifier') {
        if (shadowedGlobals.includes(node.name)) {
          throw new Error(`Participant code tried to access global '${node.name}'`);
        }
      }
    },
  });
}

const safeEval = createRestrictedEval();

function instantiateParticipant(team: string) {
  auditParticipant(team);
  return safeEval(team) as AntFunction;
}

function run(game: GameSpec) {
  console.log('Running game', game);
  game.rng = getRNG(game.seed);
  const teamFunctions = game.teams.map(instantiateParticipant);

  const battle = new Battle(game, teamFunctions);

  battle.doTurn();
}

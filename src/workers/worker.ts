import { parse } from 'espree';
import type { Program } from 'estree';
import { walk } from 'estree-walker';

import type { GameSpec } from '@/GameSpec.ts';

import { createRestrictedEval, shadowedGlobals } from '@/safe-eval.ts';
import { Battle } from '@/Battle.ts';
import type { AntFunction } from '@/Battle.ts';
import { getRNG } from '@/prng.ts';
import type { WorkerMessage } from '@/workers/WorkerMessage.ts';
import type { GameSummary } from '@/GameSummary.ts';

// TODO: We need to set up a stream of status messages back to the UI
onmessage = async (e) => {
  const command: WorkerMessage = e.data as WorkerMessage;
  console.log('Worker received message', command);
  if (command?.type === 'run-game') {
    try {
      const summary = await run(command.game);
      postMessage({ type: 'game-summary', results: summary });
    } catch (error) {
      console.error('Error running game:', error);
      postMessage({ type: 'error', error: String(error) });
    }
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

async function run(game: GameSpec): Promise<GameSummary> {
  console.log('Running game', game);
  game.rng = getRNG(game.seed);
  const teamFunctions = game.teams.map(instantiateParticipant);

  const battle = new Battle(game, teamFunctions);

  // Run the complete battle using the do-while loop structure
  const battleSummary = await battle.run();

  console.log('Battle summary', battleSummary);

  return {
    seed: game.seed,
    battles: [battleSummary],
  };
}

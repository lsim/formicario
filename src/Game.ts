import { type AntFunction, Battle } from '@/Battle.ts';
import type { GameSpec } from '@/GameSpec.ts';
import type { GameSummary } from '@/GameSummary.ts';
import { getRNG } from '@/prng.ts';
import { parse } from 'espree';
import type { Program } from 'estree';
import { walk } from 'estree-walker';
import { createRestrictedEval, shadowedGlobals } from '@/safe-eval.ts';

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

export class Game {
  public id = 0;
  stopRequested = false;
  activeBattle: Battle | null = null;

  constructor(private spec: GameSpec) {
    this.id = Date.now();
  }

  public async run(): Promise<GameSummary> {
    console.log('Running game', this.spec);
    this.spec.rng = getRNG(this.spec.seed);
    const teamFunctions = this.spec.teams.map(instantiateParticipant);

    this.activeBattle = new Battle(this.spec, teamFunctions);

    // Run the complete battle using the do-while loop structure
    const battleSummary = await this.activeBattle.run();
    this.activeBattle = null;

    console.log('Battle summary', battleSummary);

    return {
      seed: this.spec.seed,
      battles: [battleSummary],
    };
  }

  public stop() {
    this.stopRequested = true;
    this.activeBattle?.stop();
  }
}

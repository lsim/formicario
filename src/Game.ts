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
  const ast = parse(teamCode, { ecmaVersion: 6 }) as Program;

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
  activeBattle: Battle | null = null;
  teamFunctions: AntFunction[];

  constructor(private spec: GameSpec) {
    this.id = Date.now();
    this.spec.rng = getRNG(this.spec.seed);
    this.teamFunctions = this.spec.teams.map(instantiateParticipant);
  }

  public async run(pause = false): Promise<GameSummary | undefined> {
    console.log('Running game', this.spec, pause);

    this.activeBattle = new Battle(this.spec, this.teamFunctions);

    // Run the complete battle using the do-while loop structure
    this.activeBattle.paused = pause;
    const battleSummary = await this.activeBattle.run(pause ? 1 : 0);
    if (battleSummary) {
      this.activeBattle = null;

      console.log('Battle summary', battleSummary);

      return {
        seed: this.spec.seed,
        battles: [battleSummary],
      };
    }
    return undefined;
  }

  public stop() {
    this.activeBattle?.stop();
  }

  public pause() {
    if (!this.activeBattle) return;
    this.activeBattle.paused = true;
  }

  public async resume() {
    if (!this.activeBattle) return;
    this.activeBattle.paused = false;
    const battleSummary = await this.activeBattle.run();
    if (battleSummary) {
      this.activeBattle = null;
      return {
        seed: this.spec.seed,
        battles: [battleSummary],
      };
    }
    return undefined;
  }

  public step(stepSize = 1) {
    this.activeBattle?.run(stepSize);
  }
}

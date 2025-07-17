import { type AntFunction, Battle, type BattleContinuation } from '@/Battle.ts';
import type { GameSpec } from '@/GameSpec.ts';
import type { BattleSummary, GameSummary } from '@/GameSummary.ts';
import { getRNG, type RNGFunction } from '@/prng.ts';
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

export function instantiateParticipant(teamCode: string, teamName: string) {
  auditParticipant(teamCode);
  return safeEval(teamCode, teamName) as AntFunction;
}

export class Game {
  public id = 0;
  activeBattle: Battle | null = null;
  rng: RNGFunction;

  constructor(
    private spec: GameSpec,
    private readonly teamFunctions: AntFunction[],
  ) {
    this.id = Date.now();
    this.rng = getRNG(this.spec.seed);
    this.teamFunctions = teamFunctions;
  }

  public async run(pause = false): Promise<GameSummary | undefined> {
    console.log('Running game', this.spec, pause);

    const battleSummaries: BattleSummary[] = [];
    for (let i = 0; i < this.spec.numBattles && !this.stopRequested; i++) {
      const battleSeed = this.rng();
      if (battleSeed === 0) {
        console.warn('Battle seed is 0, trying again');
        i--;
        continue;
      }
      // Only pause the first battle
      this.activeBattle = new Battle(this.spec, this.teamFunctions, battleSeed, pause && i === 0);

      const battleSummary = await this.activeBattle.run();
      battleSummaries.push(battleSummary);
    }

    return {
      seed: this.spec.seed,
      battles: battleSummaries,
    };
  }

  private stopRequested = false;
  public skipBattle() {
    this.activeBattle?.stop();
  }

  public stopGame() {
    this.stopRequested = true;
    this.activeBattle?.stop();
  }

  public pause() {
    this.activeBattle?.pause();
  }

  public proceed(continuation: BattleContinuation) {
    this.activeBattle?.proceed(continuation);
    if (continuation.type === 'stop') {
      this.stopGame();
    }
  }
}

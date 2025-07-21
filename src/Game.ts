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

  public async run(pauseAfterTurns = -1): Promise<GameSummary | undefined> {
    console.log('Running game', this.spec, pauseAfterTurns);

    const battleSummaries: BattleSummary[] = [];
    for (let i = 0; i < this.spec.numBattles && !this.stopRequested; i++) {
      const battleSeed = this.rng();
      if (battleSeed === 0) {
        console.warn('Battle seed is 0, trying again');
        i--;
        continue;
      }
      const _pauseAfterTurns = this.activeBattle?.isPaused
        ? 1
        : !this.activeBattle
          ? pauseAfterTurns
          : -1;
      this.activeBattle = new Battle(
        this.spec,
        this.pickRandomTeamsForBattle(),
        battleSeed,
        _pauseAfterTurns,
      );

      const battleSummary = await this.activeBattle.run();
      postMessage({ type: 'battle-summary', summary: battleSummary });
      battleSummaries.push(battleSummary);
    }

    return {
      seed: this.spec.seed,
      battles: battleSummaries,
    };
  }

  // Note: Destructive on input array
  fisherYates<T extends object>(array: Array<T>) {
    let count = array.length,
      randomNumber,
      temp;
    while (count) {
      randomNumber = (((this.rng() % 10000) / 10000) * count--) | 0;
      temp = array[count];
      array[count] = array[randomNumber];
      array[randomNumber] = temp;
    }
    return array;
  }

  pickRandomTeamsForBattle() {
    const teamFunctions = this.fisherYates([...this.teamFunctions]);
    if (this.spec.numBattleTeams <= 1 || this.spec.numBattleTeams >= this.teamFunctions.length) {
      return teamFunctions;
    }
    return teamFunctions.slice(0, this.spec.numBattleTeams);
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

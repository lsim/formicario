import { type AntFunction, Battle, type BattleContinuation, produceBattleArgs } from '@/Battle.ts';
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

export function instantiateParticipant(teamCode: string) {
  auditParticipant(teamCode);
  return safeEval(teamCode) as AntFunction;
}

export class Game {
  public id = 0;
  activeBattle: Battle | null = null;
  rng: RNGFunction;
  private speed = 50;
  private gameOver = false;

  constructor(
    private spec: GameSpec | null,
    private readonly teamFunctions: { id: string; func: AntFunction }[],
    private readonly fillerTeamFunctions: { id: string; func: AntFunction }[],
  ) {
    this.id = Date.now();
    this.rng = getRNG(this.spec?.seed ?? 1);
  }

  public async run(pauseAfterTurns = -1): Promise<GameSummary | undefined> {
    if (this.spec != null) {
      console.log('Running standard game', this.spec, pauseAfterTurns);
      const battleSummaries: BattleSummary[] = [];
      for (let i = 0; i < this.spec.numBattles && !this.stopRequested; i++) {
        const battleSeed = this.rng();
        if (battleSeed === 0) {
          console.warn('Battle seed is 0, trying again');
          i--;
          continue;
        }
        const args = produceBattleArgs(this.spec, this.rng);
        const startNextPaused = this.activeBattle?.isPaused;
        this.activeBattle = new Battle(
          args,
          this.pickRandomTeamsForBattle(),
          battleSeed,
          i,
          startNextPaused ? 1 : -1,
        );
        this.activeBattle.setSpeed(this.speed);

        const battleSummary = await this.activeBattle.run();
        postMessage({ type: 'battle-summary', summary: battleSummary });
        battleSummaries.push(battleSummary);
      }
      this.gameOver = true;
      return {
        seed: this.spec.seed,
        battles: battleSummaries,
      };
    }
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

  // Picks randomly with preference for the teamFunctions - fills up with the filler teams
  pickRandomTeamsForBattle() {
    if (this.spec == null) return this.teamFunctions;
    const teamFunctions = this.fisherYates([...this.teamFunctions]);
    const fillerTeamFunctions = this.fisherYates([...this.fillerTeamFunctions]);
    const roster = [...teamFunctions, ...fillerTeamFunctions];
    return roster.slice(0, this.spec.numBattleTeams);
  }

  private stopRequested = false;

  public async skipBattle() {
    await this.activeBattle?.stop();
  }

  public async stopGame() {
    this.stopRequested = true;
    if (this.gameOver) return;
    await this.activeBattle?.stop();
  }

  public pause() {
    this.activeBattle?.pause();
  }

  public async proceed(continuation: BattleContinuation) {
    this.activeBattle?.proceed(continuation);
    if (continuation.type === 'stop') {
      await this.stopGame();
    }
  }

  public setSpeed(speed: number) {
    this.speed = speed;
    this.activeBattle?.setSpeed(speed);
  }
}

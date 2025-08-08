import { useWorker, type WorkerName } from '@/workers/WorkerDispatcher.ts';
import type { BattleArgs } from '@/Battle.ts';
import type { TeamWithCode } from '@/Team.ts';
import { filter, finalize, take, timeout } from 'rxjs';

export class BattleState {
  private running = true;
  private paused = false;

  public get isPaused() {
    return this.paused;
  }

  private endResolver: ((value: void | PromiseLike<void>) => void) | undefined;
  public readonly endPromise: Promise<void>;

  constructor(
    private readonly worker: ReturnType<typeof useWorker>,
    public readonly battleId: number,
    public readonly seed: number,
    public readonly args: BattleArgs,
    public readonly teams: TeamWithCode[],
    private readonly pauseAfterTurns: number,
  ) {
    this.paused = pauseAfterTurns > 0;

    this.endPromise = new Promise((resolve) => {
      this.endResolver = resolve;
    });

    worker.battleSummaries$
      .pipe(
        filter((summary) => {
          return summary.battleId === battleId;
        }),
        take(1),
        timeout(10 * 60 * 1000),
        finalize(() => {
          this.running = false;
          this.endResolver?.();
        }),
      )
      .subscribe();
  }

  pause() {
    this.paused = true;
    this.worker.pauseGame();
  }

  resume() {
    this.paused = false;
    this.worker.resumeGame();
  }

  step(steps = 1) {
    this.paused = true;
    this.worker.stepGame(steps);
  }

  async stop() {
    this.paused = false;
    await this.worker.stopGame();
  }
}

// This composable tracks the state of the single-battle runs
export default function useSingleBattle(workerId: WorkerName) {
  const worker = useWorker(workerId);

  let battleCounter = 0;

  async function runBattle(
    args: BattleArgs,
    teams: TeamWithCode[],
    seed: number,
    pauseAfterTurns: number = -1,
  ) {
    const battleId = battleCounter++;
    if (teams.length === 0) throw new Error('No teams selected');

    console.debug('Running single battle with id', battleId);
    await worker.runBattle({
      args,
      teams,
      seed,
      speed: worker.speed.value,
      pauseAfterTurns,
      battleId,
    });

    return new BattleState(worker, battleId, seed, args, teams, pauseAfterTurns);
  }

  return {
    runBattle,
  };
}

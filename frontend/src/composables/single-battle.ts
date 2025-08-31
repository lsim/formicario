import { useWorker, type WorkerName } from '@/workers/WorkerDispatcher.ts';
import type { BattleArgs } from '@/Battle.ts';
import type { TeamWithCode } from '@/Team.ts';
import { filter, finalize, type Observable, take } from 'rxjs';
import type { BattleStatus, BattleSummary, GameSummary } from '@/GameSummary.ts';
import type { GameSpec } from '@/GameSpec.ts';
import type { RunGameCommand } from '@/workers/WorkerMessage.ts';
import { useTeamStore } from '@/stores/teams.ts';
import { unref } from 'vue';

export class GameProxy {
  private paused = false;

  public get isPaused() {
    return this.paused;
  }

  private _lastBattleSummary: BattleSummary | undefined;

  public get lastBattleSummary() {
    return this._lastBattleSummary;
  }

  constructor(
    private readonly worker: ReturnType<typeof useWorker>,
    private readonly teamStore: ReturnType<typeof useTeamStore>,
    public readonly gameId: number,
    pauseAfterTurns: number,
    public readonly endPromise: Promise<void>,
  ) {
    this.paused = pauseAfterTurns > 0;
    this.worker.battleSummaries$.subscribe((summary) => {
      this._lastBattleSummary = summary;
    });
  }

  public get battleStatus$(): Observable<BattleStatus> {
    return this.worker.battleStatuses$;
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

  async skipBattle() {
    await this.worker.skipBattle();
  }

  restartSame(): Promise<GameProxy> {
    return new Promise(async (resolve) => {
      this.worker.battleSummaries$.pipe(take(1)).subscribe(async (summary) => {
        // When the next battle ends, start it right up again
        const battleId = summary.battleId + 100;
        await this.worker.runBattle({
          args: summary.args,
          teams: summary.teams.map((t) => {
            const team = this.teamStore.localTeams.find((lt) => lt.id === t.id);
            if (!team) throw new Error('Team not found');
            return { ...team, code: team.code! };
          }),
          seed: summary.seed,
          speed: unref(this.worker.speed),
          pauseAfterTurns: this.paused ? 1 : -1,
          gameId: this.gameId,
          battleId,
          isTest: true,
        });

        const endPromise = getBattleEndPromise(battleId, this.worker.battleSummaries$);

        resolve(
          new GameProxy(
            this.worker,
            this.teamStore,
            this.gameId + 100,
            this.paused ? 1 : -1,
            endPromise,
          ),
        );
      });

      // Now make sure the game ends, so we can get info from the summary
      await this.stop();
    });
  }
}

function getBattleEndPromise(battleId: number, battleSummaries$: Observable<BattleSummary>) {
  return new Promise<void>((resolve) => {
    battleSummaries$
      .pipe(
        filter((summary) => {
          return summary.battleId === battleId;
        }),
        take(1),
        finalize(() => {
          resolve();
        }),
      )
      .subscribe();
  });
}

function getGameEndPromise(gameId: number, gameSummaries$: Observable<GameSummary>) {
  return new Promise<void>((resolve) => {
    gameSummaries$
      .pipe(
        filter((summary) => {
          return summary.gameId === gameId;
        }),
        take(1),
        finalize(() => {
          resolve();
        }),
      )
      .subscribe();
  });
}

// This composable tracks the state of the single-battle runs
export default function useSingleBattle(workerId: WorkerName) {
  const worker = useWorker(workerId);
  const teamStore = useTeamStore();

  let battleCounter = 0;

  async function replayFromSummary(summary: BattleSummary, startPaused: boolean = false) {
    const teamIds = summary.teams.map((t) => t.id);
    const teams = (await Promise.all(
      teamIds.map(async (n) => {
        const localTeam = teamStore.localTeams.find((t) => t.id === n);
        if (localTeam) return localTeam;
        else throw new Error('Can only replay battles with local teams');
      }),
    )) as TeamWithCode[];

    return await runBattle(summary.args, teams, summary.seed, startPaused ? 1 : -1, false);
  }

  async function runBattle(
    args: BattleArgs,
    teams: TeamWithCode[],
    seed: number,
    pauseAfterTurns: number = -1,
    isTest: boolean = false,
  ) {
    const battleId = battleCounter++;
    if (teams.length === 0) throw new Error('No teams selected');
    const dummyGameId = battleCounter++;

    await worker.runBattle({
      args,
      teams,
      seed,
      speed: worker.speed.value,
      pauseAfterTurns,
      battleId,
      gameId: dummyGameId,
      isTest,
    });
    const endPromise = getBattleEndPromise(battleId, worker.battleSummaries$);

    return new GameProxy(worker, teamStore, dummyGameId, pauseAfterTurns, endPromise);
  }

  async function runDemoGame(gameSpec: GameSpec, pauseAfterTurns = -1) {
    const gameId = battleCounter++;
    const message = {
      game: {
        ...gameSpec,
      },
      pauseAfterTurns,
      speed: worker.speed.value,
      gameId,
      isTest: true,
    };
    await worker.startGame(message as Omit<RunGameCommand, 'id' | 'type'>);

    const endPromise = getGameEndPromise(gameId, worker.gameSummaries$);
    return new GameProxy(worker, teamStore, gameId, pauseAfterTurns, endPromise);
  }

  return {
    runDemoGame,
    replayFromSummary,
  };
}

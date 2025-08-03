import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import type { GameSpec } from '@/GameSpec.ts';
import type { RunGameCommand } from '@/workers/WorkerMessage.ts';
import { useTeamStore } from '@/stores/teams.ts';
import {
  type BattleStats,
  type BattleSummaryStats,
  type TeamStat,
  useStats,
} from '@/composables/stats.ts';
import type { BattleStatus } from '@/GameSummary.ts';
import { filter, finalize, Observable, ReplaySubject, take, timeout } from 'rxjs';
import type { BattleArgs } from '@/Battle.ts';
import type { TeamWithCode } from '@/Team.ts';
import { useStorage, watchDebounced } from '@vueuse/core';

export const useGameStore = defineStore('game', () => {
  const worker = useWorker();
  const teamStore = useTeamStore();
  const stats = useStats();

  const gameSpec: GameSpec = reactive<GameSpec>({
    mapWidth: [128, 256],
    mapHeight: [128, 256],
    newFoodSpace: [10, 20],
    newFoodMin: [10, 30],
    newFoodDiff: [5, 20],
    halfTimeTurn: 10000,
    halfTimePercent: 60,
    startAnts: [15, 40],
    timeOutTurn: 20000,
    winPercent: 75,
    statusInterval: 100,
    numBattles: 3,
    seed: (Math.random() * 4294967295) >>> 0,
    teams: [],
    numBattleTeams: 5,
  });

  // We leak this subscription as it is a singleton
  worker.gameSummaries$.subscribe(() => {
    gameRunning.value = false;
  });

  // Replay the last set of streams, so components can get them even though the battle has already started
  const battleStreams$ = ref(
    new ReplaySubject<
      [
        // Stream of battle status updates from the worker
        Observable<BattleStatus>,
        // Stream of battle summary emissions from the worker enriched with statistics
        Observable<BattleSummaryStats>,
        // Stream of battle statistics updates from the stats aggregation
        Observable<BattleStats>,
      ]
    >(1),
  );

  const gameRunning = ref(false);
  const battleReplaying = ref(false);
  const gamePaused = ref(false);
  const selectedStatusProperty = ref<TeamStat>('numAnts');
  const lastError = ref<string[]>([]);
  const liveFeed = ref(true);
  const selectedBattleSummaryStats = ref<BattleSummaryStats | null>(null);
  const speed = useStorage('speed', 50, sessionStorage);

  async function start(pauseAfterTurns = -1) {
    selectedBattleSummaryStats.value = null;
    // Select battle teams among local and built-in teams
    const battleTeams =
      teamStore.battleTeams.length === 0 ? teamStore.localTeams : teamStore.battleTeams;
    if (gameRunning.value || battleReplaying.value) return;
    const message = {
      game: {
        ...gameSpec,
        teams: [...battleTeams.map((t) => ({ id: t.id, code: t.code }))],
        seed: gameSpec.seed,
        statusInterval: !liveFeed.value ? 100 : gameSpec.statusInterval,
        numBattles: gameSpec.numBattles,
      },
      pauseAfterTurns,
      speed: speed.value,
    };
    gameRunning.value = true;
    battleStreams$.value.next([
      worker.battleStatuses$,
      stats.expandedBattleSummaries$,
      stats.aggregatedBattleStats$,
    ]);
    lastError.value = [];
    await worker.startGame(message as Omit<RunGameCommand, 'id' | 'type'>);

    gameSpec.seed++;
  }

  async function stop() {
    if (!gameRunning.value && !battleReplaying.value) return;
    await worker.stopGame();
    gamePaused.value = false;
    gameRunning.value = false;
    battleReplaying.value = false;
  }

  async function pause() {
    if (!gameRunning.value && !battleReplaying.value) return;
    await worker.pauseGame();
    gamePaused.value = true;
  }

  async function resume() {
    if (!gameRunning.value && !battleReplaying.value) return;
    await worker.resumeGame();
    gamePaused.value = false;
  }

  async function step() {
    gamePaused.value = true;
    if (!gameRunning.value && !battleReplaying.value) {
      await start(speed.value);
    } else {
      await worker.stepGame(speed.value);
    }
  }

  async function skipBattle() {
    if (!gameRunning.value && !battleReplaying.value) return;
    await worker.skipBattle();
  }

  async function runBattle(
    args: BattleArgs,
    teams: TeamWithCode[],
    seed: number,
    pauseAfterTurns: number = -1,
  ) {
    if (gameRunning.value || battleReplaying.value) return;
    if (teams.length === 0) throw new Error('No teams selected');
    battleReplaying.value = true;
    lastError.value = [];
    gamePaused.value = pauseAfterTurns > 0;
    worker.battleSummaries$
      .pipe(
        filter((summary) => summary.seed === seed),
        take(1),
        timeout(10 * 60 * 1000),
        finalize(() => (battleReplaying.value = false)),
      )
      .subscribe();
    console.debug('Rerunning battle');
    await worker.runBattle({
      args,
      teams,
      seed,
      pauseAfterTurns,
    });
    console.debug('Rerun started');
  }

  watchDebounced(
    () => speed.value,
    async (newSpeed) => {
      await worker.setSpeed(newSpeed);
    },
    { debounce: 300 },
  );

  return {
    gameSpec,
    gameRunning,
    battleReplaying,
    gamePaused,
    lastError,
    liveFeed,
    selectedStatusProperty,
    battleStreams$,
    selectedBattleSummaryStats,
    speed,

    start,
    stop,
    pause,
    step,
    resume,
    skipBattle,
    runBattle,
  };
});

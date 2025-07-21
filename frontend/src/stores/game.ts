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
import { Observable, ReplaySubject } from 'rxjs';

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
    statusInterval: 20,
    numBattles: 3,
    seed: (Math.random() * 4294967295) >>> 0,
    teams: [],
    numBattleTeams: 5,
  });

  // We leak this subscription as it is a singleton
  worker.gameSummarySubject$.subscribe(() => {
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
  const gamePaused = ref(false);
  const selectedStatusProperty = ref<TeamStat>('numAnts');
  const lastError = ref<string[]>([]);
  const liveFeed = ref(true);

  async function start(pauseAfterTurns = -1) {
    const battleTeams =
      teamStore.battleTeams.length === 0 ? teamStore.allTeams : teamStore.battleTeams;
    if (gameRunning.value) return;
    const message = {
      game: {
        ...gameSpec,
        teams: [...battleTeams.map((t) => ({ name: t.name, code: t.code }))],
        seed: gameSpec.seed,
        statusInterval: !liveFeed.value ? 100 : gameSpec.statusInterval,
        numBattles: gameSpec.numBattles,
      },
      pauseAfterTurns,
    };
    gameRunning.value = true;
    battleStreams$.value.next([
      worker.battleStatusSubject$.asObservable(),
      stats.expandedBattleSummaries$,
      stats.aggregatedBattleStats,
    ]);
    await worker.startGame(message as Omit<RunGameCommand, 'id' | 'type'>);

    gameSpec.seed++;
    lastError.value = [];
  }

  async function stop() {
    if (!gameRunning.value) return;
    await worker.stopGame();
    gamePaused.value = false;
    gameRunning.value = false;
  }

  async function pause() {
    if (!gameRunning.value) return;
    await worker.pauseGame();
    gamePaused.value = true;
  }

  async function resume() {
    if (!gameRunning.value) return;
    await worker.resumeGame();
    gamePaused.value = false;
  }

  async function step(numTurns = -1) {
    gamePaused.value = true;
    if (!gameRunning.value) {
      await start(numTurns);
    } else {
      await worker.stepGame(numTurns);
    }
  }

  async function skipBattle() {
    if (!gameRunning.value) return;
    await worker.skipBattle();
  }

  return {
    gameSpec,
    gameRunning,
    gamePaused,
    lastError,
    liveFeed,
    selectedStatusProperty,
    battleStreams$,

    start,
    stop,
    pause,
    step,
    resume,
    skipBattle,
  };
});

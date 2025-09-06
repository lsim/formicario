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
import { filter, firstValueFrom, Observable, ReplaySubject } from 'rxjs';
import { watchDebounced } from '@vueuse/core';
import useApiClient from '@/composables/api-client.ts';
import useToast from '@/composables/toast.ts';
import { BattleParticipant, BattleResult } from '#shared/BattleResult.ts';

export const useGameStore = defineStore('game', () => {
  const worker = useWorker('game-worker');
  const teamStore = useTeamStore();
  const apiClient = useApiClient();
  const stats = useStats();
  const toast = useToast();
  const gameCounter = ref(0);

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
    fillers: [],
    numBattleTeams: 5,
  });

  // We leak this subscription as it is a singleton
  worker.battleSummaries$.subscribe(async (battleSummary) => {
    const battleParticipants = battleSummary.teams.map((team) => {
      // We insist that teams be published (or be built-in) before they can take part in a ranked battle
      const builtInTeam = teamStore.localTeams.find(
        (t) =>
          t.authorName && teamStore.isBuiltIn({ authorName: t.authorName }) && t.id === team.id,
      );
      if (builtInTeam)
        return new BattleParticipant(
          builtInTeam.id,
          builtInTeam.name,
          builtInTeam.color,
          0,
          team.codeHash,
        );
      const remoteTeam = teamStore.remoteTeams.find((t) => t.id === team.id);
      if (remoteTeam)
        return new BattleParticipant(
          remoteTeam.id,
          remoteTeam.name,
          remoteTeam.color,
          remoteTeam.lamport,
          team.codeHash,
        );
      throw Error('Team not published?: ' + team.id);
    });

    const bs = new BattleResult(
      battleParticipants,
      battleSummary.turns,
      battleSummary.startTime,
      battleSummary.winner,
    );
    try {
      const numSubmitted = await apiClient.submitBattleResult(bs);
      if (numSubmitted > 0) toast.show(`Done submitting ${numSubmitted} battles`, 'is-info');
    } catch (e) {
      console.error('Failed to submit battle summary', e);
    }
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
  const selectedBattleSummaryStats = ref<BattleSummaryStats | null>(null);

  async function start(pauseAfterTurns = -1) {
    selectedBattleSummaryStats.value = null;
    if (gameRunning.value) return;
    const gameId = gameCounter.value++;
    const message = {
      game: {
        ...gameSpec,
        teams: [...teamStore.battleTeams.map((t) => ({ id: t.id, code: t.code }))],
        fillers: [...teamStore.localTeams.map((t) => ({ id: t.id, code: t.code }))],
        seed: gameSpec.seed,
        speed: worker.speed.value,
        statusInterval: !liveFeed.value ? 100 : gameSpec.statusInterval,
        numBattles: gameSpec.numBattles,
      },
      pauseAfterTurns,
      speed: worker.speed.value,
      gameId,
      isTest: false,
      isRanked: true,
    };
    gameRunning.value = true;
    battleStreams$.value.next([
      worker.battleStatuses$,
      stats.expandedBattleSummaries$,
      stats.aggregatedBattleStats$,
    ]);
    firstValueFrom(worker.gameSummaries$.pipe(filter((summary) => summary.gameId === gameId))).then(
      () => {
        gameRunning.value = false;
      },
    );
    lastError.value = [];
    await worker.startGame(message as Omit<RunGameCommand, 'id' | 'type'>);

    gameSpec.seed++;
  }

  async function stop() {
    await worker.stopGame();
    gamePaused.value = false;
    gameRunning.value = false;
  }

  async function pause() {
    await worker.pauseGame();
    gamePaused.value = true;
  }

  async function resume() {
    await worker.resumeGame();
    gamePaused.value = false;
  }

  async function step(steps = 0) {
    gamePaused.value = true;
    if (!gameRunning.value) {
      await start(steps || worker.speed.value || 1);
    } else {
      await worker.stepGame(steps || worker.speed.value || 1);
    }
  }

  async function skipBattle() {
    if (!gameRunning.value) return;
    await worker.skipBattle();
  }

  watchDebounced(
    () => worker.speed.value,
    async (newSpeed) => {
      await worker.setSpeed(newSpeed);
    },
    { debounce: 300 },
  );

  return {
    gameSpec,
    gameRunning,
    gamePaused,
    lastError,
    liveFeed,
    selectedStatusProperty,
    battleStreams$,
    selectedBattleSummaryStats,
    speed: worker.speed,

    start,
    stop,
    pause,
    step,
    resume,
    skipBattle,
  };
});

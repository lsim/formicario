import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import type { GameSpec } from '@/GameSpec.ts';
import type { RunGameCommand } from '@/workers/WorkerMessage.ts';
import { useTeamStore } from '@/stores/teams.ts';

export const useGameStore = defineStore('game', () => {
  const worker = useWorker();
  const teamStore = useTeamStore();

  const gameSpec: GameSpec = reactive<GameSpec>({
    mapWidth: [128, 512],
    mapHeight: [128, 512],
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

  const gameRunning = ref(false);
  const gamePaused = ref(false);

  const lastError = ref<string[]>([]);
  const liveFeed = ref(true);

  async function start() {
    if (teamStore.battleTeams.length === 0) {
      lastError.value = ['No teams selected'];
      return;
    }
    const message = {
      game: {
        ...gameSpec,
        teams: [...teamStore.battleTeams.map((t) => ({ name: t.name, code: t.code }))],
        seed: gameSpec.seed,
        statusInterval: !liveFeed.value ? -1 : gameSpec.statusInterval,
        numBattles: gameSpec.numBattles,
      },
      pause: gamePaused.value,
    };
    gameRunning.value = true;
    await worker.startGame(message as Omit<RunGameCommand, 'id' | 'type'>);
    gameSpec.seed++;
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

  async function step(numTurns: number) {
    gamePaused.value = true;
    if (!gameRunning.value) {
      await start();
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

    start,
    stop,
    pause,
    step,
    resume,
    skipBattle,
  };
});

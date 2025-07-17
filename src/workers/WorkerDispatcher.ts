import Worker from './worker?worker';
import type {
  AntInfoReplyMessage,
  AntInfoRequestMessage,
  DebugReplyMessage,
  DebugRequestMessage,
  RunGameCommand,
  StepGameCommand,
  WorkerMessage,
} from '@/workers/WorkerMessage.ts';
import { Subject } from 'rxjs';
import type { BattleStatus, GameSummary } from '@/GameSummary.ts';
import type { AntData } from '@/Battle.ts';
import type { Team } from '@/Team.ts';
import { deepUnref } from 'vue-deepunref';

const battleStatusSubject = new Subject<BattleStatus>();
const gameSummarySubject = new Subject<GameSummary>();
const debugAntsSubject = new Subject<AntData[]>();

const worker = new Worker();
let messageCount = 0;
const pendingCommands = new Map<number, (message: WorkerMessage) => void>();

worker.onmessage = (e) => {
  if (e.data.type === 'battle-status') {
    battleStatusSubject.next(e.data.status);
  } else if (e.data.type === 'game-summary') {
    gameSummarySubject.next(e.data.results);
  } else {
    if (e.data.type === 'debug-reply') debugAntsSubject.next(e.data.ants);

    const handler = pendingCommands.get(e.data.id);
    if (handler) {
      handler(e.data);
      pendingCommands.delete(e.data.id);
    } else {
      console.log('Worker sent unexpected message', e.data);
    }
  }
};

function queueMessage<T extends WorkerMessage>(message: Omit<T, 'id'>): Promise<WorkerMessage> {
  return new Promise((resolve, reject) => {
    const id = ++messageCount;
    pendingCommands.set(id, (message: WorkerMessage) => {
      if (message.type === 'error') reject(message.error);
      else resolve(message);
    });
    worker.postMessage({ ...deepUnref(message), id });
  });
}

export async function startGame(message: Omit<RunGameCommand, 'type' | 'id'>) {
  await queueMessage({ ...message, type: 'run-game' });
}

async function stopGame() {
  await queueMessage({ type: 'stop-game' });
}

async function skipBattle() {
  await queueMessage({ type: 'skip-battle' });
}

async function pauseGame() {
  await queueMessage({ type: 'pause-game' });
}

async function resumeGame() {
  await queueMessage({ type: 'resume-game' });
}

async function stepGame(stepSize: number = 1) {
  await queueMessage<StepGameCommand>({ type: 'step-game', stepSize });
}

async function getDebugAnts(x?: number, y?: number) {
  const reply = (await queueMessage<DebugRequestMessage>({
    type: 'debug-request',
    x,
    y,
  })) as DebugReplyMessage;
  return reply.ants;
}

async function getTeamInfo(team: Team) {
  const reply = (await queueMessage<AntInfoRequestMessage>({
    type: 'ant-info-request',
    teamCode: team.code,
    teamName: team.name,
  })) as AntInfoReplyMessage;
  return reply.info;
}

export function useWorker() {
  return {
    battleStatusSubject,
    debugAntsSubject,
    gameSummarySubject,
    getDebugAnts,
    getTeamInfo,
    pauseGame,
    queueMessage,
    resumeGame,
    skipBattle,
    startGame,
    stopGame,
    stepGame,
  };
}

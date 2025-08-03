import Worker from './worker.ts?worker';
import type {
  AntInfoReplyMessage,
  AntInfoRequestMessage,
  DebugReplyMessage,
  DebugRequestMessage,
  RunBattleMessage,
  RunGameCommand,
  SetSpeedMessage,
  StepGameCommand,
  WorkerMessage,
} from '@/workers/WorkerMessage.ts';
import { ReplaySubject, Subject } from 'rxjs';
import type { BattleStatus, BattleSummary, GameSummary } from '@/GameSummary.ts';
import type { AntData } from '@/Battle.ts';
import type { TeamWithCode } from '@/Team.ts';
import { deepUnref } from 'vue-deepunref';

const battleStatusSubject$ = new Subject<BattleStatus>();
const battleSummarySubject$ = new Subject<BattleSummary>();
const gameSummarySubject$ = new ReplaySubject<GameSummary>(1);
const debugAntsSubject$ = new Subject<AntData[]>();

const worker = new Worker();
let messageCount = 0;
const pendingCommands = new Map<number, (message: WorkerMessage) => void>();

worker.onmessage = (e) => {
  try {
    if (e.data.type === 'battle-status') {
      battleStatusSubject$.next(e.data.status);
    } else if (e.data.type === 'game-summary') {
      console.debug('Emitting game summary', e.data.results);
      gameSummarySubject$.next(e.data.results);
      console.debug('Emitted game summary');
    } else if (e.data.type === 'battle-summary') {
      console.debug('Emitting battle summary', e.data.summary);
      battleSummarySubject$.next(e.data.summary);
      console.debug('Emitted battle summary');
    } else {
      if (e.data.type === 'debug-reply') debugAntsSubject$.next(e.data.ants);

      const handler = pendingCommands.get(e.data.id);
      if (handler) {
        handler(e.data);
        pendingCommands.delete(e.data.id);
      } else {
        console.log('Worker sent unexpected message', e.data);
      }
    }
  } catch (e) {
    console.error('Worker error', e);
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

async function runBattle(message: Omit<RunBattleMessage, 'type' | 'id'>) {
  await queueMessage({ ...message, type: 'run-battle' });
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

async function getTeamInfo(team: TeamWithCode) {
  const reply = (await queueMessage<AntInfoRequestMessage>({
    type: 'ant-info-request',
    teamCode: team.code,
    teamId: team.id,
  })) as AntInfoReplyMessage;
  return reply.info;
}

async function setSpeed(speed: number) {
  await queueMessage<SetSpeedMessage>({ type: 'set-speed', speed });
}

export function useWorker() {
  return {
    battleStatuses$: battleStatusSubject$.asObservable(),
    battleSummaries$: battleSummarySubject$.asObservable(),
    debugAnts$: debugAntsSubject$.asObservable(),
    gameSummaries$: gameSummarySubject$.asObservable(),
    getDebugAnts,
    getTeamInfo,
    pauseGame,
    resumeGame,
    skipBattle,
    runBattle,
    startGame,
    stopGame,
    stepGame,
    setSpeed,
  };
}

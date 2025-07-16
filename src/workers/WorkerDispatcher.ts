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
import type { Team } from '@/stores/teams.ts';

const worker = new Worker();
let messageCount = 0;
const pendingCommands = new Map<number, (message: WorkerMessage) => void>();

export const battleStatusSubject = new Subject<BattleStatus>();
export const gameSummarySubject = new Subject<GameSummary>();
export const debugAntsSubject = new Subject<AntData[]>();

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
    worker.postMessage({ ...message, id });
  });
}

export async function startGame(message: Omit<RunGameCommand, 'type' | 'id'>) {
  await queueMessage({ ...message, type: 'run-game' });
}

export async function stopGame() {
  await queueMessage({ type: 'stop-game' });
}

export async function skipBattle() {
  await queueMessage({ type: 'skip-battle' });
}

export async function pauseGame() {
  await queueMessage({ type: 'pause-game' });
}

export async function resumeGame() {
  await queueMessage({ type: 'resume-game' });
}

export async function stepGame(stepSize: number) {
  await queueMessage<StepGameCommand>({ type: 'step-game', stepSize });
}

export async function getDebugAnts(x?: number, y?: number) {
  const reply = (await queueMessage<DebugRequestMessage>({
    type: 'debug-request',
    x,
    y,
  })) as DebugReplyMessage;
  return reply.ants;
}

export async function getTeamInfo(team: Team) {
  const reply = (await queueMessage<AntInfoRequestMessage>({
    type: 'ant-info-request',
    teamCode: team.code,
    teamName: team.name,
  })) as AntInfoReplyMessage;
  return reply.info;
}

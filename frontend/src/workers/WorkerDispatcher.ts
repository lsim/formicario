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
  TestLogMessage,
  WorkerMessage,
} from '@/workers/WorkerMessage.ts';
import { ReplaySubject, Subject } from 'rxjs';
import type { BattleStatus, BattleSummary, GameSummary } from '@/GameSummary.ts';
import type { AntData } from '@/Battle.ts';
import type { TeamWithCode } from '@/Team.ts';
import { deepUnref } from 'vue-deepunref';
import { type Ref, watch } from 'vue';
import { useStorage } from '@vueuse/core';
import useBattleRenderer from '@/composables/renderer.ts';

export class WorkerDispatcher {
  private readonly battleStatusSubject$ = new Subject<BattleStatus>();
  private readonly battleSummarySubject$ = new Subject<BattleSummary>();
  private readonly gameSummarySubject$ = new ReplaySubject<GameSummary>(1);
  private readonly debugAntsSubject$ = new Subject<AntData[]>();
  private readonly testLogSubject$ = new Subject<TestLogMessage>();
  private readonly worker = new Worker();
  private messageCount = 0;
  private readonly pendingCommands = new Map<number, (message: WorkerMessage) => void>();

  public readonly speed: Ref<number, number>;

  // For each worker, we maintain a rendering of the current state of the battle
  private backBuffer = document.createElement('canvas');
  public get renderedBattle() {
    return this.backBuffer;
  }
  private backBufferCtx = this.backBuffer.getContext('2d') as CanvasRenderingContext2D;
  private lastKnownBattleId = -1;

  private renderer = useBattleRenderer();

  constructor(public readonly workerId: string) {
    console.log('Creating a worker...', workerId);
    this.speed = useStorage(`${workerId}-speed`, 50);
    this.handleWorkerMessages();
  }

  private handleWorkerMessages() {
    this.worker.onmessage = (e) => {
      try {
        if (e.data.type === 'battle-status') {
          this.renderBattleStatus(e.data.status);
          this.battleStatusSubject$.next(e.data.status);
        } else if (e.data.type === 'game-summary') {
          console.debug('Emitting game summary', this.workerId, e.data.results);
          this.lastKnownBattleId = -1;
          this.gameSummarySubject$.next(e.data.results);
        } else if (e.data.type === 'battle-summary') {
          console.debug('Emitting battle summary', this.workerId, e.data.summary);
          this.battleSummarySubject$.next(e.data.summary);
        } else if (e.data.type === 'test-log') {
          this.testLogSubject$.next(e.data);
        } else {
          if (e.data.type === 'debug-reply') this.debugAntsSubject$.next(e.data.ants);

          const handler = this.pendingCommands.get(e.data.id);
          if (handler) {
            handler(e.data);
            this.pendingCommands.delete(e.data.id);
          } else {
            console.log(this.workerId + ' sent unexpected message', e.data);
          }
        }
      } catch (e) {
        console.error(this.workerId + ' error', e);
      }
    };

    watch(this.speed, (newSpeed) => {
      this.worker.postMessage({ type: 'set-speed', speed: newSpeed });
    });
  }

  private renderBattleStatus(status: BattleStatus) {
    if (status.battleId !== this.lastKnownBattleId) {
      // A new battle started - reset the back buffer
      this.backBuffer.width = status.args.mapWidth;
      this.backBuffer.height = status.args.mapHeight;
      this.backBufferCtx.clearRect(0, 0, this.backBuffer.width, this.backBuffer.height);
      this.renderer.setTeamColors(status.teams.map((t) => t.color));
      this.lastKnownBattleId = status.battleId;
    }
    this.renderer.renderDeltasToBackBuffer(status.deltaSquares, status.args, this.backBufferCtx);
  }

  private queueMessage<T extends WorkerMessage>(message: Omit<T, 'id'>): Promise<WorkerMessage> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageCount;
      this.pendingCommands.set(id, (message: WorkerMessage) => {
        if (message.type === 'error') reject(message.error);
        else resolve(message);
      });
      this.worker.postMessage({ ...deepUnref(message), id });
    });
  }

  async startGame(message: Omit<RunGameCommand, 'type' | 'id'>) {
    await this.queueMessage({ ...message, type: 'run-game' });
  }

  async stopGame() {
    await this.queueMessage({ type: 'stop-game' });
  }

  async skipBattle() {
    await this.queueMessage({ type: 'skip-battle' });
  }

  async runBattle(message: Omit<RunBattleMessage, 'type' | 'id'>) {
    await this.queueMessage({ ...message, type: 'run-battle' });
  }

  async pauseGame() {
    await this.queueMessage({ type: 'pause-game' });
  }

  async resumeGame() {
    await this.queueMessage({ type: 'resume-game' });
  }

  async stepGame(stepSize: number = 1) {
    await this.queueMessage<StepGameCommand>({ type: 'step-game', stepSize });
  }

  async getDebugAnts(x?: number, y?: number) {
    const reply = (await this.queueMessage<DebugRequestMessage>({
      type: 'debug-request',
      x,
      y,
    })) as DebugReplyMessage;
    return reply.ants;
  }

  async getTeamInfo(team: TeamWithCode) {
    const reply = (await this.queueMessage<AntInfoRequestMessage>({
      type: 'ant-info-request',
      teamCode: team.code,
      teamId: team.id,
    })) as AntInfoReplyMessage;
    return reply.info;
  }

  async setSpeed(speed: number) {
    this.speed.value = speed;
    await this.queueMessage<SetSpeedMessage>({ type: 'set-speed', speed });
  }

  public get battleStatuses$() {
    return this.battleStatusSubject$.asObservable();
  }

  // battleSummaries$: battleSummarySubject$.asObservable(),
  public get battleSummaries$() {
    return this.battleSummarySubject$.asObservable();
  }

  // debugAnts$: debugAntsSubject$.asObservable(),
  public get debugAnts$() {
    return this.debugAntsSubject$.asObservable();
  }

  // gameSummaries$: gameSummarySubject$.asObservable(),
  public get gameSummaries$() {
    return this.gameSummarySubject$.asObservable();
  }

  // testLogSubject$: testLogSubject$.asObservable(),
  public get testLogs$() {
    return this.testLogSubject$.asObservable();
  }
}

const workerDispatchers = new Map<string, WorkerDispatcher>();

export type WorkerName = 'game-worker' | 'replay-worker' | 'debug-worker';

export function useWorker(workerName: WorkerName) {
  if (!workerDispatchers.has(workerName)) {
    workerDispatchers.set(workerName, new WorkerDispatcher(workerName));
  }
  return workerDispatchers.get(workerName)!;
}

import type { IGameSpec } from '@/GameSpec.ts'

export type WorkerCommandType = 'run-game';

export interface WorkerCommand {
  type: WorkerCommandType;
}

export interface RunGameCommand extends WorkerCommand {
  type: 'run-game';
  game: IGameSpec;
}

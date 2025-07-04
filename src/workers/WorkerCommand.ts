import type { GameSpec } from '@/GameSpec.ts';

export type WorkerCommandType = 'run-game';

declare type TypedCommand = {
  type: WorkerCommandType;
};

export interface RunGameCommand extends TypedCommand {
  type: 'run-game';
  game: GameSpec;
}

declare type CommandMap = {
  RunGameCommand: RunGameCommand;
};

export type WorkerCommand = CommandMap[keyof CommandMap];

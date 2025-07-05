import type { GameSpec } from '@/GameSpec.ts';
import type { BattleStatus, GameSummary } from '@/GameSummary.ts';

export type WorkerMessageType = 'run-game' | 'game-summary' | 'battle-status';

declare type TypedMessage = {
  type: WorkerMessageType;
};

export interface RunGameCommand extends TypedMessage {
  type: 'run-game';
  game: GameSpec;
}

export interface GameSummaryMessage extends TypedMessage {
  type: 'game-summary';
  results: GameSummary;
}

export interface BattleStatusMessage extends TypedMessage {
  type: 'battle-status';
  status: BattleStatus;
}

declare type CommandMap = {
  RunGameCommand: RunGameCommand;
  GameSummaryMessage: GameSummaryMessage;
  BattleStatusMessage: BattleStatusMessage;
};

export type WorkerMessage = CommandMap[keyof CommandMap];

import type { GameSpec } from '@/GameSpec.ts';
import type { BattleStatus, GameSummary } from '@/GameSummary.ts';

export type WorkerMessageType = 'run-game' | 'game-summary' | 'battle-status' | 'stop-game' | 'ok';

declare type TypedMessage = {
  type: WorkerMessageType;
};

export interface RunGameCommand extends TypedMessage {
  type: 'run-game';
  game: GameSpec;
}

export interface StopGameCommand extends TypedMessage {
  type: 'stop-game';
}

export interface GameSummaryMessage extends TypedMessage {
  type: 'game-summary';
  results: GameSummary;
}

export interface BattleStatusMessage extends TypedMessage {
  type: 'battle-status';
  status: BattleStatus;
}

export interface OkReply extends TypedMessage {
  type: 'ok';
}

declare type CommandMap = {
  RunGameCommand: RunGameCommand;
  GameSummaryMessage: GameSummaryMessage;
  BattleStatusMessage: BattleStatusMessage;
  StopGameCommand: StopGameCommand;
  OkReply: OkReply;
};

export type WorkerMessage = CommandMap[keyof CommandMap];

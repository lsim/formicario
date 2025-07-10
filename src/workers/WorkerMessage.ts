import type { GameSpec } from '@/GameSpec.ts';
import type { BattleStatus, GameSummary } from '@/GameSummary.ts';
import type { AntData } from '@/Battle.ts';

export type WorkerMessageType =
  | 'run-game'
  | 'game-summary'
  | 'battle-status'
  | 'stop-game'
  | 'pause-game'
  | 'resume-game'
  | 'step-game'
  | 'debug-request'
  | 'debug-reply'
  | 'ok';

declare type TypedMessage = {
  type: WorkerMessageType;
};

export interface RunGameCommand extends TypedMessage {
  type: 'run-game';
  game: GameSpec;
  pause?: boolean;
}

export interface StopGameCommand extends TypedMessage {
  type: 'stop-game';
}

export interface PauseGameCommand extends TypedMessage {
  type: 'pause-game';
}

export interface ResumeGameCommand extends TypedMessage {
  type: 'resume-game';
}

export interface StepGameCommand extends TypedMessage {
  type: 'step-game';
  stepSize: number;
}

export interface GameSummaryMessage extends TypedMessage {
  type: 'game-summary';
  results: GameSummary;
}

export interface BattleStatusMessage extends TypedMessage {
  type: 'battle-status';
  status: BattleStatus;
}

export interface DebugRequestMessage extends TypedMessage {
  type: 'debug-request';
}

export interface DebugReplyMessage extends TypedMessage {
  type: 'debug-reply';
  ants: AntData[];
}

export interface OkReply extends TypedMessage {
  type: 'ok';
}

declare type CommandMap = {
  RunGameCommand: RunGameCommand;
  GameSummaryMessage: GameSummaryMessage;
  BattleStatusMessage: BattleStatusMessage;
  StopGameCommand: StopGameCommand;
  PauseGameCommand: PauseGameCommand;
  ResumeGameCommand: ResumeGameCommand;
  StepGameCommand: StepGameCommand;
  DebugRequestMessage: DebugRequestMessage;
  DebugReplyMessage: DebugReplyMessage;
  OkReply: OkReply;
};

export type WorkerMessage = CommandMap[keyof CommandMap];

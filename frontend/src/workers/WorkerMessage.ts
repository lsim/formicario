import type { GameSpec } from '@/GameSpec.ts';
import type { BattleStatus, BattleSummary, GameSummary } from '@/GameSummary.ts';
import type { AntData, AntDescriptor, BattleArgs } from '@/Battle.ts';
import type { TeamWithCode } from '@/Team.ts';

export type WorkerMessageType =
  | 'run-game'
  | 'game-summary'
  | 'battle-status'
  | 'battle-summary'
  | 'stop-game'
  | 'pause-game'
  | 'resume-game'
  | 'step-game'
  | 'debug-request'
  | 'debug-reply'
  | 'ant-info-request'
  | 'ant-info-reply'
  | 'skip-battle'
  | 'run-battle'
  | 'test-log'
  | 'set-speed'
  | 'error'
  | 'ok';

declare type TypedMessage = {
  type: WorkerMessageType;
  id: number;
};

export interface RunGameCommand extends TypedMessage {
  type: 'run-game';
  game: GameSpec;
  speed: number;
  pauseAfterTurns?: number;
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

export interface BattleSummaryMessage extends TypedMessage {
  type: 'battle-summary';
  summary: BattleSummary;
}

export interface BattleStatusMessage extends TypedMessage {
  type: 'battle-status';
  status: BattleStatus;
}

export interface DebugRequestMessage extends TypedMessage {
  type: 'debug-request';
  x?: number;
  y?: number;
}

export interface DebugReplyMessage extends TypedMessage {
  type: 'debug-reply';
  ants: AntData[];
}

export interface AntInfoRequestMessage extends TypedMessage {
  type: 'ant-info-request';
  teamCode: string;
  teamId: string;
}

export interface AntInfoReplyMessage extends TypedMessage {
  type: 'ant-info-reply';
  info: AntDescriptor;
}

export interface SkipBattleMessage extends TypedMessage {
  type: 'skip-battle';
}

export interface TestLogMessage extends TypedMessage {
  type: 'test-log';
  message: string;
  args: unknown[];
  ant: Partial<AntData>;
}

export interface RunBattleMessage extends TypedMessage {
  type: 'run-battle';
  args: BattleArgs;
  teams: TeamWithCode[];
  seed: number;
  speed: number;
  pauseAfterTurns?: number;
  battleId: number;
  isTest: boolean;
}

export interface SetSpeedMessage extends TypedMessage {
  type: 'set-speed';
  speed: number;
}

export interface OkReply extends TypedMessage {
  type: 'ok';
}

export interface ErrorReply extends TypedMessage {
  type: 'error';
  error: string[];
}

declare type CommandMap = {
  RunGameCommand: RunGameCommand;
  GameSummaryMessage: GameSummaryMessage;
  BattleSummaryMessage: BattleSummaryMessage;
  BattleStatusMessage: BattleStatusMessage;
  StopGameCommand: StopGameCommand;
  PauseGameCommand: PauseGameCommand;
  ResumeGameCommand: ResumeGameCommand;
  StepGameCommand: StepGameCommand;
  DebugRequestMessage: DebugRequestMessage;
  DebugReplyMessage: DebugReplyMessage;
  AntInfoRequestMessage: AntInfoRequestMessage;
  AntInfoReplyMessage: AntInfoReplyMessage;
  SkipBattleMessage: SkipBattleMessage;
  RunBattleMessage: RunBattleMessage;
  SetSpeedMessage: SetSpeedMessage;
  TestLogMessage: TestLogMessage;
  OkReply: OkReply;
  ErrorReply: ErrorReply;
};

export type WorkerMessage = CommandMap[keyof CommandMap];

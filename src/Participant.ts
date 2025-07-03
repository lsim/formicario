
export type ParticipantFunction = (state: AntState, surroundings: ParticipantSurroundings) => number;

export type AntState = object;

export type SquareState = 'empty' | 'enemy' | 'food' | 'enemy-base'

export type ParticipantSurroundings = {
  up: SquareState;
  down: SquareState;
  left: SquareState;
  right: SquareState;

};

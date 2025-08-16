export class BattleParticipant {

  constructor(
    public readonly teamId: string,
    public readonly teamName: string,
    public readonly teamColor: string,
    public readonly lamport: number,
    public readonly codeHash: string,
  ) {

  }

  // TODO: We should add more stats from the battle here (from TeamStatus)
  // TODO: We should include battle args here
}

export class BattleResult {
  public id?: string;

  constructor(
    public readonly participants: BattleParticipant[],
    public readonly durationTurns: number,
    public readonly timestamp: number,
    public readonly winnerId: string
  ) {
  }

  isValid() {

    const isValid = this.participants.length > 1
      && this.participants.every(p => p.teamId)
      && this.participants.every(p => p.lamport != null)
      && this.participants.every(p => p.codeHash)
      && this.durationTurns > 0
      && this.timestamp > 0
      && !!this.winnerId;

    console.log('BattleResult.isValid', this.winnerId, isValid);
    return isValid;
  }
}

export interface BackendPublication {
  name: string;
  code: string;
  color: string;
  timestamp: number;
  authorName: string;
  description: string;
  id: string;
  lamport: number;
  codeHash: string;
}

export type ScoreAggregator = {
  name: string;
  color: string;
  numWins: number;
  numLosses: number;
  numBeatenTeams: number;
  avgWinTurns: number;
  winLossRatio: number;
};

export type Scores = {
  [teamId: string]: ScoreAggregator;
};

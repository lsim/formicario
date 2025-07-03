// A battle holds the state of an ongoing battle. It has the specific parameters
// of the battle, and the teams that are participating in it.
import type { IGameSpec } from '@/GameSpec.ts';
import type { ParticipantFunction } from '@/Participant.ts';

export class BattleArgs {
  mapWidth: number;
  mapHeight: number;
  newFoodSpace: number;
  newFoodMin: number;
  newFoodDiff: number;
  halfTimeTurn: number;
  halfTimePercent: number;
  timeOutTurn: number;
  winPercent: number;
  startAnts: number;

  constructor(spec: IGameSpec) {
    // Choose specific parameters for the battle from the game spec values/ranges

    // Map width and height must be divisible by 64 and be randomly chosen between the min and max from the game spec
    const mapWidthMin = Math.round(spec.mapWidth[0] / 64);
    const mapWidthMax = Math.round(spec.mapWidth[1] / 64);
    const mapHeightMin = Math.round(spec.mapHeight[0] / 64);
    const mapHeightMax = Math.round(spec.mapHeight[1] / 64);
    // Pick random base number and multiply by 64 to get a random map width/height
    this.mapWidth = Math.round(Math.random() * (mapWidthMax - mapWidthMin) + mapWidthMin) * 64;
    this.mapHeight = Math.round(Math.random() * (mapHeightMax - mapHeightMin) + mapHeightMin) * 64;
    // Random values for food space, minimum and difference
    this.newFoodSpace = Math.round(
      Math.random() * (spec.newFoodSpace[1] - spec.newFoodSpace[0]) + spec.newFoodSpace[0],
    );
    this.newFoodMin = Math.round(
      Math.random() * (spec.newFoodMin[1] - spec.newFoodMin[0]) + spec.newFoodMin[0],
    );
    this.newFoodDiff = Math.round(
      Math.random() * (spec.newFoodDiff[1] - spec.newFoodDiff[0]) + spec.newFoodDiff[0],
    );
    this.startAnts = Math.round(
      Math.random() * (spec.startAnts[1] - spec.startAnts[0]) + spec.startAnts[0],
    );
    this.halfTimeTurn = spec.halfTimeTurn;
    this.halfTimePercent = spec.halfTimePercent;
    this.timeOutTurn = spec.timeOutTurn;
    this.winPercent = spec.winPercent;
  }

  public static fromGameSpec(spec: IGameSpec): BattleArgs {
    return new BattleArgs(spec);
  }
}

// Corresponds to the TeamData struct in the C code
declare type Participant = {
  func: ParticipantFunction;
  numBorn: number;
  numAnts: number;
  numBases: number;
  basesBuilt: number;
  kill: number;
  killed: number;
  dieAge: number;
  timesRun: number;
  timesTimed: number;
  timeUsed: number;
  squareOwn: number;
  foodOwn: number;
  foodTouch: number;
  foodKnown: number;
};

declare type SquareData = {
  numAnts: number;
  base: boolean;
  team: number;
  numFood: number;
  firstAnt?: AntData;
  lastAnt?: AntData;
};

declare type AntData = {
  mapNext?: AntData;
  mapPrev?: AntData;
  index: number;
  xPos: number;
  yPos: number;
  team: number;
  age: number;
  nextTurn: number;
  brain: object;
};

export class Battle {
  args: BattleArgs;
  participants: Participant[];
  // An array of squares, each with a linked list of ants on that square
  map: SquareData[] = [];
  ants: AntData[] = [];
  // Pool of dead ants ready for reuse (AntFreeList)
  // deadAnts: AntData[] = [];

  // Battle stats
  numBorn: number;
  numAnts: number;
  // antPointer corresponds to TurnAnts in the C code and keeps track of which ant is currently being processed
  antPointer: number;
  numFood: number;
  numBases: number;
  basesBuilt: number;
  currentTurn: number;

  constructor(spec: IGameSpec, participantFunctions: ParticipantFunction[]) {
    this.args = BattleArgs.fromGameSpec(spec);
    this.participants = participantFunctions.map((func) => this.resetParticipant({ func }));

    this.initializeBattle();

    this.numBorn = 0;
    this.numAnts = 0;
    this.antPointer = 0;
    this.numFood = 0;
    this.numBases = 0;
    this.basesBuilt = 0;
    this.currentTurn = 0;
  }

  mapData(x: number, y: number) {
    return this.map[x + y * this.args.mapWidth];
  }

  resetParticipant(p: Partial<Participant> & { func: ParticipantFunction }): Participant {
    return Object.assign(p, {
      numBorn: 0,
      numAnts: 0,
      numBases: 0,
      basesBuilt: 0,
      kill: 0,
      killed: 0,
      dieAge: 0,
      timesRun: 0,
      timesTimed: 0,
      timeUsed: 0,
      squareOwn: 0,
      foodOwn: 0,
      foodTouch: 0,
      foodKnown: 0,
    });
  }

  initializeBattle() {
    // Initialize map - create 1D array (length: width x height) of empty squares
    this.map = Array(this.args.mapWidth * this.args.mapHeight)
      .fill(null)
      .map(() => ({
        numAnts: 0,
        base: false,
        team: 0,
        numFood: 0,
      }));

    // Base placement algorithm - optimize for maximum separation
    const basePositions = this.calculateOptimalBasePositions();

    // Initialize each team
    this.participants.forEach((participant, teamIndex) => {
      const teamId = teamIndex + 1; // Teams are 1-indexed
      const basePos = basePositions[teamIndex];

      this.resetParticipant(participant);

      participant.numBases = 1;
      participant.basesBuilt = 1;
      participant.squareOwn = 1;
      this.numBases++;
      this.basesBuilt++;

      // Place base
      this.mapData(basePos.x, basePos.y).team = teamId;
      this.mapData(basePos.x, basePos.y).base = true;

      // Create initial ants at base position
      for (let i = 0; i < this.args.startAnts; i++) {
        const ant: AntData = {
          index: i,
          xPos: basePos.x,
          yPos: basePos.y,
          team: teamId,
          age: 0,
          nextTurn: this.currentTurn + 1,
          brain: {}, // Empty brain object for participant memory
        };

        this.ants.push(ant);
        const square = this.mapData(basePos.x, basePos.y);
        square.numAnts++;

        ant.mapNext = square.lastAnt?.mapPrev;
        ant.mapPrev = square.lastAnt;
        if (square.lastAnt) square.lastAnt.mapNext = ant;
        square.lastAnt = ant;
        square.numAnts++;
        this.numAnts++;
        this.numBorn++;
        participant.numBorn++;
        participant.numAnts++;
        ant.brain = {};
      }
    });

    // Create team shuffle tables for randomized team visibility
    this.createTeamShuffleTables();
  }

  private calculateOptimalBasePositions(): { x: number; y: number }[] {
    const numTeams = this.participants.length;
    const maxTries = 10000;
    let bestDistance = 0;
    let bestPositions: { x: number; y: number }[] = [];

    for (let attempt = 0; attempt < maxTries; attempt++) {
      const positions: { x: number; y: number }[] = [];

      // Team 0 (index 0) always gets center position
      positions.push({
        x: Math.floor(this.args.mapWidth / 2),
        y: Math.floor(this.args.mapHeight / 2),
      });

      // Other teams get random positions
      for (let i = 1; i < numTeams; i++) {
        positions.push({
          x: Math.floor(Math.random() * this.args.mapWidth),
          y: Math.floor(Math.random() * this.args.mapHeight),
        });
      }

      // Calculate minimum distance between any two bases
      let minDistance = this.args.mapWidth + this.args.mapHeight;
      for (let i = 0; i < numTeams - 1; i++) {
        for (let j = i + 1; j < numTeams; j++) {
          let dx = Math.abs(positions[j].x - positions[i].x);
          let dy = Math.abs(positions[j].y - positions[i].y);

          // Handle wraparound distances (toroidal map)
          if (dx > this.args.mapWidth / 2) dx = this.args.mapWidth - dx;
          if (dy > this.args.mapHeight / 2) dy = this.args.mapHeight - dy;

          const distance = dx + dy;
          if (distance < minDistance) minDistance = distance;
        }
      }

      // Keep the best configuration found so far
      if (minDistance > bestDistance) {
        bestDistance = minDistance;
        bestPositions = [...positions];
      }
    }

    return bestPositions;
  }

  private createTeamShuffleTables() {
    // Create randomized team visibility tables
    // Each team sees other teams in a different random order
    // This prevents teams from coordinating based on team numbers
    // TODO: Implement team shuffle tables for fair gameplay
    // For now, teams see each other with their actual indices
  }
}

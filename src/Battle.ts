// A battle holds the state of an ongoing battle. It has the specific parameters
// of the battle, and the teams that are participating in it.
import type { GameSpec } from '@/GameSpec.ts';
import type { RNGFunction } from './prng.ts';

export class BattleArgs {
  halfTimePercent: number;
  halfTimeTurn: number;
  mapHeight: number;
  mapWidth: number;
  newFoodDiff: number;
  newFoodMin: number;
  newFoodSpace: number;
  startAnts: number;
  timeOutTurn: number;
  winPercent: number;

  constructor(spec: GameSpec) {
    // Choose specific parameters for the battle from the game spec values/ranges

    // Map width and height must be divisible by 64 and be randomly chosen between the min and max from the game spec
    const mapWidthMin = Math.max(Math.round(spec.mapWidth[0] / 64), 1);
    const mapWidthMax = Math.max(Math.round(spec.mapWidth[1] / 64), 1);
    const mapHeightMin = Math.max(Math.round(spec.mapHeight[0] / 64), 1);
    const mapHeightMax = Math.max(Math.round(spec.mapHeight[1] / 64), 1);
    this.mapWidth = this.determineParameter(mapWidthMin, mapWidthMax, spec.rng) * 64;
    this.mapHeight = this.determineParameter(mapHeightMin, mapHeightMax, spec.rng) * 64;
    // Random values for food space, minimum and difference
    this.newFoodSpace = this.determineParameter(
      spec.newFoodSpace[0],
      spec.newFoodSpace[1],
      spec.rng,
    );
    this.newFoodMin = this.determineParameter(spec.newFoodMin[0], spec.newFoodMin[1], spec.rng);
    this.newFoodDiff = this.determineParameter(spec.newFoodDiff[0], spec.newFoodDiff[1], spec.rng);
    this.startAnts = this.determineParameter(spec.startAnts[0], spec.startAnts[1], spec.rng);
    this.halfTimeTurn = spec.halfTimeTurn;
    this.halfTimePercent = spec.halfTimePercent;
    this.timeOutTurn = spec.timeOutTurn;
    this.winPercent = spec.winPercent;
  }

  private determineParameter(min: number, max: number, rng: RNGFunction): number {
    return min + rng(max - min + 1);
  }

  public static fromGameSpec(spec: GameSpec): BattleArgs {
    return new BattleArgs(spec);
  }
}

// Corresponds to the TeamData struct in the C code
declare type TeamData = {
  func: AntFunction;
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

// This is all the information we store about each ant while running the battle
// This is *not* the object that is given to the ant function
declare type AntData = {
  mapNext?: AntData;
  mapPrev?: AntData;
  index: number;
  xPos: number;
  yPos: number;
  team: number;
  age: number;
  nextTurn: number;
  brain: object & { random: number };
};

// This is the information passed to the ant function - represents the AntTemp structure from C
// It contains the brain data for all ants on the current square
export type AntInfo = {
  // Array of brain objects - first element is calling ant, rest are other ants on same square
  brains: AntBrain[];
};

// Individual ant brain data that gets passed to the team function
// This represents the custom memory structure each team can define
declare type AntBrain = {
  // Core brain data that all ants have
  random: number; // Random seed for this ant

  // Custom brain data - this is a flexible object that each team can structure
  // In the C implementation, this would be team-specific structs like DummyBrain
  [key: string]: number | boolean;
};

// TODO: Define this type
declare type AntDescriptor = object;

export type AntFunction = (map?: SquareData[], antInfo?: AntInfo) => number | AntDescriptor;

export class Battle {
  args: BattleArgs;
  participants: TeamData[];
  // An array of squares, each with a linked list of ants on that square
  map: SquareData[] = [];
  ants: AntData[] = [];
  // Pool of dead ants ready for reuse (AntFreeList). This is an optimization we will tend to later
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
  rng: RNGFunction;

  constructor(spec: GameSpec, antFunctions: AntFunction[]) {
    this.args = BattleArgs.fromGameSpec(spec);
    this.rng = spec.rng;
    this.participants = antFunctions.map((func) => this.resetParticipant({ func }));

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

  resetParticipant(p: Partial<TeamData> & { func: AntFunction }): TeamData {
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
          brain: { random: this.rng() }, // Empty brain object for participant memory
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
        // OPTIMIZE: having the ant implementation produce a brain template would allow us to only
        //  shuffle primitive values during the battle, which may save the GC some work
        ant.brain = { random: this.rng() };
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
          x: Math.floor(this.rng(this.args.mapWidth)),
          y: Math.floor(this.rng(this.args.mapHeight)),
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

  // Battle simulation
  doTurn() {
    this.currentTurn++;
    let turnAnts = this.numAnts;

    // Create array of ant indices for random processing
    const antIndices = Array.from(Array(this.ants.length).keys());

    // Process all ants in random order
    while (turnAnts > 0) {
      // Pick random ant from remaining unprocessed ants
      const randomIndex = Math.floor(this.rng(turnAnts));
      const antIndex = antIndices[randomIndex];
      const ant = this.ants[antIndex];

      // Move ant from unprocessed to processed list
      antIndices[randomIndex] = antIndices[turnAnts - 1];
      antIndices[turnAnts - 1] = antIndex;
      turnAnts--;

      // Execute ant's brain and perform its action
      const action = this.runAnt(ant);
      this.doAction(ant, action);
    }

    // Place new food if needed
    const baseValue = 75; // NewBaseAnts (25) + NewBaseFood (50)
    const totalValue = this.numAnts + this.numFood + baseValue * this.numBases;
    const targetValue = (this.args.mapWidth * this.args.mapHeight) / this.args.newFoodSpace;

    while (totalValue < targetValue) {
      this.placeFood();
    }
  }

  private runAnt(ant: AntData): number {
    // TODO: Implement RunAnt logic
    return 0;
  }

  doAction(ant: AntData, action: number) {
    const direction = action & 7;
    const carryFood = (action & 8) !== 0;
    const buildBase = action === 16;

    // Handle base building
    if (buildBase) {
      const square = this.mapData(ant.xPos, ant.yPos);
      if (square.numAnts >= 25 && square.numFood >= 50 && !square.base) {
        // Build base - consume ants and food
        square.numAnts -= 25;
        square.numFood -= 50;
        square.base = true;
        square.team = ant.team;

        // Update statistics
        this.numBases++;
        this.basesBuilt++;
        this.participants[ant.team - 1].numBases++;
        this.participants[ant.team - 1].basesBuilt++;

        // Remove consumed ants from global count
        this.numAnts -= 25;
        this.participants[ant.team - 1].numAnts -= 25;
      }
      return;
    }

    // Handle movement
    let newX = ant.xPos;
    let newY = ant.yPos;

    switch (direction) {
      case 1:
        newX = (ant.xPos + 1) % this.args.mapWidth;
        break; // right
      case 2:
        newY = (ant.yPos + 1) % this.args.mapHeight;
        break; // down
      case 3:
        newX = (ant.xPos - 1 + this.args.mapWidth) % this.args.mapWidth;
        break; // left
      case 4:
        newY = (ant.yPos - 1 + this.args.mapHeight) % this.args.mapHeight;
        break; // up
      default:
        return; // stay in place
    }

    const oldSquare = this.mapData(ant.xPos, ant.yPos);
    const newSquare = this.mapData(newX, newY);

    // Handle combat - kill all enemy ants on target square
    if (newSquare.numAnts > 0 && newSquare.team !== ant.team) {
      const enemyTeam = newSquare.team;
      const killedAnts = newSquare.numAnts;

      // Update kill statistics
      this.participants[ant.team - 1].kill += killedAnts;
      this.participants[enemyTeam - 1].killed += killedAnts;

      // Remove killed ants
      this.numAnts -= killedAnts;
      this.participants[enemyTeam - 1].numAnts -= killedAnts;

      // Take over enemy base if present
      if (newSquare.base) {
        this.participants[enemyTeam - 1].numBases--;
        this.participants[ant.team - 1].numBases++;
      }

      // Clear the square
      newSquare.numAnts = 0;
      newSquare.team = 0;
    }

    // Move ant
    oldSquare.numAnts--;
    if (oldSquare.numAnts === 0) {
      oldSquare.team = 0;
    }

    ant.xPos = newX;
    ant.yPos = newY;

    newSquare.numAnts++;
    newSquare.team = ant.team;

    // Handle food transport
    if (carryFood && oldSquare.numFood > 0) {
      oldSquare.numFood--;
      this.numFood--;

      // If moving to own base, create new ant
      if (newSquare.base && newSquare.team === ant.team) {
        const newAnt: AntData = {
          index: this.ants.length,
          xPos: newX,
          yPos: newY,
          team: ant.team,
          age: 0,
          nextTurn: this.currentTurn + 1,
          brain: { random: this.rng() },
        };

        this.ants.push(newAnt);
        this.numAnts++;
        this.numBorn++;
        this.participants[ant.team - 1].numAnts++;
        this.participants[ant.team - 1].numBorn++;

        newSquare.numAnts++;
      } else {
        // Otherwise, drop food at destination
        newSquare.numFood++;
        this.numFood++;
      }
    }
  }

  placeFood() {
    const maxTries = 20;
    let bestX = 0,
      bestY = 0;
    // let bestMinDist = -1;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      let x, y;

      // Find empty square
      do {
        x = Math.floor(this.rng(this.args.mapWidth));
        y = Math.floor(this.rng(this.args.mapHeight));
      } while (
        this.mapData(x, y).numAnts > 0 ||
        this.mapData(x, y).numFood > 0 ||
        this.mapData(x, y).base
      );

      // For simplicity, just use the first valid position
      // TODO: Implement distance optimization like C version
      bestX = x;
      bestY = y;
      break;
    }

    // Place food
    const foodAmount = this.args.newFoodMin + Math.floor(this.rng(this.args.newFoodDiff + 1));
    this.mapData(bestX, bestY).numFood += foodAmount;
    this.numFood += foodAmount;
  }

  foodOwnTouch(square: SquareData, factor: number) {
    if (square.team === 0) return;

    const participant = this.participants[square.team - 1];
    const foodOwned = Math.min(square.numFood, square.numAnts);
    const foodTouched = square.numFood - foodOwned;
    const foodKnown = square.numFood;

    participant.foodOwn += foodOwned * factor;
    participant.foodTouch += foodTouched * factor;
    participant.foodKnown += foodKnown * factor;
  }

  // Check if battle should terminate
  checkTermination(): boolean {
    const baseValue = 75;
    let totalValue = 0;
    let maxTeamValue = 0;
    let activeTeams = 0;

    // Calculate team values
    for (const participant of this.participants) {
      const teamValue = participant.numAnts + baseValue * participant.numBases;
      totalValue += teamValue;
      maxTeamValue = Math.max(maxTeamValue, teamValue);
      if (teamValue > 0) activeTeams++;
    }

    // Single team wins
    if (activeTeams <= 1) {
      return true;
    }

    // Timeout
    if (this.currentTurn >= this.args.timeOutTurn) {
      return true;
    }

    // Win percentage reached
    if (totalValue > 0) {
      const winThreshold = (totalValue * this.args.winPercent) / 100;
      if (maxTeamValue >= winThreshold) {
        return true;
      }
    }

    // Half-time advantage
    if (this.currentTurn >= this.args.halfTimeTurn && totalValue > 0) {
      const halfTimeThreshold = (totalValue * this.args.halfTimePercent) / 100;
      if (maxTeamValue >= halfTimeThreshold) {
        return true;
      }
    }

    return false;
  }
}

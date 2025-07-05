import type { GameSpec } from '@/GameSpec.ts';
import type { RNGFunction } from '@/prng.ts';
import type { BattleStatus, BattleSummary } from '@/GameSummary.ts';

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
  statusInterval: number;

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
    this.statusInterval = spec.statusInterval;
  }

  private determineParameter(min: number, max: number, rng: RNGFunction): number {
    return min + rng(max - min + 1);
  }

  public static fromGameSpec(spec: GameSpec): BattleArgs {
    return new BattleArgs(spec);
  }
}

// Corresponds to the TeamData struct in the C code
declare type TeamData = AntDescriptor & {
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

export type SquareData = {
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

// Returned by the AntFunction when called with no arguments
declare type AntDescriptor = {
  color: string;
  name: string;
  brainTemplate: object;
};

export type AntFunction = (() => AntDescriptor) & ((map: SquareData[], antInfo: AntInfo) => number);

export class Battle {
  args: BattleArgs;
  teams: TeamData[];
  // An array of squares, each with a linked list of ants on that square
  map: SquareData[] = [];
  ants: AntData[] = [];
  // Pool of dead ants ready for reuse (AntFreeList). This is an optimization we will tend to later
  // deadAnts: AntData[] = [];

  // Team shuffle tables for obfuscating team numbers
  teamShuffleTables: number[][] = [];

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
  private stopRequested = false;

  constructor(spec: GameSpec, antFunctions: AntFunction[]) {
    this.args = BattleArgs.fromGameSpec(spec);
    this.rng = spec.rng;
    this.teams = antFunctions.map((func) => {
      const descriptor = func();
      const team = { func, ...descriptor };
      return this.resetTeam(team);
    });

    // Initialize battle stats before calling initializeBattle
    this.numBorn = 0;
    this.numAnts = 0;
    this.antPointer = 0;
    this.numFood = 0;
    this.numBases = 0;
    this.basesBuilt = 0;
    this.currentTurn = 0;

    this.initializeBattle();
  }

  mapData(x: number, y: number) {
    return this.map[x + y * this.args.mapWidth];
  }

  resetTeam(p: Partial<TeamData> & { func: AntFunction } & AntDescriptor): TeamData {
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
    this.teams.forEach((team, teamIndex) => {
      const teamId = teamIndex + 1; // Teams are 1-indexed
      const basePos = basePositions[teamIndex];

      this.resetTeam(team);

      team.numBases = 1;
      team.basesBuilt = 1;
      team.squareOwn = 1;
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
          brain: { random: this.rng() }, // Empty brain object for team memory
        };

        this.ants.push(ant);
        const square = this.mapData(basePos.x, basePos.y);

        // Add ant to the square's linked list (for future use)
        ant.mapNext = square.lastAnt?.mapPrev;
        ant.mapPrev = square.lastAnt;
        if (square.lastAnt) square.lastAnt.mapNext = ant;
        square.lastAnt = ant;

        // Update counters (only once per ant)
        square.numAnts++;
        this.numAnts++;
        this.numBorn++;
        team.numBorn++;
        team.numAnts++;
      }
    });

    // Create team shuffle tables for randomized team visibility
    this.createTeamShuffleTables();
  }

  private calculateOptimalBasePositions(): { x: number; y: number }[] {
    const numTeams = this.teams.length;
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

    const numTeams = this.teams.length;
    this.teamShuffleTables = [];

    for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
      const shuffleTable: number[] = new Array(numTeams + 1).fill(0);
      const taken: number[] = new Array(numTeams).fill(0);

      // Own team is always seen as team 0
      shuffleTable[teamIndex + 1] = 0;

      // Assign other teams random numbers
      for (let otherTeamIndex = 0; otherTeamIndex < numTeams; otherTeamIndex++) {
        if (otherTeamIndex === teamIndex) {
          shuffleTable[otherTeamIndex + 1] = 0; // Own team
        } else {
          let assignedNumber;
          do {
            assignedNumber = this.rng(numTeams);
          } while (taken[assignedNumber] > teamIndex);

          shuffleTable[otherTeamIndex + 1] = assignedNumber;
          taken[assignedNumber]++;
        }
      }

      this.teamShuffleTables.push(shuffleTable);
    }
  }

  emitStatus() {
    const status: BattleStatus = {
      teams: this.teams.map((team) => ({
        name: team.name,
        color: team.color,
        numBorn: team.numBorn,
        numAnts: team.numAnts,
        numBases: team.numBases,
        basesBuilt: team.basesBuilt,
        kill: team.kill,
        killed: team.killed,
        dieAge: team.dieAge,
      })),
      squares: this.map.map((square) => ({
        numAnts: square.numAnts,
        base: square.base,
        team: square.team,
        numFood: square.numFood,
      })),
    };
    postMessage({ type: 'battle-status', status });
  }

  async run(): Promise<BattleSummary> {
    const startTime = Date.now();
    let terminated = false;

    // Main battle loop - equivalent to the C do-while structure
    do {
      // Execute one turn (equivalent to DoTurn() in C)
      this.doTurn();

      // Emit status for UI updates (equivalent to SysDrawMap() in C)
      if (this.currentTurn % this.args.statusInterval === 0) {
        this.emitStatus();
      }

      // Check for termination conditions (equivalent to TermCheck() in C)
      terminated = this.checkTermination();

      // Allow for async operations and UI responsiveness
      // Yield control periodically for non-blocking execution
      if (this.currentTurn % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Optional: Check for system events (pause/stop/resume) - equivalent to SysCheck() in C
      // This could be implemented later when UI controls are added
    } while (!terminated);

    return this.generateBattleSummary(startTime);
  }

  public stop() {
    this.stopRequested = true;
  }

  private generateBattleSummary(startTime: number): BattleSummary {
    // Find the winning team
    const baseValue = 75;
    let maxTeamValue = 0;
    let winnerName = 'Draw';

    for (const team of this.teams) {
      const teamValue = team.numAnts + baseValue * team.numBases;
      if (teamValue > maxTeamValue) {
        maxTeamValue = teamValue;
        winnerName = team.name;
      }
    }

    return {
      startTime,
      winner: winnerName,
      teams: this.teams.map((t) => t.name),
      turns: this.currentTurn,
      args: this.args,
    };
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
    const targetValue = (this.args.mapWidth * this.args.mapHeight) / this.args.newFoodSpace;

    while (this.numAnts + this.numFood + baseValue * this.numBases < targetValue) {
      this.placeFood();
    }
  }

  runAnt(ant: AntData): number {
    const team = this.teams[ant.team - 1];
    if (!team) return 0;

    // Update ant age and statistics
    ant.age++;
    ant.nextTurn = this.currentTurn + 1;
    team.timesRun++;

    // Prepare 5 SquareData structures (current + 4 adjacent squares)
    const mapData = this.getSurroundings(ant.xPos, ant.yPos);

    // Apply team number obfuscation using shuffle tables
    const shuffleTable = this.teamShuffleTables[ant.team - 1];
    const obfuscatedMapData = mapData.map((square) => ({
      ...square,
      team: square.numAnts || square.base ? shuffleTable[square.team] || 0 : 0,
    }));

    // Collect brain data for all ants on current square
    const antsOnSquare = this.getAntsOnSquare(ant.xPos, ant.yPos);
    const antInfo: AntInfo = {
      brains: antsOnSquare.map((a) => ({ ...a.brain })),
    };

    // Ensure calling ant's brain is first in the array
    const callingAntIndex = antsOnSquare.findIndex((a) => a.index === ant.index);
    if (callingAntIndex > 0) {
      // Swap calling ant's brain to position 0
      [antInfo.brains[0], antInfo.brains[callingAntIndex]] = [
        antInfo.brains[callingAntIndex],
        antInfo.brains[0],
      ];
    }

    // Execute team function
    let action: number | AntDescriptor;
    try {
      // Random timing measurement (1 in 10 chance like C implementation)
      const shouldTime = this.rng(10) === 0;
      if (shouldTime) {
        const startTime = performance.now();
        action = team.func(obfuscatedMapData, antInfo);
        const endTime = performance.now();
        team.timeUsed += endTime - startTime;
        team.timesTimed++;
      } else {
        action = team.func(obfuscatedMapData, antInfo);
      }
    } catch (error) {
      // If ant function fails, default to no action
      console.error(`Ant function error for team ${ant.team}:`, error);
      action = 0;
    }

    // Update ant's brain with any changes from the first brain (calling ant)
    if (antInfo.brains.length > 0) {
      ant.brain = { ...antInfo.brains[0] };
    }

    // Update other ants' brains on the same square
    antsOnSquare.forEach((squareAnt, index) => {
      if (index < antInfo.brains.length && squareAnt.index !== ant.index) {
        squareAnt.brain = { ...antInfo.brains[index === 0 ? callingAntIndex : index] };
      }
    });

    // Return action as number (ignore AntDescriptor case for now)
    return action;
  }

  private getSurroundings(x: number, y: number): SquareData[] {
    // Returns 5 SquareData structures: [current, right, down, left, up]
    const surroundings: SquareData[] = [];

    // Current square (index 0)
    surroundings.push(this.mapData(x, y));

    // Right square (index 1) - wraps around
    const rightX = (x + 1) % this.args.mapWidth;
    surroundings.push(this.mapData(rightX, y));

    // Down square (index 2) - wraps around
    const downY = (y + 1) % this.args.mapHeight;
    surroundings.push(this.mapData(x, downY));

    // Left square (index 3) - wraps around
    const leftX = (x - 1 + this.args.mapWidth) % this.args.mapWidth;
    surroundings.push(this.mapData(leftX, y));

    // Up square (index 4) - wraps around
    const upY = (y - 1 + this.args.mapHeight) % this.args.mapHeight;
    surroundings.push(this.mapData(x, upY));

    return surroundings;
  }

  private getAntsOnSquare(x: number, y: number): AntData[] {
    // Find all ants on the specified square
    return this.ants.filter((ant) => ant.xPos === x && ant.yPos === y);
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
        this.teams[ant.team - 1].numBases++;
        this.teams[ant.team - 1].basesBuilt++;

        // Remove consumed ants from global count
        this.numAnts -= 25;
        this.teams[ant.team - 1].numAnts -= 25;
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
      this.teams[ant.team - 1].kill += killedAnts;
      this.teams[enemyTeam - 1].killed += killedAnts;

      // Remove killed ants
      this.numAnts -= killedAnts;
      this.teams[enemyTeam - 1].numAnts -= killedAnts;

      // Take over enemy base if present
      if (newSquare.base) {
        this.teams[enemyTeam - 1].numBases--;
        this.teams[ant.team - 1].numBases++;
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
        this.teams[ant.team - 1].numAnts++;
        this.teams[ant.team - 1].numBorn++;

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

    const team = this.teams[square.team - 1];
    const foodOwned = Math.min(square.numFood, square.numAnts);
    const foodTouched = square.numFood - foodOwned;
    const foodKnown = square.numFood;

    team.foodOwn += foodOwned * factor;
    team.foodTouch += foodTouched * factor;
    team.foodKnown += foodKnown * factor;
  }

  // Check if battle should terminate
  checkTermination(): boolean {
    const baseValue = 75;
    let totalValue = 0;
    let maxTeamValue = 0;
    let activeTeams = 0;

    if (this.stopRequested) return true;

    // Calculate team values
    for (const team of this.teams) {
      const teamValue = team.numAnts + baseValue * team.numBases;
      totalValue += teamValue;
      maxTeamValue = Math.max(maxTeamValue, teamValue);
      if (teamValue > 0) activeTeams++;
    }

    // Single team wins (only applies to multi-team battles)
    if (this.teams.length > 1 && activeTeams <= 1) {
      return true;
    }

    // Timeout
    if (this.currentTurn >= this.args.timeOutTurn) {
      return true;
    }

    // Win percentage reached (only applies to multi-team battles)
    if (this.teams.length > 1 && totalValue > 0) {
      const winThreshold = (totalValue * this.args.winPercent) / 100;
      if (maxTeamValue >= winThreshold) {
        return true;
      }
    }

    // Half-time advantage (only applies to multi-team battles)
    if (this.teams.length > 1 && this.currentTurn >= this.args.halfTimeTurn && totalValue > 0) {
      const halfTimeThreshold = (totalValue * this.args.halfTimePercent) / 100;
      if (maxTeamValue >= halfTimeThreshold) {
        return true;
      }
    }

    return false;
  }
}

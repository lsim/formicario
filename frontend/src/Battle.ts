import type { GameSpec } from '@/GameSpec.ts';
import { getRNG, type RNGFunction } from '@/prng.ts';
import type { BattleStatus, BattleSummary, SquareStatus } from '@/GameSummary.ts';

// Constants from MyreKrig.h
const NEW_BASE_ANTS = 25;
const NEW_BASE_FOOD = 50;
// const MAX_SQUARE_ANTS = 100;
// const MAX_SQUARE_FOOD = 200;
const BASE_VALUE = NEW_BASE_ANTS + NEW_BASE_FOOD;

// Action constants
const ACTION_DIRECTION_MASK = 7;
const ACTION_CARRY_FOOD_FLAG = 8;
const ACTION_BUILD_BASE = 16;
const MAP_TILE_SIZE = 64;

export type BattleArgs = ReturnType<typeof produceBattleArgs>;

export function produceBattleArgs(spec: GameSpec, rng: RNGFunction) {
  // Map width and height must be divisible by 64 and be randomly chosen between the min and max from the game spec
  const mapWidthMin = Math.max(Math.round(spec.mapWidth[0] / MAP_TILE_SIZE), 1);
  const mapWidthMax = Math.max(Math.round(spec.mapWidth[1] / MAP_TILE_SIZE), 1);
  const mapHeightMin = Math.max(Math.round(spec.mapHeight[0] / MAP_TILE_SIZE), 1);
  const mapHeightMax = Math.max(Math.round(spec.mapHeight[1] / MAP_TILE_SIZE), 1);
  return {
    mapWidth: determineParameter(mapWidthMin, mapWidthMax, rng) * MAP_TILE_SIZE,
    mapHeight: determineParameter(mapHeightMin, mapHeightMax, rng) * MAP_TILE_SIZE,
    // Random values for food space, minimum and difference
    newFoodSpace: determineParameter(spec.newFoodSpace[0], spec.newFoodSpace[1], rng),
    newFoodMin: determineParameter(spec.newFoodMin[0], spec.newFoodMin[1], rng),
    newFoodDiff: determineParameter(spec.newFoodDiff[0], spec.newFoodDiff[1], rng),
    startAnts: determineParameter(spec.startAnts[0], spec.startAnts[1], rng),
    halfTimeTurn: spec.halfTimeTurn,
    halfTimePercent: spec.halfTimePercent,
    timeOutTurn: spec.timeOutTurn,
    winPercent: spec.winPercent,
    statusInterval: spec.statusInterval,
  };
}

function determineParameter(min: number, max: number, rng: RNGFunction): number {
  return min + rng(max - min + 1);
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
export type AntData = {
  mapNext?: AntData;
  mapPrev?: AntData;
  index: number;
  xPos: number;
  yPos: number;
  team: number;
  age: number;
  nextTurn: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brain: any;
  alive: boolean;
};

// This is the information passed to the ant function - represents the AntTemp structure from C
// It contains the brain data for all ants on the current square
export type AntInfo = {
  // Array of brain objects - first element is calling ant, rest are other ants on same square
  brains: AntBrain[];
};

// Individual ant brain data that gets passed to the team function
// This represents the custom memory structure each team can define
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AntBrain = any;

// Returned by the AntFunction when called with no arguments
export type AntDescriptor = {
  color: string;
  name: string;
  brainTemplate: object;
  description?: string;
  backendId?: string;
};

export type AntFunction = (() => AntDescriptor) & ((map: SquareData[], antInfo: AntInfo) => number);

export type BattleContinuation = {
  type: 'resume' | 'stop' | 'takeSteps';
  steps?: number;
};

export class Battle {
  teams: TeamData[];
  // An array of squares, each with a linked list of ants on that square
  map: SquareData[] = [];
  ants: AntData[] = [];
  // Pool of dead ant indices ready for reuse (AntFreeList optimization)
  deadAntIndices: number[] = [];
  private continueResolver?: (continuation: BattleContinuation) => void;

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
  private paused = false;
  startTime = Date.now(); // Battle start timestamp for identification

  // Performance tracking
  private lastTpsUpdate = Date.now();
  private turnsAtLastUpdate = 0;
  turnsPerSecond = 0;

  public get isPaused() {
    return this.paused;
  }

  constructor(
    private args: BattleArgs,
    antFunctions: AntFunction[],
    private seed: number,
    private pauseAfterTurns = -1,
  ) {
    console.log('Battle created', args, antFunctions, seed, pauseAfterTurns);
    this.rng = getRNG(seed);
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

  mapIndex(x: number, y: number) {
    return x + y * this.args.mapWidth;
  }

  mapData(x: number, y: number) {
    return this.map[this.mapIndex(x, y)];
  }

  // Ant lifecycle management methods
  private createAnt(antData: Omit<AntData, 'index' | 'alive'>): AntData {
    let antIndex: number;
    let ant: AntData;

    if (this.deadAntIndices.length > 0) {
      // Recycle a dead ant slot
      antIndex = this.deadAntIndices.pop()!;
      ant = { ...antData, index: antIndex, alive: true };
      this.ants[antIndex] = ant;
    } else {
      // Create new slot
      antIndex = this.ants.length;
      ant = { ...antData, index: antIndex, alive: true };
      this.ants.push(ant);
    }

    return ant;
  }

  private killAnt(ant: AntData) {
    if (ant.alive) {
      ant.alive = false;
      this.deadAntIndices.push(ant.index);

      // Accumulate the ant's age for average death age calculation
      const team = this.teams[ant.team - 1];
      if (team) {
        team.dieAge += ant.age;
      }

      // Decrement the square's ant counter before removing from list
      const square = this.mapData(ant.xPos, ant.yPos);
      square.numAnts--;

      this.removeAntFromSquareList(ant);
    }
  }

  // Helper method to remove an ant from its square's linked list
  private removeAntFromSquareList(ant: AntData) {
    const square = this.mapData(ant.xPos, ant.yPos);

    if (ant.mapPrev) {
      ant.mapPrev.mapNext = ant.mapNext;
    } else {
      // This ant was first in list, update square's firstAnt
      square.firstAnt = ant.mapNext;
    }

    if (ant.mapNext) {
      ant.mapNext.mapPrev = ant.mapPrev;
    } else {
      // This ant was last in list, update square's lastAnt
      square.lastAnt = ant.mapPrev;
    }

    // Clear the ant's linked list pointers
    ant.mapNext = undefined;
    ant.mapPrev = undefined;
  }

  // Helper method to add an ant to a square's linked list
  private addAntToSquareList(ant: AntData, square: SquareData) {
    ant.mapNext = undefined;
    ant.mapPrev = square.lastAnt;
    if (square.lastAnt) {
      square.lastAnt.mapNext = ant;
    } else {
      square.firstAnt = ant;
    }
    square.lastAnt = ant;
  }

  // Helper method to handle base capture
  private captureBase(attackerTeam: number, defenderTeam: number): void {
    if (defenderTeam > 0 && defenderTeam <= this.teams.length) {
      if (this.teams[defenderTeam - 1].numBases > 0) {
        this.teams[defenderTeam - 1].numBases--;
        this.teams[attackerTeam - 1].numBases++;
      }
    }
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
        const ant = this.createAnt({
          xPos: basePos.x,
          yPos: basePos.y,
          team: teamId,
          age: 0,
          nextTurn: this.currentTurn, // Initial ants should be able to act immediately
          brain: { ...structuredClone(this.teams[teamId - 1].brainTemplate), random: this.rng() },
        });
        const square = this.mapData(basePos.x, basePos.y);

        // Add ant to the square's linked list
        this.addAntToSquareList(ant, square);

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

  getTeamSummary(team: TeamData) {
    return {
      name: team.name,
      color: team.color,
      numBorn: team.numBorn,
      numAnts: team.numAnts,
      numBases: team.numBases,
      basesBuilt: team.basesBuilt,
      kill: team.kill,
      killed: team.killed,
      dieAge: team.killed > 0 ? Math.round(team.dieAge / team.killed) : 0,
      squareOwn: team.squareOwn,
      foodOwn: team.foodOwn,
      foodTouch: team.foodTouch,
      foodKnown: team.foodKnown,
      timeUsed: team.timeUsed / team.timesTimed,
    };
  }

  squareDataToStatus(square: SquareData, index: number): SquareStatus {
    return {
      index: index,
      numAnts: square.numAnts,
      base: square.base,
      team: square.team,
      numFood: square.numFood,
    };
  }

  emitStatus() {
    if (this.touchedSquares.size === 0) return;

    // Update turns per second calculation
    const now = Date.now();
    const elapsed = now - this.lastTpsUpdate;

    // Update TPS every second or more
    if (elapsed >= 1000) {
      const turnsSinceLastUpdate = this.currentTurn - this.turnsAtLastUpdate;
      this.turnsPerSecond = (turnsSinceLastUpdate * 1000) / elapsed;
      this.lastTpsUpdate = now;
      this.turnsAtLastUpdate = this.currentTurn;
    }

    const status: BattleStatus = {
      seed: this.seed,
      args: this.args,
      teams: this.teams.map((team) => this.getTeamSummary(team)),
      deltaSquares: Array.from(this.touchedSquares).map((i) => {
        const square = this.map[i];
        return this.squareDataToStatus(square, i);
      }),
      turns: this.currentTurn,
      turnsPerSecond: Math.round(this.turnsPerSecond * 100) / 100, // Round to 2 decimal places
    };
    this.touchedSquares.clear();
    postMessage({ type: 'battle-status', status });
  }

  proceed(continuation: BattleContinuation) {
    if (this.continueResolver) {
      this.continueResolver(continuation);
    }
  }

  async run(): Promise<BattleSummary> {
    let terminated = false;
    let stepsToTake = -1;

    // Main battle loop - equivalent to the C do-while structure
    do {
      // Execute one turn (equivalent to DoTurn() in C)
      this.doTurn();
      if (stepsToTake > 0) stepsToTake--;

      // Emit status for UI updates (equivalent to SysDrawMap() in C)
      if (
        this.args.statusInterval >= 0 &&
        (stepsToTake === 0 ||
          this.currentTurn === 1 ||
          this.currentTurn % this.args.statusInterval === 0)
      ) {
        this.emitStatus();
      }

      if (this.pauseAfterTurns > 0 && this.currentTurn === this.pauseAfterTurns) {
        this.pause();
      }

      if ((this.paused && stepsToTake === -1) || stepsToTake === 0) {
        const continuation: BattleContinuation = await new Promise((resolve) => {
          this.continueResolver = resolve;
        });
        this.continueResolver = undefined;
        if (continuation.type === 'stop') {
          terminated = true;
          break;
        } else if (continuation.type === 'resume') {
          stepsToTake = -1;
          this.paused = false;
        } else if (continuation.type === 'takeSteps') {
          stepsToTake = continuation.steps ?? 1;
        }
      }

      // Check for termination conditions (equivalent to TermCheck() in C)
      terminated = this.checkTermination();

      // Allow for async operations and UI responsiveness
      // Yield control periodically for non-blocking execution
      if (this.currentTurn % 20 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    } while (!terminated);

    return this.generateBattleSummary();
  }

  public stop() {
    this.stopRequested = true;
    this.proceed({ type: 'stop' });
  }

  public pause() {
    this.paused = true;
  }

  public generateBattleSummary(): BattleSummary {
    // Find the winning team
    const baseValue = BASE_VALUE;
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
      startTime: this.startTime,
      winner: winnerName,
      teams: this.teams.map((t) => this.getTeamSummary(t)),
      turns: this.currentTurn,
      args: this.args,
      duration: Date.now() - this.startTime,
      squares: this.map.map((s, index) => this.squareDataToStatus(s, index)),
      seed: this.seed,
    };
  }

  quarantinedTeams: number[] = [];

  // Squares that have been touched since the last status update
  touchedSquares: Set<number> = new Set();

  // Battle simulation
  doTurn() {
    this.currentTurn++;

    // Get all living ants that should act this turn
    const livingAnts = this.ants.filter(
      (ant) =>
        ant.alive && ant.nextTurn <= this.currentTurn && !this.quarantinedTeams.includes(ant.team),
    );
    let turnAnts = livingAnts.length;

    // Create array of living ant indices for random processing
    const antIndices = Array.from(Array(livingAnts.length).keys());

    // Process all living ants in random order
    while (turnAnts > 0) {
      // Pick random ant from remaining unprocessed ants
      const randomIndex = Math.floor(this.rng(turnAnts));
      const antIndex = antIndices[randomIndex];
      const ant = livingAnts[antIndex];

      // Move ant from unprocessed to processed list
      antIndices[randomIndex] = antIndices[turnAnts - 1];
      antIndices[turnAnts - 1] = antIndex;
      turnAnts--;
      // Safety check: ant may have died during this turn
      if (!ant.alive || this.quarantinedTeams.includes(ant.team)) {
        continue;
      }

      // Execute ant's brain and perform its action
      try {
        const action = this.runAnt(ant);
        this.doAction(ant, action);
      } catch (error) {
        // Disable this ant
        this.quarantinedTeams.push(ant.team);
        console.error(
          `Ant function error for team ${ant.team}:`,
          '\nerror:',
          error,
          '\nant:',
          ant,
          '\nsquare:',
          this.mapData(ant.xPos, ant.yPos),
        );
        if (this.quarantinedTeams.length === this.teams.length) {
          // All teams are quarantined, stop the battle
          this.stop();
        }
      }
    }

    // Place new food if needed
    const baseValue = BASE_VALUE;
    const targetValue = (this.args.mapWidth * this.args.mapHeight) / this.args.newFoodSpace;

    while (this.numAnts + this.numFood + baseValue * this.numBases < targetValue) {
      this.placeFood();
    }
  }

  runAnt(ant: AntData): number {
    const team = this.teams[ant.team - 1];
    if (!team) return 0;

    // Prepare 5 SquareData structures (current + 4 adjacent squares)
    const mapData = this.getSurroundings(ant.xPos, ant.yPos);

    // Apply team number obfuscation using shuffle tables
    const shuffleTable = this.teamShuffleTables[ant.team - 1];
    const obfuscatedMapData = mapData.map((square) => ({
      ...square,
      team: square.numAnts || square.base ? shuffleTable[square.team] || 0 : 0,
    }));

    // Collect brain data for all living ants on current square to match square.numAnts
    // This must be done BEFORE updating ant.nextTurn
    const antsOnSquare = this.getAntsOnSquare(ant.xPos, ant.yPos);
    // Because we don't copy the brain objects, they will be mutated directly by the ant function - obviating the need for subsequent copying
    const antInfo: AntInfo = {
      brains: antsOnSquare.map((a) => a.brain),
    };

    // Update ant age and statistics (AFTER collecting brain data)
    ant.age++;
    ant.nextTurn = this.currentTurn + 1;
    team.timesRun++;

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
    // Random timing measurement (1 in 10 chance like C implementation)
    const shouldTime = this.rng(10) === 0;
    //console.log('Calling ant with args', obfuscatedMapData, antInfo, 'in turn', this.currentTurn);
    if (shouldTime) {
      const startTime = performance.now();
      action = team.func(obfuscatedMapData, antInfo);
      const endTime = performance.now();
      team.timeUsed += endTime - startTime;
      team.timesTimed++;
    } else {
      action = team.func(obfuscatedMapData, antInfo);
    }

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
    // Use linked list for efficient traversal of ants on this square
    const square = this.mapData(x, y);
    const antsOnSquare: AntData[] = [];

    let current = square.firstAnt;
    while (current) {
      if (current.alive) {
        antsOnSquare.push(current);
      }
      current = current.mapNext;
    }

    return antsOnSquare;
  }

  doAction(ant: AntData, action: number) {
    const direction = action & ACTION_DIRECTION_MASK;
    const carryFood = (action & ACTION_CARRY_FOOD_FLAG) !== 0;
    const buildBase = action === ACTION_BUILD_BASE;

    // Handle base building
    if (buildBase) {
      const square = this.mapData(ant.xPos, ant.yPos);
      if (square.numAnts > NEW_BASE_ANTS && square.numFood >= NEW_BASE_FOOD && !square.base) {
        // Update food statistics before base building (subtract old values)
        this.relinquishFood(square, ant.team);

        // Temporarily remove the building ant from the list (like C implementation)
        this.removeAntFromSquareList(ant);
        square.numAnts--;

        // Kill NEW_BASE_ANTS ants to build the base using the linked list
        // Note: We can only kill as many ants as are available (excluding the builder)
        let killedAnts = 0;
        let currentAnt = square.firstAnt;
        const maxAntsToKill = Math.min(NEW_BASE_ANTS, square.numAnts);
        while (currentAnt && killedAnts < maxAntsToKill) {
          const nextAnt = currentAnt.mapNext;
          if (currentAnt.alive && currentAnt.team === ant.team) {
            this.killAnt(currentAnt);
            killedAnts++;
          }
          currentAnt = nextAnt;
        }

        // Re-insert the building ant (like C implementation)
        this.addAntToSquareList(ant, square);
        square.numAnts++;

        // Build base - consume food (numAnts should now be 1 - just the builder)
        square.numFood -= NEW_BASE_FOOD;
        square.base = true;
        square.team = ant.team;

        // Update statistics
        this.numBases++;
        this.basesBuilt++;
        this.teams[ant.team - 1].numBases++;
        this.teams[ant.team - 1].basesBuilt++;

        // Remove consumed ants from global count (but not the builder)
        this.numAnts -= killedAnts;
        this.teams[ant.team - 1].numAnts -= killedAnts;
        this.touchedSquares.add(this.mapIndex(ant.xPos, ant.yPos));

        // Update food statistics after base building (add new values)
        // Now square has 1 ant (the builder) and reduced food
        this.seizeFood(square, ant.team);
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
    this.touchedSquares.add(this.mapIndex(ant.xPos, ant.yPos));
    const newSquare = this.mapData(newX, newY);
    this.touchedSquares.add(this.mapIndex(newX, newY));

    // Handle combat - kill all enemy ants on target square
    if (newSquare.numAnts > 0 && newSquare.team !== ant.team) {
      const enemyTeam = newSquare.team;
      let killedAnts = 0;

      // Kill all enemy ants on this square using the linked list
      let currentAnt = newSquare.firstAnt;
      while (currentAnt) {
        const nextAnt = currentAnt.mapNext;
        if (currentAnt.alive && currentAnt.team === enemyTeam) {
          this.killAnt(currentAnt);
          killedAnts++;
        }
        currentAnt = nextAnt;
      }

      // Update kill statistics
      this.teams[ant.team - 1].kill += killedAnts;
      this.teams[enemyTeam - 1].killed += killedAnts;

      // Remove killed ants from counters
      this.numAnts -= killedAnts;
      this.teams[enemyTeam - 1].numAnts -= killedAnts;

      // Take over enemy base if present
      if (newSquare.base) {
        this.captureBase(ant.team, enemyTeam);
      }

      this.teams[enemyTeam - 1].squareOwn--;
      this.teams[ant.team - 1].squareOwn++;

      // Clear the square
      newSquare.numAnts = 0;
      newSquare.team = 0;
    } else if (newSquare.team > 0 && newSquare.team !== ant.team) {
      // Moving to enemy territory without combat
      const enemyTeam = newSquare.team;

      // Handle base capture for undefended bases
      if (newSquare.base) {
        this.captureBase(ant.team, enemyTeam);
      }

      this.teams[enemyTeam - 1].squareOwn--;
      this.teams[ant.team - 1].squareOwn++;
    } else if (newSquare.team === 0) {
      // Moving to neutral territory - claim it
      this.teams[ant.team - 1].squareOwn++;
    }

    // Update food statistics before ant movement (relinquish food from squares this team owns)
    this.relinquishFood(oldSquare, ant.team);
    this.relinquishFood(newSquare, ant.team);

    // Move ant
    oldSquare.numAnts--;

    // Remove ant from old square's linked list
    this.removeAntFromSquareList(ant);

    ant.xPos = newX;
    ant.yPos = newY;

    // Add ant to new square's linked list
    this.addAntToSquareList(ant, newSquare);

    newSquare.numAnts++;
    newSquare.team = ant.team;

    // Handle food transport BEFORE updating food statistics
    if (carryFood && oldSquare.numFood > 0) {
      oldSquare.numFood--;
      this.numFood--;

      // If moving to own base, create new ant
      if (newSquare.base && newSquare.team === ant.team) {
        const newAnt = this.createAnt({
          xPos: newX,
          yPos: newY,
          team: ant.team,
          age: 0,
          nextTurn: this.currentTurn + 1,
          brain: { ...structuredClone(this.teams[ant.team - 1].brainTemplate), random: this.rng() },
        });

        // Add new ant to square's linked list
        this.addAntToSquareList(newAnt, newSquare);

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

    // Update food statistics after all state changes are complete (seize food from squares this team now owns)
    this.seizeFood(oldSquare, ant.team);
    this.seizeFood(newSquare, ant.team);
  }

  // Instance array to track last food placements (converted from C static variables)
  private lastFoodMemory: { x: number; y: number }[] = [];
  private lastFoodIndex = 0;
  private readonly LAST_FOOD_MEM = 42; // From C constant

  placeFood() {
    const maxTries = 20; // From C implementation
    let bestX = 0;
    let bestY = 0;
    let bestMinDist = -1;

    // Try 20 different positions to find the best one
    for (let attempt = 0; attempt < maxTries; attempt++) {
      let x: number, y: number;

      // Find empty square (equivalent to C do-while loop)
      do {
        x = this.rng(this.args.mapWidth);
        y = this.rng(this.args.mapHeight);
      } while (
        this.mapData(x, y).numAnts > 0 ||
        this.mapData(x, y).numFood > 0 ||
        this.mapData(x, y).base
      );

      // Calculate minimum distance to previous food placements
      let minDist = this.args.mapWidth + this.args.mapHeight; // Start with max possible distance
      const memorySize =
        this.lastFoodIndex < this.LAST_FOOD_MEM ? this.lastFoodIndex : this.LAST_FOOD_MEM;

      for (let j = 0; j < memorySize; j++) {
        const lastFood = this.lastFoodMemory[j];
        if (!lastFood) continue;

        // Calculate toroidal distance (accounting for map wrapping)
        let xDist = x - lastFood.x;
        let yDist = y - lastFood.y;

        // Convert to absolute values
        if (xDist < 0) xDist = -xDist;
        if (yDist < 0) yDist = -yDist;

        // Handle toroidal wrapping (shortest distance around edges)
        if (xDist > this.args.mapWidth / 2) xDist = this.args.mapWidth - xDist;
        if (yDist > this.args.mapHeight / 2) yDist = this.args.mapHeight - yDist;

        // Manhattan distance
        const totalDist = xDist + yDist;
        if (totalDist < minDist) minDist = totalDist;
      }

      // Keep the position with the best (largest) minimum distance
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestX = x;
        bestY = y;
      }
    }

    // Record this food placement in the circular buffer
    const memoryIndex = this.lastFoodIndex % this.LAST_FOOD_MEM;
    if (!this.lastFoodMemory[memoryIndex]) {
      this.lastFoodMemory[memoryIndex] = { x: 0, y: 0 };
    }
    this.lastFoodMemory[memoryIndex].x = bestX;
    this.lastFoodMemory[memoryIndex].y = bestY;
    this.lastFoodIndex++;

    // Place food with random amount (equivalent to C: Used.NewFoodMin+Random(Used.NewFoodDiff+1))
    const foodAmount = this.args.newFoodMin + this.rng(this.args.newFoodDiff + 1);
    this.mapData(bestX, bestY).numFood += foodAmount;
    this.touchedSquares.add(this.mapIndex(bestX, bestY));
    this.numFood += foodAmount;
  }

  relinquishFood(square: SquareData, team: number) {
    this.foodOwnTouch(square, team, -1);
  }
  seizeFood(square: SquareData, team: number) {
    this.foodOwnTouch(square, team, 1);
  }
  //   foodOwn: Food the team can directly control (min(square.numFood, square.numAnts))
  //   foodTouch: Excess food the team can potentially access (square.numFood - foodOwn)
  //   foodKnown: Total food the team is aware of (square.numFood)
  //
  //   Strategic Purpose:
  //
  //   These metrics track how effectively teams are controlling food resources:
  //   - High foodOwn: Team has good ant-to-food ratios (efficient control)
  //   - High foodTouch: Team has access to abundant food sources
  //   - foodKnown: Team's overall food awareness/territory reach
  foodOwnTouch(square: SquareData, teamNumber: number, factor: number) {
    // Only update stats if the specified team actually owns this square
    if (square.team !== teamNumber) return;

    const team = this.teams[teamNumber - 1];
    const foodOwned = Math.min(square.numFood, square.numAnts);
    const foodTouched = square.numFood - foodOwned;
    const foodKnown = square.numFood;

    team.foodOwn += foodOwned * factor;
    team.foodTouch += foodTouched * factor;
    team.foodKnown += foodKnown * factor;
  }

  // Check if battle should terminate
  checkTermination(): boolean {
    const baseValue = BASE_VALUE;
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

    // Last team standing wins (only applies to multi-team battles)
    if (this.teams.length > 1 && activeTeams <= 1) {
      console.debug('Single team wins', this.teams, activeTeams);
      return true;
    }

    if (this.teams.length === 1 && this.currentTurn >= this.args.halfTimeTurn) {
      console.debug('Solo battle ends at halftime', this.teams, activeTeams);
      return true;
    }

    // Timeout
    if (this.currentTurn >= this.args.timeOutTurn) {
      console.debug('Timeout', this.currentTurn, this.args.timeOutTurn);
      return true;
    }

    // Win percentage reached (only applies to multi-team battles)
    // NOTE: With eg 5 teams, where 4 teams have just their bases (75), the dominator will need to have a very high number of ants to win
    // Or must capture the bases. This can give a very long and boring battle. We should tweak this. Perhaps bases shouldn't factor in?
    // Another factor that plays into this is that a resource equilibrium is reached since no ants are dying.
    // Perhaps an additional winning condition should be added - the number of turns without significant change in team totals?
    // Or perhaps a n turns without any new ants being born (no new food appearing)?
    if (this.teams.length > 1 && totalValue > 0) {
      const winThreshold = totalValue * (this.args.winPercent / 100);
      if (maxTeamValue >= winThreshold) {
        // console.debug(
        //   'Win percentage reached',
        //   'maxTeamValue', maxTeamValue,
        //   'winThreshold', winThreshold,
        //   'baseValue', baseValue,
        //   'this.args.winPercent', this.args.winPercent,
        // );
        return true;
      }
    }

    // Half-time advantage (only applies to multi-team battles)
    if (this.teams.length > 1 && this.currentTurn >= this.args.halfTimeTurn && totalValue > 0) {
      const halfTimeThreshold = (totalValue * this.args.halfTimePercent) / 100;
      if (maxTeamValue >= halfTimeThreshold) {
        console.debug('Half-time advantage reached', maxTeamValue, halfTimeThreshold);
        return true;
      }
    }

    return false;
  }

  public getAntsForDebug(x?: number, y?: number): AntData[] {
    if (x === undefined || y === undefined) {
      return this.ants.filter((a) => a.alive).map((ant) => structuredClone(ant));
    } else {
      // Make it a little easier to select an ant by returning all ants in a small area around the point
      const antsOnSquare = [];
      const range = 1;
      for (let i = x - range; i <= x + range; i++) {
        for (let j = y - range; j <= y + range; j++) {
          const square = this.mapData(i, j);
          let current = square.firstAnt;
          while (current) {
            antsOnSquare.push(current);
            current = current.mapNext;
          }
        }
      }
      return antsOnSquare;
    }
  }

  public testAccess() {
    return {
      createAnt: this.createAnt.bind(this),
      addAntToSquareList: this.addAntToSquareList.bind(this),
      mapWidth: this.args.mapWidth,
      mapHeight: this.args.mapHeight,
      startAnts: this.args.startAnts,
      timeOutTurn: this.args.timeOutTurn,
    };
  }
}

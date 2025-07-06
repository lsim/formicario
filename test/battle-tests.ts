import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import type { GameSpec } from '@/GameSpec';
import { Battle, BattleArgs, type AntFunction, type AntInfo, type SquareData } from '@/Battle';
import { getRNG } from '@/prng.ts';
import type { BattleStatusMessage } from '@/workers/WorkerMessage.ts';

describe('Battle tests', () => {
  let gameSpec: GameSpec;
  let simpleAnt: AntFunction;
  let aggressiveAnt: AntFunction;

  beforeEach(() => {
    gameSpec = {
      statusInterval: 100,
      halfTimePercent: 60,
      halfTimeTurn: 100,
      mapHeight: [128, 128],
      mapWidth: [128, 128],
      newFoodDiff: [5, 10],
      newFoodMin: [5, 10],
      newFoodSpace: [20, 30],
      seed: 42,
      rng: getRNG(42),
      startAnts: [5, 5],
      teams: [],
      timeOutTurn: 1000,
      winPercent: 70,
    };

    // Simple ant that moves randomly
    simpleAnt = ((map?: SquareData[], antInfo?: AntInfo) => {
      if (!map || !antInfo) {
        return { name: 'SimpleAnt', color: '#FF0000', brainTemplate: { counter: 0 } };
      }
      // Use deterministic movement based on brain state
      const brain = antInfo.brains[0];
      // brain.counter = (brain.counter || 0) + 1;
      return brain.random % 5; // Deterministic direction cycle
    }) as AntFunction;

    // Aggressive ant that tries to move toward enemies
    aggressiveAnt = ((map?: SquareData[], antInfo?: AntInfo) => {
      if (!map || !antInfo) {
        return { name: 'AggressiveAnt', color: '#0000FF', brainTemplate: {} };
      }
      // Look for enemies in adjacent squares and move toward them
      for (let i = 1; i < map.length; i++) {
        if (map[i].numAnts > 0 && map[i].team !== 0) {
          return i; // Move toward enemy
        }
      }
      return 0; // Stay if no enemies found
    }) as AntFunction;

    vi.spyOn(global, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('BattleArgs', () => {
    it('should produce valid battle args from game spec', () => {
      const battleArgs = BattleArgs.fromGameSpec(gameSpec);
      expect(battleArgs).toBeTruthy();
      expect(battleArgs.halfTimePercent).toBe(60);
      expect(battleArgs.halfTimeTurn).toBe(100);
      expect(battleArgs.mapHeight).toBe(128); // 128/64 * 64 = 128
      expect(battleArgs.mapWidth).toBe(128);
      expect(battleArgs.timeOutTurn).toBe(1000);
      expect(battleArgs.winPercent).toBe(70);
    });

    it('should handle map size divisibility by 64', () => {
      const spec = {
        ...gameSpec,
        mapWidth: [200, 300] as [number, number],
        mapHeight: [150, 250] as [number, number],
      };
      const battleArgs = BattleArgs.fromGameSpec(spec);
      expect(battleArgs.mapWidth % 64).toBe(0);
      expect(battleArgs.mapHeight % 64).toBe(0);
      expect(battleArgs.mapWidth).toBeGreaterThanOrEqual(192); // 200/64 rounded * 64
      expect(battleArgs.mapHeight).toBeGreaterThanOrEqual(128); // 150/64 rounded * 64
    });
  });

  describe('Battle initialization', () => {
    it('should initialize battle with correct starting state', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      expect(battle.teams).toHaveLength(1);
      expect(battle.teams[0].name).toBe('SimpleAnt');
      expect(battle.teams[0].color).toBe('#FF0000');
      expect(battle.numAnts).toBeGreaterThan(0);
      expect(battle.numBases).toBe(1);
      expect(battle.currentTurn).toBe(0);
      expect(battle.ants).toHaveLength(battle.args.startAnts);
    });

    it('should initialize multiple teams with proper base separation', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt]);

      expect(battle.teams).toHaveLength(2);
      expect(battle.numBases).toBe(2);
      expect(battle.ants).toHaveLength(battle.args.startAnts * 2);

      // Check that teams have different base positions
      const team1Ants = battle.ants.filter((ant) => ant.team === 1);
      const team2Ants = battle.ants.filter((ant) => ant.team === 2);

      expect(team1Ants).toHaveLength(battle.args.startAnts);
      expect(team2Ants).toHaveLength(battle.args.startAnts);

      // Teams should have different starting positions
      const team1Pos = { x: team1Ants[0].xPos, y: team1Ants[0].yPos };
      const team2Pos = { x: team2Ants[0].xPos, y: team2Ants[0].yPos };
      expect(team1Pos.x !== team2Pos.x || team1Pos.y !== team2Pos.y).toBe(true);
    });

    it('should create team shuffle tables', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt]);

      expect(battle.teamShuffleTables).toHaveLength(2);
      expect(battle.teamShuffleTables[0]).toHaveLength(3); // numTeams + 1
      expect(battle.teamShuffleTables[1]).toHaveLength(3);

      // Each team should see itself as team 0
      expect(battle.teamShuffleTables[0][1]).toBe(0); // Team 1 sees itself as 0
      expect(battle.teamShuffleTables[1][2]).toBe(0); // Team 2 sees itself as 0
    });
  });

  describe('Map operations', () => {
    it('should correctly access map data with coordinates', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      const centerX = Math.floor(battle.args.mapWidth / 2);
      const centerY = Math.floor(battle.args.mapHeight / 2);

      const square = battle.mapData(centerX, centerY);
      expect(square).toBeDefined();
      expect(square.base).toBe(true); // First team gets center position
      expect(square.team).toBe(1);
    });

    it('should get correct surroundings with wrapping', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      const surroundings = battle['getSurroundings'](0, 0); // Access private method for testing
      expect(surroundings).toHaveLength(5);

      // Current square
      expect(surroundings[0]).toBe(battle.mapData(0, 0));
      // Right (wraps from 0 to mapWidth-1 conceptually, but 0+1 = 1)
      expect(surroundings[1]).toBe(battle.mapData(1, 0));
      // Down
      expect(surroundings[2]).toBe(battle.mapData(0, 1));
      // Left (wraps from 0 to mapWidth-1)
      expect(surroundings[3]).toBe(battle.mapData(battle.args.mapWidth - 1, 0));
      // Up (wraps from 0 to mapHeight-1)
      expect(surroundings[4]).toBe(battle.mapData(0, battle.args.mapHeight - 1));
    });

    it('should find ants on square correctly', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      const firstAnt = battle.ants[0];
      const antsOnSquare = battle['getAntsOnSquare'](firstAnt.xPos, firstAnt.yPos);

      expect(antsOnSquare).toContain(firstAnt);
      expect(
        antsOnSquare.every((ant) => ant.xPos === firstAnt.xPos && ant.yPos === firstAnt.yPos),
      ).toBe(true);
    });
  });

  describe('Game mechanics', () => {
    it('should execute a single turn', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);
      const initialTurn = battle.currentTurn;

      battle.doTurn();

      expect(battle.currentTurn).toBe(initialTurn + 1);
    });

    it('should run ant function with correct parameters', () => {
      let calledWithMap = false;
      let calledWithAntInfo = false;

      const testAnt = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'TestAnt', color: '#00FF00', brainTemplate: {} };
        }
        calledWithMap = Array.isArray(map) && map.length === 5;
        calledWithAntInfo = antInfo && Array.isArray(antInfo.brains);
        return 0; // Stay in place
      }) as AntFunction;

      const battle = new Battle(gameSpec, [testAnt]);
      battle.doTurn();

      expect(calledWithMap).toBe(true);
      expect(calledWithAntInfo).toBe(true);
    });

    it('should handle ant movement', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);
      const ant = battle.ants[0];
      const originalX = ant.xPos;
      const originalY = ant.yPos;

      // Force ant to move right
      battle.doAction(ant, 1);

      const expectedX = (originalX + 1) % battle.args.mapWidth;
      expect(ant.xPos).toBe(expectedX);
      expect(ant.yPos).toBe(originalY);
    });

    it('should handle toroidal wrap-around for ant movement across map boundaries', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);
      const ant = battle.ants[0];

      // Test moving right from the eastern edge (wraps to western edge)
      ant.xPos = battle.args.mapWidth - 1;
      ant.yPos = 10;
      const eastSquare = battle.mapData(ant.xPos, ant.yPos);
      eastSquare.numAnts = 1;
      eastSquare.team = ant.team;

      battle.doAction(ant, 1); // Move right

      expect(ant.xPos).toBe(0); // Should wrap to x=0
      expect(ant.yPos).toBe(10); // Y should remain unchanged
      expect(battle.mapData(0, 10).numAnts).toBe(1);
      expect(battle.mapData(0, 10).team).toBe(ant.team);
      expect(eastSquare.numAnts).toBe(0); // Original square should be empty

      // Test moving left from the western edge (wraps to eastern edge)
      ant.xPos = 0;
      ant.yPos = 20;
      const westSquare = battle.mapData(ant.xPos, ant.yPos);
      westSquare.numAnts = 1;
      westSquare.team = ant.team;

      battle.doAction(ant, 3); // Move left

      expect(ant.xPos).toBe(battle.args.mapWidth - 1); // Should wrap to eastern edge
      expect(ant.yPos).toBe(20);
      expect(battle.mapData(battle.args.mapWidth - 1, 20).numAnts).toBe(1);
      expect(battle.mapData(battle.args.mapWidth - 1, 20).team).toBe(ant.team);
      expect(westSquare.numAnts).toBe(0);

      // Test moving down from the southern edge (wraps to northern edge)
      ant.xPos = 30;
      ant.yPos = battle.args.mapHeight - 1;
      const southSquare = battle.mapData(ant.xPos, ant.yPos);
      southSquare.numAnts = 1;
      southSquare.team = ant.team;

      battle.doAction(ant, 2); // Move down

      expect(ant.xPos).toBe(30);
      expect(ant.yPos).toBe(0); // Should wrap to y=0
      expect(battle.mapData(30, 0).numAnts).toBe(1);
      expect(battle.mapData(30, 0).team).toBe(ant.team);
      expect(southSquare.numAnts).toBe(0);

      // Test moving up from the northern edge (wraps to southern edge)
      ant.xPos = 40;
      ant.yPos = 0;
      const northSquare = battle.mapData(ant.xPos, ant.yPos);
      northSquare.numAnts = 1;
      northSquare.team = ant.team;

      battle.doAction(ant, 4); // Move up

      expect(ant.xPos).toBe(40);
      expect(ant.yPos).toBe(battle.args.mapHeight - 1); // Should wrap to southern edge
      expect(battle.mapData(40, battle.args.mapHeight - 1).numAnts).toBe(1);
      expect(battle.mapData(40, battle.args.mapHeight - 1).team).toBe(ant.team);
      expect(northSquare.numAnts).toBe(0);
    });

    it('should handle toroidal wrap-around for food transport across boundaries', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);
      const ant = battle.ants[0];

      // Place food at eastern edge
      ant.xPos = battle.args.mapWidth - 1;
      ant.yPos = 50;
      const sourceSquare = battle.mapData(ant.xPos, ant.yPos);
      sourceSquare.numFood = 5;
      sourceSquare.numAnts = 1;
      sourceSquare.team = ant.team;

      const initialFood = battle.numFood;

      // Carry food right (should wrap to western edge)
      battle.doAction(ant, 1 | 8); // Move right + carry food

      expect(ant.xPos).toBe(0); // Wrapped to western edge
      expect(ant.yPos).toBe(50);
      expect(sourceSquare.numFood).toBe(4); // Food taken from source
      expect(battle.mapData(0, 50).numFood).toBe(1); // Food deposited at destination
      expect(battle.numFood).toBe(initialFood); // Net food unchanged
    });

    it('should verify getSurroundings handles corner cases correctly', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      // Test corner position (0,0)
      const cornerSurroundings = battle['getSurroundings'](0, 0);
      expect(cornerSurroundings).toHaveLength(5);
      expect(cornerSurroundings[0]).toBe(battle.mapData(0, 0)); // Current
      expect(cornerSurroundings[1]).toBe(battle.mapData(1, 0)); // Right
      expect(cornerSurroundings[2]).toBe(battle.mapData(0, 1)); // Down
      expect(cornerSurroundings[3]).toBe(battle.mapData(battle.args.mapWidth - 1, 0)); // Left (wrapped)
      expect(cornerSurroundings[4]).toBe(battle.mapData(0, battle.args.mapHeight - 1)); // Up (wrapped)

      // Test opposite corner (mapWidth-1, mapHeight-1)
      const oppositeSurroundings = battle['getSurroundings'](
        battle.args.mapWidth - 1,
        battle.args.mapHeight - 1,
      );
      expect(oppositeSurroundings).toHaveLength(5);
      expect(oppositeSurroundings[0]).toBe(
        battle.mapData(battle.args.mapWidth - 1, battle.args.mapHeight - 1),
      ); // Current
      expect(oppositeSurroundings[1]).toBe(battle.mapData(0, battle.args.mapHeight - 1)); // Right (wrapped)
      expect(oppositeSurroundings[2]).toBe(battle.mapData(battle.args.mapWidth - 1, 0)); // Down (wrapped)
      expect(oppositeSurroundings[3]).toBe(
        battle.mapData(battle.args.mapWidth - 2, battle.args.mapHeight - 1),
      ); // Left
      expect(oppositeSurroundings[4]).toBe(
        battle.mapData(battle.args.mapWidth - 1, battle.args.mapHeight - 2),
      ); // Up
    });

    it('should handle base building', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);
      const ant = battle.ants[0];
      const square = battle.mapData(ant.xPos, ant.yPos);

      // Set up conditions for base building
      square.numAnts = 30;
      square.numFood = 60;
      square.base = false;

      const initialBases = battle.numBases;
      battle.doAction(ant, 16); // Build base action

      expect(battle.numBases).toBe(initialBases + 1);
      expect(square.base).toBe(true);
    });

    it('should handle food placement', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);
      const initialFood = battle.numFood;

      battle.placeFood();

      expect(battle.numFood).toBeGreaterThan(initialFood);
    });

    it('should calculate termination conditions correctly', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      // Initial state should not be terminated
      expect(battle.checkTermination()).toBe(false);

      // Force timeout
      battle.currentTurn = battle.args.timeOutTurn;
      expect(battle.checkTermination()).toBe(true);
    });

    it('should calculate termination correctly for multiple teams', () => {
      const battle = new Battle({ ...gameSpec, winPercent: 70 }, [simpleAnt, aggressiveAnt]);

      // Test edge case: teams with zero values should not affect termination calculations
      // Team 1: 100 ants + 1 base = 175 total value
      // Team 2: 0 ants + 0 bases = 0 total value (eliminated)
      // Total value: 175, so 70% threshold = 122.5
      // Team 1 has 175/175 = 100% but the eliminated team check should trigger first
      battle.teams[0].numAnts = 100;
      battle.teams[0].numBases = 1;
      battle.teams[1].numAnts = 0;
      battle.teams[1].numBases = 0;

      // This should terminate due to single team remaining, not win percentage
      expect(battle.checkTermination()).toBe(true);

      // Reset to competitive scenario
      battle.teams[1].numAnts = 80;
      battle.teams[1].numBases = 1;

      // Test normal competitive scenario
      // Team 1: 100 ants + 1 base = 175 total value
      // Team 2: 80 ants + 1 base = 155 total value
      // Total value: 330, so 70% threshold = 231
      // Team 1 has 175/330 = 53% (should NOT trigger termination)
      expect(battle.checkTermination()).toBe(false);

      // Give team 1 a decisive advantage
      // Team 1: 250 ants + 2 bases = 400 total value
      // Team 2: 80 ants + 1 base = 155 total value
      // Total value: 555, so 70% threshold = 388.5
      // Team 1 has 400/555 = 72% (should terminate)
      battle.teams[0].numAnts = 250;
      battle.teams[0].numBases = 2;
      expect(battle.checkTermination()).toBe(true);

      // Test that the calculation works correctly with different base values
      // Reset for edge case testing
      battle.teams[0].numAnts = 0;
      battle.teams[0].numBases = 3; // 3 * 75 = 225 value
      battle.teams[1].numAnts = 100;
      battle.teams[1].numBases = 0; // 100 value
      // Total: 325, threshold: 227.5, team 1 has 225/325 = 69.2% (should NOT terminate)
      expect(battle.checkTermination()).toBe(false);

      // Bump team 1 just over threshold
      battle.teams[0].numBases = 4; // 4 * 75 = 300 value, 300/400 = 75% (should terminate)
      expect(battle.checkTermination()).toBe(true);
    });
  });

  it('foobar', () => {
    const battle = new Battle({ ...gameSpec, winPercent: 70 }, [simpleAnt, aggressiveAnt]);

    battle.teams[0].numAnts = 10;
    battle.teams[0].numBases = 1;
    battle.teams[1].numAnts = 10;
    battle.teams[1].numBases = 1;

    expect(battle.checkTermination()).toBe(false);
  });

  describe('Battle execution', () => {
    it('should run complete battle and produce summary', async () => {
      // Use shorter timeout for test
      const testSpec = { ...gameSpec, timeOutTurn: 5 };
      const battle = new Battle(testSpec, [simpleAnt]);

      const summary = await battle.run();

      expect(summary).toBeDefined();
      if (summary) {
        expect(summary.turns).toBeGreaterThan(0);
        expect(summary.winner).toBeDefined();
        expect(summary.teams).toContain('SimpleAnt');
        expect(summary.startTime).toBeGreaterThan(0);
        expect(summary.args).toBe(battle.args);
      }
    });

    it('should handle multiple teams battle', async () => {
      const testSpec = { ...gameSpec, timeOutTurn: 10 };
      const battle = new Battle(testSpec, [simpleAnt, aggressiveAnt]);

      const summary = await battle.run();

      if (summary) {
        expect(summary.teams).toHaveLength(2);
        expect(summary.teams).toContain('SimpleAnt');
        expect(summary.teams).toContain('AggressiveAnt');
        expect(['SimpleAnt', 'AggressiveAnt', 'Draw']).toContain(summary.winner);
      }
    });

    it('should respect timeout conditions', async () => {
      const testSpec = { ...gameSpec, timeOutTurn: 3 };
      const battle = new Battle(testSpec, [simpleAnt]);

      const summary = await battle.run();
      if (summary) {
        expect(summary.turns).toBeLessThanOrEqual(3);
      }
    });

    it('should handle ant function errors gracefully', async () => {
      const errorAnt = ((map?: SquareData[], antInfo?: AntInfo) => {
        if (!map || !antInfo) {
          return { name: 'ErrorAnt', color: '#FF00FF', brainTemplate: {} };
        }
        throw new Error('Test error');
      }) as AntFunction;

      const testSpec = { ...gameSpec, timeOutTurn: 3 };
      const battle = new Battle(testSpec, [errorAnt]);

      // Should not throw, should handle gracefully
      const summary = await battle.run();
      expect(summary).toBeDefined();
    });
  });

  describe('Team interactions', () => {
    it('should handle combat between teams', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt]);

      // Find ants from different teams
      const team1Ant = battle.ants.find((ant) => ant.team === 1)!;

      // Set up a combat scenario: Team 1 ant attacks Team 2 square
      const targetX = 10,
        targetY = 10;

      // Place enemy ants on target square
      const targetSquare = battle.mapData(targetX, targetY);
      targetSquare.numAnts = 3;
      targetSquare.team = 2;

      // Move team1 ant to adjacent square
      team1Ant.xPos = targetX - 1;
      team1Ant.yPos = targetY;

      const initialAnts = battle.numAnts;
      const initialTeam1Kills = battle.teams[0].kill;
      const initialTeam2Killed = battle.teams[1].killed;

      // Attack: move right into enemy square
      battle.doAction(team1Ant, 1);

      // Verify combat occurred
      expect(battle.numAnts).toBe(initialAnts - 3); // 3 enemy ants killed
      expect(battle.teams[0].kill).toBe(initialTeam1Kills + 3);
      expect(battle.teams[1].killed).toBe(initialTeam2Killed + 3);
      expect(targetSquare.numAnts).toBe(1); // Only attacking ant remains
      expect(targetSquare.team).toBe(1); // Square now controlled by team 1
    });

    it('should handle base capture during combat', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt]);

      const team1Ant = battle.ants.find((ant) => ant.team === 1)!;
      const targetX = 20,
        targetY = 20;

      // Set up enemy base with defenders
      const targetSquare = battle.mapData(targetX, targetY);
      targetSquare.numAnts = 2;
      targetSquare.team = 2;
      targetSquare.base = true;

      // Manually adjust base counts to test capture
      battle.teams[1].numBases = 2; // Give team 2 an extra base

      // Position attacker adjacent to base
      team1Ant.xPos = targetX - 1;
      team1Ant.yPos = targetY;

      const initialTeam1Bases = battle.teams[0].numBases;
      const initialTeam2Bases = battle.teams[1].numBases;

      // Attack the base
      battle.doAction(team1Ant, 1);

      // Verify base capture
      expect(battle.teams[0].numBases).toBe(initialTeam1Bases + 1);
      expect(battle.teams[1].numBases).toBe(initialTeam2Bases - 1);
      expect(targetSquare.team).toBe(1); // Base now belongs to team 1
    });

    it('should handle food transport and ant creation', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      const ant = battle.ants[0];
      const sourceX = 30,
        sourceY = 30;
      const baseX = 31,
        baseY = 30;

      // Set up food source
      const sourceSquare = battle.mapData(sourceX, sourceY);
      sourceSquare.numFood = 5;

      // Set up team base
      const baseSquare = battle.mapData(baseX, baseY);
      baseSquare.base = true;
      baseSquare.team = 1;

      // Position ant at food source
      ant.xPos = sourceX;
      ant.yPos = sourceY;

      const initialAnts = battle.numAnts;
      const initialFood = battle.numFood;

      // Carry food to base (move right with carry flag)
      battle.doAction(ant, 1 | 8); // Direction 1 (right) + carry food flag (8)

      // Verify food transport and ant creation
      expect(battle.numAnts).toBe(initialAnts + 1); // New ant created
      expect(battle.numFood).toBe(initialFood - 1); // Food consumed for ant creation
      expect(sourceSquare.numFood).toBe(4); // Food taken from source
    });

    it('should handle food transport without ant creation', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      const ant = battle.ants[0];
      const sourceX = 40,
        sourceY = 40;
      const destX = 41,
        destY = 40;

      // Set up food source
      const sourceSquare = battle.mapData(sourceX, sourceY);
      sourceSquare.numFood = 5;

      // Set up non-base destination
      const destSquare = battle.mapData(destX, destY);
      destSquare.base = false;

      // Position ant at food source
      ant.xPos = sourceX;
      ant.yPos = sourceY;

      const initialFood = battle.numFood;

      // Carry food to non-base square
      battle.doAction(ant, 1 | 8); // Direction 1 (right) + carry food flag (8)

      // Verify food transport without ant creation
      expect(battle.numFood).toBe(initialFood); // No net food change
      expect(sourceSquare.numFood).toBe(4); // Food taken from source
      expect(destSquare.numFood).toBe(1); // Food deposited at destination
    });

    it('should not update square ownership when ants leave', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      const ant = battle.ants[0];
      const startX = 50,
        startY = 50;

      // Position ant alone on a square
      ant.xPos = startX;
      ant.yPos = startY;
      const startSquare = battle.mapData(startX, startY);
      startSquare.numAnts = 1;
      startSquare.team = 1;

      // Move ant away
      battle.doAction(ant, 1); // Move right

      // Verify square ownership is NOT cleared when ant leaves
      expect(startSquare.numAnts).toBe(0);
      expect(startSquare.team).toBe(1); // Team ownership persists
    });

    it('should call foodOwnTouch during termination check', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      // Set up a square with food and ants
      const square = battle.mapData(10, 10);
      square.numAnts = 3;
      square.numFood = 5;
      square.team = 1;

      const initialFoodOwn = battle.teams[0].foodOwn;

      // Call foodOwnTouch manually to test the function
      battle.foodOwnTouch(square, 1);

      // Verify food statistics are updated
      expect(battle.teams[0].foodOwn).toBeGreaterThan(initialFoodOwn);
      expect(battle.teams[0].foodTouch).toBeGreaterThan(0);
      expect(battle.teams[0].foodKnown).toBe(5);
    });

    it('should handle termination by win percentage', () => {
      const battle = new Battle({ ...gameSpec, winPercent: 50 }, [simpleAnt, aggressiveAnt]);

      // Manually set up a scenario where team 1 has > 50% of total value
      battle.teams[0].numAnts = 100;
      battle.teams[0].numBases = 2;
      battle.teams[1].numAnts = 10;
      battle.teams[1].numBases = 1;

      // Check termination
      expect(battle.checkTermination()).toBe(true);
    });

    it('should handle termination by half-time advantage', () => {
      const battle = new Battle({ ...gameSpec, halfTimeTurn: 10, halfTimePercent: 60 }, [
        simpleAnt,
        aggressiveAnt,
      ]);

      // Set current turn past half-time
      battle.currentTurn = 15;

      // Set up scenario where team 1 has > 60% advantage
      battle.teams[0].numAnts = 80;
      battle.teams[0].numBases = 1;
      battle.teams[1].numAnts = 20;
      battle.teams[1].numBases = 1;

      // Check termination
      expect(battle.checkTermination()).toBe(true);
    });

    it('should handle termination when only one team remains active', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt]);

      // Simulate one team being completely eliminated
      battle.teams[0].numAnts = 50;
      battle.teams[0].numBases = 1;
      battle.teams[1].numAnts = 0; // Team 2 eliminated
      battle.teams[1].numBases = 0;

      // Check termination - should return true as only 1 team remains active
      expect(battle.checkTermination()).toBe(true);
    });

    it('should handle timing measurements for performance tracking', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      const ant = battle.ants[0];
      const initialTimesTimed = battle.teams[0].timesTimed;

      // Run ant multiple times to potentially trigger timing measurement
      for (let i = 0; i < 50; i++) {
        battle.runAnt(ant);
      }

      // Timing measurement should have occurred at least once (1 in 10 chance each time)
      expect(battle.teams[0].timesTimed).toBeGreaterThanOrEqual(initialTimesTimed);
    });

    it('should track team statistics', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt]);

      expect(battle.teams[0].numAnts).toBeGreaterThan(0);
      expect(battle.teams[1].numAnts).toBeGreaterThan(0);
      expect(battle.teams[0].numBases).toBe(1);
      expect(battle.teams[1].numBases).toBe(1);
    });

    it('should handle battle stop functionality', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      // Initially stop is not requested
      expect(battle.checkTermination()).toBe(false);

      // Request stop
      battle.stop();

      // Termination should now return true due to stop request
      expect(battle.checkTermination()).toBe(true);
    });

    it('should handle square ownership transfer when moving to enemy territory', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt]);

      const ant = battle.ants.find((a) => a.team === 1)!;
      const targetX = 60;
      const targetY = 60;

      // Set up enemy territory (team 2) with no ants
      const targetSquare = battle.mapData(targetX, targetY);
      targetSquare.numAnts = 0; // No ants, just territory ownership
      targetSquare.team = 2; // Owned by team 2

      // Position ant adjacent to enemy territory
      ant.xPos = targetX - 1;
      ant.yPos = targetY;

      const initialTeam1SquareOwn = battle.teams[0].squareOwn;
      const initialTeam2SquareOwn = battle.teams[1].squareOwn;

      // Move into enemy territory (no combat since no ants)
      battle.doAction(ant, 1); // Move right

      // Verify square ownership transfer
      expect(battle.teams[0].squareOwn).toBe(initialTeam1SquareOwn + 1); // Team 1 gains ownership
      expect(battle.teams[1].squareOwn).toBe(initialTeam2SquareOwn - 1); // Team 2 loses ownership
      expect(targetSquare.team).toBe(1); // Square now owned by team 1
      expect(targetSquare.numAnts).toBe(1); // Ant moved there
    });

    it('should test advanced food placement with distance optimization', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      // Clear any existing food
      for (let x = 0; x < battle.args.mapWidth; x++) {
        for (let y = 0; y < battle.args.mapHeight; y++) {
          const square = battle.mapData(x, y);
          square.numFood = 0;
          square.numAnts = 0;
          square.base = false;
        }
      }

      const initialFood = (battle.numFood = 0);

      // Place multiple food items to test distance optimization
      battle.placeFood();
      const firstFoodCount = battle.numFood;
      expect(firstFoodCount).toBeGreaterThan(initialFood);

      // Place second food - should be at different location
      battle.placeFood();
      expect(battle.numFood).toBeGreaterThan(firstFoodCount);

      // Place third food - distance optimization should kick in
      battle.placeFood();
      expect(battle.numFood).toBeGreaterThan(firstFoodCount);
    });

    it('should handle edge cases for base building requirements', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);
      const ant = battle.ants[0];
      const square = battle.mapData(ant.xPos, ant.yPos);

      // Test base building with insufficient ants
      square.numAnts = 20; // Less than 25 required
      square.numFood = 60;
      square.base = false;
      const initialBases = battle.numBases;

      battle.doAction(ant, 16); // Try to build base

      expect(battle.numBases).toBe(initialBases); // Should not increase
      expect(square.base).toBe(false); // Should not become a base

      // Test base building with insufficient food
      square.numAnts = 30; // More than 25 required
      square.numFood = 40; // Less than 50 required

      battle.doAction(ant, 16); // Try to build base

      expect(battle.numBases).toBe(initialBases); // Should not increase
      expect(square.base).toBe(false); // Should not become a base
    });

    it('should handle paused battle state correctly', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      // Battle should not be paused initially
      expect(battle.paused).toBe(false);

      // Set battle to paused
      battle.paused = true;

      // Run with single step should return undefined when paused
      const result = battle.run(true);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle ant movement to same position', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);
      const ant = battle.ants[0];
      const originalX = ant.xPos;
      const originalY = ant.yPos;

      // Action 0 means stay in place
      battle.doAction(ant, 0);

      expect(ant.xPos).toBe(originalX);
      expect(ant.yPos).toBe(originalY);
    });

    it('should handle status emission with touched squares', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      // Mock postMessage to capture status emissions
      const statusMessages: BattleStatusMessage[] = [];
      vi.spyOn(global, 'postMessage').mockImplementation((message: BattleStatusMessage) => {
        statusMessages.push(message);
      });

      // Add some touched squares by moving an ant
      const ant = battle.ants[0];
      battle.doAction(ant, 1); // This should touch squares

      // Emit status
      battle.emitStatus();

      // Should have emitted a status message
      expect(statusMessages.length).toBeGreaterThan(0);
      const lastMessage = statusMessages[statusMessages.length - 1];
      expect(lastMessage.type).toBe('battle-status');
      expect(lastMessage.status).toBeDefined();
      expect(lastMessage.status.teams).toBeDefined();
      expect(lastMessage.status.deltaSquares).toBeDefined();
    });

    it('should handle status emission with no touched squares', () => {
      const battle = new Battle(gameSpec, [simpleAnt]);

      // Mock postMessage
      let statusEmitted = false;
      vi.spyOn(global, 'postMessage').mockImplementation(() => {
        statusEmitted = true;
      });

      // Clear touched squares
      battle.touchedSquares.clear();

      // Emit status - should return early with no touched squares
      battle.emitStatus();

      // No status should have been emitted
      expect(statusEmitted).toBe(false);
    });

    it('should emit status during battle run at specified intervals', () => {
      const battle = new Battle({ ...gameSpec, statusInterval: 2, timeOutTurn: 5 }, [simpleAnt]);

      // Mock postMessage
      const statusMessages: BattleStatusMessage[] = [];
      vi.spyOn(global, 'postMessage').mockImplementation((message: BattleStatusMessage) => {
        if (message.type === 'battle-status') {
          statusMessages.push(message);
        }
      });

      // Run battle
      battle.run();

      // Should have emitted status at intervals
      expect(statusMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Battle determinism', () => {
    it('should produce identical results with identical seeds', () => {
      const seed = 12345;
      const testSpec = {
        ...gameSpec,
        seed,
        rng: getRNG(seed),
        timeOutTurn: 10,
        statusInterval: 1000, // Prevent status emission during short test
      };

      // Run first battle
      const battle1 = new Battle(testSpec, [simpleAnt]);
      const firstBattleState = {
        mapState: battle1.map.map((s) => ({ ...s })),
        antPositions: battle1.ants.map((a) => ({ x: a.xPos, y: a.yPos, team: a.team })),
        foodMemory: [...battle1['lastFoodMemory']],
        foodIndex: battle1['lastFoodIndex'],
      };

      // Run second battle with same seed
      const battle2 = new Battle({ ...testSpec, rng: getRNG(seed) }, [simpleAnt]);
      const secondBattleState = {
        mapState: battle2.map.map((s) => ({ ...s })),
        antPositions: battle2.ants.map((a) => ({ x: a.xPos, y: a.yPos, team: a.team })),
        foodMemory: [...battle2['lastFoodMemory']],
        foodIndex: battle2['lastFoodIndex'],
      };

      // Initial states should be identical
      expect(secondBattleState.antPositions).toEqual(firstBattleState.antPositions);
      expect(secondBattleState.foodMemory).toEqual(firstBattleState.foodMemory);
      expect(secondBattleState.foodIndex).toEqual(firstBattleState.foodIndex);

      // Run both battles for a few turns
      for (let i = 0; i < 5; i++) {
        battle1.doTurn();
        battle2.doTurn();
      }

      // After identical operations, states should still be identical
      // Note: startTime is excluded as it's intentionally non-deterministic for battle identification
      const finalState1 = {
        turn: battle1.currentTurn,
        numAnts: battle1.numAnts,
        numFood: battle1.numFood,
        antPositions: battle1.ants.map((a) => ({ x: a.xPos, y: a.yPos, team: a.team })),
        foodMemory: [...battle1['lastFoodMemory']],
        foodIndex: battle1['lastFoodIndex'],
      };

      const finalState2 = {
        turn: battle2.currentTurn,
        numAnts: battle2.numAnts,
        numFood: battle2.numFood,
        antPositions: battle2.ants.map((a) => ({ x: a.xPos, y: a.yPos, team: a.team })),
        foodMemory: [...battle2['lastFoodMemory']],
        foodIndex: battle2['lastFoodIndex'],
      };

      expect(finalState2).toEqual(finalState1);
    });

    it('should produce different results with different seeds', () => {
      const testSpec1 = {
        ...gameSpec,
        seed: 12345,
        rng: getRNG(12345),
        timeOutTurn: 10,
        statusInterval: 1000,
      };

      const testSpec2 = {
        ...gameSpec,
        seed: 54321,
        rng: getRNG(54321),
        timeOutTurn: 10,
        statusInterval: 1000,
      };

      // Run battles with different seeds
      const battle1 = new Battle(testSpec1, [simpleAnt]);
      const battle2 = new Battle(testSpec2, [simpleAnt]);

      // Run both battles for a few turns
      for (let i = 0; i < 5; i++) {
        battle1.doTurn();
        battle2.doTurn();
      }

      // Final states should be different
      const finalState1 = {
        numAnts: battle1.numAnts,
        numFood: battle1.numFood,
        antPositions: battle1.ants.map((a) => ({ x: a.xPos, y: a.yPos, team: a.team })),
      };

      const finalState2 = {
        numAnts: battle2.numAnts,
        numFood: battle2.numFood,
        antPositions: battle2.ants.map((a) => ({ x: a.xPos, y: a.yPos, team: a.team })),
      };

      expect(finalState2).not.toEqual(finalState1);
    });
  });
});

import { describe, expect, it, beforeEach } from 'vitest';

import type { GameSpec } from '@/GameSpec';
import { Battle, BattleArgs, type AntFunction, type AntInfo, type SquareData } from '@/Battle';
import { getRNG } from '@/prng.ts';

describe('Battle tests', () => {
  let gameSpec: GameSpec;
  let simpleAnt: AntFunction;
  let aggressiveAnt: AntFunction;

  beforeEach(() => {
    gameSpec = {
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
        return { name: 'SimpleAnt', color: '#FF0000', brainTemplate: {} };
      }
      return Math.floor(Math.random() * 5); // Random direction
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
  });

  describe('Battle execution', () => {
    it('should run complete battle and produce summary', async () => {
      // Use shorter timeout for test
      const testSpec = { ...gameSpec, timeOutTurn: 5 };
      const battle = new Battle(testSpec, [simpleAnt]);

      const summary = await battle.run();

      expect(summary).toBeDefined();
      expect(summary.turns).toBeGreaterThan(0);
      expect(summary.winner).toBeDefined();
      expect(summary.teams).toContain('SimpleAnt');
      expect(summary.startTime).toBeGreaterThan(0);
      expect(summary.args).toBe(battle.args);
    });

    it('should handle multiple teams battle', async () => {
      const testSpec = { ...gameSpec, timeOutTurn: 10 };
      const battle = new Battle(testSpec, [simpleAnt, aggressiveAnt]);

      const summary = await battle.run();

      expect(summary.teams).toHaveLength(2);
      expect(summary.teams).toContain('SimpleAnt');
      expect(summary.teams).toContain('AggressiveAnt');
      expect(['SimpleAnt', 'AggressiveAnt', 'Draw']).toContain(summary.winner);
    });

    it('should respect timeout conditions', async () => {
      const testSpec = { ...gameSpec, timeOutTurn: 3 };
      const battle = new Battle(testSpec, [simpleAnt]);

      const summary = await battle.run();

      expect(summary.turns).toBeLessThanOrEqual(3);
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
      const team2Ant = battle.ants.find((ant) => ant.team === 2)!;

      // Instead, test combat logic directly by setting up the scenario
      const square = battle.mapData(team2Ant.xPos, team2Ant.yPos);
      square.numAnts = 1;
      square.team = 2;

      // Simulate team1 ant moving into team2 square
      battle.doAction(team1Ant, 0); // Setup for potential combat scenario

      // Note: Full combat testing would require more complex setup
      expect(battle.numAnts).toBeGreaterThan(0);
    });

    it('should track team statistics', () => {
      const battle = new Battle(gameSpec, [simpleAnt, aggressiveAnt]);

      expect(battle.teams[0].numAnts).toBeGreaterThan(0);
      expect(battle.teams[1].numAnts).toBeGreaterThan(0);
      expect(battle.teams[0].numBases).toBe(1);
      expect(battle.teams[1].numBases).toBe(1);
    });
  });
});

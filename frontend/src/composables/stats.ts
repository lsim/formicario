import type { BattleSummary, TeamStatus } from '@/GameSummary.ts';
import { type Observable, scan, share, throttleTime, withLatestFrom } from 'rxjs';
import { useWorker } from '@/workers/WorkerDispatcher.ts';

export type TeamStat = keyof Omit<TeamStatus, 'name' | 'color'>;

type TeamStats = {
  teamColor: string;
  stats: Record<TeamStat, number[]>;
};

export type BattleStats = {
  seed: number;
  turn: number[];
  teams: {
    [teamName: string]: TeamStats;
  };
};

export type BattleSummaryStats = {
  summary: BattleSummary;
  stats: BattleStats;
};

// Typescript compiler will ensure that the keys of the returned object are the same as the keys of the TeamStatus type
export function emptyTeamStats(color: string): TeamStats {
  return {
    teamColor: color,
    stats: {
      numBorn: [],
      numAnts: [],
      numBases: [],
      basesBuilt: [],
      kill: [],
      killed: [],
      dieAge: [],
      squareOwn: [],
      foodOwn: [],
      foodTouch: [],
      foodKnown: [],
      // timesRun: [],
      // timesTimed: [],
      timeUsed: [],
    },
  };
}

export function useStats() {
  const worker = useWorker();

  function aggregateBattleStats(throttle = 100) {
    return worker.battleStatusSubject$.pipe(
      throttleTime(throttle, undefined, { leading: true, trailing: true }),
      // Accumulate stats for each 200 turns
      scan(
        (acc, status) => {
          // Accumulate stats for each team - reset when the battle status seed changes (new battle)
          if (status.seed !== acc.seed) {
            acc = { turn: [], teams: {}, seed: status.seed };
          }
          acc.turn.push(status.turns);
          acc.seed = status.seed;
          for (const team of status.teams) {
            if (!acc.teams[team.name]) {
              acc.teams[team.name] = emptyTeamStats(team.color);
            }
            for (const stat of Object.keys(acc.teams[team.name].stats) as TeamStat[]) {
              acc.teams[team.name].stats[stat].push(team[stat]);
            }
          }
          return acc;
        },
        { turn: [], teams: {}, seed: 0 } as BattleStats,
      ),
    );
  }

  // The stats aggregation is expensive, so we share the stream to avoid redundant aggregation
  const sharedBattleStats$ = aggregateBattleStats().pipe(share());

  const expandedBattleSummaries$: Observable<BattleSummaryStats> =
    worker.battleSummarySubject$.pipe(
      withLatestFrom(sharedBattleStats$, (summary, stats) => ({ summary, stats })),
    );

  return {
    aggregatedBattleStats: sharedBattleStats$,
    expandedBattleSummaries$,
  };
}

import type { BattleSummary, TeamStatus } from '@/GameSummary.ts';
import {
  endWith,
  filter,
  type Observable,
  repeat,
  scan,
  share,
  takeUntil,
  throttleTime,
  withLatestFrom,
} from 'rxjs';
import { useWorker } from '@/workers/WorkerDispatcher.ts';

export type TeamStat = keyof TeamStatus['numbers'];

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
    return worker.battleStatuses$.pipe(
      throttleTime(throttle, undefined, { leading: true, trailing: true }),
      takeUntil(worker.battleSummaries$),
      endWith(null), // Signal end of battle to reset stats aggregation
      repeat(),
      scan(
        (acc, status) => {
          if (!status) return { turn: [], teams: {}, seed: 0 };
          // Accumulate stats for each team - reset when the battle status seed changes (new battle)
          acc.turn.push(status.turns);
          acc.seed = status.seed;
          for (const team of status.teams) {
            if (!acc.teams[team.id]) {
              acc.teams[team.id] = emptyTeamStats(team.color);
            }
            for (const stat of Object.keys(acc.teams[team.id].stats) as TeamStat[]) {
              acc.teams[team.id].stats[stat].push(team.numbers[stat]);
            }
          }
          return acc;
        },
        { turn: [], teams: {}, seed: 0 } as BattleStats,
      ),
      filter((stats) => stats.turn.length > 0),
    );
  }

  // The stats aggregation is expensive, so we share the stream to avoid redundant aggregation
  const sharedBattleStats$ = aggregateBattleStats().pipe(share());

  const expandedBattleSummaries$: Observable<BattleSummaryStats> = worker.battleSummaries$.pipe(
    withLatestFrom(sharedBattleStats$, (summary, stats) => ({ summary, stats })),
  );

  return {
    aggregatedBattleStats$: sharedBattleStats$,
    expandedBattleSummaries$,
  };
}

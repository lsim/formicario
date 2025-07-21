// A composable for rendering a battle to a canvas

import type { SquareStatus } from '@/GameSummary.ts';
import type { BattleArgs } from '@/Battle.ts';
import Color from 'color';

function getEmptySquareColor(s: SquareStatus, teamCol: string) {
  if (s.numAnts === 0 && s.numFood === 0 && !s.base && s.team) {
    return Color(teamCol).darken(0.7).hex();
  }
}

function getAntSquareColor(s: SquareStatus, teamCol: string) {
  if (s.numAnts > 0) {
    // Full brightness when there is food as well as ants else slightly dimmed
    return s.numFood > 0 ? Color(teamCol).lighten(0.6).hex() : teamCol;
  }
}

function getEmptyFoodSquareColor(s: SquareStatus, battleArgs: BattleArgs) {
  if (!s.numAnts && s.numFood) {
    // 50% white when there is [;minFood] food, [50%-80%] white when there is [minFood;maxFood] food
    const minFood = battleArgs.newFoodMin;
    const maxFood = battleArgs.newFoodMin + battleArgs.newFoodDiff;
    const food = Math.min(s.numFood, maxFood);
    const whiteRatio = (food - minFood) / (maxFood - minFood || 1);
    return Color('#555').lighten(whiteRatio).hex();
  }
}

function getBaseSquareColor(s: SquareStatus, teamCol: string) {
  // Base squares are mostly white, but tinted with team color
  if (s.base) {
    return Color(teamCol).lighten(0.9).hex();
  }
}

export default function useBattleRenderer() {
  let teamColors: string[] | undefined;

  function renderDeltasToBackBuffer(
    deltas: SquareStatus[],
    battleArgs: BattleArgs,
    canvasContext: CanvasRenderingContext2D,
  ) {
    for (let i = 0; i < deltas.length; i++) {
      const square = deltas[i];
      const x = square.index % battleArgs.mapWidth;
      const y = Math.floor(square.index / battleArgs.mapWidth);
      const teamCol: string =
        square.team === 0 ? 'magenta' : teamColors?.[square.team - 1] || 'magenta';

      const pixelColor =
        getBaseSquareColor(square, teamCol) ||
        getEmptyFoodSquareColor(square, battleArgs) ||
        getAntSquareColor(square, teamCol) ||
        getEmptySquareColor(square, teamCol);

      if (pixelColor) {
        canvasContext.fillStyle = pixelColor;
        canvasContext.fillRect(x, y, 1, 1);
      } else {
        canvasContext.clearRect(x, y, 1, 1);
      }
    }
  }

  return {
    renderDeltasToBackBuffer,
    setTeamColors(colors: string[]) {
      teamColors = colors;
    },
  };
}

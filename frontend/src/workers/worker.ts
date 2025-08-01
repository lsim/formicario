import type { WorkerMessage } from '@/workers/WorkerMessage.ts';
import { Game, instantiateParticipant } from '@/Game.ts';
import { type AntFunction } from '@/Battle.ts';

let activeGame: Game | undefined;

function getAntFunctions(teams: { id: string; code: string }[]): {
  id: string;
  func?: AntFunction;
  error?: string;
  line?: number;
  column?: number;
}[] {
  return teams.map((team) => {
    try {
      return {
        id: team.id,
        func: instantiateParticipant(team.code, team.id),
      };
    } catch (error) {
      return {
        id: team.id,
        line: (error as { lineNumber: number }).lineNumber,
        column: (error as { column: number }).column,
        error: (error as { message: string }).message,
      };
    }
  });
}

onmessage = async (e) => {
  const command: WorkerMessage = e.data as WorkerMessage;
  // console.debug('Worker received message', command);
  try {
    if (command?.type === 'run-game') {
      activeGame?.stopGame();
      const teamFunctions = getAntFunctions(command.game.teams);
      const failedAntFunctions = teamFunctions.filter((f) => f.error);
      if (failedAntFunctions.length > 0) {
        postMessage({
          type: 'error',
          id: command.id,
          error: failedAntFunctions.map((f) => `${f.id}: ${f.error}\n${f.line}:${f.column}`),
        });
        return;
      }
      activeGame = new Game(
        command.game,
        teamFunctions.filter((f) => f && f.func && f.id).map((f) => ({ id: f.id!, func: f.func! })),
      );
      const p = activeGame.run(command.pauseAfterTurns);
      postMessage({ type: 'ok', id: command.id });
      const summary = await p;
      if (!summary) {
        postMessage({ type: 'error', error: ['Failed to run game'] });
        return;
      }
      activeGame = undefined;
      postMessage({ type: 'game-summary', results: summary });
    } else if (command?.type === 'stop-game') {
      activeGame?.stopGame();
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'skip-battle') {
      activeGame?.skipBattle();
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'run-battle') {
      activeGame?.stopGame();
      const teamFunctions = getAntFunctions(command.teams);
      const failedAntFunctions = teamFunctions.filter((f) => f.error);
      if (failedAntFunctions.length > 0) {
        postMessage({
          type: 'error',
          id: command.id,
          error: failedAntFunctions.map((f) => `${f.id}: ${f.error}\n${f.line}:${f.column}`),
        });
        return;
      }
      activeGame = new Game(
        null,
        teamFunctions.filter((f) => f && f.func && f.id).map((f) => ({ id: f.id!, func: f.func! })),
        command.args,
        command.seed,
      );
      const p = activeGame.run(command.pauseAfterTurns);
      postMessage({ type: 'ok', id: command.id });
      await p;
      activeGame = undefined;
    } else if (command?.type === 'pause-game') {
      activeGame?.pause();
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'resume-game') {
      activeGame?.proceed({ type: 'resume' });
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'step-game') {
      activeGame?.proceed({ type: 'takeSteps', steps: command.stepSize });
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'ant-info-request') {
      try {
        const func = instantiateParticipant(command.teamCode, command.teamId);
        const descriptor = func();
        postMessage({ type: 'ant-info-reply', info: descriptor, id: command.id });
      } catch (error) {
        postMessage({ type: 'error', error: [String(error)], id: command.id });
      }
    } else if (command?.type === 'debug-request') {
      const ants = activeGame?.activeBattle?.getAntsForDebug(command.x, command.y);
      postMessage({ type: 'debug-reply', ants, id: command.id });
    } else {
      console.error('Unknown command', command);
      postMessage({ type: 'error', error: 'Unexpected command: ' + command?.type, id: command.id });
    }
  } catch (error) {
    console.error('Error processing message: ' + command?.type, error);
    postMessage({ type: 'error', error: String(error), id: command.id });
  }
};

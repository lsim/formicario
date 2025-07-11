import type { WorkerMessage } from '@/workers/WorkerMessage.ts';
import { Game, instantiateParticipant } from '@/Game.ts';

let activeGame: Game | undefined;

function getAntFunctions(teamNames: string[]) {
  return teamNames.map((team) => {
    try {
      return {
        name: team,
        func: instantiateParticipant(team),
      };
    } catch (error) {
      return {
        name: team,
        error,
      };
    }
  });
}

onmessage = async (e) => {
  const command: WorkerMessage = e.data as WorkerMessage;
  console.log('Worker received message', command);
  try {
    if (command?.type === 'run-game') {
      activeGame?.stop();
      const antFunctions = getAntFunctions(command.game.teams);
      const failedAntFunctions = antFunctions.filter((f) => f.error);
      if (failedAntFunctions.length > 0) {
        postMessage({
          type: 'error',
          error: failedAntFunctions.map((f) => `${f.name}: ${f.error}`),
        });
        return;
      }
      activeGame = new Game(
        command.game,
        antFunctions.map((f) => f.func).filter((f) => !!f),
      );
      const p = activeGame.run(command.pause);
      postMessage({ type: 'ok' });
      const summary = await p;
      if (!summary) {
        postMessage({ type: 'error', error: ['Failed to run game'] });
        return;
      }
      activeGame = undefined;
      postMessage({ type: 'game-summary', results: summary });
    } else if (command?.type === 'stop-game') {
      activeGame?.stop();
      postMessage({ type: 'ok' });
    } else if (command?.type === 'pause-game') {
      activeGame?.pause();
      postMessage({ type: 'ok' });
    } else if (command?.type === 'resume-game') {
      const p = activeGame?.resume();
      postMessage({ type: 'ok' });
      const summary = await p;
      if (!summary) return;
      activeGame = undefined;
      postMessage({ type: 'game-summary', results: summary });
    } else if (command?.type === 'step-game') {
      activeGame?.step(command.stepSize);
      postMessage({ type: 'ok' });
    } else if (command?.type === 'ant-info-request') {
      try {
        const func = instantiateParticipant(command.team);
        const descriptor = func();
        postMessage({ type: 'ant-info-reply', info: descriptor });
      } catch (error) {
        postMessage({ type: 'error', error: [String(error)] });
      }
    } else if (command?.type === 'debug-request') {
      const ants = activeGame?.activeBattle?.getAntsForDebug(command.x, command.y);
      postMessage({ type: 'debug-reply', ants });
    } else {
      console.error('Unknown command', command);
      postMessage({ type: 'error', error: 'Unknown command' });
    }
  } catch (error) {
    console.error('Error processing message: ' + command?.type, error);
    postMessage({ type: 'error', error: String(error) });
  }
};

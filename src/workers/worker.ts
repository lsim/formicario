import type { WorkerMessage } from '@/workers/WorkerMessage.ts';
import { Game } from '@/Game.ts';

let activeGame: Game | undefined;

// TODO: We need to set up a stream of status messages back to the UI
onmessage = async (e) => {
  const command: WorkerMessage = e.data as WorkerMessage;
  console.log('Worker received message', command);
  try {
    if (command?.type === 'run-game') {
      activeGame?.stop();
      activeGame = new Game(command.game);
      const p = activeGame.run(command.pause);
      postMessage({ type: 'ok' });
      const summary = await p;
      if (!summary) return;
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
    } else if (command?.type === 'debug-request') {
      const ants = activeGame?.activeBattle?.getAntsForDebug();
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

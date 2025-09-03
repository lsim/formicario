import type { WorkerMessage } from '@/workers/WorkerMessage.ts';
import { Game, instantiateParticipant } from '@/Game.ts';
import { type AntFunction, Battle } from '@/Battle.ts';
import { hash } from '#shared/hash.ts';

let activeGame: Game | undefined;
let activeSingleBattle: Battle | undefined;

function getAntFunctions(teams: { id: string; code: string; color?: string }[]): {
  id: string;
  func?: AntFunction;
  color?: string;
  error?: string;
  line?: number;
  column?: number;
}[] {
  return teams.map((team) => {
    try {
      const func = instantiateParticipant(team.code);
      // Store hash of code that was run (to prevent tampering)
      hash(team.code).then((codeHash) => (func.codeHash = codeHash));
      return {
        id: team.id,
        func: func,
        color: team.color,
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

let singleBattleEnded: Promise<void> | null = null;

let gameEnded: Promise<void> | null = null;

onmessage = async (e) => {
  const command: WorkerMessage = e.data as WorkerMessage;
  // console.debug('Worker received message', command);
  try {
    if (command?.type === 'run-game') {
      activeGame?.stopGame();
      await gameEnded;
      const teamFunctions = getAntFunctions(command.game.fillers);
      const failedAntFunctions = teamFunctions.filter((f) => f.error);
      if (failedAntFunctions.length > 0) {
        postMessage({
          type: 'error',
          id: command.id,
          error: failedAntFunctions.map((f) => `${f.id}: ${f.error}\n${f.line}:${f.column}`),
        });
        return;
      }
      const fixedTeamIds = command.game.teams.map((t) => t.id);
      const fixedTeamFunctions = teamFunctions.filter((tf) => fixedTeamIds.includes(tf.id));
      activeGame = new Game(
        command.game,
        fixedTeamFunctions
          .filter((f) => f && f.func && f.id)
          .map((f) => ({ id: f.id!, func: f.func! })),
        teamFunctions
          .filter((f) => f && f.func && f.id && !fixedTeamIds.includes(f.id))
          .map((f) => ({
            id: f.id!,
            func: f.func!,
          })),
        command.gameId,
        command.isTest,
        command.isRanked,
      );
      activeGame.setSpeed(command.speed);
      gameEnded = activeGame.run(command.pauseAfterTurns).then((summary) => {
        if (!summary) {
          postMessage({ type: 'error', error: ['Failed to run game'] });
          return;
        }
        activeGame = undefined;
        postMessage({ type: 'game-summary', results: summary });
      });
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'stop-game') {
      if (activeGame) {
        await activeGame.stopGame();
      } else if (activeSingleBattle) {
        await activeSingleBattle.stop();
      }
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'skip-battle') {
      activeGame?.skipBattle();
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'run-battle') {
      activeSingleBattle?.stop();
      await singleBattleEnded;
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
      activeSingleBattle = new Battle(
        command.args,
        teamFunctions
          .filter((f) => f && f.func && f.id)
          .map((f) => ({ id: f.id!, func: f.func!, color: f.color })),
        command.seed,
        -1,
        command.battleId,
        command.pauseAfterTurns,
        command.isTest,
        false,
      );
      activeSingleBattle.setSpeed(command.speed);
      singleBattleEnded = activeSingleBattle
        .run()
        .then((summary) => {
          postMessage({ type: 'battle-summary', summary, id: -1 });
        })
        .catch((e) => {
          console.error('Battle ended in error', activeSingleBattle?.battleId, e);
        })
        .finally(() => (activeSingleBattle = undefined));
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'pause-game') {
      activeGame?.pause();
      activeSingleBattle?.pause();
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'resume-game') {
      activeGame?.proceed({ type: 'resume' });
      activeSingleBattle?.proceed({ type: 'resume' });
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'step-game') {
      activeGame?.proceed({ type: 'takeSteps', steps: command.stepSize });
      activeSingleBattle?.proceed({ type: 'takeSteps', steps: command.stepSize });
      postMessage({ type: 'ok', id: command.id });
    } else if (command?.type === 'ant-info-request') {
      try {
        const func = instantiateParticipant(command.teamCode);
        const descriptor = func();
        postMessage({ type: 'ant-info-reply', info: descriptor, id: command.id });
      } catch (error) {
        postMessage({ type: 'error', error: [String(error)], id: command.id });
      }
    } else if (command?.type === 'debug-request') {
      const ants = (activeGame?.activeBattle || activeSingleBattle)?.getAntsForDebug(
        command.x,
        command.y,
      );
      postMessage({ type: 'debug-reply', ants, id: command.id });
    } else if (command?.type === 'set-speed') {
      activeGame?.setSpeed(command.speed);
      activeSingleBattle?.setSpeed(command.speed);
      postMessage({ type: 'ok', id: command.id });
    } else {
      console.error('Unknown command', command);
      postMessage({ type: 'error', error: 'Unexpected command: ' + command?.type, id: command.id });
    }
  } catch (error) {
    console.error('Error processing message: ' + command?.type, error);
    postMessage({ type: 'error', error: String(error), id: command.id });
  }
};

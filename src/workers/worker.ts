import type { ParticipantFunction } from '@/Participant.ts'
import { parse } from 'espree';
import type { IGameSpec } from '@/GameSpec.ts'
import type { ITeam } from '@/Team.ts'

onmessage = (e) => {
  console.log('Worker received message', e.data);
  if (e.data?.type === 'run-game') {
    run(e.data.game);
  }
  postMessage('Hello from the worker thread');
};

function evaluateStep(participant: ParticipantFunction) {

}

function auditParticipant(participant: string) {
  const ast = parse(participant);

  // TODO: check that the participant doesn't access any globals (except Math)
}

function instantiateParticipant(team: ITeam) {
  auditParticipant(team.code);
  return new Function('"use strict";\n' + team.code)();
}

function run(game: IGameSpec) {
  const participantFunctions = game.teams.map(instantiateParticipant);

  const steps = participantFunctions.map(evaluateStep);

}

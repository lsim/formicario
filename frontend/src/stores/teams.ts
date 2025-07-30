import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { blacklist, type Team } from '@/Team.ts';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import { useStorage } from '@vueuse/core';
import Color from 'color';

export const useTeamStore = defineStore('team', () => {
  const worker = useWorker();

  const teamStorage = useStorage<Record<string, Team>>('teamsById', {});

  async function loadBuiltinTeams() {
    const teams = [];
    // Built-in teams
    const rawImport = import.meta.glob('@ants/*.js', { eager: true, query: '?raw' }) as Record<
      string,
      { default: string }
    >;

    for (const [key, value] of Object.entries(rawImport)) {
      const code = value.default;
      const id = key.replace(/^\.\.\/ants\/(.+)\.js$/, '$1');
      const teamInfo: Team = { id, code, color: '', brainTemplate: {}, owner: 'built-in' };
      try {
        const moreInfo = await worker.getTeamInfo(teamInfo);
        if (moreInfo.color) teamInfo.color = moreInfo.color;
        if (moreInfo.name) teamInfo.name = moreInfo.name;
        if (moreInfo.brainTemplate) teamInfo.brainTemplate = moreInfo.brainTemplate;
        teamInfo.status = 'ok';
      } catch (error) {
        console.warn(`Failed to load team ${id}: ${error}`);
        teamInfo.status = 'error';
      }
      teams.push(teamInfo);
    }
    return teams;
  }

  const builtinTeams = ref<Team[]>([]);
  const builtInsReady = loadBuiltinTeams().then(
    (teams) => (builtinTeams.value = teams.filter((t) => !blacklist.includes(t.id))),
  );

  const allTeams = computed(() => [
    ...builtinTeams.value,
    ...Object.keys(teamStorage.value).map((id) => teamStorage.value[id]),
  ]);

  const battleTeams = ref<Team[]>([]);

  function selectForBattle(team: Team) {
    if (battleTeams.value.some((t) => t.name === team.name)) return;
    battleTeams.value = [...battleTeams.value, team];
  }

  function unselectForBattle(team: Team) {
    battleTeams.value = battleTeams.value.filter((t) => t.name !== team.name);
  }

  function isNameTakenByOther(name: string, id: string) {
    return Object.keys(teamStorage.value).some(
      (k) => teamStorage.value[k].name === name && k !== id,
    );
  }

  function renameTeam(id: string, name: string) {
    if (!teamStorage.value[id]) return;
    if (isNameTakenByOther(name, id)) throw Error('Team with name "' + name + '" already exists!');
    teamStorage.value[id].name = name;
  }

  function isBuiltIn(team: Team) {
    return team.owner === 'built-in';
  }

  function contrastingColor(color: string) {
    const c = new Color(color);
    return c.contrast(Color('white')) > c.contrast(Color('black')) ? 'white' : 'black';
  }

  function saveTeam(team: Team) {
    if (!team.name) throw Error('Team must have a name');
    if (isNameTakenByOther(team.name || '', team.id)) {
      throw Error('Team with name "' + team.name + '" already exists!');
    }
    team.lastChanged = Date.now();
    teamStorage.value[team.id] = team;
  }

  function loadTeam(id: string) {
    return teamStorage.value[id];
  }

  function teamName(teamId: string) {
    return allTeams.value.find((t) => t.id === teamId)?.name || '';
  }

  return {
    allTeams,
    battleTeams,
    selectForBattle,
    unselectForBattle,
    saveTeam,
    loadTeam,
    renameTeam,
    teamName,
    isBuiltIn,
    builtInsReady,
    contrastingColor,
  };
});

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { blacklist, type Team } from '@/Team.ts';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import { useStorage } from '@vueuse/core';
import Color from 'color';
import useApiClient, { type BackendPublication } from '@/composables/api-client.ts';
import useToast from '@/composables/toast.ts';

export declare type TeamMeta = {
  name: string;
  color: string;
  id: string;
  authorName?: string;
};

export const useTeamStore = defineStore('team', () => {
  const worker = useWorker();
  const apiClient = useApiClient();
  const toast = useToast();

  const teamStorage = useStorage<Record<string, Team>>('teamsById', {});

  const currentlyEditing = useStorage<string>('currentlyEditing', '', sessionStorage);

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
      const teamInfo: Team = {
        id,
        code,
        color: '',
        brainTemplate: {},
        authorName: 'built-in',
        name: id,
      };
      try {
        const moreInfo = await worker.getTeamInfo({ ...teamInfo, code });
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
  const teamsLoaded = Promise.all([
    loadBuiltinTeams().then(
      (teams) => (builtinTeams.value = teams.filter((t) => !blacklist.includes(t.id))),
    ),
    apiClient.loadPublications(),
  ]);

  const remoteTeams = apiClient.backendPublications;

  const localTeams = computed(() => [
    ...builtinTeams.value,
    ...Object.keys(teamStorage.value).map((id) => teamStorage.value[id]),
  ]);

  const battleTeams = ref<Team[]>([]);

  const allTeamMetas = computed(() => {
    const map = new Map<string, TeamMeta>();
    remoteTeams.value.forEach(({ name, color, id, authorName }) => {
      map.set(id, { name, color, id, authorName });
    });
    localTeams.value.forEach(({ name, color, id, authorName }) => {
      map.set(id, { name, color, id, authorName, ...(map.get(id) || {}) });
    });
    return Array.from(map.values());
  });

  async function selectForBattle(team: Team) {
    if (battleTeams.value.some((t) => t.name === team.name)) return;
    if (team.code) battleTeams.value = [...battleTeams.value, team];
    else {
      const remoteTeam = await apiClient.getFullPublication(team.id);
      if (remoteTeam) {
        battleTeams.value = [...battleTeams.value, { ...team, ...remoteTeam }];
      } else {
        toast.show('Could not find code for team', 'is-danger');
      }
    }
  }

  function unselectForBattle(team: Team) {
    battleTeams.value = battleTeams.value.filter((t) => t.name !== team.name);
  }

  function isNameTakenByOther(name: string, id: string) {
    return localTeams.value.some((t) => t.name === name && t.id !== id);
  }

  function renameTeam(id: string, name: string) {
    if (!teamStorage.value[id]) return;
    if (isNameTakenByOther(name, id)) throw Error('Team with name "' + name + '" already exists!');
    teamStorage.value[id].name = name;
  }

  function isBuiltIn(team: { authorName: string }) {
    return team.authorName === 'built-in';
  }

  function isOwnedByUser(team: Team | BackendPublication) {
    return !team.authorName || team.authorName === apiClient.userName.value;
  }

  function contrastingColor(color: string) {
    const c = new Color(color);
    return c.contrast(Color('white')) > c.contrast(Color('black')) ? 'white' : 'black';
  }

  function invertedColor(color: string) {
    return new Color(color).rotate(180).hex();
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
    return allTeamMetas.value.find((t) => t.id === teamId)?.name || '';
  }

  async function deleteTeam(id: string) {
    const team = localTeams.value.find((t) => t.id === id);
    if (!team || !isOwnedByUser(team)) return;
    if (teamStorage.value[id]) delete teamStorage.value[id];
    try {
      await apiClient.unpublishTeam(id);
    } catch (e) {
      console.warn('Failed to unpublish team', e);
    }
  }

  return {
    localTeams,
    remoteTeams,
    allTeamMetas,
    battleTeams,
    selectForBattle,
    unselectForBattle,
    saveTeam,
    loadTeam,
    deleteTeam,
    renameTeam,
    teamName,
    isBuiltIn,
    isOwnedByUser,
    teamsLoaded,
    contrastingColor,
    invertedColor,
    currentlyEditing,
  };
});

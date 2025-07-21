import { defineStore } from 'pinia';
import { ref } from 'vue';
import { blacklist, type Team } from '@/Team.ts';
import { useWorker } from '@/workers/WorkerDispatcher.ts';

export const useTeamStore = defineStore('team', () => {
  const worker = useWorker();
  async function loadBuiltinTeams() {
    const teams = [];
    // Built-in teams
    const rawImport = import.meta.glob('@ants/*.js', { eager: true, query: '?raw' }) as Record<
      string,
      { default: string }
    >;

    for (const [key, value] of Object.entries(rawImport)) {
      const code = value.default;
      const name = key.replace(/^\.\.\/ants\/(.+)\.js$/, '$1');
      const teamInfo: Team = { name, code };
      try {
        const moreInfo = await worker.getTeamInfo(teamInfo);
        if (moreInfo.color) teamInfo.color = moreInfo.color;
        if (moreInfo.brainTemplate) teamInfo.brainTemplate = moreInfo.brainTemplate;
        teamInfo.status = 'ok';
      } catch (error) {
        console.warn(`Failed to load team ${name}: ${error}`);
        teamInfo.status = 'error';
      }
      teams.push(teamInfo);
    }
    return teams;
  }

  const allTeams = ref<Team[]>([]);
  loadBuiltinTeams().then(
    (teams) => (allTeams.value = teams.filter((t) => !blacklist.includes(t.name))),
  );

  const battleTeams = ref<Team[]>([]);

  function selectForBattle(team: Team) {
    if (battleTeams.value.some((t) => t.name === team.name)) return;
    battleTeams.value = [...battleTeams.value, team];
  }

  function unselectForBattle(team: Team) {
    battleTeams.value = battleTeams.value.filter((t) => t.name !== team.name);
  }

  return { allTeams, battleTeams, selectForBattle, unselectForBattle };
});

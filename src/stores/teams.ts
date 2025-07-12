import { defineStore } from 'pinia';
import { ref } from 'vue';

export type Team = {
  name: string;
  code: string;
  color?: string;
};

export const useTeamStore = defineStore('team', () => {
  const allTeams = ref<Team[]>([]);
  const battleTeams = ref<Team[]>([]);

  return { allTeams, battleTeams };
});

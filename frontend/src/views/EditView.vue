<script setup lang="ts">
import { useRouter } from 'vue-router';
import CodeEditor from '@/components/editor/CodeEditor.vue';
import { useTeamStore } from '@/stores/teams.ts';
import type { Team } from '@/Team.ts';
import { computed, ref, watch } from 'vue';
import { ColorPicker } from 'vue3-colorpicker';
import 'vue3-colorpicker/style.css';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import { debouncedWatch } from '@vueuse/core';
import useToast from '@/composables/toast.ts';
import TeamList from '@/components/TeamList.vue';
import useApiClient from '@/composables/api-client.ts';

const teamStore = useTeamStore();
const router = useRouter();
const worker = useWorker();
const toast = useToast();
const apiClient = useApiClient();

const props = defineProps<{
  id?: string;
}>();

const codeTemplate = `// eslint-disable-next-line no-unused-vars
function ant(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData || !antInfo) {
    return {
      name: 'MyCleverName',
      color: '#FF0000',
      brainTemplate: {
        // Things your ant can remember go here
      },
    };
  }

  const { brains: [brain, ...otherBrains] } = antInfo;

  //     4
  //   3 0 1
  //     2
  return brain.random % 5;
}
`;
let firstChangeWatcher: ReturnType<typeof watch> | null = null;
let codeChangeWatcher: ReturnType<typeof debouncedWatch> | null = null;

const team = ref<Team>({
  id: '',
  code: codeTemplate,
});

const showingBuiltIn = computed(() => teamStore.isBuiltIn(team.value));

const listBuiltIns = ref(true);
const showMyTeamsOnly = ref(false);

const listedTeams = computed(() => {
  return teamStore.allTeams.filter((t) => {
    if (showMyTeamsOnly.value) {
      return t.id === team.value.id;
    }
    return listBuiltIns.value || !teamStore.isBuiltIn(t);
  });
});

// React to the team id changing
watch(
  () => props.id,
  (newId) => {
    // Allow for the allTeams list to be computed
    firstChangeWatcher?.stop();
    codeChangeWatcher?.();

    Promise.all([
      teamStore.builtInsReady,
      !newId ? worker.getTeamInfo({ id: 'none', code: codeTemplate }) : null,
    ]).then(([, teamInfo]) => {
      try {
        if (newId) {
          const teamForId = teamStore.allTeams.find((t) => t.id === newId);
          if (teamForId && teamStore.isBuiltIn(teamForId)) {
            // Built-in team
            team.value = teamForId;
            return;
          }

          const t = teamStore.loadTeam(newId);
          if (t) {
            team.value = t;
            return;
          }
        }

        team.value = {
          code: codeTemplate,
          ...teamInfo,
          id: '',
        };
        updateTeamFromCode().then(() => {
          // Set up the storage reactivity when the name is changed in the code
          firstChangeWatcher = watch(
            () => parsedName.value,
            (newName) => {
              if (!newName) return;
              try {
                team.value.id = crypto.randomUUID();
                team.value.name = newName;
                teamStore.saveTeam(team.value);
                router.push(`/edit/${team.value.id}`);
                firstChangeWatcher?.stop();
              } catch (e) {
                toast.show(String(e), 'is-danger');
                console.error(e);
              }
            },
          );
        });
      } finally {
        updateTeamFromCode().then(() => {});
        if (!teamStore.isBuiltIn(team.value)) {
          watchCodeChanges();
        }
      }
    });
  },
  { immediate: true },
);

const pickedColor = ref<string>('');

function updateCodeDeclaration(declarationProp: 'color' | 'name') {
  // We could use espree to find this, but that would mean messing up the user's preferred formatting
  const propRegex = new RegExp(`${declarationProp}\\s*:\\s*['"].*['"]\\s*,`, 'gm');

  team.value.code = team.value.code.replace(
    propRegex,
    `${declarationProp}: '${pickedColor.value}',`,
  );
}

watch(
  () => pickedColor.value,
  (newColor) => {
    if (!newColor || newColor === team.value.color) return;
    team.value.color = newColor;
    updateCodeDeclaration('color');
  },
);

const parsedName = ref('');

async function updateTeamFromCode() {
  try {
    // Could be first change to a new team
    const t = await worker.getTeamInfo(team.value);
    if (t.name) {
      parsedName.value = t.name;
      if (team.value.id && t.name !== team.value.name) {
        teamStore.renameTeam(team.value.id, t.name);
      }
    }
    if (t.color) {
      team.value.color = t.color;
      pickedColor.value = t.color;
    }
    if (t.brainTemplate) team.value.brainTemplate = t.brainTemplate;
  } catch (error: unknown) {
    toast.show(String(error), 'is-danger');
  }
}

function watchCodeChanges() {
  codeChangeWatcher?.();
  codeChangeWatcher = debouncedWatch(
    () => team.value.code,
    () => updateTeamFromCode(),
    { debounce: 500 },
  );
}

function teamSelected(team: Team) {
  router.push(`/edit/${team.id}`);
  pickedColor.value = '';
  parsedName.value = '';
}

async function publish() {
  await apiClient.publishTeam({
    color: team.value.color,
    name: team.value.name,
    brainTemplate: team.value.brainTemplate,
    description: team.value.description,
    id: team.value.id,
    code: team.value.code,
  });
}

const codeMirrorOptions = {
  lineWrapping: true,
};
</script>

<template>
  <div class="edit">
    <div class="columns">
      <div class="editor-column column">
        <code-editor v-model="team.code" :disabled="showingBuiltIn" :options="codeMirrorOptions" />
      </div>
      <div class="menu-column column is-one-fifth">
        <div class="panel">
          <p
            class="panel-heading"
            :style="
              pickedColor && {
                backgroundColor: pickedColor,
                color: teamStore.contrastingColor(pickedColor),
              }
            "
            :class="{ mouseDisabled: showingBuiltIn }"
          >
            {{ team.name }}
            <span class="is-pulled-right" v-if="team.id && pickedColor">
              <color-picker
                class="color-picker"
                format="hex"
                shape="circle"
                disable-alpha
                picker-type="chrome"
                v-model:pureColor="pickedColor"
              />
            </span>
          </p>
          <div class="panel-block">
            <button class="button is-primary is-outlined is-fullwidth">New team</button>
          </div>
          <div class="panel-block">
            <team-list @team-selected="teamSelected" class="team-list" :teams="listedTeams" />
          </div>
          <label class="panel-block">
            <input type="checkbox" v-model="listBuiltIns" />
            Show built-ins
          </label>
          <label class="panel-block">
            <input type="checkbox" v-model="showMyTeamsOnly" />
            My teams only
          </label>
          <div class="panel-block">
            <button class="button is-primary is-outlined is-fullwidth" @click="publish()">
              Publish team
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.mouseDisabled {
  pointer-events: none;
}
.menu-column {
  div.panel {
    width: 12em;
    position: sticky;
    top: 1em;
    .team-list {
      height: 30vh;
    }
  }
}

.panel-heading {
  transition:
    background-color 0.5s ease,
    color 0.5s ease;
}
</style>
<style lang="scss">
.cm-editor {
  width: calc(100vw - 18em);
  min-height: calc(100vh - 10em);
}
</style>

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
import type { AntDescriptor } from '@/Battle.ts';
import ModalWrapper from '@/components/ModalWrapper.vue';
import { faCloudArrowUp, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import TestBattleView from '@/components/TestBattleView.vue';

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
      name: 'ACleverName', // <-- Change the name here
      color: '#FF0000',
      brainTemplate: {
        // Things your ants should remember go here
      },
      description: '',
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
  name: '',
  color: '',
  authorName: '',
});

const currentIsBuiltIn = computed(() =>
  teamStore.isBuiltIn({ authorName: team.value.authorName || '' }),
);

async function setupExistingTeam(id: string) {
  const localTeamForId = teamStore.localTeams.find((t) => t.id === id);
  if (localTeamForId) {
    team.value = localTeamForId;
    if (!teamStore.isBuiltIn({ authorName: team.value.authorName || '' })) {
      teamStore.currentlyEditing = id;
    }
    return true;
  }
  console.log('No local team found with id', id);
  const remoteTeamForId = teamStore.remoteTeams.find((t) => t.id === id);
  if (remoteTeamForId) {
    if (!remoteTeamForId.code) {
      team.value = await apiClient.getFullPublication(id);
      teamStore.saveTeam(team.value); // Add to local storage, so editor can bind to it
    } else {
      team.value = remoteTeamForId;
    }
    teamStore.currentlyEditing = id;
    return true;
  }
  console.log('No remote team found with id', id);
  return false;
}

function setupNewTeam(descriptor: AntDescriptor) {
  team.value = {
    code: codeTemplate,
    ...descriptor,
    authorName: apiClient.userName.value,
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
}

// React to the team id changing
watch(
  () => props.id,
  (newId) => {
    // Allow for the allTeams list to be computed
    firstChangeWatcher?.stop();
    codeChangeWatcher?.();

    Promise.all([
      teamStore.teamsLoaded,
      !newId
        ? worker.getTeamInfo({ id: 'none', code: codeTemplate, name: 'none', color: '' })
        : null,
    ]).then(async ([, teamInfo]) => {
      try {
        if (newId && (await setupExistingTeam(newId))) return;
        else if (newId) {
          toast.show(`No team found with id ${newId}`, 'is-danger');
          await router.push(`/edit`);
          return;
        } else if (teamInfo) {
          if (teamStore.currentlyEditing) {
            await router.push(`/edit/${teamStore.currentlyEditing}`);
            return;
          } else {
            setupNewTeam(teamInfo);
          }
        }
      } finally {
        updateTeamFromCode().then(() => {});
        if (!teamStore.isBuiltIn({ authorName: team.value.authorName || '' })) {
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

  team.value.code = team.value.code?.replace(
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

function validateBrainTemplate(brainTemplate: Record<string, number | boolean | unknown>) {
  for (const key in brainTemplate) {
    const value = brainTemplate[key];
    if (typeof value !== 'number' && typeof value !== 'boolean') {
      throw Error(`Brain template property '${key}' is not a number or boolean`);
    }
  }
}

let warnTimeout: ReturnType<typeof setTimeout> | null = null;
function warnDebounced(message: string) {
  if (warnTimeout) clearTimeout(warnTimeout);
  warnTimeout = setTimeout(() => {
    toast.show(message, 'is-warning');
    warnTimeout = null;
  }, 20000);
}

async function updateTeamFromCode() {
  try {
    if (!team.value.code) return;
    // Could be first change to a new team
    const t = await worker.getTeamInfo({ ...team.value, code: team.value.code });
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
    if (t.brainTemplate) {
      validateBrainTemplate(t.brainTemplate as Record<string, number | boolean | unknown>);
      team.value.brainTemplate = t.brainTemplate;
    }
    if (warnTimeout) clearTimeout(warnTimeout);
  } catch (error: unknown) {
    // Debounce so it doesn't spam the user while they're typing
    warnDebounced(String(error));
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
  if (!teamStore.isBuiltIn({ authorName: team.authorName || '' }))
    teamStore.currentlyEditing = team.id;
  pickedColor.value = '';
  parsedName.value = '';
}

async function publishTeam() {
  if (team.value.authorName && team.value.authorName !== apiClient.userName.value) {
    toast.show(
      `You are not the author of this team. You can only publish your own teams.`,
      'is-danger',
    );
    return;
  }
  if (!team.value.code) {
    console.warn('No code to publish');
    return;
  }
  await apiClient.publishTeam({
    color: team.value.color,
    name: team.value.name,
    brainTemplate: team.value.brainTemplate,
    description: team.value.description,
    id: team.value.id,
    code: team.value.code,
  });
}

const showDeleteConfirmation = ref<{
  resolve: (value: unknown) => void;
  reject: () => void;
  message: string;
} | null>(null);

function confirm(message: string) {
  return new Promise((resolve, reject) => {
    showDeleteConfirmation.value = { resolve, reject, message };
  }).finally(() => {
    showDeleteConfirmation.value = null;
  });
}

async function deleteTeam() {
  try {
    teamStore.currentlyEditing = '';
    await confirm('Are you sure you want to delete this team?');
    await teamStore.deleteTeam(team.value.id);
    await router.push('/edit');
    toast.show('Team deleted', 'is-success');
  } catch (e) {
    toast.show('Team deletion aborted', 'is-warning');
    console.error('Failed to delete team', e);
  }
}

function createNewTeam() {
  teamStore.currentlyEditing = '';
  router.push('/edit');
}

const codeMirrorOptions = {
  lineWrapping: true,
};
</script>

<template>
  <div class="edit">
    <modal-wrapper :visible="!!showDeleteConfirmation" v-if="showDeleteConfirmation">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Confirm deletion</p>
        </header>
        <section class="modal-card-body">
          <p>{{ showDeleteConfirmation.message }}</p>
        </section>
        <footer class="modal-card-foot">
          <button class="button" @click="showDeleteConfirmation.resolve(true)">Yes</button>
          <button class="button" @click="showDeleteConfirmation.reject()">No</button>
        </footer>
      </div>
    </modal-wrapper>
    <div class="columns">
      <div class="editor-column column">
        <code-editor
          v-model="team.code"
          :disabled="currentIsBuiltIn"
          :options="codeMirrorOptions"
        />
      </div>
      <div class="menu-column column is-one-fifth">
        <div class="panel">
          <p
            class="panel-heading"
            :style="
              pickedColor && {
                backgroundColor: pickedColor,
                color: teamStore.contrastingColor(pickedColor),
                borderColor: teamStore.invertedColor(pickedColor),
              }
            "
            :class="{ mouseDisabled: currentIsBuiltIn }"
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
          <div class="panel-block" v-if="team.id">
            <button class="button is-static is-size-7 is-fullwidth">
              Author: {{ team.authorName || 'You!' }}
            </button>
          </div>
          <div class="panel-block">
            <button @click="createNewTeam" class="button is-primary is-outlined is-fullwidth">
              <span class="icon is-small is-justify-content-left">
                <font-awesome-icon :icon="faPlus" />
              </span>
              <span>New team</span>
            </button>
          </div>
          <div class="panel-block team-selection">
            <team-list @team-selected="teamSelected" class="team-list" />
          </div>
          <div class="panel-block">
            <button
              class="button is-primary is-outlined is-fullwidth"
              @click="publishTeam()"
              :disabled="!!team.id && !teamStore.isOwnedByUser(team)"
              title="Push to the cloud for others to enjoy!"
            >
              <span class="icon is-small is-justify-content-left">
                <font-awesome-icon :icon="faCloudArrowUp" />
              </span>
              <span>Publish team</span>
            </button>
          </div>
          <div class="panel-block">
            <button
              class="button is-danger is-outlined is-fullwidth"
              @click="deleteTeam"
              :disabled="!!team.id && !teamStore.isOwnedByUser(team)"
            >
              <span class="icon is-small is-justify-content-left">
                <font-awesome-icon :icon="faTrash" />
              </span>
              <span>Delete team</span>
            </button>
          </div>
          <test-battle-view :code="team.code || ''" :color="team.color" />
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
    .team-selection {
      &:hover,
      &:has(:focus) {
        .team-list {
          height: 30vh;
        }
      }
      .team-list {
        height: 2.5em;
        transition: height 0.3s ease;
      }
    }
  }
}

.panel-heading {
  transition:
    background-color 0.5s ease,
    color 0.5s ease;
  border: 5px solid;
  margin: -5px;
}
</style>
<style lang="scss">
.cm-editor {
  width: calc(100vw - 18em);
  height: calc(100vh - 10em);
}
</style>

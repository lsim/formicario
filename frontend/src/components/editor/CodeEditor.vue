<script setup lang="ts">
import { ref } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { javascript, esLint } from '@codemirror/lang-javascript';
import { lintGutter, linter } from '@codemirror/lint';
import Linter from 'eslint4b-prebuilt';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from 'codemirror';

const code = ref('');

const extensions = [
  linter(esLint(new Linter())),
  lintGutter(),
  javascript(),
  oneDark,
  EditorView.lineWrapping,
];

// TODO: Make eslint extensions to catch eg Math api usage and other restricted stuff
</script>

<template>
  <codemirror v-model="code" :extensions="extensions" />
</template>

<style scoped lang="scss"></style>

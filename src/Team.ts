export type Team = {
  name: string;
  code: string;
  color?: string;
  brainTemplate?: object;
  status?: 'ok' | 'error';
};

// We are going to add more to this list as we go
import type { AntFunction } from '@/Battle.ts';

export const prohibitedGlobalNames = [
  'document',
  'self',
  'window',
  'Math',
  'JSON',
  'Date',
  'fetch',
  'XMLHttpRequest',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'console',
  'alert',
  'prompt',
  'confirm',
];

const allowedGlobalNames = ['name'];

export const shadowedGlobals = Object.keys(self)
  .concat(prohibitedGlobalNames)
  .filter((prop) => !allowedGlobalNames.includes(prop));

function buildScope(allowedGlobals: Record<string, unknown> = {}) {
  const scope: Record<string, unknown> = {};

  // Set each to undefined
  shadowedGlobals.forEach((prop) => {
    // Skip props starting with a number as they aren't valid parameter names
    if (!/^\d/.test(prop)) scope[prop] = undefined;
  });

  scope.Object = Object;
  scope.Array = Array;
  scope.String = String;
  scope.Number = Number;
  scope.Boolean = Boolean;
  scope.RegExp = RegExp;
  scope.Error = Error;
  scope.Symbol = Symbol;

  return { ...scope, ...allowedGlobals };
}

// Expects code that declares a function
export function createRestrictedEval(
  allowedGlobals: Record<string, unknown> = {},
): (code: string) => AntFunction {
  // We return an eval function where the scope is limited to the allowed globals
  return function restrictedEval(fnCode: string) {
    // Create an isolated scope by shadowing the prohibited globals with function arguments of the same name
    const scope = buildScope(allowedGlobals);
    const scopeKeys = Object.keys(scope);
    const scopeValues = Object.values(scope);

    const wrappedCode = `
      "use strict";
      return (${fnCode});
    `;

    return Function(...scopeKeys, wrappedCode)(...scopeValues);
  };
}

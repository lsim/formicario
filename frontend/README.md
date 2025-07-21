<img src="/images/ants-magnifier.png" alt="Three old ant factions duking it out" style="" />

# Formicario

This ancient programming game was popularized by the myrekrig.dk community in Aarhus, Denmark in the late 20th century. 

This project aims to recreate the game using modern web technologies. 

## The name

`Formicario` is a play on the word `Formicarium` (ant vivarium) with a nod to the excellent game Factorio.

## The game

**Formicario** is a programming game, i.e., a competition where each participant writes a program, after which the programs play against each other. The background story is as follows:

A series of mutually hostile ant colonies are established simultaneously on the surface of a torus (i.e., on a rectangular area where opposite sides meet each other). Scattered across this torus, there are piles of food that the ants can collect and bring back to their base, whereby new ants are born. Inevitably, violent confrontations arise between the different ant races in their struggle for survival and conquest...

The purpose of the game is, in other words, to program an ant algorithm that can most efficiently manage food collection, communication between the ants, as well as protection against and combat with the hostile ant teams.

## The rules

Available in [English](../Gospel/english/Rules.md) and the original [Danish](../Gospel/original/Regler.md).

The original C programming guide is also available in [English](../Gospel/english/OriginalProgrammingGuide.md) and the original [Danish](../Gospel/original/OriginalProgrammingGuide.md).

Note that the syntax looks slightly different in javascript. But there are lots of examples available in the **ants** folder for inspiration. Ranging from the banal to the downright mystical.

## The history

Myrekrig had its heyday around 2000. It was developed by Aske Simon Christensen and received updates while he was still at the computer science department at Aarhus University. Lots of nerd cred befell those who managed to top the charts on http://myrekrig.dk in those days.

## Project Setup

```sh
yarn
```

### Compile and Hot-Reload for Development

```sh
yarn dev
```

### Type-Check, Compile and Minify for Production

```sh
yarn build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
yarn test
```

### Lint with [ESLint](https://eslint.org/)

```sh
yarn lint
```

<script setup lang="ts">
import imgUrl from '../../../images/ants-magnifier.png';
</script>

<template>
  <div>
    <section class="hero is-primary is-medium">
      <div class="hero-body">
        <div class="container has-text-centered">
          <h1 class="title is-1 has-text-weight-bold">Welcome to Formicario</h1>
          <h2 class="subtitle is-3">The ultimate ant colony battle of wits</h2>
          <figure class="image is-inline-block mt-5">
            <img :src="imgUrl" alt="Ant colonies battling for supremacy" />
          </figure>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="notification is-info is-light">
          <h2 class="title is-2">What is Formicario?</h2>
          <div class="content is-size-5">
            <p>
              <strong>Formicario</strong> is a programming game that you play by writing a
              javascript algorithm to control an ant colony. Your ants must collect food, build
              bases, and battle other colonies for territorial dominance on a 2D torus battlefield.
            </p>
            <p>
              A play on <em>Formicarium</em> (ant vivarium) with a nod to Factorio, this modern web
              implementation recreates the classic programming game that captivated the myrekrig.dk
              community in Denmark in the late 90s.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 class="title is-2 has-text-centered mb-6">How the Game Works</h2>

        <div class="columns is-multiline">
          <div class="column is-half">
            <div class="card is-shadowless">
              <div class="card-content">
                <div class="content">
                  <p class="title is-4">🗺️ The Battlefield</p>
                  <p>
                    Ant colonies battle on a torus-shaped map (64+ squares wide/high) where opposite
                    edges connect. Each team starts with an initial population of ants at their
                    base, scattered food piles across the terrain.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="column is-half">
            <div class="card is-shadowless">
              <div class="card-content">
                <div class="content">
                  <p class="title is-4">⚡ Turn-Based Action</p>
                  <p>
                    Each turn, ants move in random order. Your ant can stand still, move in four
                    directions, drag food back to base, or build new bases when requirements are
                    met.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="column is-half">
            <div class="card is-shadowless">
              <div class="card-content">
                <div class="content">
                  <p class="title is-4">🧠 Limited Intelligence</p>
                  <p>
                    Each ant sees only its immediate surroundings (5 squares) and can communicate
                    only with friendly ants on the same square through shared brain memory.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="column is-half">
            <div class="card is-shadowless">
              <div class="card-content">
                <div class="content">
                  <p class="title is-4">⚔️ Combat & Growth</p>
                  <p>
                    Moving onto enemy squares destroys hostile ants and takes over their bases.
                    Bringing food to your base spawns new ants. Build strategic bases (worth 75 ant
                    points each) to expand your reach.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 class="title is-2 has-text-centered mb-6">Victory Conditions</h2>
        <div class="columns">
          <div class="column">
            <div class="notification is-success">
              <p class="title is-5 has-text-success-dark">Domination</p>
              <p>Control 75% of total points (ants + bases × 75)</p>
            </div>
          </div>
          <div class="column">
            <div class="notification is-warning">
              <p class="title is-5 has-text-warning-dark">Half-Time</p>
              <p>Control 60% of points after 10,000 turns</p>
            </div>
          </div>
          <div class="column">
            <div class="notification is-danger">
              <p class="title is-5 has-text-danger-dark">Time Limit</p>
              <p>Most points when battle ends at 20,000 turns</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 class="title is-2 has-text-centered mb-6">Programming Your Ants</h2>

        <div class="columns">
          <div class="column">
            <div class="box">
              <p class="title is-4 has-text-primary">The Ant Brain</p>
              <div class="content">
                <p>
                  Each ant has a memory structure you design. Store coordinates, food locations,
                  communication data, or strategic state. A prefilled field is initialized with a
                  random seed for your algorithms.
                </p>
              </div>
            </div>
          </div>

          <div class="column">
            <div class="box">
              <p class="title is-4 has-text-primary">The Ant Function</p>
              <div class="content">
                <p>
                  Your core algorithm receives the 5 surrounding squares and brain memories of all
                  friendly ants on your square. Return a number (0-4) to move, add 8 to move
                  <em>and</em> drag food, or return 16 to build a base.
                </p>
              </div>
            </div>
          </div>

          <div class="column">
            <div class="box">
              <p class="title is-4 has-text-primary">Team Obfuscation</p>
              <div class="content">
                <p>
                  Enemy teams appear with randomized IDs, preventing you from identifying specific
                  opponents. You must rely on behavioral patterns and strategic adaptation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 class="title is-2 has-text-centered mb-6">Strategic Considerations</h2>
        <div class="columns is-multiline">
          <div class="column is-half">
            <div class="tags has-addons is-large">
              <span class="tag is-dark">Food Collection</span>
              <span class="tag is-info">Efficient gathering and transport systems</span>
            </div>
          </div>
          <div class="column is-half">
            <div class="tags has-addons is-large">
              <span class="tag is-dark">Base Expansion</span>
              <span class="tag is-success">Strategic placement for territorial control</span>
            </div>
          </div>
          <div class="column is-half">
            <div class="tags has-addons is-large">
              <span class="tag is-dark">Communication</span>
              <span class="tag is-warning">Coordinate through shared brain memories</span>
            </div>
          </div>
          <div class="column is-half">
            <div class="tags has-addons is-large">
              <span class="tag is-dark">Combat Tactics</span>
              <span class="tag is-danger">Aggressive expansion vs. defensive positioning</span>
            </div>
          </div>
          <div class="column is-half">
            <div class="tags has-addons is-large">
              <span class="tag is-dark">Exploration</span>
              <span class="tag is-primary">Systematic vs. random map discovery</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="box">
          <h2 class="title is-2 has-text-centered">Historical Legacy</h2>
          <div class="content is-size-5 has-text-centered">
            <p>
              Myrekrig reached its peak around 2000, developed by Aske Simon Christensen at Aarhus
              University's computer science department. Topping the charts at myrekrig.dk brought
              significant nerd cred in those legendary days of fiercely competitive programming.
            </p>
            <p>
              This modern TypeScript implementation attempts to preserve the original's strategic
              depth and mathematical precision while bringing the classic game to contemporary web
              browsers.
            </p>
            <p>
              A large number of ant teams were implemented for the original game. The majority of
              these have been translated to javascript in the making of this game, so they can serve
              as inspiration for your own ant teams. If you are the original author of one of these
              teams of legend - welcome back to the arena!
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="hero is-dark">
      <div class="hero-body">
        <div class="container has-text-centered">
          <p class="title is-2">Ready to Command Your Colony?</p>
          <p class="subtitle is-4">
            Study the existing ant strategies, design your algorithm, and enter the eternal struggle
            for ant supremacy. May the most efficient colony prevail!
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss"></style>

# Ideas for future development

## Battle

- Add slider for speeding up/slowing down the battle. Default to low value, so it is easy to see what is going on

## Editor

- Make editing tabs dynamic - like in vscode, session state for the open tabs, a plus button to add a new tab
- A visual interface for setting up battle situation (eg 3x3 squares with ant in the middle), take a step and inspect the ant state and decision-making
- The ability to quickly run eg a 128x128 simulation with just the ant(s) being edited (eg in a slide in overlay with pause/step controls)
  - Perhaps with different handy modes/challenges available:
    - No food drops after round 1 (how many turns to collect and convert them all)
    - A sprinkling of random ants added initially (how many turns to find/kill them all)
- 

## Ranking

- A leaderboard tab/view
- Some way of aggregating results from multiple clients
- Will need some security measures to prevent cheating
  - Only accept results from clients running against the official website/backend
- Should use code hashes to track versioning
- Find some way to weight results
  - How high ranking were the loser teams?
  - How recent are the results?
  - How small a brain did the winning team use?


# What are the rules?

In the following, words written in *italics* are variable sizes that can be set with parameters to the control program, but which the ants cannot read.

Words in `monospace` are constants that are readable by the ants.

Subsequent number intervals in parentheses indicate the interval within which the size falls unless otherwise specified. Important concepts are written in **bold** the first time they are mentioned.

A **game** of Formicario consists of a number of **battles**. For each battle, random values are chosen for the variable sizes within user-specified intervals.

Each ant program defines a **race** of ants. In each battle, a number of **teams** of ants fight against each other. Each team is of a specific race, but there can be multiple teams of the same race in a battle. These will then be opponents on equal footing with others. The race only indicates the control algorithm used.

The area where a battle takes place is *MapWidth* (250-500) fields wide and *MapHeight* (250-500) fields high. The ants do not know these sizes, but can assume that they will always be divisible by 64.

For each participating team, a **base** is placed at an almost random location on the area, almost in the sense that the mutual distance between the bases does not become too small.

Each team starts with *StartAnts* (10-50) ants on the base.

On a field where there is no base, there can be a number of **food pieces** that the ants can drag around.

A battle proceeds in **turns**. In each turn, all ants in the area **move** in random order. When an ant moves, it can choose to:

1. Stand still.
2. Move 1 field in one of the directions north, south, east, or west.
3. If there is food on the field the ant is standing on: Move in a direction and drag 1 piece of food along.
4. Build a new base. For this to be possible, there must be at least `NewBaseAnts` (25) ants and `NewBaseFood` (50) pieces of food on the field in addition to the ant itself, which will then be removed when the base is built.

An ant cannot move onto a field where there are already `MaxSquareAnts` (100) or more ants. If it attempts this, it simply remains standing.

An ant cannot drag food onto a field where there are already `MaxSquareFood` (200) or more pieces of food. If it attempts this, the ant moves (if it can), but the food remains behind.

Any piece of food that is dragged onto the ant's own base or is surplus when building a new base immediately becomes a new ant of that team. These new ants get their first move in the immediately following turn.

Each ant is equipped with a **brain** in the form of a limited amount of memory. An ant always has access to read and write in the brain of all ants located on the same field as itself. Apart from the contents of these, the only information an ant has access to is the contents of the 5 fields the ant has the possibility to end its move on, as well as the values of the constants `NewBaseAnts`, `NewBaseFood`, `BaseValue` (`NewBaseAnts` + `NewBaseFood`), `MaxSquareAnts`, and `MaxSquareFood`.

When an ant moves onto a field, all hostile ants and any hostile base on the field are destroyed.

An ant team's **points** are defined as (number of ants on the team) + (number of bases the team has) × `BaseValue`, and **total points** denotes the sum of the points of the two ant teams that have the most points.

After each turn, new food is placed on the area. As long as the total number of points is less than (*MapWidth* × *MapHeight*) / *NewFoodSpace* (15-40), a cluster consisting of a random number of pieces of food (at least *NewFoodMin* (10-30), at most *NewFoodMin* + *NewFoodDiff* (5-20)) is placed on a random, empty field on the area. Similar to the placement of bases, the placement of food is not entirely random, as food has the highest probability of appearing in areas where it has been a long time since food last appeared.

A battle ends when:

1. An ant team has achieved *WinPercent* (75) percent of total points, or
2. *HalfTimeTurn* (10000) turns have passed and an ant team has achieved *HalfTimePercent* (60) percent of total points, or
3. *TimeOutTurn* (20000) turns have passed.

The winner of the battle is the team that has the most points at the end.

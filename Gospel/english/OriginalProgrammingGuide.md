# How do you program an ant?

Ant algorithms are written in C (ANSI C with `char` signed as default and // comments allowed). Ant programs are each in their own file, compiled separately and linked together with a control program that handles the simulation itself.

An ant program consists essentially of three things:

1. A structure that defines the brain that each ant possesses. There is no upper limit on the size of an ant's brain, but as will become apparent later, the size affects the ant race's final score.

   When an ant is born, the first **long** is initialized to a completely pseudo-random value, to give the ants the opportunity to generate random numbers for their own use. The rest of the structure is initialized to 0.

   This structure could, for example, look like this:
   ```c
   struct AntBrain {
      u_long random;
      short x,y;
      short foodx[10],foody[10];
      u_long timeout;
   };
   ```

2. A function that is called every time an ant needs to make a move. This function's return value then determines what the ant does in that particular turn.

   The function's prototype is:
   ```c
   int AntFunction(struct SquareData *fields, struct AntBrain *mem);
   ```

   The first parameter points to an array with 5 elements, with information about each of the 5 fields the ant can end its turn on, arranged as follows:
   ```
         4
       3 0 1
         2
   ```

   The `SquareData` structure has the following design:
   ```c
   struct SquareData {
      u_char NumAnts;
      u_char Base;
      u_char Team;
      u_char NumFood;
   };
   ```

    - `NumAnts` indicates the number of ants on the field.
    - `Base` is `1` if there is a base on the field, `0` otherwise.
    - `Team` indicates, if there are ant(s) and/or base on the field, which team they belong to. The ant itself is team 0, and the others count from 1 to (number of teams)-1. If there are neither ants nor base on the field, `Team` contains 0 (i.e., the same as if some of one's own ants were standing on the field).
    - `NumFood` indicates the number of food pieces on the field.

   The ant routine's second parameter points to a copy of the called ant's brain. The type of this parameter is therefore a pointer to the structure the ant's brain is defined as. If there are other ants than the called one on the same field, there will likewise be copies of their brains following the first one, in the order the respective ants arrived at the field. These can then be accessed as `mem[1]`, `mem[2]`, ..., `mem[fields->NumAnts-1]`. When the ant routine returns, all brains are copied back to their owner ants.

   The ant routine's return value is interpreted as follows:

   | Return Value | Action |
      |--------------|---------|
   | 0-4 | Move to the respective field, cf. the design of the `fields` array. |
   | 0-4 + 8 | Move to the field and drag 1 piece of food along. If there is no food on the field the ant is on, only the move is executed without dragging food along. |
   | 16 | Build a new base. `NewBaseFood` food pieces, as well as the `NewBaseAnts` ants (besides the ant that is moving), who arrived first at the field, disappear, and a new base is established. If the requirements for building a base are not met, the ant simply remains standing. |

3. What makes it all work together:

    - At the top, `Myre.h` is included, which contains definitions of the necessary structures, constants and macros as well as a couple of practical `typedef`s:
      ```c
      #include "Myre.h"
      ```

    - At the bottom (or just below the brain definition), a call to the `DefineAnt` macro is placed:
      ```c
      DefineAnt(name, title, func, mem)
      ```
      where:
        - `name` identifies the ant. It must be a legal C variable name.
        - `title` is a string of at most 10 characters that indicates the ant's name as it appears in the program's output.
        - `func` is the name of the ant function.
        - `mem` is the type of the ant's brain.

      It could, for example, look like this:
      ```c
      DefineAnt(ExampleAnt, "Example", ExampleFunction, struct ExampleBrain)
      ```

To ensure the described rules are followed, there are the following natural restrictions on ant programs:

- An ant program may not include anything other than `Myre.h` and may not refer to any variables or functions outside the ant's own file. A single exception to this rule is `assert()`, which is available to the ants.
- An ant may not access other information than what it is given by virtue of the 5 fields in the `fields` array and the `fields->NumAnts` ants in the `mem` array.
- The ants may not communicate with each other in ways other than through the access to each other's brains they have when standing on the same field. It is therefore not permitted to declare any global or static variables.


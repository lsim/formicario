/*
 * ReluctAnt
 *
 * This ant serves as an example on how to implement your own ant. See also the Programming Guide.
 *
 * @param {SquareData} squareData: An array of the closest squares in the following order: [center, right, below, left, above]
 * @param {AntBrain} antBrain: This ant's current state
 * @returns {number | object} the action to take or an object describing itself:
 * - 0-4  : move to the given direction (0 = stay, 1 = right, 2 = down, 3 = left, 4 = up)
 * - 0-4+8: move to the given direction and drag food (8 = stay, 9 = right, 10 = down, 11 = left, 12 = up)
 * - 16   : build base (provided conditions are met - otherwise stay)
 */
function ReluctAnt(squareData, antBrain) {
  // When invoked with no arguments, the ant must return an object describing itself.
  if (!squareData)
    return {
      // Brain size is defined by the number of expressions in the structure. Arrays must be fixed-size and only support basic read/write operations.
      brain: {},
      name: 'ReluctAnt',
      color: '#8956ff',
    };

  // Each ant is born with a random number in its brain in addition to its brain structure.

  // This very basic ReluctAnt strategy has each ant move exclusively in one of the four directions.
  return (antBrain.random % 3) + 1;
}

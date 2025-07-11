function Servant(squareData, antInfo) {
  // Return ant descriptor when called without arguments
  if (!squareData) {
    return {
      brainTemplate: {
        random: 1,
        x: 0,
        y: 0,
        foodx: new Array(10).fill(0),
        foody: new Array(10).fill(0),
        timeout: 0
      },
      name: 'Servant',
      color: '#888888', // Gray color
    };
  }

  // "Den kære leder er død." - The dear leader is dead.
  // This ant does absolutely nothing, as per the original C code
  return 0;
}
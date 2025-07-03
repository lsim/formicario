# MyreKrig (Ant War) - Implementation Analysis

## Project Overview

MyreKrig is a competitive programming game where AI-controlled ant colonies battle for territorial control on a 2D grid. This project contains both the original C implementation and a modern Vue 3/TypeScript reimplementation.

## Original C Implementation Analysis

### Architecture and Purpose

The original MyreKrig system is a sophisticated tournament framework for AI competition. Ant colonies (teams) compete simultaneously on a shared 2D map, collecting food, building bases, and fighting enemy ants. Victory is determined by territorial control through a combination of ants and bases.

**Key Design Principles:**
- Turn-based simulation with random ant activation order
- Limited information visibility (local 5-square view per ant)
- Pluggable AI implementations with standardized interface
- Multiple battle system with statistical analysis
- Various visualization modes for different use cases

### Core Data Structures

**Game State (`Myre.h`):**
- `SquareData`: Map cells with ant count, bases, team control, and food
- `AntData`: Individual ant state with position, team, age, and custom memory
- Memory management through custom allocators and free lists

**Team System (`MyreKrig.h`):**
- `TeamData`: Team statistics, AI function pointers, and performance metrics
- `Parameters`: Configurable game settings (map size, food spawn, turn limits)
- Battle configuration with randomized parameters

### Game Mechanics

**Turn Execution:**
1. Random ant selection and activation
2. AI function call with local state (5 squares + friendly ant memories)
3. Action processing (move, carry food, build base)
4. Automatic combat resolution
5. Resource management (food spawning, base construction)

**Victory Conditions:**
- Percentage territorial control: `(NumAnts + BaseValue * NumBases) / TotalValue`
- Time limits with HalfTime and TimeOut thresholds
- BaseValue = 75, making bases highly valuable strategic assets

### AI Interface

Each participant implements a single function:
```c
int AntFunction(struct SquareData *squares, void *memory)
```

**Information Available:**
- Local 5-square view (center + 4 adjacent)
- Team number obfuscation (enemies appear as random team IDs)
- Shared memory access for friendly ants on same square
- No global map knowledge or enemy strategy visibility

**Notable AI Strategies:**
- **SunMyre**: Hierarchical queen/scout/worker/guard system with systematic exploration
- **Dummy**: Spiral exploration pattern with role-based combat
- **ElephAnt**: Basic pathfinding with base-relative navigation

### Display Systems

- **MK_Ascii.c**: Real-time ASCII visualization with ANSI colors
- **MK_Count.c**: Minimal turn counter for progress monitoring
- **MK_Quiet.c**: Silent mode for batch tournament processing
- **MK_XWin.c**: X11 graphics system for visual gameplay

## Vue 3/TypeScript Implementation Analysis

### Modern Architecture

The reimplementation modernizes MyreKrig as a web-based application using current best practices:

**Technology Stack:**
- Vue 3 with Composition API and `<script setup>` syntax
- TypeScript 5.8 with strict type checking
- Vite for development and building
- Web Workers for game simulation
- ESLint + Prettier for code quality

### Current Implementation Status

**Completed Foundation:**
```typescript
// Core type system
interface IGameSpec {
  mapWidth: [number, number];
  mapHeight: [number, number];
  newFoodSpace: [number, number];
  startAnts: [number, number];
  teams: ITeam[];
}

// Participant interface
type ParticipantFunction = (
  state: AntState, 
  surroundings: ParticipantSurroundings
) => number;

// Team definition
interface ITeam {
  name: string;
  color: string;
  code: string; // JavaScript code as string
}
```

**Worker System:**
- Message passing infrastructure with typed commands
- Code security auditing using `espree` AST parsing
- Dynamic function evaluation with `new Function()`
- Isolation through web worker threads

**Vue Application:**
- Minimal UI with worker communication testing
- Router setup for future expansion
- Pinia state management prepared but unused

### Progress and Gaps

**✅ Implemented:**
- TypeScript type definitions for all game entities
- Worker thread infrastructure and message passing
- Code parsing and security validation framework
- Basic Vue 3 application structure
- Modern build tooling and development environment

**🔄 In Progress:**
- Battle initialization logic (stubbed)
- Game simulation loop (incomplete)
- Map generation and food placement (missing)

**📋 Planned:**
- Canvas-based game visualization
- Complete battle simulation implementation
- Secure code execution sandboxing

### Architectural Mapping

The TypeScript implementation preserves core concepts while modernizing the approach:

| C Implementation | TypeScript Implementation |
|------------------|---------------------------|
| `struct SquareData` | `SquareData` type + map array |
| `struct AntData` | `AntData` interface with brain object |
| `struct TeamData` | `ITeam` interface + `ParticipantFunction` |
| `DefineAnt` macro | Dynamic function instantiation |
| C game loop | Worker-based async execution |
| Manual memory management | JavaScript object lifecycle |
| Compiled functions | Runtime code evaluation |

## Technical Considerations

### Security
- Original C: Process isolation through system boundaries
- Modern TypeScript: AST parsing + worker isolation + runtime sandboxing

### Performance
- Original C: Direct memory access and compiled code
- Modern TypeScript: JIT compilation with worker thread overhead

### Extensibility
- Original C: Compile-time team registration
- Modern TypeScript: Runtime code loading and evaluation

## Development Commands

Based on the project structure, key commands should be:
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run type-check` - TypeScript validation
- `npm run lint` - Code quality checking

## Next Steps

To complete the TypeScript implementation:

1. **Core Game Logic**: Implement battle simulation loop in worker
2. **Visualization**: Add canvas-based map rendering
3. **Testing**: Create comprehensive test suite for game mechanics
4. **Security**: Strengthen code execution sandboxing
5. **UI/UX**: Build tournament management interface
6. **Performance**: Optimize worker communication and game loops

The project shows excellent progress in modernizing a classic competitive programming platform while preserving its core strategic gameplay and tournament structure.
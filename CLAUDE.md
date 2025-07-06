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

**Completed Core Systems:**
```typescript
// Complete battle simulation system
export class Battle {
  args: BattleArgs;
  teams: TeamData[];
  map: SquareData[] = [];
  ants: AntData[] = [];
  deadAntIndices: number[] = []; // Ant recycling system
  
  // Fully implemented game loop
  doTurn(): void
  doAction(ant: AntData, action: number): void
  checkTermination(): boolean
}

// Ant function interface matching C implementation
export type AntFunction = (() => AntDescriptor) & 
  ((map: SquareData[], antInfo: AntInfo) => number);

// Linked list optimization for efficient square traversal
type AntData = {
  mapNext?: AntData;
  mapPrev?: AntData;
  alive: boolean;
  // ... other fields
}
```

**Battle System Features:**
- Complete turn-based simulation with random ant processing
- Efficient linked list management for ants per square (O(ants_on_square) vs O(total_ants))
- Ant recycling system preventing memory leaks in long battles
- Full combat resolution with proper base capture mechanics
- Food placement with distance optimization and circular buffer memory
- Team shuffle tables for obfuscated enemy visibility
- Deterministic RNG system for reproducible battles

**Worker System:**
- Message passing infrastructure with typed commands
- Battle execution in separate thread for UI responsiveness
- Real-time status updates with delta compression
- Pause/resume and single-step debugging capabilities

**Vue Application:**
- Interactive battle visualization with real-time updates
- Team statistics display and performance metrics
- Battle configuration with randomized parameters
- Modern responsive UI with Vue 3 Composition API

### Progress Status

**✅ Fully Implemented:**
- Complete battle simulation engine (1:1 C implementation port)
- Ant lifecycle management with proper linked list maintenance
- Combat system with base capture and territory control
- Food spawning and resource management
- Turn processing with deterministic randomization
- Team obfuscation and information hiding
- Performance optimizations from C version
- Comprehensive test suite (68 passing tests)
- Worker-based architecture for smooth UI
- Real-time battle visualization

**✅ Advanced Features:**
- Ant recycling system (prevents memory leaks)
- Linked list optimizations (performance boost for dense squares)
- Deterministic RNG (reproducible battles)
- Delta-based status updates (efficient UI updates)
- Battle pause/resume functionality
- Single-step debugging mode

**🔄 Current Work:**
- Expanding ant AI library (multiple strategies implemented)
- UI polish and additional visualization features

**📋 Future Enhancements:**
- Tournament system with bracket management
- Historical battle replay system
- Advanced AI analysis and debugging tools
- Multi-battle statistical analysis

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

## Performance Optimizations Implemented

### Linked List System
Following the C implementation's pointer management, the TypeScript version now includes:
- **Efficient square traversal**: O(ants_on_square) instead of O(total_ants)
- **Proper memory management**: Dead ants removed from linked lists immediately
- **Combat optimization**: Enemy killing uses linked list traversal, not array filtering

### Memory Management
- **Ant recycling system**: Dead ant indices are reused to prevent array growth
- **Circular buffer for food placement**: Fixed-size memory for distance optimization
- **Structured cloning for brain templates**: Proper object isolation

### Battle Performance
- **Deterministic RNG**: Single seeded random number generator
- **Delta status updates**: Only changed squares sent to UI
- **Efficient turn processing**: Random ant selection without expensive operations

## Test Coverage

The implementation includes comprehensive test coverage:
- **68 total tests passing** (67 battle tests + other components)
- **6 linked list integrity tests** validating proper pointer management
- **Performance regression tests** ensuring optimizations work correctly
- **Determinism tests** verifying reproducible battle outcomes
- **Edge case coverage** for combat, base building, and resource management

## Quality Assurance

**Code Quality:**
- TypeScript 5.8 with strict type checking
- ESLint + Prettier for consistent formatting
- Comprehensive test suite with Vitest
- Performance monitoring and optimization

**Battle Fidelity:**
- 1:1 mapping with original C implementation behavior
- All major algorithms preserved (combat, food placement, termination)
- Team obfuscation and information hiding maintained
- Victory conditions and scoring identical

## Development Status

The TypeScript implementation has achieved **feature parity** with the original C version for core battle simulation. The system is now ready for:

1. **Tournament Integration**: Multi-battle statistical analysis
2. **Advanced Visualization**: Enhanced UI features and debugging tools  
3. **AI Development**: Expanded library of competitive ant strategies
4. **Performance Tuning**: Further optimizations for large-scale battles

The project successfully modernizes a classic competitive programming platform while preserving its core strategic gameplay, mathematical precision, and tournament-grade reliability.
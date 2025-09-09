# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **baseball game stream processor** that uses the Sabertooth baseball game state engine to process live game event streams. The system handles baseball game events, maintains game state, and processes various game scenarios including baserunning, scoring, and lineup management.

## Key Commands

### Development Commands
```bash
# Start the Express server
npm start
# or
node server.js

# Start simple HTTP server (alternative)
npm run serve
# or  
python3 -m http.server 8000

# No tests configured
npm test  # Will show error message
```

## Architecture

### Core Components

**sabertooth.js** - The core minified baseball game state engine containing:
- `BaseballCompactorController` - Main class for managing game state
- State contexts: `situation`, `baserunners`, `lineup`, `fielders`
- Event processing pipeline with immutable state transitions

**server.js** - Express.js server with:
- JWT refresh token proxy functionality  
- MongoDB connection capabilities
- Swagger API documentation setup
- CORS configuration for cross-origin requests
- REST API endpoints for game processing

**process_game.js** - Game processing script that demonstrates how to use the Sabertooth engine

### Key Files
- `players.json`, `opponents.json` - Player and team data
- `example-game2.json` - Example game event stream data
- `index.html`, `style.css` - Simple web interface
- `docker-compose.yaml`, `Dockerfile` - Container configuration

## Working with the Sabertooth Engine

### Controller Initialization
```javascript
const controller = new global.controllers.baseball.usingCompactor({
    homeTeamId: string,
    awayTeamId: string, 
    playerTeamMembership: object, // Maps player IDs to team IDs
    homePlayerIds: string[],
    awayPlayerIds: string[]
});
```

### Processing Events
```javascript
controller.push(eventData);  // Single event or array of events
```

### Querying Game State
```javascript
const state = controller.latestState();
const inning = state.get('inning', controller.situation);
const currentBatter = state.call('currentBatter', [], controller.lineup);
```

### Major Event Types
- **Pitch events**: `pitch`, `BK` (balk), `IP` (illegal pitch)
- **At-bat outcomes**: `SO` (strikeout), `BB` (walk), `HB` (hit by pitch)
- **Ball in play**: `1B`, `2B`, `3B`, `HR`, `E` (error), `FC` (fielder's choice)
- **Base running**: `rSB` (stolen base), `rCS` (caught stealing), `rPO` (picked off)
- **Roster management**: `transaction`, `sub`, `pos`, `dh`

## Development Notes

### Important Constraints
- **sabertooth.js is minified** - Original source code is obfuscated, making debugging difficult
- **Immutable state model** - Each event creates new state rather than modifying existing state
- **Event order matters** - Events must be processed sequentially to maintain valid game state

### TypeScript Configuration  
- Target: ES2022, CommonJS modules
- Strict mode enabled with type checking
- Output directory: `./dist`

### Dependencies
- **express** - Web server framework
- **mongodb** - Database driver  
- **node-fetch** - HTTP client for API calls
- **cors** - Cross-origin resource sharing
- **swagger-jsdoc/swagger-ui-express** - API documentation

## Data Files
- Game event streams follow specific JSON structure with sequence numbers and event codes
- Player data includes IDs, team memberships, and roster information
- Opponent teams are stored separately from player teams
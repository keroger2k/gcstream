# Game Stream Processor

This project processes game event streams using the Sabertooth baseball game state engine. The system handles baseball game events, maintains game state, and processes various game scenarios including baserunning, scoring, and lineup management.

## Core Components

### sabertooth.js

The `sabertooth.js` file contains the core game state engine. It provides a sophisticated baseball game state manager with the following key components:

#### BaseballCompactorController

The `BaseballCompactorController` is the central class responsible for managing the state of a baseball game. It processes incoming game events, updates the internal state representation, and provides methods to query the current game situation, statistics, and player information.

**Constructor:**

The controller is instantiated with initial game setup data:

```javascript
const controller = new global.controllers.baseball.usingCompactor({
    homeTeamId: string,         // Unique identifier for the home team
    awayTeamId: string,         // Unique identifier for the away team
    playerTeamMembership: object, // An object mapping player IDs to their respective team IDs (e.g., { playerId1: homeTeamId, playerId2: awayTeamId })
    homePlayerIds: string[],    // An array of player IDs belonging to the home team, typically representing the initial roster
    awayPlayerIds: string[]     // An array of player IDs belonging to the away team, typically representing the initial roster
});
```

##### Important Methods

1.  **`push(eventData)`**: Processes a new game event or a collection of events.
    *   **Input**: `eventData` - An object or an array of objects, where each object represents a specific game event (e.g., a pitch, a hit, a substitution). The structure of these event objects is defined by the Sabertooth engine's expected event formats (see "Event Types" below).
    *   **Function**: Updates the internal game state based on the logic associated with the event type. This can include changing the count, moving baserunners, recording outs, updating scores, and modifying player statuses or positions.

2.  **`latestState()`**: Retrieves an object that represents the current, up-to-date state of the game.
    *   **Returns**: A state object. This object does not directly contain all state properties but provides methods (`get` and `call`) to query various aspects of the game across different "contexts" (like situation, baserunners, lineup, and fielders).

3.  **`stats`**: Provides access to accumulated game statistics.
    *   **Contains**: This property likely holds aggregated data such as team scores, player-specific stats (batting, pitching, fielding), pitch counts, and other relevant statistical information compiled throughout the game. The exact structure would be defined by the Sabertooth engine.

##### State Query Methods

The state object returned by `latestState()` is the primary way to inspect the detailed status of the game. It uses a context-based approach to retrieve information. The main contexts are `controller.situation`, `controller.baserunners`, `controller.lineup`, and `controller.fielders`.

1.  **`get(property, context)`**: Retrieves a specific piece of state information (property) from a given game context.
    *   **`property` (string)**: The name of the state attribute to query.
    *   **`context` (object)**: The specific part of the game state to query (e.g., `controller.situation`, `controller.baserunners`).
    *   **Common Properties & Contexts**:
        *   `inning` (from `controller.situation`): Current inning number.
        *   `half` (from `controller.situation`): Current inning half ('top' or 'bottom').
        *   `balls` (from `controller.situation`): Current balls count for the batter.
        *   `strikes` (from `controller.situation`): Current strikes count for the batter.
        *   `outs` (from `controller.situation`): Current number of outs in the half-inning.
        *   `atBatTeamId` (from `controller.situation`): The ID of the team currently at bat.
        *   `inFieldTeamId` (from `controller.situation`): The ID of the team currently in the field.
        *   `scores` (from `controller.baserunners`): An object or structure representing the current game score (e.g., `{ [homeTeamId]: 5, [awayTeamId]: 3 }`).
        *   `baserunners` (from `controller.baserunners`): An object or array detailing which player is on which base (e.g., `{ 1: 'playerIdX', 2: null, 3: 'playerIdY' }`).
        *   `batter` (from `controller.lineup`): The ID of the current player at bat.
        *   `pitcher` (from `controller.fielders`): The ID of the current pitcher.
        *   `playerAtPosition` (from `controller.fielders`, with position argument): The ID of the player at a specific defensive position (e.g., 'P', 'C', '1B').
        *   `lastPitchDetail`: Details about the most recently processed pitch, potentially including its type, speed, or outcome.

2.  **`call(method, args, context)`**: Invokes a method within a specific game context, often to get computed state or specific player roles.
    *   **`method` (string)**: The name of the method to call on the context.
    *   **`args` (array)**: An array of arguments to pass to the method.
    *   **`context` (object)**: The specific part of the game state where the method resides.
    *   **Common Methods & Contexts**:
        *   `currentBatter([teamId])` (on `controller.lineup`): Gets the player ID of the current batter for the specified team (or the active batting team if `teamId` is omitted).
        *   `playerForPosition([teamId, position])` (on `controller.fielders`): Gets the player ID of the fielder at the specified `position` for the given `teamId`.
        *   `getLineup(teamId)` (on `controller.lineup`): Retrieves the batting order for the specified team.
        *   `isRunnerAt(base)` (on `controller.baserunners`): Checks if a runner is present at a given base.

### Key Concepts

Understanding these baseball and simulation-specific terms is crucial for working with the Sabertooth engine:

*   **Inning**: A fundamental unit of play, divided into two halves.
*   **Half**: The top (away team bats) or bottom (home team bats) of an inning.
*   **At-Bat**: A batter's turn facing a pitcher. Ends when the batter gets a hit, is put out, or reaches base via a walk, hit-by-pitch, etc.
*   **Pitch Result**: The outcome of a single pitch (e.g., `Ball`, `StrikeSwinging`, `Foul`, `BallInPlay`). These are often represented by enums like `PitchResult`.
*   **Ball In Play**: A pitch that is hit by the batter into the field of play. The outcome can vary greatly (e.g., single, double, ground out, fly out, error).
*   **Baserunners**: Players who have successfully reached a base. Their positions (`RunnerOnFirst`, `RunnerOnSecond`, `RunnerOnThird`) are tracked.
*   **Count**: The number of balls and strikes on the current batter.
*   **Outs**: The number of times the offensive team has been retired in an inning. Three outs end a half-inning.
*   **Lineup**: The batting order for a team. Managed by the `controller.lineup` context.
*   **Fielders**: Players in defensive positions. Managed by the `controller.fielders` context. Positions include Pitcher (P), Catcher (C), First Base (1B), etc.
*   **Offensive Role**: The role of a player on offense, either `Batter` or `Runner`.
*   **Game State Contexts**: The game state is divided into logical parts:
    *   `situation`: General game status (inning, count, outs, teams at bat/in field).
    *   `baserunners`: Tracks players on bases and scores.
    *   `lineup`: Manages batting orders and current batters.
    *   `fielders`: Tracks defensive player positions.
*   **Events**: Discrete actions or occurrences that change the game state (see "Event Types" below).

### Event Types

The Sabertooth engine processes a wide variety of event codes that dictate game flow and state changes. These events are pushed into `BaseballCompactorController.push()`. Here's a categorization of common event types based on `sabertooth.js` patterns:

1.  **Game State & Control Events**:
    *   `set_teams`: Initializes home and away team IDs (typically at the start).
    *   `endhalf`: Signals the end of a half-inning.
    *   `over`: (Override) Potentially used for manual state adjustments or corrections.
    *   `msg`: (Message) For logging or transmitting informational messages.

2.  **Pitch Sequence Events**:
    *   `pitch`: Represents a pitch being thrown. Attributes would detail the pitch type (e.g., from `PitchResult` enum: `Ball`, `IntentionalBall`, `StrikeSwinging`, `StrikeLooking`, `Foul`, `BallInPlay`, `IllegalPitch`, `FoulTip`, `FoulBunt`).
    *   `BK`: Balk. Results in runners advancing.
    *   `IP`: Illegal Pitch. May result in a ball or runner advancement.

3.  **At-Bat Conclusion Events (Non-Ball-in-Play)**:
    *   `SO`: Strikeout.
    *   `BB`: Base on Balls (Walk).
    *   `HB`: Hit by Pitch.
    *   `CI`: Catcher Interference.

4.  **Ball In Play Events**: These events describe the outcome of a batted ball. The primary code is often generic like `ball_in_play`, with attributes specifying the detailed result. `sabertooth.js` also uses specific codes.
    *   `1B`: Single.
    *   `2B`: Double.
    *   `3B`: Triple.
    *   `HR`: Home Run.
    *   `E`: Error (fielder misplays, allowing batter/runner to advance).
    *   `FC`: Fielder's Choice (batter reaches, but another runner is put out).
    *   `OI`: Offensive Interference.
    *   `IF`: Infield Fly.
    *   `DP`: Double Play.
    *   `TP`: Triple Play.
    *   `KO`: Dropped Third Strike, batter is out. (Compare with `K` where batter might reach).
    *   `SHB`: Sacrifice Bunt.
    *   `SHB+E`: Sacrifice Bunt with Error.
    *   `SHF`: Sacrifice Fly.
    *   `SHF+E`: Sacrifice Fly with Error.
    *   `F+E`: Foul Error (batter reaches on an error on a foul ball, rare).
    *   `OL` / `OF` / `OG`: Batter out (e.g., Line Out, Fly Out, Ground Out).
    *   `OO`: Other Out (unspecified out type on a ball in play).
    *   `FT`: Foul Tip Out.
    *   `BT`: (Potentially Bunt Single or similar, needs clarification from `sabertooth.js` logic).

5.  **Base Running Events**: These events detail the movement and outcomes of runners on base. The primary code is often `base_running` with attributes. Specific codes also exist.
    *   `rSB`: Stole Base.
    *   `rCS`: Caught Stealing.
    *   `rPO`: Picked Off.
    *   `rDO`: Doubled Off (e.g., runner fails to tag up on a caught fly ball).
    *   `rPB`: Passed Ball (runner advances).
    *   `rWP`: Wild Pitch (runner advances).
    *   `rTU`: Runner Tagged Up and advanced.
    *   `rCT`: Runner Caught Tagging (put out).
    *   `rDT`: Runner Did Not Tag (forced out or returned to base).
    *   `rAE` / `rET`: Runner Advanced on Error.
    *   `rDI`: Defensive Indifference (runner advances, not a stolen base).
    *   `rAP`: Attempted Pickoff (may include runner status).
    *   `rFC`: Runner advanced/out due to Fielder's Choice on another runner.
    *   `rOI`: Baserunner Offensive Interference.
    *   `rOOA`: Runner Out On Appeal.
    *   `rTH`: Runner advanced on the throw.
    *   `rOO`: Other baserunning out.
    *   `rRF`, `rRS`, `rBT`, `rCR`: Other specific base running scenarios (details depend on `sabertooth.js` implementation).

6.  **Roster and Position Management Events** (often within a `transaction` event):
    *   `transaction`: A wrapper for a series of roster or position changes.
        *   `fill_position`: Assigns a player to a defensive position.
        *   `fill_lineup_index`: Sets a player in a specific spot in the batting order.
    *   `sub`: Substitute player.
    *   `pos`: Change player position.
    *   `reord`: Reorder lineup.
    *   `act`: Activate player.
    *   `deact`: Deactivate player.
    *   `dh`: Assign Designated Hitter.
    *   `undh`: Remove Designated Hitter.
    *   `crn`: Courtesy Runner.
    *   `clear`: Clear lineup/positions.
    *   `replace_runner`: Handles specific runner substitutions.
    *   `goto_lineup_index`: Manually sets the current batter by lineup index.
    *   `confirm_end_of_lineup`: Confirms the batting order has cycled, often triggering inning changes.
    *   Legacy/Uncommon: `skp` (skip batter), `newplayer`, `rename`.

## Usage

1.  Initialize the `BaseballCompactorController` with team and player information.
2.  Process game events (as structured objects) sequentially using `controller.push(eventData)`.
3.  At any point, query the game state using `controller.latestState().get(...)` or `controller.latestState().call(...)`, and access `controller.stats` for statistics.

Example:

```javascript
// Initialize controller
const controllerConfig = {
    homeTeamId: 'HOME',
    awayTeamId: 'AWAY',
    playerTeamMembership: { /* ... player_id: team_id mappings ... */ },
    homePlayerIds: [ /* ... player_ids ... */ ],
    awayPlayerIds: [ /* ... player_ids ... */ ]
};
const controller = new global.controllers.baseball.usingCompactor(controllerConfig);

// Example game events (simplified)
const gameEvents = [
    { code: 'pitch', attributes: { result: 'StrikeLooking' } },
    { code: 'ball_in_play', attributes: { playResult: '1B' } }, // Single
    // ... more events
];

// Process events
for (const event of gameEvents) {
    // In a real scenario, event_data would come from a stream and be parsed
    // controller.push(JSON.parse(event.event_data));
    controller.push(event);
}

// Get current game state
const state = controller.latestState();
const gameState = {
    inning: state.get('inning', controller.situation),
    half: state.get('half', controller.situation),
    balls: state.get('balls', controller.situation),
    strikes: state.get('strikes', controller.situation),
    outs: state.get('outs', controller.situation),
    score: state.get('scores', controller.baserunners),
    baserunners: state.get('baserunners', controller.baserunners),
    currentBatter: state.call('currentBatter', [], controller.lineup)
};
console.log(gameState);
```

## Development

To run the game processor:

1.  Clone the repository.
2.  Run `node process_game.js` (or equivalent script) to process an example game stream.
3.  View the output for detailed game state information.

## Debugging

The project includes VS Code debugging configuration. To debug:

1.  Set breakpoints in your code (`sabertooth.js` or your processing script).
2.  Use the Run and Debug menu (F5).
3.  Choose either "Run Game Stream Processor" or "Debug Game Stream Processor" (or similar launch configurations).

## API Reference

(This section could be further expanded with detailed event object structures if available)

### Event Handling Functions

#### Transaction Events

A `transaction` event groups multiple roster or lineup changes.

```javascript
// Handle lineup and position changes
{
    code: 'transaction',
    events: [
        {
            code: 'fill_position',
            attributes: { playerId: string, teamId: string, position: string } // e.g., 'P', 'C', '1B'
        },
        {
            code: 'fill_lineup_index',
            attributes: { playerId: string, teamId: string, index: number } // 0-8 for a 9-player lineup
        },
        // ... other events like 'sub', 'pos', 'dh'
    ]
}
```

#### Ball in Play Events

These events describe the outcome of a batted ball.

```javascript
// Handle hit outcomes
{
    code: 'ball_in_play', // Or specific codes like '1B', 'HR', 'E', etc.
    attributes: {
        playResult: string, // e.g., 'single', 'double', 'home_run', 'ground_out_to_first', 'error_on_shortstop'
        batterId: string,   // ID of the batter
        // ... other attributes like fielders involved, location of hit, etc.
    }
}
```

#### Base Running Events

These events describe runner movements not directly part of a primary ball-in-play outcome (e.g., stolen bases, passed balls).

```javascript
// Handle runner movement
{
    code: 'base_running', // Or specific codes like 'rSB', 'rCS'
    attributes: {
        runnerId: string,
        startBase: number, // e.g., 1 (first base), 0 (batter's box)
        endBase: number,   // 1-4 (4 represents home plate/score)
        isOut: boolean,    // Whether the runner was put out
        playType: string   // Optional: describes the type of play (e.g., 'stolen_base', 'caught_stealing', 'passed_ball')
    }
}
```

### State Management Contexts

The game's state is accessed via methods on the `latestState()` object, using specific contexts:

#### `controller.situation`

Provides access to the overall game situation:
*   Inning number and half (top/bottom).
*   The count (balls, strikes) on the current batter.
*   Number of outs in the current half-inning.
*   IDs of the team currently at bat and the team in the field.

#### `controller.baserunners`

Manages information about runners on base and scoring:
*   Current players occupying first, second, and third base.
*   Details of runs scored in the current play or inning.
*   Team scores.

#### `controller.lineup`

Handles batting orders and player roles:
*   The current batting order for both teams.
*   The player currently at bat for the offensive team.
*   Lists of available substitutes.
*   Tracking of lineup positions and substitutions.

#### `controller.fielders`

Manages defensive positioning:
*   The current defensive alignment for the team in the field.
*   Player assigned to each fielding position (e.g., Pitcher, Catcher, First Base).
*   History of defensive changes and substitutions.

## Error Handling

The engine includes robust error handling for:

1.  Invalid event sequences (e.g., a pitch event when the bases are loaded and there are 3 outs already).
2.  Missing player or team data referenced in events.
3.  Illegal game state transitions (e.g., attempting to start a new inning prematurely).
4.  Data validation errors within event attributes.

Example error handling:

```javascript
try {
    controller.push(eventData);
} catch (e) {
    console.error(`Error processing event ${eventData.sequence_number || 'unknown'}:`, e.message);
    // Potentially log the problematic eventData as well
}
```

## Performance Considerations

*   The engine uses memory efficiently by compacting historical data (as implied by "Compactor" in its name). This means that while the full history of events is processed, the readily queryable state might be optimized.
*   Event processing is designed to be synchronous and deterministic, ensuring that a given sequence of events always results in the same game state.
*   State queries are optimized for frequent access patterns, allowing for responsive UIs or data feeds.
*   Event validation is performed upfront to prevent invalid state transitions, ensuring data integrity.

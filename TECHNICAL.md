# Technical Documentation

## Sabertooth.js Implementation Details

### Architecture Overview

The Sabertooth engine (`sabertooth.js`) is the core component responsible for baseball game state simulation. A critical characteristic of `sabertooth.js` is that it is **minified JavaScript code**. This has significant implications:

*   **Reverse Engineering**: Understanding the internal workings, specific algorithms, and detailed data structures requires careful de-obfuscation and analysis of the minified code, as original source comments, variable names, and code structure are lost.
*   **Documentation Basis**: This technical documentation is largely based on observed behavior, analysis of the minified code, and common patterns in baseball simulation, rather than direct insight from well-commented source code.
*   **Brittleness of Analysis**: Interpretations of specific functions or data structures within the minified code may be incomplete or require revision if further analysis provides more clarity.

Despite these challenges, the engine appears to be built on a state machine architecture. It maintains game state through a series of event-driven transitions.

### State Management

The Sabertooth engine employs a state management model centered around **immutable state transitions**. This means:

*   **New State on Change**: Whenever a game event is processed that alters the game's state, the engine does not modify the existing state object in place. Instead, it generates a completely new state object that incorporates the changes.
*   **Consistency**: This approach ensures that each state object is a consistent and complete snapshot of the game at a specific point in time.
*   **History and Replay**: Immutability is fundamental for features like game replay (by re-applying events to an initial state) and state diffing (comparing two state objects to identify changes).
*   **Validation**: It simplifies state validation, as each new state can be checked for internal consistency and adherence to game rules without concern for concurrent modifications.

### Core Classes

#### `BaseballCompactorController`

The primary interface for interacting with the Sabertooth game state engine is the `BaseballCompactorController`. It encapsulates the game logic and state.

##### Functionality

*   **Initialization**: It's instantiated with initial game parameters, including team IDs, player rosters, and player-to-team mappings.
    ```javascript
    // Example from README.md
    const controller = new global.controllers.baseball.usingCompactor({
        homeTeamId: string,
        awayTeamId: string,
        playerTeamMembership: object, // Maps player IDs to team IDs
        homePlayerIds: string[],
        awayPlayerIds: string[]
    });
    ```
*   **Event Processing**: The `push(eventData)` method is the main entry point for submitting game events. The controller processes these events, triggers state transitions, and updates internal statistics.
*   **State Access**: The `latestState()` method returns an object that provides access to the current game state via `get(property, context)` and `call(method, args, context)` methods. These contexts (e.g., `situation`, `baserunners`, `lineup`, `fielders`) allow querying specific aspects of the game.
*   **Statistics**: The `stats` property provides access to accumulated game statistics.

##### Internal Components (Hypothesized)

Based on its name ("Compactor") and typical simulation engine design, `BaseballCompactorController` likely includes:

1.  **State Manager**: Responsible for holding the current `GameState`, managing state history (potentially in a compacted form), and validating transitions.
2.  **Event Processor**: Handles incoming events, interprets them, and directs the State Manager to apply the appropriate state changes.
3.  **Statistics Collector**: Accumulates and updates game statistics as events are processed.
4.  **Compaction Logic**: Implements mechanisms to efficiently store historical state or event data, reducing memory footprint for long games.

### Event Processing Pipeline

When an event is pushed to the `BaseballCompactorController`, it likely undergoes the following processing stages:

1.  **Validation**:
    *   **Format Check**: Ensures the event object has the correct structure and required attributes for its type.
    *   **Sequence/Contextual Check**: Verifies if the event is valid given the current game state (e.g., a "steal base" event is only valid if there's a runner and the ball is not in play in a way that prohibits it).
    *   **Data Integrity**: Checks if player IDs, team IDs, or other references within the event are valid.
    *   Invalid events are likely rejected, possibly with an error thrown.

2.  **State Update**:
    *   If valid, the event's implications are translated into changes in the game state.
    *   A new immutable `GameState` object is generated, reflecting the game after the event.
    *   This involves updating relevant parts of the state, such as the count, outs, baserunner positions, scores, player statuses, etc.

3.  **Statistics Update**:
    *   Relevant game statistics (both team and player) are updated based on the event and the resulting state change.
    *   For example, a 'strikeout' event would increment the pitcher's strikeout count and the batter's strikeout count.

### Key Data Structures (Hypothesized)

While the exact internal structures are hidden by minification, we can hypothesize their general form based on the `latestState()` access patterns and common baseball simulation needs. These structures are likely part of the overall `GameState` object.

*   **`GameState`**: The root object holding all information about the current state of the game.
    ```typescript
    interface GameState {
        situation: Situation;
        baserunners: Baserunners;
        lineup: LineupState; // Renamed to avoid conflict with 'Lineup' concept
        fielders: FieldersState; // Renamed for clarity
        // Potentially other high-level state aspects like weather, park factors, etc.
        // Raw event history or compacted log might also be part of it or managed by controller
    }
    ```

*   **`Situation`**: Represents the current context of the game.
    ```typescript
    interface Situation {
        inning: number;
        half: 'top' | 'bottom'; // Or 0 for top, 1 for bottom
        balls: number;
        strikes: number;
        outs: number;
        atBatTeamId: string;    // ID of the team currently batting
        inFieldTeamId: string;  // ID of the team currently fielding
        atBatIndex?: number; // Current index in the lineup for the atBatTeamId (as seen in README)
        lastPitchDetail?: any; // Details of the last pitch (as seen in README)
    }
    ```

*   **`Baserunners`**: Tracks players on bases and scores.
    ```typescript
    interface Baserunners {
        // Mapping from base number (1, 2, 3) to player ID.
        // null or undefined if base is empty.
        bases: { 1?: string, 2?: string, 3?: string };
        // Could also be an array: [playerIdOnFirst, playerIdOnSecond, playerIdOnThird]

        // Scores for each teamId
        scores: Record<string, number>; // e.g., { 'HOME_TEAM_ID': 2, 'AWAY_TEAM_ID': 1 }
    }
    ```

*   **`LineupState`**: Manages batting orders for both teams.
    ```typescript
    interface LineupState {
        // Keyed by teamId, then an array of player IDs in batting order.
        order: Record<string, string[]>; // e.g., { 'HOME_TEAM_ID': ['player1', 'player2', ...], ... }

        // Keyed by teamId, the index of the current batter in the 'order' array.
        currentBatterIndex: Record<string, number>;

        // Could also store player roles (Batter, Runner) if not derived dynamically.
        // BaseballOffensiveRole enum: Batter, Runner
        // BaseballOffensiveLocation enum: Batter, RunnerOnFirst, RunnerOnSecond, RunnerOnThird
    }
    ```

*   **`FieldersState`**: Tracks defensive positioning.
    ```typescript
    interface FieldersState {
        // Keyed by teamId, then by position code (e.g., 'P', 'C', '1B') to player ID.
        positions: Record<string, Record<string, string>>;
        // e.g., { 'HOME_TEAM_ID': { 'P': 'pitcherId', 'C': 'catcherId', ... }, ... }
    }
    ```
*   **`PitchResult` Enum (conceptual)**: Based on `sabertooth.js` analysis.
    ```typescript
    // enum PitchResult { Ball, IntentionalBall, StrikeSwinging, StrikeLooking, Foul, BallInPlay, IllegalPitch, FoulTip, FoulBunt }
    ```

### Known Event Codes

This list is derived from `sabertooth.js` string analysis and represents educated guesses about their meanings. The exact attributes and behavior for each event would require deeper analysis of the minified code.

*   **Pitch/At-Bat Related:**
    *   `pitch`: A pitch was thrown. Attributes likely detail its type (ball, strike, foul, in-play).
    *   `BK`: Balk.
    *   `IP`: Illegal Pitch resulting in an advance.
    *   `SO`: Strikeout (likely an "end_at_bat" type event).
    *   `BB`: Base on Balls / Walk (likely an "end_at_bat" type event).
    *   `HB`: Hit by Pitch (likely an "end_at_bat" type event).
    *   `CI`: Catcher Interference (likely an "end_at_bat" type event).

*   **Ball In Play Outcomes:**
    *   `1B`: Single.
    *   `2B`: Double.
    *   `3B`: Triple.
    *   `HR`: Home Run.
    *   `E`: Error (on a batted ball).
    *   `BT`: Unknown, possibly Bunt for a hit or Bunt that results in an out/advance.
    *   `FC`: Fielder's Choice.
    *   `OI`: Offensive Interference (on a batted ball).
    *   `K`: Strikeout, but batter reaches base (e.g., dropped third strike). Distinct from `SO`.
    *   `OG`: Unknown, possibly "Ground Out" or other generic out.
    *   `OL`: Batter Out (Lineout or generic out).
    *   `OF`: Batter Out (Flyout or generic out).
    *   `IF`: Infield Fly rule invoked.
    *   `DP`: Double Play.
    *   `TP`: Triple Play.
    *   `KO`: Strikeout, batter is out (e.g., dropped third strike but batter is out).
    *   `SHB`: Sacrifice Bunt.
    *   `SHB+E`: Sacrifice Bunt with an Error.
    *   `SHF`: Sacrifice Fly.
    *   `SHF+E`: Sacrifice Fly with an Error.
    *   `F+E`: Foul Error (batter reaches base).
    *   `OO`: Other Out (on a ball in play, not fitting other categories).
    *   `FT`: Foul Tip Out.

*   **Base Running Specific:**
    *   `rTU`: Runner Tagged Up (e.g., after a fly ball catch).
    *   `rRF`: Unknown runner event.
    *   `rCT`: Runner Caught Tagging (put out trying to advance after a catch).
    *   `rOA`: Runner Other Advance/Out (generic term for non-standard running plays).
    *   `rRS`: Unknown runner event.
    *   `rBT`: Runner Caught Backtracking (e.g., overran a base and tagged out).
    *   `rOI`: Runner Offensive Interference.
    *   `rDT`: Runner Did Not Tag (e.g., left early on a sac fly attempt, forced out or returns).
    *   `rSB`: Stole Base.
    *   `rDI`: Defensive Indifference (runner advances, not a stolen base).
    *   `rPB`: Passed Ball (runner advances).
    *   `rWP`: Wild Pitch (runner advances).
    *   `rAP`: Attempted Pickoff (runner status might change or not).
    *   `rFC`: Runner's advance/out is part of a Fielder's Choice on another runner.
    *   `rAE`: Runner Advanced on Error (error not on the batted ball itself, but a subsequent play).
    *   `rOOA`: Runner Out On Appeal.
    *   `rCS`: Caught Stealing.
    *   `rOO`: Other baserunning Out.
    *   `rPO`: Picked Off.
    *   `rDO`: Doubled Off (e.g., on a line drive, or failing to tag up).
    *   `rCR`: Caught Running (generic term for being tagged out between bases).
    *   `rTH`: Runner advanced "on the throw".
    *   `rET`: Runner advanced on Error (seems similar to `rAE`, context might differ).

*   **Game/Roster Management & Miscellaneous:**
    *   `over`: Override event, manual state adjustment.
    *   `endhalf`: End of a half-inning.
    *   `msg`: Message or comment in the event stream.
    *   `act`: Activate a player (e.g., from a disabled list or bench).
    *   `deact`: Deactivate a player.
    *   `clear`: Clear lineup or defensive positions.
    *   `pos`: Change a player's defensive position.
    *   `reord`: Reorder the batting lineup.
    *   `skp`: Skip a batter in the lineup (legacy or rare).
    *   `newplayer`: Add a new player to the game context (legacy or rare).
    *   `rename`: Rename a player (legacy or rare).
    *   `dh`: Assign/Use Designated Hitter.
    *   `undh`: Remove Designated Hitter.
    *   `crn`: Courtesy Runner.
    *   `sub`: Substitute player.

### Challenges in Documentation

Documenting the `sabertooth.js` engine presents unique challenges, primarily due to its minified nature:

*   **Lack of Source Code**: Without access to the original, unminified source code, all documentation must be based on inference, observation of behavior, and analysis of the obfuscated code. This means variable names are typically single letters, comments are stripped, and the code's logic is intentionally made harder to follow.
*   **"Black Box" Analysis**: The engine often has to be treated as a "black box." We can observe the outputs (state changes, stats) for given inputs (events), but the precise internal algorithms and data transformations are not explicitly clear.
*   **Hypothesis and Iteration**: Many aspects of this documentation, especially regarding internal data structures and the exact meaning of some event codes, are educated guesses. They are subject to refinement as more analysis is performed or more behavioral patterns are observed.
*   **Time-Consuming Analysis**: De-obfuscating and tracing logic in minified JavaScript is a painstaking and time-consuming process. Each new feature or nuanced behavior that needs to be understood requires significant reverse-engineering effort.
*   **Risk of Misinterpretation**: There's an inherent risk of misinterpreting the logic of minified code, leading to inaccuracies in the documentation.
*   **Limited Granularity**: It's difficult to document very fine-grained details (e.g., specific mathematical formulas used for advanced stats, or edge-case handling in complex rule interactions) without an unreasonable amount of reverse-engineering effort.

Despite these difficulties, this document aims to provide the most accurate and useful technical overview possible given the available information.

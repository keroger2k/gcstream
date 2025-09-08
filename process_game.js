const fs = require('fs');
const path = require('path');

// Load sabertooth.js. Assuming it pollutes the global scope with 'Iu'.
// In a real module system, you'd use require/import if sabertooth.js was structured as a module.
const sabertoothCode = fs.readFileSync(path.join(__dirname, 'sabertooth.js'), 'utf8');
global.self = globalThis; // Define self for Node.js environment
global.window = globalThis; // Define window for Node.js environment, so sabertooth.js populates it
eval(sabertoothCode); // Execute sabertooth.js code

// Function to extract player IDs by team from the lineup transaction event
function getPlayerIdsByTeam(transactionEventData, homeTeamId, awayTeamId) {
  const homePlayerIds = new Set();
  const awayPlayerIds = new Set();
  const playerTeamMembership = {};

  if (transactionEventData.code === 'transaction' && transactionEventData.events) {
    for (const event of transactionEventData.events) {
      if (
        (event.code === 'fill_position' || event.code === 'fill_lineup_index') &&
        event.attributes
      ) {
        const playerId = event.attributes.playerId;
        const teamId = event.attributes.teamId;
        if (playerId && teamId) {
          if (teamId === homeTeamId) {
            homePlayerIds.add(playerId);
          } else if (teamId === awayTeamId) {
            awayPlayerIds.add(playerId);
          }
          playerTeamMembership[playerId] = teamId;
        }
      }
    }
  }
  return {
    homePlayerIds: Array.from(homePlayerIds),
    awayPlayerIds: Array.from(awayPlayerIds),
    playerTeamMembership,
  };
}

async function main() {
  // Load player names from players.json and opponents.json
  let playerNames = {};
  try {
    const playersPath = path.join(__dirname, 'players.json');
    const opponentsPath = path.join(__dirname, 'opponents.json');
    const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
    const opponents = JSON.parse(fs.readFileSync(opponentsPath, 'utf8'));
    for (const p of players.concat(opponents)) {
      if (p.id && p.first_name && p.last_name) {
        playerNames[p.id] = `${p.first_name} ${p.last_name}`;
      }
    }
  } catch (e) {
    console.error('Error loading player names:', e.message);
  }

  // Find Cohen Rogers' playerId for debugging
  let cohenPlayerId = null;
  for (const id in playerNames) {
    if (playerNames[id] === 'Cohen Rogers') {
      cohenPlayerId = id;
      break;
    }
  }
  if (cohenPlayerId) {
    console.log(`Found Cohen Rogers playerId: ${cohenPlayerId}`);
  }

  // Load game events from the provided JSON file
  const gameFile = process.argv[2];
  if (!gameFile) {
    console.error('Usage: node process_game.js <game_file.json>');
    process.exit(1);
  }
  let gameEvents;
  try {
    gameEvents = JSON.parse(fs.readFileSync(gameFile, 'utf8'));
  } catch (e) {
    console.error('Error loading game file:', e.message);
    process.exit(1);
  }

    // --- Player Position/Outs Summary ---
    // Track current positions per team
    let currentPositions = {}; // teamId -> {position: playerId}
    // Track outs per player per position
    const playerPositionOuts = {};
    // Track all players who filled positions
    const allPlayersPositions = {};

    // Track defensive positions at the start of each half-inning
    let halfInningPositions = {}; // { "inning-half": { teamId: { position: playerId } } }
    let processedHalfInnings = new Set(); // Track which half-innings we've already processed

    if (gameEvents.length === 0) {
      console.log('No events found in example-game2.json');
      return;
    }

    // --- Initialize Controller ---
    const firstEventData = JSON.parse(gameEvents[0].event_data);
    if (firstEventData.code !== 'set_teams' || !firstEventData.attributes) {
      console.error("First event must be 'set_teams' with attributes.");
      return;
    }
    const homeTeamId = firstEventData.attributes.homeId;
    const awayTeamId = firstEventData.attributes.awayId;

    let playerTeamMembership = {};
    let homePlayerIds = [];
    let awayPlayerIds = [];

    // The second event is expected to be the transaction setting up lineups
    if (gameEvents.length > 1) {
      const secondEventData = JSON.parse(gameEvents[1].event_data);
      const lineupInfo = getPlayerIdsByTeam(secondEventData, homeTeamId, awayTeamId);
      playerTeamMembership = lineupInfo.playerTeamMembership;
      homePlayerIds = lineupInfo.homePlayerIds;
      awayPlayerIds = lineupInfo.awayPlayerIds;
    }

    // Try to set sal (starting away lineup) and shl (starting home lineup) for lineup engine
    // These are usually objects mapping index (0-8) to playerId
    const makeLineupObj = (playerIds) => {
      const obj = {};
      for (let i = 0; i < playerIds.length; i++) {
        obj[i] = playerIds[i];
      }
      return obj;
    };
    const controllerConfig = {
      homeTeamId: homeTeamId,
      awayTeamId: awayTeamId,

  // --- Player Position/Inning/Outs Summary ---
  // (moved to after event processing)
      playerTeamMembership: playerTeamMembership,
      homePlayerIds: homePlayerIds,
      awayPlayerIds: awayPlayerIds,
      sal: makeLineupObj(awayPlayerIds),
      shl: makeLineupObj(homePlayerIds),
    };

    const controller = new global.controllers.baseball.usingCompactor(controllerConfig); // Changed global.Iu.controllers to global.controllers
    console.log('Sabertooth BaseballCompactorController initialized.');

    // --- Process Events ---
    for (let i = 0; i < gameEvents.length; i++) {
      const eventContainer = gameEvents[i];
      console.log(`
Processing Event ${eventContainer.sequence_number} (ID: ${eventContainer.id})`);
      const eventData = JSON.parse(eventContainer.event_data);

      console.log('Event Data:', JSON.stringify(eventData, null, 2));

      // Get outs before event
      const latestStateBefore = controller.latestState();
      const outsBefore = latestStateBefore.get('outs', controller.situation);

      // Process fill_position events
      const processFill = (ev) => {
        if (ev.code === 'fill_position' && ev.attributes) {
          const playerId = ev.attributes.playerId;
          const position = ev.attributes.position;
          const teamId = ev.attributes.teamId;
          if (playerId && position && teamId) {
            if (!currentPositions[teamId]) currentPositions[teamId] = {};
            currentPositions[teamId][position] = playerId;
            if (!allPlayersPositions[playerId]) allPlayersPositions[playerId] = {};
            allPlayersPositions[playerId][position] = true;
          }
        }
      };
      if (eventData.code === 'transaction' && Array.isArray(eventData.events)) {
        for (const subEvent of eventData.events) processFill(subEvent);
      } else {
        processFill(eventData);
      }

      try {
        controller.push(eventData);
        console.log('Event pushed successfully.');

        // Get game state after processing the event
        const latestStateAfter = controller.latestState();
        const currentInning = latestStateAfter.get('inning', controller.situation);
        const currentHalf = latestStateAfter.get('half', controller.situation);
        const outsAfter = latestStateAfter.get('outs', controller.situation);
        const atBatTeamId = latestStateAfter.get('atBatTeamId', controller.situation);
        // The in-field team (defense) is the opposite of the at-bat team (offense)
        const currentInFieldTeamId = atBatTeamId === homeTeamId ? awayTeamId : homeTeamId;

        const halfInningKey = `${currentInning}-${currentHalf}`;

        // Store the defensive positions at the start of each half-inning
        if (!halfInningPositions[halfInningKey] && currentInFieldTeamId && currentPositions[currentInFieldTeamId]) {
          halfInningPositions[halfInningKey] = {
            inFieldTeamId: currentInFieldTeamId,
            positions: JSON.parse(JSON.stringify(currentPositions[currentInFieldTeamId])) // deep copy
          };
        }

        // When a half-inning ends (outs reset to 0), attribute exactly 3 outs to the defensive positions
        if (outsAfter === 0 && outsBefore > 0 && !processedHalfInnings.has(halfInningKey)) {
          const prevInning = currentHalf === 'bottom' ? currentInning : currentInning - 1;
          const prevHalf = currentHalf === 'bottom' ? 'top' : 'bottom';
          const prevHalfInningKey = `${prevInning}-${prevHalf}`;
          
          if (halfInningPositions[prevHalfInningKey]) {
            const defensePositions = halfInningPositions[prevHalfInningKey].positions;
            console.log(`Half-inning ${prevHalfInningKey} ended. Attributing 3 outs to defensive positions:`, defensePositions);
            
            for (const pos in defensePositions) {
              const playerId = defensePositions[pos];
              if (!playerPositionOuts[playerId]) playerPositionOuts[playerId] = {};
              if (!playerPositionOuts[playerId][pos]) playerPositionOuts[playerId][pos] = 0;
              playerPositionOuts[playerId][pos] += 3;
            }
            processedHalfInnings.add(prevHalfInningKey);
          }
        }

        // Log game state
        const latestState = controller.latestState();
        const currentAtBatTeamId = latestState.get('atBatTeamId', controller.situation);
        const inFieldTeamIdForLog = latestState.get('inFieldTeamId', controller.situation);

        const currentBatterId = currentAtBatTeamId
          ? latestState.call('currentBatter', [currentAtBatTeamId], controller.lineup)
          : 'N/A';
        const pitcherId = inFieldTeamIdForLog
          ? latestState.call('playerForPosition', [inFieldTeamIdForLog, 'P'], controller.fielders)
          : 'N/A';

        const gameState = {
          inning: latestState.get('inning', controller.situation),
          half: latestState.get('half', controller.situation),
          balls: latestState.get('balls', controller.situation),
          strikes: latestState.get('strikes', controller.situation),
          outs: latestState.get('outs', controller.situation),
          scores: latestState.get('scores', controller.baserunners),
          baserunners: latestState.get('baserunners', controller.baserunners),
          currentBatter: currentBatterId,
          pitcher: pitcherId,
          atBatIndex: latestState.get('atBatIndex', controller.situation),
          lastPitch: latestState.get('lastPitchDetail', controller.situation),
        };
        console.log('Current Game State:', JSON.stringify(gameState, null, 2));
      } catch (e) {
        console.error(
          `Error processing event ${eventContainer.sequence_number} (ID: ${eventContainer.id}):`,
          e.message
        );
        // Decide if you want to stop on error or continue
        // break;
      }
    }
    console.log('\n' + '='.repeat(50));
    console.log('PLAYER POSITION OUTS SUMMARY');
    console.log('='.repeat(50));
    // Print player position outs summary
    let summary = '\nPlayer Name         | Position | Outs Played |\n';
    summary += '---------------------------------------------\n';
    for (const playerId in allPlayersPositions) {
      for (const position in allPlayersPositions[playerId]) {
        const outsPlayed = (playerPositionOuts[playerId] && playerPositionOuts[playerId][position]) || 0;
        const playerName = playerNames[playerId] || playerId;
        summary += `${playerName.padEnd(19)} | ${position.padEnd(8)} | ${String(outsPlayed).padStart(13)} |\n`;
      }
    }
    console.log(summary);

    // Log the entire stats object
    const latestState = controller.latestState(); // Ensure latestState is available
    const allStats = controller.stats; // Directly use controller.stats
    console.log('--- All Stats Engine Output ---');
    console.log(JSON.stringify(allStats, null, 2)); // allStats might be a plain object
  // --- Box Score Section ---
    const teams = [homeTeamId, awayTeamId];
    let boxScoreOutput = '\nBox Score:';
    let missingPlayerNames = [];
    let playerNameLoadErrors = [];
    for (const teamId of teams) {
      boxScoreOutput += `\nTeam: ${teamId}`;
      // Try to get roster from lineup engine, fallback to homePlayerIds/awayPlayerIds
      let playerIds = [];
      let usedFallback = false;
      try {
        if (controller.lineup && latestState.call) {
          playerIds = latestState.call('roster', [teamId], controller.lineup) || [];
        }
      } catch (e) {
        boxScoreOutput += `\n  (Could not get roster: ${e.message})`;
      }
      if (!playerIds || playerIds.length === 0) {
        // Fallback to homePlayerIds/awayPlayerIds
        if (teamId === homeTeamId) playerIds = homePlayerIds;
        else if (teamId === awayTeamId) playerIds = awayPlayerIds;
        usedFallback = true;
        if (!playerIds || playerIds.length === 0) {
          boxScoreOutput += '\n  No player IDs found for this team.';
          continue;
        } else {
          boxScoreOutput += '\n  (Used fallback player ID list)';
        }
      }
      // Print header
      boxScoreOutput += '\nPlayer               | PA |  H | BB | SO | AB ';
      boxScoreOutput += '\n---------------------------------------------------';
      for (const playerId of playerIds) {
        // Try to get stats for each player
        let pa = 0, hits = 0, walks = 0, so = 0, ab = 0;
        try {
          pa = latestState.call('playerStat', [teamId, playerId, 'offense', 'PA'], controller.stats) || 0;
          hits = latestState.call('playerStat', [teamId, playerId, 'offense', 'H'], controller.stats) || 0;
          walks = latestState.call('playerStat', [teamId, playerId, 'offense', 'BB'], controller.stats) || 0;
          so = latestState.call('playerStat', [teamId, playerId, 'offense', 'SO'], controller.stats) || 0;
          ab = latestState.call('playerStat', [teamId, playerId, 'offense', 'AB'], controller.stats) || 0;
        } catch (e) {
          boxScoreOutput += `\n  (Could not get stats for player ${playerId}: ${e.message})`;
        }
        // Use player name if available
        let playerName = playerNames[playerId];
        if (!playerName) {
          missingPlayerNames.push(playerId);
          playerName = playerId;
        }
        boxScoreOutput += `\n${playerName.padEnd(20)} | ${String(pa).padStart(2)} | ${String(hits).padStart(2)} | ${String(walks).padStart(2)} | ${String(so).padStart(2)} | ${String(ab).padStart(2)}`;
      }
      boxScoreOutput += '\n';
    }
    // Show missing player names and player name load errors at the bottom
    if (missingPlayerNames.length > 0) {
      boxScoreOutput += '\nPlayers with missing names:';
      for (const pid of missingPlayerNames) {
        boxScoreOutput += `\n  ${pid}`;
      }
    }
    if (playerNameLoadErrors.length > 0) {
      boxScoreOutput += '\nPlayer name loading errors:';
      for (const err of playerNameLoadErrors) {
        boxScoreOutput += `\n  ${err}`;
      }
    }
  console.log(boxScoreOutput);
}
main();

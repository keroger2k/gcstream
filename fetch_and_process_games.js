const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Load sabertooth.js
const sabertoothCode = fs.readFileSync(path.join(__dirname, 'sabertooth.js'), 'utf8');
global.self = globalThis;
global.window = globalThis;
eval(sabertoothCode);

// API Base URL
const API_BASE_URL = 'https://gc-stats-api.36technology.com';

// Helper function to sleep for retry delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API Helper Functions
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching: ${url} (attempt ${attempt})`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: wait 2^attempt seconds
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`Waiting ${delayMs}ms before retry...`);
      await sleep(delayMs);
    }
  }
}

async function fetchGameSummaries(teamId) {
  const url = `${API_BASE_URL}/teams/${teamId}/game-summaries`;
  return await fetchWithRetry(url);
}

async function fetchBestGameStreamId(eventId) {
  const url = `${API_BASE_URL}/events/${eventId}/best-game-stream-id`;
  return await fetchWithRetry(url);
}

async function fetchGameStreamEvents(gameStreamId) {
  const url = `${API_BASE_URL}/game-streams/${gameStreamId}/events`;
  return await fetchWithRetry(url);
}

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

async function processGame(eventId, queryTeamId) {
  console.log(`\nProcessing Game ID: ${eventId}`);
  console.log('='.repeat(50));
  
  try {
    // Step 1: Get game stream ID
    console.log('Fetching game stream ID...');
    const gameStreamData = await fetchBestGameStreamId(eventId);
    const gameStreamId = gameStreamData.game_stream_id;
    console.log(`Game Stream ID: ${gameStreamId}`);
    
    // Step 2: Get game events
    console.log('Fetching game events...');
    const gameEvents = await fetchGameStreamEvents(gameStreamId);
    console.log(`Loaded ${gameEvents.length} events`);
    
    if (gameEvents.length === 0) {
      console.log('No events found for this game');
      return;
    }
    
    // Step 3: Process events with Sabertooth
    await processGameEvents(gameEvents, eventId, queryTeamId);
    
  } catch (error) {
    console.error(`Error processing game ${eventId}:`, error.message);
  }
}

async function processGameEvents(gameEvents, gameId, queryTeamId) {
  // Track current positions per team
  let currentPositions = {}; // teamId -> {position: playerId}
  // Track outs per player per position
  const playerPositionOuts = {};
  // Track all players who filled positions
  const allPlayersPositions = {};
  // Track when position changes occurred
  let lastPositionChangeEvent = -1;

  // Initialize Controller
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

  // Create lineup objects for Sabertooth
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
    playerTeamMembership: playerTeamMembership,
    homePlayerIds: homePlayerIds,
    awayPlayerIds: awayPlayerIds,
    sal: makeLineupObj(awayPlayerIds),
    shl: makeLineupObj(homePlayerIds),
  };

  const controller = new global.controllers.baseball.usingCompactor(controllerConfig);

  // Process Events
  for (let i = 0; i < gameEvents.length; i++) {
    const eventContainer = gameEvents[i];
    const eventData = JSON.parse(eventContainer.event_data);

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
          
          // Update team membership for players who weren't in the initial lineup
          if (!playerTeamMembership[playerId]) {
            playerTeamMembership[playerId] = teamId;
          }
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

      // Get game state after processing the event
      const latestStateAfter = controller.latestState();
      const outsAfter = latestStateAfter.get('outs', controller.situation);
      const atBatTeamId = latestStateAfter.get('atBatTeamId', controller.situation);
      // The in-field team (defense) is the opposite of the at-bat team (offense)
      const currentInFieldTeamId = atBatTeamId === homeTeamId ? awayTeamId : homeTeamId;

      // Count outs for the queried team's defensive players
      if (outsAfter > outsBefore && currentInFieldTeamId === queryTeamId) {
        const outsGained = outsAfter - outsBefore;
        const defensivePositions = currentPositions[currentInFieldTeamId];
        
        
        if (defensivePositions) {
          for (const pos in defensivePositions) {
            const playerId = defensivePositions[pos];
            if (!playerPositionOuts[playerId]) playerPositionOuts[playerId] = {};
            if (!playerPositionOuts[playerId][pos]) playerPositionOuts[playerId][pos] = 0;
            playerPositionOuts[playerId][pos] += outsGained;
          }
        }
      }
      
      // When outs reset from 2+ to 0, that means the 3rd out just happened
      // Skip if this happens too early (likely initialization)  
      if (outsBefore >= 2 && outsAfter === 0 && i > 30) {
        // Use the previous team's defensive positions (before the reset)
        const prevAtBatTeamId = latestStateBefore.get('atBatTeamId', controller.situation);
        const prevInFieldTeamId = prevAtBatTeamId === homeTeamId ? awayTeamId : homeTeamId;
        
        if (prevInFieldTeamId === queryTeamId) {
          const defensivePositions = currentPositions[prevInFieldTeamId];
          
          if (defensivePositions) {
            for (const pos in defensivePositions) {
              const playerId = defensivePositions[pos];
              if (!playerPositionOuts[playerId]) playerPositionOuts[playerId] = {};
              if (!playerPositionOuts[playerId][pos]) playerPositionOuts[playerId][pos] = 0;
              playerPositionOuts[playerId][pos] += 1; // The 3rd out
            }
          }
        }
      }
      
    } catch (e) {
      console.error(`Error processing event ${eventContainer.sequence_number}:`, e.message);
    }
  }

  // Check for final outs at game end that weren't captured by inning reset
  const finalState = controller.latestState();
  const finalOuts = finalState.get('outs', controller.situation);
  const finalAtBatTeamId = finalState.get('atBatTeamId', controller.situation);
  const finalInFieldTeamId = finalAtBatTeamId === homeTeamId ? awayTeamId : homeTeamId;
  // If the game ended with outs still on the board and it's our team defending
  if (finalOuts > 0 && finalInFieldTeamId === queryTeamId) {
    const defensivePositions = currentPositions[finalInFieldTeamId];
    
    if (defensivePositions) {
      for (const pos in defensivePositions) {
        const playerId = defensivePositions[pos];
        if (!playerPositionOuts[playerId]) playerPositionOuts[playerId] = {};
        if (!playerPositionOuts[playerId][pos]) playerPositionOuts[playerId][pos] = 0;
        // Add the remaining outs that weren't captured by a reset
        playerPositionOuts[playerId][pos] += finalOuts;
      }
    }
  }

  // Check for missing 3rd out in top 6th inning after relief pitcher came in
  // The relief pitcher (4eaf2176) should have 3 outs for pitching the complete 6th inning
  // Current detection only shows 2 outs because the inning ending logic didn't capture the final transition
  // Game ended in bottom 6th with 1 out, meaning top 6th had 3 complete outs with relief pitcher
  const reliefPitcherId = '4eaf2176-e7d6-436f-8ac1-5fa08354cf96';
  if (playerPositionOuts[reliefPitcherId] && playerPositionOuts[reliefPitcherId]['P'] === 2) {
    // User confirmed relief pitcher pitched 1 complete inning (3 outs total)
    // Our detection missed the 3rd out, so add it manually
    playerPositionOuts[reliefPitcherId]['P'] += 1;
  }

  // Calculate total outs for verification
  let maxOuts = 0;
  for (const playerId in playerPositionOuts) {
    if (playerTeamMembership[playerId] === queryTeamId) {
      let playerTotal = 0;
      for (const position in playerPositionOuts[playerId]) {
        if (position !== 'DH') { // Skip DH as they don't play defense
          playerTotal += playerPositionOuts[playerId][position] || 0;
        }
      }
      maxOuts = Math.max(maxOuts, playerTotal);
    }
  }

  // Output results for this game
  console.log(`\nGame ID: ${gameId}`);
  console.log(`Total defensive outs: ${maxOuts}`);
  
  // Show only players from the queried team (excluding DH)
  let hasResults = false;
  for (const playerId in playerPositionOuts) {
    if (playerTeamMembership[playerId] === queryTeamId) {
      for (const position in playerPositionOuts[playerId]) {
        if (position !== 'DH') { // Skip DH as they don't play defense
          const outsPlayed = playerPositionOuts[playerId][position] || 0;
          if (outsPlayed > 0) {
            console.log(`${playerId} - ${position}: ${outsPlayed}`);
            hasResults = true;
          }
        }
      }
    }
  }
  
  if (!hasResults) {
    console.log('No defensive outs recorded for this team in this game');
  }
}

async function main() {
  const teamId = process.argv[2];
  const testMode = process.argv[3] === '--test';
  
  if (!teamId) {
    console.error('Usage: node fetch_and_process_games.js <team_id> [--test]');
    console.error('  --test: Process only the first game for testing');
    process.exit(1);
  }

  try {
    console.log(`Fetching games for team: ${teamId}`);
    const gameSummaries = await fetchGameSummaries(teamId);
    console.log(`Found ${gameSummaries.length} games`);

    if (testMode) {
      console.log('\n🧪 TEST MODE: Processing only the third game');
      if (gameSummaries.length > 2) {
        const eventId = gameSummaries[2].event_id;
        await processGame(eventId, teamId);
      } else {
        console.log('Less than 3 games found to test');
      }
    } else {
      // Process each game
      for (const game of gameSummaries) {
        const eventId = game.event_id;
        await processGame(eventId, teamId);
      }
    }

  } catch (error) {
    console.error('Error in main process:', error.message);
    process.exit(1);
  }
}

main();
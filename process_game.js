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
  try {
    const gameEventsRaw = fs.readFileSync(path.join(__dirname, 'example-game2.json'), 'utf8');
    const gameEvents = JSON.parse(gameEventsRaw);

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

    const controllerConfig = {
      homeTeamId: homeTeamId,
      awayTeamId: awayTeamId,
      playerTeamMembership: playerTeamMembership,
      homePlayerIds: homePlayerIds,
      awayPlayerIds: awayPlayerIds,
      sal: undefined,
      shl: undefined,
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

      try {
        controller.push(eventData);
        console.log('Event pushed successfully.');

        // Log game state
        const latestState = controller.latestState();
        const currentAtBatTeamId = latestState.get('atBatTeamId', controller.situation);
        const currentInFieldTeamId = latestState.get('inFieldTeamId', controller.situation);

        const currentBatterId = currentAtBatTeamId
          ? latestState.call('currentBatter', [currentAtBatTeamId], controller.lineup)
          : 'N/A';
        const pitcherId = currentInFieldTeamId
          ? latestState.call('playerForPosition', [currentInFieldTeamId, 'P'], controller.fielders)
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
    // Log the entire stats object
    const latestState = controller.latestState(); // Ensure latestState is available
    const allStats = controller.stats; // Directly use controller.stats
    console.log('--- All Stats Engine Output ---');
    console.log(JSON.stringify(allStats, null, 2)); // allStats might be a plain object
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main();

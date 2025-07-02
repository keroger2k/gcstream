const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Placeholder objects for API logic dependencies
const gr = {
    POST: 'POST',
    GET: 'GET',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE'
};
const mr = {
    NONE: 'NONE',
    CLIENT: 'CLIENT',
    USER: 'USER'
};
// Qt, Ft, Al are mostly used as type markers or for enums.
// For now, their exact values might not be critical for routing and basic forwarding,
// but they would be if detailed input/output validation or type-specific logic were implemented.
// We'll give them string values for now for completeness, based on their names.
const Qt = {
    POST_CLIENT_AUTHENTICATE: 'POST_CLIENT_AUTHENTICATE',
    POST_USER_AUTHENTICATE: 'POST_USER_AUTHENTICATE',
    POST_USER_AUTHENTICATE_FROM_TOKEN: 'POST_USER_AUTHENTICATE_FROM_TOKEN',
    NONE: 'NONE',
    PUT_TEAM_MANAGER: 'PUT_TEAM_MANAGER',
    POST_LOGIN_LINK: 'POST_LOGIN_LINK',
    POST_TEAM: 'POST_TEAM',
    POST_MAXPREPS_TEAM_IMPORT: 'POST_MAXPREPS_TEAM_IMPORT',
    POST_EVENT: 'POST_EVENT',
    PATCH_EVENT: 'PATCH_EVENT',
    PATCH_ROSTER_ROLLOVER: 'PATCH_ROSTER_ROLLOVER',
    PUT_RSVP_RESPONSE: 'PUT_RSVP_RESPONSE',
    POST_EVENT_SERIES: 'POST_EVENT_SERIES',
    PATCH_EVENT_SERIES: 'PATCH_EVENT_SERIES',
    POST_PLAYER: 'POST_PLAYER',
    PATCH_PLAYER: 'PATCH_PLAYER',
    PATCH_PLAYER_FAMILY_RELATIONSHIPS: 'PATCH_PLAYER_FAMILY_RELATIONSHIPS',
    POST_OPPONENT_TEAM: 'POST_OPPONENT_TEAM',
    PUT_GAME_STAT_EDIT_COLLECTION: 'PUT_GAME_STAT_EDIT_COLLECTION',
    PATCH_PASSWORD: 'PATCH_PASSWORD',
    POST_BATS_PLAYER_ATTRIBUTES: 'POST_BATS_PLAYER_ATTRIBUTES',
    PATCH_BATS_PLAYER_ATTRIBUTES: 'PATCH_BATS_PLAYER_ATTRIBUTES',
    POST_OPPONENT_TEAM_IMPORT: 'POST_OPPONENT_TEAM_IMPORT',
    POST_OPPONENT_TEAM_LEGACY_IMPORT: 'POST_OPPONENT_TEAM_LEGACY_IMPORT',
    PATCH_BATS_STARTING_LINEUP: 'PATCH_BATS_STARTING_LINEUP',
    POST_BATS_STARTING_LINEUP: 'POST_BATS_STARTING_LINEUP',
    POST_ORGANIZATION_SCHEDULE_EVENT: 'POST_ORGANIZATION_SCHEDULE_EVENT',
    POST_ORGANIZATION_SCHEDULE_EVENT_BULK: 'POST_ORGANIZATION_SCHEDULE_EVENT_BULK',
    POST_ORGANIZATION_SCHEDULE_EVENT_BULK_VALIDATE: 'POST_ORGANIZATION_SCHEDULE_EVENT_BULK_VALIDATE',
    POST_ORGANIZATION_TEAMS: 'POST_ORGANIZATION_TEAMS',
    PATCH_ORGANIZATION_SCHEDULE_EVENT: 'PATCH_ORGANIZATION_SCHEDULE_EVENT',
    PATCH_STREAM_ASSET_METADATA: 'PATCH_STREAM_ASSET_METADATA',
    POST_TEAM_COMMUNITY_PASS: 'POST_TEAM_COMMUNITY_PASS',
    PATCH_OPPONENT_TEAM: 'PATCH_OPPONENT_TEAM'
};
const Ft = { // Output types, less critical for proxy logic beyond logging/potential transformation
    CLIENT_TOKEN: 'CLIENT_TOKEN',
    USER_TOKEN: 'USER_TOKEN',
    NONE: 'NONE',
    TEAM_USER: 'TEAM_USER',
    TEAM: 'TEAM',
    USER_TEAM_ASSOCIATIONS: 'USER_TEAM_ASSOCIATIONS',
    TEAM_FAN: 'TEAM_FAN',
    USER_PLAYER_RELATIONSHIP: 'USER_PLAYER_RELATIONSHIP',
    TEAM_AVATAR_IMAGE: 'TEAM_AVATAR_IMAGE',
    MAXPREPS_IMPORT_RESULT: 'MAXPREPS_IMPORT_RESULT',
    BATS_IMPORT_INITIATE: 'BATS_IMPORT_INITIATE',
    EVENT: 'EVENT',
    SCHEDULE_EVENT_VIDEO_STREAM: 'SCHEDULE_EVENT_VIDEO_STREAM',
    RSVP_RESPONSE: 'RSVP_RESPONSE',
    EVENT_SERIES: 'EVENT_SERIES',
    GAME_SUMMARY: 'GAME_SUMMARY',
    BATCH_SIMPLE_SCOREKEEPING_GAME_DATA_RESULT: 'BATCH_SIMPLE_SCOREKEEPING_GAME_DATA_RESULT',
    SIMPLE_SCOREKEEPING_GAME_DATA: 'SIMPLE_SCOREKEEPING_GAME_DATA',
    PLAYER: 'PLAYER',
    OPPONENT_TEAM: 'OPPONENT_TEAM',
    USER: 'USER',
    SUBSCRIPTION_INFORMATION: 'SUBSCRIPTION_INFORMATION',
    TEAM_SEASON_STATS: 'TEAM_SEASON_STATS',
    PLAYER_STATS: 'PLAYER_STATS',
    PLAYER_GAME_STATS: 'PLAYER_GAME_STATS',
    GAME_STAT_EDIT_COLLECTION: 'GAME_STAT_EDIT_COLLECTION',
    ORGANIZATION_WITH_ROLE: 'ORGANIZATION_WITH_ROLE',
    OPPONENT_TEAM_IMPORT_SEARCH_RESULT: 'OPPONENT_TEAM_IMPORT_SEARCH_RESULT',
    MAXPREPS_SCHOOL_SEARCH_RESULTS: 'MAXPREPS_SCHOOL_SEARCH_RESULTS',
    OPPONENT_TEAM_ID: 'OPPONENT_TEAM_ID',
    EVENT_BEST_STREAM_ID: 'EVENT_BEST_STREAM_ID',
    GAME_STREAM: 'GAME_STREAM',
    GAME_STREAM_EVENT: 'GAME_STREAM_EVENT',
    GAME_STREAM_VIEWER_PAYLOAD_LITE: 'GAME_STREAM_VIEWER_PAYLOAD_LITE',
    BATS_STARTING_LINEUP: 'BATS_STARTING_LINEUP',
    LATEST_BATS_STARTING_LINEUP: 'LATEST_BATS_STARTING_LINEUP',
    ORGANIZATION: 'ORGANIZATION',
    ORGANIZATION_TEAM: 'ORGANIZATION_TEAM',
    ORGANIZATION_USER_ASSOCIATIONS: 'ORGANIZATION_USER_ASSOCIATIONS',
    ORGANIZATION_SCHEDULE_EVENT: 'ORGANIZATION_SCHEDULE_EVENT',
    ORGANIZATION_SCHEDULE_EVENT_BULK_VALIDATE: 'ORGANIZATION_SCHEDULE_EVENT_BULK_VALIDATE',
    ORGANIZATION_SCHEDULE_EVENT_BULK_UPLOAD_TEMPLATE: 'ORGANIZATION_SCHEDULE_EVENT_BULK_UPLOAD_TEMPLATE',
    ORGANIZATION_LEADERBOARDS: 'ORGANIZATION_LEADERBOARDS',
    ORGANIZATION_SCHEDULE_EVENT_RESULTS_EXPORT: 'ORGANIZATION_SCHEDULE_EVENT_RESULTS_EXPORT',
    VIDEO_CLIP_ASSET_METADATA: 'VIDEO_CLIP_ASSET_METADATA',
    VIDEO_CLIP: 'VIDEO_CLIP',
    VIDEO_STREAM_ASSET_METADATA: 'VIDEO_STREAM_ASSET_METADATA',
    VIDEO_STREAM_ASSET_PLAYBACK_DATA: 'VIDEO_STREAM_ASSET_PLAYBACK_DATA',
    ATHLETE_PROFILE_PUBLIC: 'ATHLETE_PROFILE_PUBLIC',
    ATHLETE_PROFILE_CLIPS_PUBLIC: 'ATHLETE_PROFILE_CLIPS_PUBLIC',
    ATHLETE_PROFILE_CAREER_STATS_PUBLIC: 'ATHLETE_PROFILE_CAREER_STATS_PUBLIC',
    TEAM_PUBLIC_PROFILE_ID: 'TEAM_PUBLIC_PROFILE_ID'
};
const Al = { // Allowed Capabilities, used for authorization checks (more advanced, not fully proxied yet)
    canAccessTeam: 'canAccessTeam',
    canAccessRSVP: 'canAccessRSVP',
    canAccessEvent: 'canAccessEvent',
    canAccessPlayerProfile: 'canAccessPlayerProfile',
    canAccessAthleteProfileClips: 'canAccessAthleteProfileClips',
    canAccessAthleteProfileCareerStats: 'canAccessAthleteProfileCareerStats',
    canAccessPlaybackClip: 'canAccessPlaybackClip'
    // ... other capabilities would go here
};
const pc = function(param) { // pc is a constructor for paginated types
    this.param = param;
    // This could be enhanced if the proxy needed to understand the wrapped type for pagination.
    // For now, it's just a marker.
};

const vr = (...e) => e
  , Zwr = e => e
  , Jwr = Zwr({
    post_client_authenticate: {
        path: "/client-authenticate",
        method: gr.POST,
        params: vr(),
        auth: mr.NONE,
        inputType: Qt.POST_CLIENT_AUTHENTICATE,
        outputType: Ft.CLIENT_TOKEN,
        paginate: !1
    },
    post_user_authenticate: {
        path: "/user-authenticate",
        method: gr.POST,
        params: vr(),
        auth: mr.CLIENT,
        inputType: Qt.POST_USER_AUTHENTICATE,
        outputType: Ft.USER_TOKEN,
        paginate: !1
    },
    post_user_authenticate_from_token: {
        path: "/user-authenticate-from-token",
        method: gr.POST,
        params: vr(),
        auth: mr.CLIENT,
        inputType: Qt.POST_USER_AUTHENTICATE_FROM_TOKEN,
        outputType: Ft.USER_TOKEN,
        paginate: !1
    },
    post_users: {
        path: "/users/",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    put_manager: {
        path: "/teams/:teamID/managers/",
        method: gr.PUT,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.PUT_TEAM_MANAGER,
        outputType: Ft.TEAM_USER,
        paginate: !1
    },
    delete_manager: {
        path: "/teams/:teamID/managers/:userID",
        method: gr.DELETE,
        params: vr("teamID", "userID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_user: {
        path: "/users/:userId",
        method: gr.GET,
        params: vr("userId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_user_status: {
        path: "/users/:email/status",
        method: gr.GET,
        params: vr("email"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    send_login_link: {
        path: "/users/:email/send-login-link",
        method: gr.POST,
        params: vr("email"),
        auth: mr.USER,
        inputType: Qt.POST_LOGIN_LINK,
        outputType: Ft.NONE,
        paginate: !1
    },
    "send-email-confirmation": {
        path: "/users/:email/send-email-confirmation",
        method: gr.POST,
        params: vr("email"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_teams: {
        path: "/teams/",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.POST_TEAM,
        outputType: Ft.TEAM,
        paginate: !1
    },
    get_team: {
        path: "/teams/:teamID",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessTeam,
        inputType: Qt.NONE,
        outputType: Ft.TEAM,
        paginate: !1
    },
    patch_team: {
        path: "/teams/:teamID",
        method: gr.PATCH,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.TEAM,
        paginate: !1
    },
    get_team_associations: {
        path: "/teams/:teamID/associations",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessRSVP,
        inputType: Qt.NONE,
        outputType: new pc(Ft.USER_TEAM_ASSOCIATIONS),
        paginate: !0
    },
    get_team_fans: {
        path: "/teams/:teamID/fans",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: new pc(Ft.TEAM_FAN),
        paginate: !0
    },
    get_team_relationships: {
        path: "/teams/:teamID/relationships",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessRSVP,
        inputType: Qt.NONE,
        outputType: new pc(Ft.USER_PLAYER_RELATIONSHIP),
        paginate: !0
    },
    get_team_users: {
        path: "/teams/:teamID/users",
        method: gr.GET,
        params: vr("teamID"),
        allowedCapabilities: Al.canAccessRSVP,
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: new pc(Ft.TEAM_USER),
        paginate: !0
    },
    get_messaging_channel: {
        path: "/teams/:teamID/messaging-channel",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_team_avatar_image: {
        path: "/teams/:teamID/avatar-image",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    delete_team_avatar_image: {
        path: "/teams/:teamID/avatar-image",
        method: gr.DELETE,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_team_avatar_image: {
        path: "/teams/:teamID/avatar-image",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessTeam,
        inputType: Qt.NONE,
        outputType: Ft.TEAM_AVATAR_IMAGE,
        paginate: !1
    },
    get_team_notification_setting: {
        path: "/teams/:teamID/team-notification-setting",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_team_notification_setting: {
        path: "/teams/:teamID/team-notification-setting",
        method: gr.PATCH,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_team_high_school_info: {
        path: "/teams/:teamID/high-school-info",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_team_high_school_info: {
        path: "/teams/:teamID/high-school-info",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_maxpreps_team_import: {
        path: "/integrations/teams/maxpreps/import",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.POST_MAXPREPS_TEAM_IMPORT,
        outputType: Ft.MAXPREPS_IMPORT_RESULT,
        paginate: !1
    },
    post_me_bats_import_initiate: {
        path: "/me/bats-import/initiate",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.BATS_IMPORT_INITIATE,
        paginate: !1
    },
    get_team_external_associations: {
        path: "/teams/:teamID/external-associations",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_public_team_summary: {
        path: "/teams/:teamID/public-summary",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_schedule_events: {
        path: "/teams/:teamID/schedule",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessTeam,
        inputType: Qt.NONE,
        outputType: new pc(Ft.EVENT),
        paginate: !1
    },
    post_reimport_external_events: {
        path: "/teams/:teamID/schedule/reimport-external-events",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_schedule_events: {
        path: "/teams/:teamID/schedule/events/",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.POST_EVENT,
        outputType: Ft.EVENT,
        paginate: !1
    },
    patch_schedule_event: {
        path: "/teams/:teamID/schedule/events/:eventID/",
        method: gr.PATCH,
        params: vr("teamID", "eventID"),
        auth: mr.USER,
        inputType: Qt.PATCH_EVENT,
        outputType: Ft.EVENT,
        paginate: !1
    },
    delete_schedule_event: {
        path: "/teams/:teamID/schedule/events/:eventID/",
        method: gr.PATCH,
        params: vr("teamID", "eventID"),
        auth: mr.USER,
        inputType: Qt.PATCH_EVENT,
        outputType: Ft.EVENT,
        paginate: !1
    },
    get_schedule_event_video_stream: {
        path: "/teams/:teamID/schedule/events/:eventID/video-stream/",
        method: gr.GET,
        params: vr("teamID", "eventID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessEvent,
        inputType: Qt.NONE,
        outputType: Ft.SCHEDULE_EVENT_VIDEO_STREAM,
        paginate: !1
    },
    patch_roster_rollover: {
        path: "/teams/:teamID/rollover",
        method: gr.PATCH,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.PATCH_ROSTER_ROLLOVER,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_event: {
        path: "/events/:eventID",
        method: gr.GET,
        params: vr("eventID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessEvent,
        inputType: Qt.NONE,
        outputType: Ft.EVENT,
        paginate: !1
    },
    get_event_rsvp: {
        path: "/teams/:teamID/schedule/events/:eventID/rsvp-responses",
        method: gr.GET,
        params: vr("teamID", "eventID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessRSVP,
        inputType: Qt.NONE,
        outputType: new pc(Ft.RSVP_RESPONSE),
        paginate: !1
    },
    put_event_rsvp_for_player: {
        path: "/teams/:teamID/schedule/events/:eventID/rsvp-responses/player/:playerID",
        method: gr.PUT,
        params: vr("teamID", "eventID", "playerID"),
        allowedCapabilities: Al.canAccessRSVP,
        auth: mr.USER,
        inputType: Qt.PUT_RSVP_RESPONSE,
        outputType: Ft.NONE,
        paginate: !1
    },
    put_event_rsvp_for_user: {
        path: "/teams/:teamID/schedule/events/:eventID/rsvp-responses/user/:userID",
        method: gr.PUT,
        params: vr("teamID", "eventID", "userID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessRSVP,
        inputType: Qt.PUT_RSVP_RESPONSE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_schedule_event_series: {
        path: "/teams/:teamID/schedule/event-series/",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.POST_EVENT_SERIES,
        outputType: Ft.EVENT_SERIES,
        paginate: !1
    },
    get_schedule_event_series: {
        path: "/teams/:teamID/schedule/event-series/:seriesID",
        method: gr.GET,
        params: vr("teamID", "seriesID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessRSVP,
        inputType: Qt.NONE,
        outputType: Ft.EVENT_SERIES,
        paginate: !1
    },
    get_schedule_event_series_events: {
        path: "/teams/:teamID/schedule/event-series/:seriesID/events",
        method: gr.GET,
        params: vr("teamID", "seriesID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_schedule_event_series: {
        path: "/teams/:teamID/schedule/event-series/:seriesID/",
        method: gr.PATCH,
        params: vr("teamID", "seriesID"),
        auth: mr.USER,
        inputType: Qt.PATCH_EVENT_SERIES,
        outputType: Ft.EVENT_SERIES,
        paginate: !1
    },
    delete_schedule_event_series: {
        path: "/teams/:teamID/schedule/event-series/:seriesID/",
        method: gr.PATCH,
        params: vr("teamID", "seriesID"),
        auth: mr.USER,
        inputType: Qt.PATCH_EVENT_SERIES,
        outputType: Ft.EVENT_SERIES,
        paginate: !1
    },
    get_team_game_summaries: {
        path: "/teams/:teamID/game-summaries",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessTeam,
        inputType: Qt.NONE,
        outputType: new pc(Ft.GAME_SUMMARY),
        paginate: !0
    },
    get_team_game_summary: {
        path: "/teams/:teamID/game-summaries/:eventID",
        method: gr.GET,
        params: vr("teamID", "eventID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.GAME_SUMMARY,
        paginate: !1
    },
    get_batch_simple_scorekeeping_game_data_result: {
        path: "/teams/:teamID/schedule/batch-simple-scorekeeping-data",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessTeam,
        inputType: Qt.NONE,
        outputType: new pc(Ft.BATCH_SIMPLE_SCOREKEEPING_GAME_DATA_RESULT),
        paginate: !1
    },
    get_simple_scorekeeping_game_data: {
        path: "/teams/:teamID/schedule/events/:eventId/simple-scorekeeping/game-data",
        method: gr.GET,
        params: vr("teamID", "eventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.SIMPLE_SCOREKEEPING_GAME_DATA,
        paginate: !1
    },
    post_simple_scorekeeping_game_data: {
        path: "/teams/:teamID/schedule/events/:eventId/simple-scorekeeping/game-data",
        method: gr.POST,
        params: vr("teamID", "eventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_simple_scorekeeping_game_data: {
        path: "/teams/:teamID/schedule/events/:eventId/simple-scorekeeping/game-data",
        method: gr.PATCH,
        params: vr("teamID", "eventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_simple_scorekeeping_game_data_after_game: {
        path: "/teams/:teamID/schedule/events/:eventId/simple-scorekeeping/game-data-after-game",
        method: gr.PATCH,
        params: vr("teamID", "eventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_simple_scorekeeping_game_data_after_game: {
        path: "/teams/:teamID/schedule/events/:eventId/simple-scorekeeping/game-data-after-game",
        method: gr.POST,
        params: vr("teamID", "eventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_simple_scorekeeping_share_time: {
        path: "/teams/:teamID/schedule/events/:eventId/simple-scorekeeping/share-time",
        method: gr.POST,
        params: vr("teamID", "eventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_event_bats_scorekeeping_data: {
        path: "/teams/:teamID/schedule/events/:eventId/scorekeeping-data/bats",
        method: gr.GET,
        params: vr("teamID", "eventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_players: {
        path: "/teams/:teamID/players",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessTeam,
        inputType: Qt.NONE,
        outputType: new pc(Ft.PLAYER),
        paginate: !0
    },
    post_players: {
        path: "/teams/:teamID/players/",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.POST_PLAYER,
        outputType: Ft.PLAYER,
        paginate: !1
    },
    patch_player: {
        path: "/players/:playerID",
        method: gr.PATCH,
        params: vr("playerID"),
        auth: mr.USER,
        inputType: Qt.PATCH_PLAYER,
        outputType: Ft.PLAYER,
        paginate: !1
    },
    delete_player: {
        path: "/players/:playerID",
        method: gr.DELETE,
        params: vr("playerID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_player_family_relationships: {
        path: "/players/:playerID/family-relationships",
        method: gr.PATCH,
        params: vr("playerID"),
        auth: mr.USER,
        inputType: Qt.PATCH_PLAYER_FAMILY_RELATIONSHIPS,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_simple_scorekeeping_team_config: {
        path: "/teams/:teamID/simple-scorekeeping/config",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_simple_scorekeeping_team_config: {
        path: "/teams/:teamID/simple-scorekeeping/config",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_opponent_team: {
        path: "/teams/:owningTeamId/opponent/",
        method: gr.POST,
        params: vr("owningTeamId"),
        auth: mr.USER,
        inputType: Qt.POST_OPPONENT_TEAM,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_opponent_team: {
        path: "/teams/:owningTeamID/opponent/:rootTeamID",
        method: gr.GET,
        params: vr("owningTeamID", "rootTeamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.OPPONENT_TEAM,
        paginate: !1
    },
    get_me_user: {
        path: "/me/user",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessRSVP,
        inputType: Qt.NONE,
        outputType: Ft.USER,
        paginate: !1
    },
    get_me_subscription_information: {
        path: "/me/subscription-information",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.SUBSCRIPTION_INFORMATION,
        paginate: !1
    },
    get_me_team: {
        path: "/me/teams",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: new pc(Ft.TEAM),
        paginate: !1
    },
    get_me_team_stats: {
        path: "/teams/:teamID/season-stats",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.TEAM_SEASON_STATS,
        paginate: !1
    },
    get_player_stats: {
        path: "/teams/:teamID/players/:playerID/stats",
        method: gr.GET,
        params: vr("teamID", "playerID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessPlayerProfile,
        inputType: Qt.NONE,
        outputType: new pc(Ft.PLAYER_STATS),
        paginate: !1
    },
    get_player_game_stats: {
        path: "/teams/:teamID/schedule/events/:eventID/player-stats",
        method: gr.GET,
        params: vr("teamID", "eventID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.PLAYER_GAME_STATS,
        paginate: !1
    },
    put_game_stat_edit_collection: {
        path: "/game-streams/:gameStreamID/game-stat-edit-collection/:lastGameStreamEventID",
        method: gr.PUT,
        params: vr("gameStreamID", "lastGameStreamEventID"),
        auth: mr.USER,
        inputType: Qt.PUT_GAME_STAT_EDIT_COLLECTION,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_game_stat_edit_collection: {
        path: "/game-streams/:gameStreamID/game-stat-edit-collection/:lastGameStreamEventID",
        method: gr.GET,
        params: vr("gameStreamID", "lastGameStreamEventID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.GAME_STAT_EDIT_COLLECTION,
        paginate: !1
    },
    get_me_permissions: {
        path: "/me/permissions",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_me_permissions_v2: {
        path: "/me/permissions/:scopingEntityType/:scopingEntityId",
        method: gr.GET,
        params: vr("scopingEntityType", "scopingEntityId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_me_permissions_v2_all: {
        path: "/me/permissions/all",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_me_password: {
        path: "/me/password",
        method: gr.PATCH,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.PATCH_PASSWORD,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_me_external_calendar_sync_url: {
        path: "/me/external-calendar-sync-url",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_me_pending_teams: {
        path: "/me/pending-teams",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_me_client_backup: {
        path: "/me/client-backups",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    delete_me_relationship_requests: {
        path: "/me/relationship-requests/:teamID",
        method: gr.DELETE,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_me_twilio_chat: {
        path: "/me/tokens/twilio-chat",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_me_organizations: {
        path: "/me/organizations",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: new pc(Ft.ORGANIZATION_WITH_ROLE),
        paginate: !0
    },
    post_me_firebase_token: {
        path: "/me/tokens/firebase",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_team_updates: {
        path: "/sync-topics/teams/:teamID/updates",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_team_topic_state: {
        path: "/sync-topics/teams/:teamID/topic-state",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_global_topic_state: {
        path: "/sync-topics/global/topic-state",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_messaging_channel_image: {
        path: "/channels/:channelId/images/:imageId",
        method: gr.GET,
        params: vr("channelId", "imageId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_messaging_channel_images: {
        path: "/channels/:channelId/images",
        method: gr.GET,
        params: vr("channelId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_messaging_channel_image: {
        path: "/channels/:channelId/images",
        method: gr.POST,
        params: vr("channelId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_messaging_channel_video: {
        path: "/channels/:channelId/videos",
        method: gr.POST,
        params: vr("channelId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_messaging_channel_video: {
        path: "/channels/:channelId/videos/:videoId",
        method: gr.GET,
        params: vr("channelId", "videoId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_messaging_channel_videos: {
        path: "/channels/:channelId/videos",
        method: gr.GET,
        params: vr("channelId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    delete_messaging_media: {
        path: "/channels/:channelId/media/:mediaId",
        method: gr.DELETE,
        params: vr("channelId", "mediaId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_simple_scorekeeping_configs: {
        path: "/simple-scorekeeping-configs/",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_provider_user_authenticate: {
        path: "/authentication-provider/:provider/user-authenticate",
        method: gr.POST,
        params: vr("provider"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_bsb_teams: {
        path: "/integrations/teams",
        method: gr.GET,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_team_import: {
        path: "/integrations/teams/import",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_bats_player_attributes: {
        path: "/player-attributes/:playerId/bats/",
        method: gr.GET,
        params: vr("playerId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_bats_player_attributes: {
        path: "/player-attributes/:playerId/bats/",
        method: gr.POST,
        params: vr("playerId"),
        auth: mr.USER,
        inputType: Qt.POST_BATS_PLAYER_ATTRIBUTES,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_bats_player_attributes: {
        path: "/player-attributes/:playerId/bats/",
        method: gr.PATCH,
        params: vr("playerId"),
        auth: mr.USER,
        inputType: Qt.PATCH_BATS_PLAYER_ATTRIBUTES,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_bats_scorekeeping_data: {
        path: "/scorekeeping-data/bats/:batsScorekeepingDataId/",
        method: gr.POST,
        params: vr("batsScorekeepingDataId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_bats_scorekeeping_data: {
        path: "/scorekeeping-data/bats/:batsScorekeepingDataId/",
        method: gr.PATCH,
        params: vr("batsScorekeepingDataId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_bats_scorekeeping_data: {
        path: "/scorekeeping-data/bats/:batsScorekeepingDataId/",
        method: gr.GET,
        params: vr("batsScorekeepingDataId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_bats_scorekeeping_data_event_ids: {
        path: "/scorekeeping-data/bats/:batsScorekeepingDataId/event-ids",
        method: gr.GET,
        params: vr("batsScorekeepingDataId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_bats_scorekeeping_event: {
        path: "/scorekeeping-events/bats/:batsScorekeepingEventId/",
        method: gr.POST,
        params: vr("batsScorekeepingEventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_bats_scorekeeping_event: {
        path: "/scorekeeping-events/bats/:batsScorekeepingEventId/",
        method: gr.GET,
        params: vr("batsScorekeepingEventId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_pregame_data: {
        path: "/pregame-data/",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_pregame_data: {
        path: "/pregame-data/:pregameDataId",
        method: gr.GET,
        params: vr("pregameDataId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    opponent_search: {
        path: "/search/opponent-import",
        method: gr.GET,
        params: vr("startAt", "name", "ageGroup", "competitionLevel", "city", "state", "country", "season", "year", "sport", "filterSeasons", "filterIncludeOlderSeasons", "filterCity", "filterState", "filterLat", "filterLong"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.OPPONENT_TEAM_IMPORT_SEARCH_RESULT,
        paginate: !1
    },
    get_maxpreps_school_search: {
        path: "/search/maxpreps-school",
        method: gr.GET,
        params: vr("name", "start_at"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.MAXPREPS_SCHOOL_SEARCH_RESULTS,
        paginate: !1
    },
    post_opponent_team_import: {
        path: "/teams/:teamID/opponent/import",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.POST_OPPONENT_TEAM_IMPORT,
        outputType: Ft.OPPONENT_TEAM_ID,
        paginate: !1
    },
    post_opponent_team_legacy_import: {
        path: "/teams/:teamID/opponent/legacy-import",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.POST_OPPONENT_TEAM_LEGACY_IMPORT,
        outputType: Ft.OPPONENT_TEAM_ID,
        paginate: !1
    },
    get_event_best_stream_id: {
        path: "/events/:eventID/best-game-stream-id",
        method: gr.GET,
        params: vr("eventID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessEvent,
        inputType: Qt.NONE,
        outputType: Ft.EVENT_BEST_STREAM_ID,
        paginate: !1
    },
    get_game_stream: {
        path: "/game-streams/:streamID",
        method: gr.GET,
        params: vr("streamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessTeam,
        inputType: Qt.NONE,
        outputType: Ft.GAME_STREAM,
        paginate: !1
    },
    get_game_stream_events: {
        path: "/game-streams/:streamID/events",
        method: gr.GET,
        params: vr("streamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessTeam,
        inputType: Qt.NONE,
        outputType: new pc(Ft.GAME_STREAM_EVENT),
        paginate: !1
    },
    get_game_stream_viewer_payload_lite: {
        path: "/game-streams/gamestream-viewer-payload-lite/:eventID",
        method: gr.GET,
        params: vr("eventID"),
        auth: mr.USER,
        paginate: !1,
        inputType: Qt.NONE,
        outputType: Ft.GAME_STREAM_VIEWER_PAYLOAD_LITE
    },
    get_bats_starting_lineup: {
        path: "/bats-starting-lineups/:lineupId",
        method: gr.GET,
        params: vr("lineupId"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.BATS_STARTING_LINEUP,
        paginate: !1
    },
    patch_bats_starting_lineup: {
        path: "/bats-starting-lineups/:lineupId",
        method: gr.PATCH,
        params: vr("lineupId"),
        auth: mr.USER,
        inputType: Qt.PATCH_BATS_STARTING_LINEUP,
        outputType: Ft.BATS_STARTING_LINEUP,
        paginate: !1
    },
    post_bats_starting_lineup: {
        path: "/bats-starting-lineups/",
        method: gr.POST,
        params: vr(),
        auth: mr.USER,
        inputType: Qt.POST_BATS_STARTING_LINEUP,
        outputType: Ft.BATS_STARTING_LINEUP,
        paginate: !1
    },
    get_latest_bats_starting_lineup: {
        path: "/bats-starting-lineups/latest/:teamID",
        method: gr.GET,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.LATEST_BATS_STARTING_LINEUP,
        paginate: !1
    },
    get_player_profile_photo: {
        path: "/players/:playerID/profile-photo",
        method: gr.GET,
        params: vr("playerID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessPlayerProfile,
        inputType: Qt.NONE,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_organization: {
        path: "/organizations/:orgID",
        method: gr.GET,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.ORGANIZATION,
        paginate: !1
    },
    get_organization_teams: {
        path: "/organizations/:orgID/teams",
        method: gr.GET,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: new pc(Ft.ORGANIZATION_TEAM),
        paginate: !0
    },
    get_organization_users: {
        path: "/organizations/:orgID/users",
        method: gr.GET,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.ORGANIZATION_USER_ASSOCIATIONS,
        paginate: !1
    },
    post_organization_schedule_event: {
        path: "/organizations/:orgID/events",
        method: gr.POST,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.POST_ORGANIZATION_SCHEDULE_EVENT,
        outputType: Ft.ORGANIZATION_SCHEDULE_EVENT,
        paginate: !1
    },
    post_organization_schedule_event_bulk: {
        path: "/organizations/:orgID/events/bulk",
        method: gr.POST,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.POST_ORGANIZATION_SCHEDULE_EVENT_BULK,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_organization_schedule_event_bulk_validate: {
        path: "/organizations/:orgID/events/bulk/validate",
        method: gr.POST,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.POST_ORGANIZATION_SCHEDULE_EVENT_BULK_VALIDATE,
        outputType: Ft.ORGANIZATION_SCHEDULE_EVENT_BULK_VALIDATE,
        paginate: !1
    },
    post_organization_teams: {
        path: "/organizations/:orgID/teams",
        method: gr.POST,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.POST_ORGANIZATION_TEAMS,
        outputType: Ft.NONE,
        paginate: !1
    },
    patch_organization_schedule_event: {
        path: "/organizations/:orgID/events/:eventID",
        method: gr.PATCH,
        params: vr("orgID", "eventID"),
        auth: mr.USER,
        inputType: Qt.PATCH_ORGANIZATION_SCHEDULE_EVENT,
        outputType: Ft.ORGANIZATION_SCHEDULE_EVENT,
        paginate: !1
    },
    get_organization_schedule_event_bulk_upload_template: {
        path: "/organizations/:orgID/events/bulk/template",
        method: gr.GET,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.ORGANIZATION_SCHEDULE_EVENT_BULK_UPLOAD_TEMPLATE,
        paginate: !1
    },
    get_organization_leaderboards: {
        path: "/organizations/:orgID/leaderboards",
        method: gr.GET,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.ORGANIZATION_LEADERBOARDS,
        paginate: !1
    },
    get_organization_schedule_event_results_export: {
        path: "/organizations/:orgID/events/results/export",
        method: gr.GET,
        params: vr("orgID"),
        auth: mr.USER,
        inputType: Qt.NONE,
        outputType: Ft.ORGANIZATION_SCHEDULE_EVENT_RESULTS_EXPORT,
        paginate: !1
    },
    get_player_video_clip_asset_metadata: {
        path: "/teams/:teamID/video-clips/player/:playerID/clips",
        method: gr.GET,
        params: vr("playerID", "teamID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessPlayerProfile,
        inputType: Qt.NONE,
        outputType: new pc(Ft.VIDEO_CLIP_ASSET_METADATA),
        paginate: !0
    },
    get_video_clip: {
        path: "/teams/:teamID/video-clips/playable-clip/:clipID/clip",
        method: gr.GET,
        params: vr("teamID", "clipID"),
        auth: mr.USER,
        allowedCapabilities: Al.canAccessPlaybackClip,
        inputType: Qt.NONE,
        outputType: Ft.VIDEO_CLIP,
        paginate: !1
    },
    get_all_schedule_event_stream_asset_metadata: {
        path: "/teams/:teamID/schedule/events/:eventID/video-stream/assets",
        method: gr.GET,
        auth: mr.USER,
        params: vr("teamID", "eventID"),
        inputType: Qt.NONE,
        outputType: new pc(Ft.VIDEO_STREAM_ASSET_METADATA),
        paginate: !1
    },
    get_stream_asset_playback_data: {
        path: "/teams/:teamID/schedule/events/:eventID/video-stream/assets/playback",
        method: gr.GET,
        auth: mr.USER,
        params: vr("teamID", "eventID"),
        inputType: Qt.NONE,
        outputType: new pc(Ft.VIDEO_STREAM_ASSET_PLAYBACK_DATA),
        paginate: !1
    },
    get_all_team_stream_asset_metadata: {
        path: "/teams/:teamID/video-stream/assets",
        method: gr.GET,
        auth: mr.USER,
        params: vr("teamID"),
        inputType: Qt.NONE,
        outputType: new pc(Ft.VIDEO_STREAM_ASSET_METADATA),
        paginate: !0
    },
    patch_stream_asset_metadata: {
        path: "/teams/:teamID/schedule/events/:eventID/video-stream/assets/:assetID/hidden",
        method: gr.PATCH,
        auth: mr.USER,
        params: vr("teamID", "eventID", "assetID"),
        inputType: Qt.PATCH_STREAM_ASSET_METADATA,
        outputType: Ft.NONE,
        paginate: !1
    },
    post_team_community_pass: {
        path: "/teams/:teamID/community-pass",
        method: gr.POST,
        params: vr("teamID"),
        auth: mr.USER,
        inputType: Qt.POST_TEAM_COMMUNITY_PASS,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_opponent_teams: {
        path: "/teams/:teamID/opponents",
        method: gr.GET,
        auth: mr.USER,
        params: vr("teamID"),
        inputType: Qt.NONE,
        outputType: new pc(Ft.OPPONENT_TEAM),
        paginate: !0
    },
    patch_opponent_team: {
        path: "/teams/:teamID/opponent/:opponentTeamID",
        method: gr.PATCH,
        auth: mr.USER,
        params: vr("teamID", "opponentTeamID"),
        inputType: Qt.PATCH_OPPONENT_TEAM,
        outputType: Ft.NONE,
        paginate: !1
    },
    get_athlete_profile_by_handle_public: {
        path: "/public/athlete-profile/:handle",
        method: gr.GET,
        auth: mr.NONE,
        params: vr("handle"),
        inputType: Qt.NONE,
        outputType: Ft.ATHLETE_PROFILE_PUBLIC,
        paginate: !1
    },
    get_athlete_profile_clips_public: {
        path: "/public/athlete-profile/:athleteProfileID/clips",
        method: gr.GET,
        auth: mr.NONE,
        allowedCapabilities: Al.canAccessAthleteProfileClips,
        params: vr("athleteProfileID"),
        inputType: Qt.NONE,
        outputType: new pc(Ft.ATHLETE_PROFILE_CLIPS_PUBLIC),
        paginate: !1
    },
    get_athlete_profile_authenticated_clip_url_public: {
        path: "/public/athlete-profile/:athleteProfileID/clips/:clipID/authenticatedUrl",
        method: gr.GET,
        auth: mr.NONE,
        allowedCapabilities: Al.canAccessAthleteProfileClips,
        params: vr("athleteProfileID", "clipID"),
        inputType: Qt.NONE,
        outputType: Ft.VIDEO_STREAM_PLAYBACK_DATA,
        paginate: !1
    },
    get_athlete_profile_career_stats_public: {
        path: "/public/athlete-profile/:athleteProfileID/career-stats",
        method: gr.GET,
        auth: mr.NONE,
        allowedCapabilities: Al.canAccessAthleteProfileCareerStats,
        params: vr("athleteProfileID"),
        inputType: Qt.NONE,
        outputType: Ft.ATHLETE_PROFILE_CAREER_STATS_PUBLIC,
        paginate: !1
    },
    get_team_public_profile_id: {
        path: "/teams/:teamID/public-team-profile-id",
        method: gr.GET,
        auth: mr.USER,
        params: vr("teamID"),
        inputType: Qt.NONE,
        outputType: Ft.TEAM_PUBLIC_PROFILE_ID,
        paginate: !1
    }
});

const app = express();
const port = process.env.PORT || 3001;

// API Constants
const API_URL = "https://api.team-manager.gc.com";
const AUTH_ENDPOINT = "/auth"; // Corrected endpoint
const DEVICE_ID = "b1be8358d171ea1f6e037fbde6297e3a";
const WEB_CLIENT_ID = "a0b1b2c8-522d-4b94-a6f5-fbab9342903d";
const WEB_EDEN_AUTH_KEY_B64 = "fWQBLAla8kD+qhuOfDpnKUvl3dy/EOv/+kdJ6Q3sRs0="; // This could also be an env var if it changes

// MongoDB Configuration (Prioritize Environment Variable)
const MONGO_URL = process.env.MONGO_URL || "mongodb://192.168.10.67:27017/gcdb";
// MONGO_DB_NAME is now part of MONGO_URL if set via env, or part of the default.
// If MONGO_URL from env var does not include the db name, MongoClient will use 'test' or require it to be specified.
// The docker-compose MONGO_URL includes /gcdb. If running locally without docker-compose and MONGO_URL env var,
// ensure the default points to the correct database or adjust MongoClient connection.
// For simplicity, assuming MONGO_URL contains the db name or a default db is acceptable if not specified.
// MongoClient will handle parsing the db name from the URL if present.

const MONGO_COLLECTION_NAME = "TokenCollection"; // This could also be an env var

const DEPLOY_URL = process.env.DEPLOY_URL || null;

// CORS configuration
const corsOptions = {
  origin: DEPLOY_URL
    ? [DEPLOY_URL, 'http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080']
    : ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Helper functions for signature generation ---
function randomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function base64Encode(plainText) {
    return Buffer.from(plainText, 'utf8').toString('base64');
}

function getTimestamp() {
    return Math.floor(new Date().getTime() / 1000);
}

function valuesForSigner(payload) {
    const propertyArray = [];
    if (payload == null || typeof payload !== 'object') {
        return [];
    }
    const keys = Object.keys(payload).sort();
    for (const key of keys) {
        const value = payload[key];
        if (value !== null && value !== undefined) {
            if (typeof value === 'boolean') {
                propertyArray.push(value ? "True" : "False");
            } else {
                propertyArray.push(value.toString());
            }
        }
    }
    return propertyArray;
}

function signPayloadNode(context, payload) {
    const values = valuesForSigner(payload);
    const valstring = values.join('|');
    const key = Buffer.from(WEB_EDEN_AUTH_KEY_B64, 'base64');
    const nonceBytes = Buffer.from(context.nonce, 'base64');
    const stringToSignPart1 = context.timestamp.toString() + "|";
    const dataParts = [
        Buffer.from(stringToSignPart1, 'utf8'),
        nonceBytes,
        Buffer.from("|" + valstring, 'utf8')
    ];
    const dataToSign = Buffer.concat(dataParts);
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(dataToSign);
    return hmac.digest('base64');
}

// --- MongoDB Helper ---
async function getTokensFromDB() {
    const client = new MongoClient(MONGO_URL);
    try {
        await client.connect();
        // MONGO_DB_NAME is derived from MONGO_URL by MongoClient if specified in the URL path
        // e.g. mongodb://host:port/dbname. If not, a default or 'test' might be used.
        // The following line is not strictly necessary if dbname is in MONGO_URL.
        // const db = client.db(); // Or client.db(specific_db_name_if_not_in_url)
        const db = client.db(); // MongoClient uses the db from the connection string
        console.log(`[${new Date().toISOString()}] Connected to MongoDB at ${MONGO_URL}, using DB: ${db.databaseName}`);
        const collection = db.collection(MONGO_COLLECTION_NAME);
        // Assuming there's only one document or we need the first one that matches 'token' type.
        const tokenDoc = await collection.findOne({ type: "token" });
        if (tokenDoc) {
            console.log(`[${new Date().toISOString()}] Token document found in DB.`);
            return tokenDoc;
        } else {
            console.log(`[${new Date().toISOString()}] No token document found in DB.`);
            return null;
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Error connecting to or querying MongoDB:`, err);
        throw err; // Re-throw to be caught by the endpoint handler
    } finally {
        await client.close();
        console.log(`[${new Date().toISOString()}] Disconnected from MongoDB.`);
    }
}

async function updateTokensInDB(originalDocId, newAccessToken, newAccessExpires, newRefreshTokenData, newRefreshExpires) {
    const client = new MongoClient(MONGO_URL);
    try {
        await client.connect();
        const db = client.db(); // MongoClient uses the db from the connection string
        const collection = db.collection(MONGO_COLLECTION_NAME);

        const updateFields = {
            'access.data': newAccessToken,
            'access.expires': newAccessExpires
        };

        if (newRefreshTokenData && newRefreshExpires) {
            updateFields['refresh.data'] = newRefreshTokenData;
            updateFields['refresh.expires'] = newRefreshExpires;
        }

        const result = await collection.updateOne(
            { _id: originalDocId }, // Query by the original document's _id
            { $set: updateFields }
        );
        console.log(`[${new Date().toISOString()}] MongoDB update result: Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);
        return result.modifiedCount > 0;
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Error updating token in MongoDB:`, err);
        return false;
    } finally {
        await client.close();
    }
}

// --- Helper Function to get a valid token ---
async function getValidToken(authType) {
    // For now, only mr.USER and mr.CLIENT will trigger token refresh.
    // mr.NONE will not require a token.
    // This function will be expanded to differentiate client/user tokens if needed.
    if (authType === mr.NONE) {
        return null; // No token needed
    }

    // Attempt to get token by calling our own /refresh_token endpoint logic
    // This reuses the existing token refresh and DB storage mechanism
    console.log(`[${new Date().toISOString()}] Internal call to refresh/fetch token logic for authType: ${authType}`);
    const tokenDoc = await getTokensFromDB();
    if (!tokenDoc || !tokenDoc.access || !tokenDoc.refresh) {
        throw new Error('Token data not found or invalid in database for internal call.');
    }

    const { access, refresh, _id: docId } = tokenDoc;
    const currentTimeSeconds = Math.floor(Date.now() / 1000);

    if (access.expires > currentTimeSeconds + 60) {
        console.log(`[${new Date().toISOString()}] Internal: Access token from DB is still valid.`);
        return access.data;
    }

    console.log(`[${new Date().toISOString()}] Internal: Access token expired or nearing expiry. Attempting refresh.`);
    const context = {
        nonce: base64Encode(randomString(32)),
        timestamp: getTimestamp(),
        previousSignature: ""
    };
    const payloadToSign = { type: "refresh" };
    const clientRequestSignature = signPayloadNode(context, payloadToSign);
    const fullApiUrl = API_URL + AUTH_ENDPOINT;
    const headersToGcApi = {
        'Content-Type': 'application/json',
        'Gc-Signature': `${context.nonce}.${clientRequestSignature}`,
        'Gc-Token': refresh.data,
        'Gc-App-Version': '0.0.0',
        'Gc-Device-Id': DEVICE_ID,
        'Gc-Client-Id': WEB_CLIENT_ID,
        'Gc-App-Name': 'web',
        'Gc-Timestamp': context.timestamp.toString()
    };

    const apiResponse = await fetch(fullApiUrl, {
        method: 'POST',
        headers: headersToGcApi,
        body: JSON.stringify(payloadToSign)
    });

    const responseBodyText = await apiResponse.text();
    if (!apiResponse.ok) {
        throw new Error(`Internal: Error from GC API during refresh: ${apiResponse.status} - ${responseBodyText}`);
    }

    let responseBodyJson;
    try {
        responseBodyJson = JSON.parse(responseBodyText);
    } catch (e) {
        throw new Error(`Internal: GC API refresh response was OK but not valid JSON. Body: ${responseBodyText}`);
    }

    const newAccessToken = responseBodyJson.access && responseBodyJson.access.data;
    const newAccessExpiresTimestamp = responseBodyJson.access && responseBodyJson.access.expires;
    const newRefreshTokenData = responseBodyJson.refresh && responseBodyJson.refresh.data;
    const newRefreshExpires = responseBodyJson.refresh && responseBodyJson.refresh.expires;

    if (!newAccessToken || typeof newAccessExpiresTimestamp === 'undefined') {
        throw new Error("Internal: Invalid token data from GC API after refresh.");
    }

    await updateTokensInDB(docId, newAccessToken, newAccessExpiresTimestamp, newRefreshTokenData, newRefreshExpires);
    console.log(`[${new Date().toISOString()}] Internal: Token refreshed successfully.`);
    return newAccessToken;
}

// --- Generic API Call Forwarder ---
async function forwardApiCall(req, res, apiDefinition) {
    try {
        const { method, path: apiPath, auth: authType, params: expectedParams, inputType, outputType, paginate } = apiDefinition;

        // 1. Authentication (Get Token if needed)
        let gcToken = null;
        if (authType !== mr.NONE) {
            try {
                gcToken = await getValidToken(authType);
                if (!gcToken) {
                    // This case should ideally be handled by getValidToken throwing an error if token is required but not obtainable
                    return res.status(401).json({ error: "Authentication required but no token could be obtained." });
                }
            } catch (authError) {
                console.error(`[${new Date().toISOString()}] Authentication error for ${method} ${req.path}:`, authError);
                return res.status(500).json({ error: "Failed to authenticate for GC API", details: authError.message });
            }
        }

        // 2. Construct Target URL
        // Replace path parameters (e.g., :teamID) with values from req.params
        let effectivePath = apiPath; // Example: "/teams/:teamID/managers/:userID"

        // Iterate over the keys in req.params (e.g., { teamID: "actual_value", userID: "another_value" })
        // These keys are determined by Express based on the route definition.
        for (const key in req.params) {
            if (Object.prototype.hasOwnProperty.call(req.params, key)) {
                const placeholder = `:${key}`; // e.g., ":teamID"
                // Ensure global replacement if a param name could appear multiple times (unlikely in standard REST paths but safer)
                const regex = new RegExp(placeholder, 'g');
                if (effectivePath.includes(placeholder)) {
                    effectivePath = effectivePath.replace(regex, req.params[key]);
                    console.log(`[${new Date().toISOString()}] Path param substitution: ${placeholder} -> ${req.params[key]}. New path: ${effectivePath}`);
                }
            }
        }

        const targetUrl = new URL(API_URL + effectivePath);

        // Add query parameters from req.query.
        // The previous logic for expectedParams for query params might need review if issues persist there,
        // but path parameters are the current focus.
        // More sophisticated input validation based on `inputType` would go here.
        if (method === gr.GET || method === gr.DELETE) { // Common for GET, sometimes DELETE
            Object.entries(req.query).forEach(([key, value]) => {
                targetUrl.searchParams.append(key, value);
            });
        }

        // 3. Prepare Payload and Signature (if not GET/DELETE or if body is allowed)
        let requestBody = null;
        const context = {
            nonce: base64Encode(randomString(32)),
            timestamp: getTimestamp(),
            previousSignature: "" // Adjust if needed for specific endpoints
        };
        let signaturePayload = {}; // Default to empty object for signing if no body

        if (method !== gr.GET && method !== gr.DELETE && Object.keys(req.body).length > 0) {
            requestBody = JSON.stringify(req.body);
            signaturePayload = req.body; // Sign the actual request body
        } else if (method === gr.GET || method === gr.DELETE) {
            // For GET/DELETE, signature payload might be empty or based on query params if API requires.
            // The provided Jwr definitions don't specify signing query params, so assume empty or path-based.
            // If specific GET/DELETE requests need signed query params, this needs adjustment.
            // For now, let's assume an empty payload for signing if no body.
        }


        const clientRequestSignature = signPayloadNode(context, signaturePayload);

        // 4. Construct Headers
        const headersToGcApi = {
            'Content-Type': 'application/json', // Assume JSON, adjust if inputType suggests otherwise
            'Gc-Signature': `${context.nonce}.${clientRequestSignature}`,
            'Gc-App-Version': '0.0.0', // Example version, make configurable if needed
            'Gc-Device-Id': DEVICE_ID,
            'Gc-Client-Id': WEB_CLIENT_ID,
            'Gc-App-Name': 'web',
            'Gc-Timestamp': context.timestamp.toString()
        };
        if (gcToken) {
            headersToGcApi['Gc-Token'] = gcToken;
        }

        // 5. Make the call to GC API
        console.log(`[${new Date().toISOString()}] Forwarding ${method} to GC API: ${targetUrl.toString()}`);
        if(requestBody) console.log(`[${new Date().toISOString()}] Request Body: ${requestBody.substring(0,500)}...`);


        const apiResponse = await fetch(targetUrl.toString(), {
            method: method, // Use the mapped method string
            headers: headersToGcApi,
            body: requestBody // null if GET/DELETE or no body
        });

        // 6. Handle Response
        const responseBodyText = await apiResponse.text();
        console.log(`[${new Date().toISOString()}] GC API Response Status for ${method} ${req.path}: ${apiResponse.status}`);

        // Forward status code
        res.status(apiResponse.status);

        // Forward headers (optional, but can be useful for content-type, etc.)
        // Be selective to avoid forwarding sensitive headers
        // apiResponse.headers.forEach((value, name) => {
        //   if (name.toLowerCase() === 'content-type' || name.toLowerCase().startsWith('gc-')) {
        //     res.setHeader(name, value);
        //   }
        // });
        if(apiResponse.headers.get('content-type')) {
            res.setHeader('Content-Type', apiResponse.headers.get('content-type'));
        }


        if (!apiResponse.ok) {
            console.error(`[${new Date().toISOString()}] Error from GC API for ${method} ${req.path}: ${apiResponse.status} - ${responseBodyText}`);
            // Attempt to send as JSON if possible, otherwise text
            try {
                return res.send(JSON.parse(responseBodyText));
            } catch (e) {
                return res.send(responseBodyText);
            }
        }

        // For successful responses, send the body
        // Add pagination logic here if apiDefinition.paginate is true
        // This is a simplified version; actual pagination might involve multiple requests
        // or parsing 'next' links from headers/body.
        if (paginate) {
            console.log(`[${new Date().toISOString()}] Pagination enabled for ${method} ${req.path}, but not fully implemented in proxy.`);
            // Potentially look for Gc-Next-Start-At header or similar
        }

        try {
            return res.send(JSON.parse(responseBodyText));
        } catch (e) {
            return res.send(responseBodyText); // Send as text if not JSON
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Internal proxy error for ${apiDefinition.method} ${req.path}:`, error);
        res.status(500).json({ error: 'Proxy server internal error during API forwarding', details: error.message });
    }
}


// --- New API Endpoint to get/refresh token ---
app.get('/refresh_token', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Request to /refresh_token`);
    try {
        const tokenDoc = await getTokensFromDB();

        if (!tokenDoc || !tokenDoc.access || !tokenDoc.refresh) {
            console.error(`[${new Date().toISOString()}] Invalid or missing token document structure in DB.`);
            return res.status(500).json({ error: 'Token data not found or invalid in database.' });
        }

        const { access, refresh, _id: docId } = tokenDoc;
        const currentTimeSeconds = Math.floor(Date.now() / 1000);

        // Check if access token is still valid (e.g., expires in more than 60 seconds)
        if (access.expires > currentTimeSeconds + 60) {
            console.log(`[${new Date().toISOString()}] Access token from DB is still valid. Expires at: ${new Date(access.expires * 1000).toISOString()}`);
            return res.json({
                token: access.data,
                expires: access.expires,
                status: "Retrieved from DB"
            });
        }

        // Access token is expired or nearing expiration, try to refresh
        console.log(`[${new Date().toISOString()}] Access token expired or nearing expiry. Attempting refresh. Current time: ${new Date(currentTimeSeconds * 1000).toISOString()}, Token expires: ${new Date(access.expires * 1000).toISOString()}`);

        const context = {
            nonce: base64Encode(randomString(32)),
            timestamp: getTimestamp(),
            previousSignature: "" // Not typically used for refresh, but part of original structure
        };

        // The payload for refresh is just { type: "refresh" } according to original logic.
        // However, the problem description implies the refresh token itself is sent.
        // The GC API expects the refresh token in the 'Gc-Token' header.
        const payloadToSign = { type: "refresh" }; // This is what gets signed for the GC API.
        const clientRequestSignature = signPayloadNode(context, payloadToSign);

        const fullApiUrl = API_URL + AUTH_ENDPOINT;
        const headersToGcApi = {
            'Content-Type': 'application/json',
            'Gc-Signature': `${context.nonce}.${clientRequestSignature}`,
            'Gc-Token': refresh.data, // Use the refresh token from DB
            'Gc-App-Version': '0.0.0', // Example version
            'Gc-Device-Id': DEVICE_ID,
            'Gc-Client-Id': WEB_CLIENT_ID,
            'Gc-App-Name': 'web',
            'Gc-Timestamp': context.timestamp.toString()
        };

        console.log(`[${new Date().toISOString()}] Forwarding refresh request to GC API (${fullApiUrl}). Gc-Token: ${refresh.data.substring(0,20)}...`);

        const apiResponse = await fetch(fullApiUrl, {
            method: 'POST',
            headers: headersToGcApi,
            body: JSON.stringify(payloadToSign) // Body is { "type": "refresh" }
        });

        const responseBodyText = await apiResponse.text();
        let responseBodyJson;

        console.log(`[${new Date().toISOString()}] GC API Response Status for refresh: ${apiResponse.status}`);

        if (!apiResponse.ok) {
            console.error(`[${new Date().toISOString()}] Error from GC API during refresh: ${apiResponse.status} - ${responseBodyText}`);
            try {
                responseBodyJson = JSON.parse(responseBodyText);
                return res.status(apiResponse.status).json(responseBodyJson);
            } catch (e) {
                return res.status(apiResponse.status).send(responseBodyText);
            }
        }

        try {
            responseBodyJson = JSON.parse(responseBodyText);
        } catch (e) {
            console.error(`[${new Date().toISOString()}] GC API refresh response was OK but not valid JSON. Status: ${apiResponse.status}, Body: ${responseBodyText}`);
            return res.status(502).json({ error: "Unexpected non-JSON success response from GC API after refresh", details: responseBodyText });
        }

        // Parse the GC API response structure
        const newAccessToken = responseBodyJson.access && responseBodyJson.access.data;
        const newAccessExpiresTimestamp = responseBodyJson.access && responseBodyJson.access.expires; // This is an absolute timestamp
        const newRefreshTokenData = responseBodyJson.refresh && responseBodyJson.refresh.data;
        const newRefreshExpires = responseBodyJson.refresh && responseBodyJson.refresh.expires;

        if (!newAccessToken || typeof newAccessExpiresTimestamp === 'undefined') {
            console.error(`[${new Date().toISOString()}] GC API refresh response missing access.data or access.expires. Response:`, responseBodyJson);
            return res.status(500).json({ error: "Invalid token data from GC API after refresh - missing access token or its expiry" });
        }

        // We have new tokens (access and potentially refresh), update them in the DB.
        // If newRefreshTokenData or newRefreshExpires are undefined (not provided by API),
        // updateTokensInDB should ideally preserve the old ones if that's the desired behavior.
        // However, the current updateTokensInDB replaces refresh.data and refresh.expires if new ones are provided.
        // If the API guarantees to always return full refresh details if it returns a refresh token, this is fine.
        // If it might only return refresh.data, we might need to adjust updateTokensInDB or logic here.
        // For now, assume if refresh.data is there, refresh.expires will also be there as per API response example.

        await updateTokensInDB(docId, newAccessToken, newAccessExpiresTimestamp, newRefreshTokenData, newRefreshExpires);

        console.log(`[${new Date().toISOString()}] Token refreshed successfully. New access token expires at: ${new Date(newAccessExpiresTimestamp * 1000).toISOString()}`);
        res.json({
            token: newAccessToken,
            expires: newAccessExpiresTimestamp, // Send the absolute expiry timestamp
            status: "Token refreshed"
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Internal proxy error in /refresh_token:`, error);
        res.status(500).json({ error: 'Proxy server internal error', details: error.message });
    }
});


// Simple root endpoint for testing if server is up
app.get('/', (req, res) => {
    res.send('JWT Refresh Proxy Server is running with MongoDB support! <a href="/api-docs">View API Docs</a>');
});

// --- Dynamically create routes from Jwr object ---
Object.entries(Jwr).forEach(([apiKey, apiDefinition]) => {
    const httpMethod = apiDefinition.method; // This will be e.g., gr.POST, which needs to be mapped
    const path = apiDefinition.path;

    // Ensure httpMethod is a string like 'GET', 'POST', etc.
    // This relies on gr.POST being 'POST', gr.GET being 'GET' etc.
    // which will be set in the next step (refining placeholder objects)
    const expressMethod = String(httpMethod).toLowerCase();

    if (app[expressMethod]) {
        console.log(`[${new Date().toISOString()}] Creating route: ${String(httpMethod).toUpperCase()} ${path} (mapped from ${apiKey})`);
        app[expressMethod](path, async (req, res) => {
            // Attach the full apiDefinition to the request object for the forwarder to use
            // req.apiDefinition = apiDefinition;
            // It's cleaner to pass it directly to forwardApiCall
            await forwardApiCall(req, res, apiDefinition);
        });
    } else {
        console.error(`[${new Date().toISOString()}] Invalid or unsupported HTTP method: ${httpMethod} for path ${path}`);
    }
});

app.listen(port, () => {
    const baseUrl = process.env.DEPLOY_URL || `http://localhost:${port}`;
    console.log(`Proxy server listening at ${baseUrl}`);
    console.log('CORS enabled for origins: ' + corsOptions.origin.join(', '));
    console.log('Endpoints:');
    console.log(`  GET  ${baseUrl}/refresh_token (gets/refreshes token from MongoDB)`);
    console.log(`  GET  ${baseUrl}/ (test endpoint)`);
    console.log('Dynamically created GC API proxy endpoints from Jwr will also be available.');
});

// --- OpenAPI Specification Setup ---
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'GameChanger API Proxy (Dynamic)',
    version: 'v1.0.0',
    description: 'A dynamically generated OpenAPI specification for the GameChanger API proxy. All endpoints are proxied to the GameChanger API.',
  },
  servers: [
    {
      url: 'https://gc-stats-api.36technology.com/', // Ensure trailing slash
      description: 'Production API Server',
    }
  ],
  components: {
    securitySchemes: {
      // If your API uses security schemes like Bearer token, define them here
      // For example:
      // bearerAuth: {
      //   type: 'http',
      //   scheme: 'bearer',
      //   bearerFormat: 'JWT',
      // },
    },
    schemas: {
        // Define common schemas here if any. For now, most are generic objects.
        GenericRequest: {
            type: 'object',
            description: 'Generic request body. Specific properties vary by endpoint.'
        },
        GenericResponse: {
            type: 'object',
            description: 'Generic response body. Specific properties vary by endpoint.'
        },
        ErrorResponse: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                details: { type: 'string' }
            }
        }
    }
  },
  paths: {} // Paths will be populated dynamically
};

// Function to transform Jwr entries to OpenAPI paths
function generateOpenApiPaths(jwrObject) {
  const paths = {};
  for (const apiKey in jwrObject) {
    const apiDef = jwrObject[apiKey];
    const path = apiDef.path;
    const method = apiDef.method.toLowerCase(); // e.g., 'get', 'post'

    if (!paths[path]) {
      paths[path] = {};
    }

    // Basic parameter mapping (from path, e.g., /teams/:teamID)
    const parameters = (apiDef.params || []).map(paramName => {
      if (path.includes(`:${paramName}`)) {
        return {
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string' }, // Assuming string for now
          description: `Parameter ${paramName}`
        };
      }
      // Query parameters would need more info from JWR or a convention
      // For GET/DELETE, other params might be query params.
      // This is a simplification. The original openapi.yaml has more details for query params.
      // We'd need to enhance JWR or make assumptions to fully replicate.
      return null; // Placeholder for non-path params for now
    }).filter(p => p !== null);

    // Add query parameters for GET requests if they are in apiDef.params but not in path
    if (method === 'get' && apiDef.params) {
        apiDef.params.forEach(paramName => {
            if (!path.includes(`:${paramName}`) && !parameters.some(p => p.name === paramName)) {
                parameters.push({
                    name: paramName,
                    in: 'query',
                    required: false, // Assuming query params are optional unless specified
                    schema: { type: 'string' },
                    description: `Query parameter ${paramName}`
                });
            }
        });
    }


    paths[path][method] = {
      summary: apiKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Generate a summary from the key
      operationId: apiKey,
      tags: path.split('/')[1] ? [path.split('/')[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())] : ['Default'], // Basic tagging
      parameters: parameters.length > 0 ? parameters : undefined,
      requestBody: (method === 'post' || method === 'put' || method === 'patch') ? {
        description: `Request body for ${apiKey}`,
        required: true, // Assuming body is required for these methods if defined
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GenericRequest' } // Placeholder
          }
        }
      } : undefined,
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GenericResponse' } // Placeholder
            }
          }
        },
        '400': {
          description: 'Bad Request',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        },
        '401': {
          description: 'Unauthorized',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        },
        '404': {
          description: 'Not Found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        },
        '500': {
          description: 'Internal Server Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
        }
        // Add other common responses or derive from apiDef.outputType if possible
      },
      // security: authType !== mr.NONE ? [{ bearerAuth: [] }] : [], // Example security
    };
  }
  return paths;
}

swaggerDefinition.paths = generateOpenApiPaths(Jwr);

// Options for swagger-jsdoc
const options = {
  swaggerDefinition,
  apis: [], // We are not using file paths here, as definition is constructed programmatically
};

const openapiSpecification = swaggerJsdoc(options);

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));

// Endpoint to serve the raw OpenAPI JSON specification
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openapiSpecification);
});

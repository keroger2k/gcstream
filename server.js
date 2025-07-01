const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// API Constants
const API_URL = "https://api.team-manager.gc.com";
const AUTH_ENDPOINT = "/api/v1/auth/token/refresh"; // Corrected endpoint
const DEVICE_ID = "b1be8358d171ea1f6e037fbde6297e3a";
const WEB_CLIENT_ID = "a0b1b2c8-522d-4b94-a6f5-fbab9342903d";
const WEB_EDEN_AUTH_KEY_B64 = "fWQBLAla8kD+qhuOfDpnKUvl3dy/EOv/+kdJ6Q3sRs0=";

// MongoDB Constants
const MONGO_URL = "mongodb://192.168.10.67:27017";
const MONGO_DB_NAME = "gcdb";
const MONGO_COLLECTION_NAME = "TokenCollection";

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
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
        console.log(`[${new Date().toISOString()}] Connected to MongoDB at ${MONGO_URL}`);
        const db = client.db(MONGO_DB_NAME);
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
        const db = client.db(MONGO_DB_NAME);
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
    res.send('JWT Refresh Proxy Server is running with MongoDB support!');
});

app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
    console.log('CORS enabled for origins: ' + corsOptions.origin.join(', '));
    console.log('Endpoints:');
    console.log(`  GET  http://localhost:${port}/refresh_token (gets/refreshes token from MongoDB)`);
    console.log(`  GET  http://localhost:${port}/ (test endpoint)`);
});

const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// API Constants (mirroring what was in script.js)
const API_URL = "https://api.team-manager.gc.com";
const AUTH_ENDPOINT = "/auth";
const DEVICE_ID = "b1be8358d171ea1f6e037fbde6297e3a";
const WEB_CLIENT_ID = "a0b1b2c8-522d-4b94-a6f5-fbab9342903d";
const WEB_EDEN_AUTH_KEY_B64 = "fWQBLAla8kD+qhuOfDpnKUvl3dy/EOv/+kdJ6Q3sRs0=";

// CORS configuration
// Allow requests from the frontend server (e.g., http://localhost:8000)
const corsOptions = {
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080'], // Added 8080 as common alternative
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json()); // Middleware to parse JSON bodies

// --- Helper functions for signature generation (ported from C# via script.js) ---
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
                propertyArray.push(value ? "True" : "False"); // Match C# bool.ToString()
            } else {
                propertyArray.push(value.toString());
            }
        }
    }
    return propertyArray;
}

function signPayloadNode(context, payload) { // Renamed to avoid conflict if this file was merged with old script.js
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

// --- API Proxy Endpoint ---
app.post('/api/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        console.log(`[${new Date().toISOString()}] Bad Request: Missing refreshToken`);
        return res.status(400).json({ error: 'Missing refreshToken in request body' });
    }

    try {
        const context = {
            nonce: base64Encode(randomString(32)),
            timestamp: getTimestamp(),
            previousSignature: ""
        };

        const payload = { type: "refresh" }; // This is the payload to be signed and sent
        const clientRequestSignature = signPayloadNode(context, payload); // Use the correct function name

        const fullApiUrl = API_URL + AUTH_ENDPOINT;

        const headersToGcApi = {
            'Content-Type': 'application/json',
            'Gc-Signature': `${context.nonce}.${clientRequestSignature}`,
            'Gc-Token': refreshToken,
            'Gc-App-Version': '0.0.0',
            'Gc-Device-Id': DEVICE_ID,
            'Gc-Client-Id': WEB_CLIENT_ID,
            'Gc-App-Name': 'web',
            'Gc-Timestamp': context.timestamp.toString()
        };

        console.log(`[${new Date().toISOString()}] Request to /api/refresh-token with token: ${refreshToken.substring(0,20)}...`);
        console.log(`[${new Date().toISOString()}] Forwarding to GC API (${fullApiUrl}). Headers being sent to GC: Gc-Signature=${headersToGcApi['Gc-Signature'].substring(0,40)}..., Gc-Token=${headersToGcApi['Gc-Token'].substring(0,20)}..., Timestamp=${headersToGcApi['Gc-Timestamp']}`);
        console.log(`[${new Date().toISOString()}] Payload to GC API:`, JSON.stringify(payload));

        const apiResponse = await fetch(fullApiUrl, {
            method: 'POST',
            headers: headersToGcApi,
            body: JSON.stringify(payload) // Send the actual payload
        });

        const responseBodyText = await apiResponse.text();
        let responseBodyJson;

        console.log(`[${new Date().toISOString()}] GC API Response Status: ${apiResponse.status}`);
        // console.log(`[${new Date().toISOString()}] GC API Response Body Text: ${responseBodyText.substring(0, 500)}`);


        if (!apiResponse.ok) {
            console.error(`[${new Date().toISOString()}] Error from GC API: ${apiResponse.status} - ${responseBodyText}`);
            // Try to parse as JSON, but send text if it fails
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
            console.error(`[${new Date().toISOString()}] GC API response was OK but not valid JSON. Status: ${apiResponse.status}, Body: ${responseBodyText}`);
            return res.status(502).json({ error: "Unexpected non-JSON success response from GC API", details: responseBodyText });
        }

        res.status(apiResponse.status).json(responseBodyJson);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Internal proxy error in /api/refresh-token:`, error);
        res.status(500).json({ error: 'Proxy server internal error', details: error.message });
    }
});

// Simple root endpoint for testing if server is up
app.get('/', (req, res) => {
    res.send('JWT Refresh Proxy Server is running!');
});

app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
    console.log('CORS enabled for origins: ' + corsOptions.origin.join(', '));
    console.log('Endpoints:');
    console.log(`  POST http://localhost:${port}/api/refresh-token`);
    console.log(`  GET  http://localhost:${port}/ (test endpoint)`);
});

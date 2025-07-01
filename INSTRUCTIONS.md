# JWT Refresh Token UI with Node.js Proxy - Running Instructions

This project provides a simple web interface to refresh JWT tokens. It uses a Node.js server as a proxy to handle the actual API communication and request signing, bypassing browser CORS limitations.

## Prerequisites

-   **Node.js and npm:** Required to run the proxy server and install dependencies. Download from [https://nodejs.org/](https://nodejs.org/)
-   **Python (optional, for http.server):** A simple way to serve the `index.html` file. Most systems have Python pre-installed. Alternatively, any simple HTTP server can be used (like Node.js `http-server` package).

## Setup

1.  **Clone the repository / Download files:**
    Ensure you have all project files in a single directory:
    *   `index.html`
    *   `style.css`
    *   `script.js`
    *   `server.js`
    *   `package.json`
    *   `package-lock.json` (will be generated after `npm install`)
    *   This `INSTRUCTIONS.md` file.

2.  **Install Node.js Dependencies:**
    Open a terminal or command prompt in the project's root directory (where `package.json` and `server.js` are located) and run:
    ```bash
    npm install
    ```
    This will install `express`, `node-fetch`, and `cors` as defined in `package.json`.

## Running the Application

You need to run **two separate servers** simultaneously in two different terminal windows, both from the project's root directory:

**Terminal 1: Start the Node.js Proxy Server**

   In your terminal, from the project root directory, run:
   ```bash
   node server.js
   ```
   By default, this server will start on `http://localhost:3001`. You should see output like:
   ```
   Proxy server listening at http://localhost:3001
   CORS enabled for origins: http://localhost:8000, http://127.0.0.1:8000, ...
   Endpoints:
     POST http://localhost:3001/api/refresh-token
     GET  http://localhost:3001/ (test endpoint)
   ```

**Terminal 2: Start the Frontend HTTP Server (to serve `index.html`)**

   In a new terminal window, also from the project root directory:

   *   **Using Python 3:**
       ```bash
       python -m http.server 8000
       ```
   *   **Using Python 2:**
       ```bash
       python -m SimpleHTTPServer 8000
       ```
   *   **Alternatively, using Node.js `http-server` (if installed):**
       First, install it globally if you haven't: `npm install -g http-server`
       Then run:
       ```bash
       http-server -p 8000 --cors
       ```
   This will serve the `index.html` file. You should see output indicating it's serving on port 8000.

   *(Note: If port 8000 is in use, you can choose a different port, e.g., 8080. If you do, make sure that port is also listed in the `corsOptions.origin` array in `server.js` and re-start `server.js`.)*

## Using the UI

1.  Once both servers are running, open your web browser and navigate to:
    `http://localhost:8000` (or the port you chose for the frontend server).

2.  You should see the "Refresh JWT Token" interface.

3.  Paste your JWT refresh token into the text area.

4.  Click the "Submit" button.

5.  The `script.js` in your browser will send the token to your local Node.js proxy server (`http://localhost:3001/api/refresh-token`).

6.  The Node.js proxy server will then securely sign the request and forward it to the actual GameChanger API (`https://api.team-manager.gc.com/auth`).

7.  The response from the GameChanger API will be sent back through the proxy to your browser and displayed on the page. You should see the new access and refresh tokens, or an error message if something went wrong.

    Check the console output in both terminal windows for logging information, which can be helpful for debugging.
    *   The Node.js proxy server terminal (`node server.js`) will show logs about requests it receives and forwards.
    *   The frontend server terminal might show basic HTTP request logs.
    *   The browser's developer console (F12) will show logs from `script.js` and any client-side errors.

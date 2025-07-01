#!/bin/sh
# Start both Node.js and Python HTTP servers
node server.js &
python3 -m http.server 8000 &
wait

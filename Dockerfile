# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package.json ./
# If you have a package-lock.json, uncomment the next line and potentially remove the one above for package.json only
# COPY package-lock.json ./

# Install app dependencies
# Using --only=production to ensure only production dependencies are installed.
# If you have a package-lock.json and want to use `npm ci` for faster, more reliable builds:
# RUN npm ci --only=production
RUN apk add --no-cache python3 py3-pip && \
    npm install --omit=dev
# Note: --omit=dev is the equivalent of --only=production for npm v7+ which node:18-alpine should have.
# If using an older npm, use --only=production.

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000
EXPOSE 8000

# Make start.sh executable
RUN chmod +x ./start.sh

# Define the command to run both servers
CMD ["./start.sh"]


# Use the official Node.js 20 image as a base.
FROM node:20-slim

# Set the working directory in the container.
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json from the worker directory.
COPY worker/package*.json ./

# Install dependencies for the worker.
RUN npm install

# Copy the rest of the worker's source code.
COPY worker/. .

# The command to run the worker script.
CMD [ "npm", "run", "worker" ]
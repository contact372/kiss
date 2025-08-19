# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package.json ./

# Install any needed packages
RUN npm install

# Copy the rest of the application's source code
COPY . .

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run poll.js when the container launches
CMD ["node", "poll.js"]

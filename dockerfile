# 1. Base Image: Use a specific, lightweight Node.js version
FROM node:18-slim

# 2. Set working directory
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json (if available)
# This leverages Docker's layer caching. These files don't change often.
COPY worker/package.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of your application's code
COPY worker/poll.js ./

# 6. Command to run the application
CMD [ "node", "poll.js" ]

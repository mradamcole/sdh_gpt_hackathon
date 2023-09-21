# Use an official lightweight Node.js image as a parent image
FROM node:14-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the entire application into the container
COPY . .

# Use a simple HTTP server to serve the application
RUN npm install -g http-server

# Command to run when the container starts
CMD ["http-server", "-p", "8080"]
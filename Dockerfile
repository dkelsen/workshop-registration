FROM node:20-bookworm AS build

# Set working directory in the container
WORKDIR /usr/src/app

# Copy your package.json and package-lock.json (if available) to install dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install
RUN npx -y playwright install --with-deps chromium

# Copy the rest of your application code to the container
COPY . .

# Set the command to start your application
CMD ["npm", "start"]
# Build stage for frontend
FROM node:20 AS frontend-build
WORKDIR /app/svos-ui
COPY svos-ui/package*.json ./
RUN npm install
COPY svos-ui/ ./
RUN npm run build

# Final stage
FROM node:20-slim
WORKDIR /app

# Copy backend dependencies
COPY package*.json ./
RUN npm install --production

# Copy server code
COPY server/ ./server/
# Copy the built frontend from the build stage
COPY --from=frontend-build /app/svos-ui/dist ./svos-ui/dist

# Expose the port (Cloud Run sets PORT env var)
EXPOSE 8080

CMD ["node", "server/index.js"]

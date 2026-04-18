# Build stage for frontend
FROM node:20 AS frontend-build
WORKDIR /app/svos-ui
COPY svos-ui/package*.json ./
RUN npm install

# Build Arguments for Vite (required at build-time)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

# Set ENV from ARGs so Vite can see them
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

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

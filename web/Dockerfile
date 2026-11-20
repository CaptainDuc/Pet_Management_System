# Build stage
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL=/api/v1
ARG VITE_PAYMENT_URL=/api/v1
ARG VITE_NOTIFICATION_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PAYMENT_URL=$VITE_PAYMENT_URL
ENV VITE_NOTIFICATION_URL=$VITE_NOTIFICATION_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Run stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

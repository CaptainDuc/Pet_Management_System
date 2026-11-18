# Build stage
FROM node:20-alpine3.20 AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:8080/api/v1
ARG VITE_PAYMENT_URL=http://localhost:8082/api/v1
ARG VITE_NOTIFICATION_URL=http://localhost:8083/api/v1
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
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

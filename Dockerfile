# ===== Full stack Dockerfile (multi-stage) =====
# 1) Build Angular frontend
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/ema-ecom-frontend/package*.json ./
RUN npm ci || npm install
COPY frontend/ema-ecom-frontend .
RUN npm run build

# 2) Build Spring Boot backend with embedded static SPA
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
# Copy Maven poms
COPY pom.xml ./
COPY backend/pom.xml ./backend/pom.xml
# Pre-fetch dependencies
RUN mvn -q -e -DskipTests dependency:go-offline
# Copy backend sources (standard layout under backend/src)
COPY backend/src ./backend/src
# Place built frontend into resources-static inside backend module
RUN mkdir -p backend/src/main/resources-static
COPY --from=frontend /frontend/dist/ ./backend/src/main/resources-static/
# Build only the backend module
RUN mvn -q -e -DskipTests -pl backend -am package

# 3) Runtime image
FROM eclipse-temurin:21-jre
ENV JAVA_OPTS=""
WORKDIR /app
COPY --from=build /workspace/backend/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]

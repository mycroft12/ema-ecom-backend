# ===== Full stack Dockerfile (multi-stage) =====
# 1) Build Angular frontend
FROM node:20-alpine AS frontend
WORKDIR /workspace
ENV NODE_OPTIONS="--max_old_space_size=2048"
ENV NG_BUILD_MAX_WORKERS=2
COPY frontend ./frontend
RUN if [ -f ./frontend/package.json ]; then \
      cd ./frontend; \
    elif [ -f ./frontend/ema-ecom-frontend/package.json ]; then \
      cd ./frontend/ema-ecom-frontend; \
    else \
      echo "frontend/package.json not found"; \
      exit 1; \
    fi \
 && (npm ci || npm install) \
 && npm run build \
 && if [ ! -d ./dist ]; then \
      echo "dist/ folder not found after build"; \
      exit 1; \
    fi \
 && build_index="$(find ./dist -maxdepth 3 -type f -name index.html | head -n 1)" \
 && if [ -z "$build_index" ]; then \
      echo "index.html not found under dist/"; \
      exit 1; \
    fi \
 && build_dir="$(dirname "$build_index")" \
 && mkdir -p /workspace/frontend-dist \
 && cp -R "$build_dir"/. /workspace/frontend-dist/ \
 && test -f /workspace/frontend-dist/index.html

# 2) Build Spring Boot backend
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
ENV MAVEN_CONFIG=/tmp/.m2
RUN mkdir -p /tmp/.m2
COPY pom.xml ./
COPY backend/pom.xml ./backend/pom.xml
RUN mvn -q -e -DskipTests -Dmaven.repo.local=/tmp/.m2/repository dependency:go-offline
COPY backend/src ./backend/src
RUN mvn -q -e -DskipTests -Dmaven.repo.local=/tmp/.m2/repository -pl backend -am package

# 3) Runtime image: Nginx serves SPA and proxies /api to backend on localhost:8080
FROM nginx:1.27-alpine
RUN apk add --no-cache openjdk21-jre curl
ENV JAVA_OPTS=""
WORKDIR /app
COPY --from=build /workspace/backend/target/*.jar /app/app.jar
COPY --from=frontend /workspace/frontend-dist/ /usr/share/nginx/html/
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN test -f /usr/share/nginx/html/index.html
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]

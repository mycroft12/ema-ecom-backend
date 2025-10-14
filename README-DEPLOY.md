EMA E-commerce Packaging and Deployment Guide

Overview
This repository now contains:
- Backend: Spring Boot app (this directory)
- Frontend: Angular 19 app in frontend/ema-ecom-frontend
- Containerization: Multi-stage Dockerfile to build a single app image and docker-compose.yml to run with Postgres

Quick start (local with Docker)
1) (Optional) Create a .env file at the project root to override defaults (see "Environment variables").
2) Build and run:
   docker compose build
   docker compose up -d
3) Open http://localhost:8080 in your browser (the SPA is served by the backend).
4) Swagger UI: http://localhost:8080/swagger-ui.html

Backend standalone (without Docker)
- Run Postgres locally or via: docker compose up -d db
- Export env variables for prod profile, e.g.:
  export SPRING_PROFILES_ACTIVE=prod
  export DB_URL=jdbc:postgresql://localhost:5432/emaecom
  export DB_USER=ema
  export DB_PASSWORD=ema
  export JWT_SECRET=change_me
  export JWT_ISSUER=ema-ecom
  export CORS_ALLOWED_ORIGINS=http://localhost:4200
- Build & run:
  ./mvnw -DskipTests -pl backend -am package
  java -jar backend/target/*.jar

Frontend dev mode
cd frontend/ema-ecom-frontend
npm install
npm start
- App on http://localhost:4200, proxied to backend at http://localhost:8080

Frontend production build (optional)
cd frontend/ema-ecom-frontend
npm install
npm run build
- Output in dist/ema-ecom-frontend (the Dockerfile already embeds this into the backend at build time)

Production deployment on VPS (compose)
- Ensure Docker is installed
- Copy the repo (or CI artifacts) to the server
- Configure environment via a .env file (see below)
- docker compose build
- docker compose up -d
- Optionally terminate TLS at a reverse-proxy (e.g., Caddy, Nginx, Traefik) in front of the app

Environment variables (.env)
- docker-compose.yml accepts the following variables (with defaults in braces):
  - DB_NAME (emaecom)
  - DB_USER (ema)
  - DB_PASSWORD (ema)
  - DB_PORT (5432)
  - JWT_SECRET (change_me)
  - JWT_ISSUER (ema-ecom)
  - CORS_ALLOWED_ORIGINS (http://localhost)

Example .env
# Database
DB_NAME=emaecom
DB_USER=ema
DB_PASSWORD=super_secret_password
DB_PORT=5432

# Auth / CORS
JWT_SECRET=please_change_me
JWT_ISSUER=ema-ecom
CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:4200

Notes
- .env.example was removed. Create your own .env using the keys above.
- In single-package mode, the backend serves the Angular SPA from classpath:/resources-static/; CORS is typically not needed unless you host the SPA separately.

Config knobs
- application-prod.yml reads these env vars:
  - DB_URL, DB_USER, DB_PASSWORD
  - JWT_SECRET, JWT_ISSUER
  - CORS_ALLOWED_ORIGINS (comma-separated)
- If you deploy the frontend separately (Nginx, etc.), point /api to the backend and ensure CORS is configured.

Security notes
- Keep JWT_SECRET secure (never commit). Rotate if leaked.
- Create an admin user and assign required permissions (e.g., import:configure).


EMA E-commerce Packaging and Deployment Guide

Overview
This repository now contains:
- Backend: Spring Boot app (this directory)
- Frontend: Angular 19 app in frontend/ema-ecom-frontend
- Containerization: Multi-stage Dockerfile to build a single app image and docker-compose.yml to run with Postgres

Quick start (local with Docker)
1) (Optional) Create a .env file at the project root to override defaults (see "Environment variables").
2) Build and run:
   docker compose build
   docker compose up -d
3) Open http://localhost:8080 in your browser (the SPA is served by the backend).
4) Swagger UI: http://localhost:8080/swagger-ui.html

Run both backend and frontend together (Dev)
Option A — One command (shell):
- ./run-dev.sh            # starts backend (Spring Boot) and frontend (Angular dev server)
- ./run-dev.sh --with-db  # also starts Postgres via docker-compose (service: db)
Notes:
- Frontend runs on http://localhost:4200 with proxy to http://localhost:8080 (see proxy.conf.json).
- Backend uses the "dev" profile (application-dev.yml). Adjust DB creds there or pass SPRING_PROFILES_ACTIVE.

Option B — IntelliJ IDEA Compound Run Configuration:
- Open the project in IntelliJ (Ultimate recommended for Angular + Spring).
- The repository provides shared run configurations under .run/:
  - Backend (Spring Boot): runs com.mycroft.ema.ecom.Application with profile "dev".
  - Frontend (npm start): runs npm start in frontend/ema-ecom-frontend.
  - Dev (Backend + Frontend): a Compound configuration to start both.
- In the Run/Debug configurations list, select "Dev (Backend + Frontend)" and click Run.
- If NPM is not configured, set Node interpreter to "Project" and ensure Node is installed.

Backend standalone (without Docker)
- Run Postgres locally or via: docker compose up -d db
- Export env variables for prod profile, e.g.:
  export SPRING_PROFILES_ACTIVE=prod
  export DB_URL=jdbc:postgresql://localhost:5432/emaecom
  export DB_USER=ema
  export DB_PASSWORD=ema
  export JWT_SECRET=change_me
  export JWT_ISSUER=ema-ecom
  export CORS_ALLOWED_ORIGINS=http://localhost:4200
- Build & run:
  ./mvnw -DskipTests -pl backend -am package
  java -jar backend/target/*.jar

Frontend dev mode
cd frontend/ema-ecom-frontend
npm install
npm start
- App on http://localhost:4200, proxied to backend at http://localhost:8080

Frontend production build (optional)
cd frontend/ema-ecom-frontend
npm install
npm run build
- Output in dist/ema-ecom-frontend (the Dockerfile already embeds this into the backend at build time)

Production deployment on VPS (compose)
- Ensure Docker is installed
- Copy the repo (or CI artifacts) to the server
- Configure environment via a .env file (see below)
- docker compose build
- docker compose up -d
- Optionally terminate TLS at a reverse-proxy (e.g., Caddy, Nginx, Traefik) in front of the app

Environment variables (.env)
- docker-compose.yml accepts the following variables (with defaults in braces):
  - DB_NAME (emaecom)
  - DB_USER (ema)
  - DB_PASSWORD (ema)
  - DB_PORT (5432)
  - JWT_SECRET (change_me)
  - JWT_ISSUER (ema-ecom)
  - CORS_ALLOWED_ORIGINS (http://localhost)

Example .env
# Database
DB_NAME=emaecom
DB_USER=ema
DB_PASSWORD=super_secret_password
DB_PORT=5432

# Auth / CORS
JWT_SECRET=please_change_me
JWT_ISSUER=ema-ecom
CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:4200

Notes
- .env.example was removed. Create your own .env using the keys above.
- In single-package mode, the backend serves the Angular SPA from classpath:/resources-static/; CORS is typically not needed unless you host the SPA separately.

Config knobs
- application-prod.yml reads these env vars:
  - DB_URL, DB_USER, DB_PASSWORD
  - JWT_SECRET, JWT_ISSUER
  - CORS_ALLOWED_ORIGINS (comma-separated)
- If you deploy the frontend separately (Nginx, etc.), point /api to the backend and ensure CORS is configured.

Security notes
- Keep JWT_SECRET secure (never commit). Rotate if leaked.
- Create an admin user and assign required permissions (e.g., import:configure).

NEXT PROMPT:

i want you to add an API that can populate the table based on a csv file.
You need to add validations for that.
Frontend : Expose this API inside the card of 
Configure components 
(in our current example Products, 
bellow the reset configuration button)
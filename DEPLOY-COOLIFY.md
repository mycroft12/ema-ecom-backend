# Deploy to Hostinger VPS with Coolify (dashkod.com)

This is a step-by-step guide to deploy this app on a Hostinger VPS using Coolify, with the domain `dashkod.com`.

---

## 1) Point your domain to the VPS

In your DNS provider for `dashkod.com`, add:

- **A record**: `@` → `<your_vps_public_ip>`
- **(Optional) A record**: `www` → `<your_vps_public_ip>`

Wait for DNS propagation (usually minutes, sometimes longer).

---

## 2) Install Coolify on the VPS (skip if already installed)

SSH into the VPS, then run:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Open Coolify in the browser:

```
http://<your_vps_public_ip>:8000
```

Finish the initial setup wizard.

---

## 3) Create a Project in Coolify

- Create a new **Project** (example name: `ema-ecom`).

---

## 4) Add your application (Docker Compose)

- Add a new **Service** → **Docker Compose**.
- Connect your Git repo (GitHub/GitLab) or upload the project.
- Set compose file path to:

```
docker-compose.yml
```

---

## 5) Configure Environment Variables in Coolify

Add these in the Coolify env var panel for the compose service.

### Required

- `APP_MASTER_KEY` → base64 32‑byte key (AES‑256‑GCM)
  - Generate:
    ```bash
    openssl rand -base64 32
    ```

### Recommended

- `JWT_SECRET` → long random string
- `DB_PASSWORD` → strong password
- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` → strong credentials

### Domain‑specific

- `CORS_ALLOWED_ORIGINS=https://dashkod.com`

### Optional (only if you expose MinIO publicly)

- `APP_MINIO_PUBLIC_BASE_URL=https://dashkod.com/minio/ema-ecom`
- `MINIO_BIND_ADDRESS=0.0.0.0`
- `MINIO_CONSOLE_BIND_ADDRESS=0.0.0.0`

---

## 6) Attach your domain in Coolify

- In the app service, add a domain:
  - `dashkod.com`
- Make sure it points to the **app** service on port `8080`.
- Enable **SSL** (Let’s Encrypt) in Coolify.

---

## 7) Deploy

- Click **Deploy/Build** in Coolify.
- Wait for all containers to become healthy.

---

## 8) Verify

- App: `https://dashkod.com`
- Swagger UI: `https://dashkod.com/swagger-ui.html`

---

## Notes

- If you want `www.dashkod.com`, add that domain in Coolify too and enable SSL.
- If you want MinIO behind its own subdomain (e.g., `minio.dashkod.com`), set it up in Coolify and update `APP_MINIO_PUBLIC_BASE_URL`.

---

## 9) If HTTPS does not work (Coolify Proxy routing fix)

If the proxy logs show:

```
Host(``) && PathPrefix(`dashkod.com`)
```

Coolify is treating the domain as a path. Fix it by forcing host/path in compose.

**Update docker-compose.yml (app service env):**

```
SERVICE_FQDN_APP: ${SERVICE_FQDN_APP:-dashkod.com}
SERVICE_URL_APP: ${SERVICE_URL_APP:-/}
```

Then:

1) Commit + push the change
2) Coolify → App → **Reload Compose File**
3) **Redeploy**
4) Servers → localhost → Proxy → **Restart**

Expected proxy rule after fix:

```
Host(`dashkod.com`) && PathPrefix(`/`)
```

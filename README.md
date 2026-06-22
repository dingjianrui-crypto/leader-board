# Leader Board

Leader Board is a Next.js application for comparing offline video model outputs. It stores relational data in SQLite and stores uploaded files through a storage adapter. The default storage adapter uses the local filesystem; production can also use Volcengine TOS object storage.

## Linux VM Deployment

This guide deploys the app as a daemon service on a Linux VM with `systemd`.

### 1. Prerequisites

- Linux VM with a persistent disk.
- Node.js 20 or newer.
- npm.
- A non-root deploy user, for example `leaderboard`.
- Optional: a reverse proxy such as Nginx or Caddy for HTTPS.

Example directories:

```bash
sudo useradd --system --create-home --shell /bin/bash leaderboard
sudo mkdir -p /opt/leader-board /var/lib/leader-board/uploads
sudo chown -R leaderboard:leaderboard /opt/leader-board /var/lib/leader-board
```

Use `/var/lib/leader-board` or another persistent disk mount for SQLite and local uploads. Do not place the database under a temporary build directory.

### 2. Copy The App

Clone or copy the repository to the VM:

```bash
sudo -u leaderboard git clone <repo-url> /opt/leader-board
cd /opt/leader-board
```

Install dependencies and build:

```bash
sudo -u leaderboard npm ci
sudo -u leaderboard npm run build
```

The app uses `output: "standalone"` in `next.config.ts`, so production should run `.next/standalone/server.js`.

If you deploy only build artifacts instead of the full repository, copy these paths to the same release directory:

```bash
.next/standalone
.next/static
public  # only if this directory exists in your checkout
drizzle
package.json
.env
```

### 3. Configure Environment

Create `/opt/leader-board/.env`:

```bash
sudo -u leaderboard cp /opt/leader-board/.env.example /opt/leader-board/.env
sudo -u leaderboard nano /opt/leader-board/.env
```

Recommended SQLite config:

```bash
DATABASE_URL=file:/var/lib/leader-board/leader-board.sqlite
MAX_UPLOAD_BYTES=52428800
```

For local filesystem uploads:

```bash
STORAGE_PROVIDER=local
UPLOAD_ROOT=/var/lib/leader-board/uploads
```

For Volcengine TOS object storage:

```bash
STORAGE_PROVIDER=object_store
TOS_ACCESS_KEY_ID=your_access_key_id
TOS_ACCESS_KEY_SECRET=your_access_key_secret
TOS_BUCKET=your_bucket_name
TOS_ENDPOINT=tos-cn-beijing.volces.com
TOS_REGION=cn-beijing
TOS_PUBLIC_BASE_URL=
TOS_STS_TOKEN=
```

Use the endpoint for the bucket region. Do not use a TOS Vector endpoint such as `tosvectors-*`; uploaded media uses standard TOS object APIs.
Object-store uploads are saved with `public-read` object ACL, and media previews use the direct public object URL. Leave `TOS_PUBLIC_BASE_URL` empty to use `https://<bucket>.<endpoint>/<object-key>`, or set it to a custom bucket domain/CDN origin.

### 4. Initialize The Database Schema

The app creates the SQLite file and parent directory automatically when it opens the database, but it does not create tables automatically. Run migrations once before starting the service:

```bash
cd /opt/leader-board
sudo -u leaderboard npm run db:migrate
```

Run the same command after future deployments that include new files under `drizzle/`.

### 5. Run Manually First

Before creating the daemon, start the app once from the shell:

```bash
cd /opt/leader-board
sudo -u leaderboard PORT=3000 HOSTNAME=127.0.0.1 node .next/standalone/server.js
```

In another shell:

```bash
curl -I http://127.0.0.1:3000/compare
```

Stop the manual process after the check.

### 6. Create A systemd Service

Create `/etc/systemd/system/leader-board.service`:

```ini
[Unit]
Description=Leader Board Next.js app
After=network.target

[Service]
Type=simple
User=leaderboard
Group=leaderboard
WorkingDirectory=/opt/leader-board
EnvironmentFile=/opt/leader-board/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node /opt/leader-board/.next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable leader-board
sudo systemctl start leader-board
sudo systemctl status leader-board
```

View logs:

```bash
sudo journalctl -u leader-board -f
```

### 7. Reverse Proxy

Expose the service through Nginx, Caddy, or another reverse proxy. The app should listen on localhost and the reverse proxy should handle TLS.

Minimal Nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 8. Updating The Deployment

For a new release:

```bash
cd /opt/leader-board
sudo -u leaderboard git pull
sudo -u leaderboard npm ci
sudo -u leaderboard npm run build
sudo -u leaderboard npm run db:migrate
sudo systemctl restart leader-board
```

Check status and logs after restart:

```bash
sudo systemctl status leader-board
sudo journalctl -u leader-board -n 100 --no-pager
```

### 9. Backup Notes

If using local uploads, back up both of these together from the same time window:

- SQLite database: `/var/lib/leader-board/leader-board.sqlite`
- Upload directory: `/var/lib/leader-board/uploads`

If using TOS object storage, back up the SQLite database and ensure bucket lifecycle/versioning matches your retention needs.

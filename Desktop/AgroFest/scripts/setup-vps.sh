#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
APP_USER="${APP_USER:-ubuntu}"
REPO_URL="${REPO_URL:-}"

if [[ -z "${REPO_URL}" ]]; then
  echo "Usage: REPO_URL=https://github.com/OWNER/REPO.git sudo -E bash scripts/setup-vps.sh"
  exit 1
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl git gnupg ufw nginx certbot python3-certbot-nginx

sudo install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
  sudo chmod a+r /etc/apt/keyrings/docker.asc
fi

if [[ ! -f /etc/apt/sources.list.d/docker.list ]]; then
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
fi

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "${APP_USER}"
sudo systemctl enable --now docker
sudo systemctl enable --now nginx

sudo mkdir -p "${APP_DIR}" /opt/backups
sudo chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}" /opt/backups
sudo chmod 755 "${APP_DIR}" /opt/backups

if [[ ! -d "${APP_DIR}/.git" ]]; then
  sudo -u "${APP_USER}" git clone "${REPO_URL}" "${APP_DIR}"
fi

if [[ ! -f /swapfile ]]; then
  if ! swapon --show | grep -q .; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
  fi
fi

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

sudo cp "${APP_DIR}/nginx/default.conf" /etc/nginx/sites-available/agrofest
sudo ln -sfn /etc/nginx/sites-available/agrofest /etc/nginx/sites-enabled/agrofest
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

df -h /
free -h
docker --version
docker compose version

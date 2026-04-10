#!/usr/bin/env python3
import argparse
import os
import posixpath
import shlex
import sys
import tempfile
import time
from pathlib import Path

import paramiko


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy frontend dist via SSH (paramiko).")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--local-dist", required=True)
    parser.add_argument("--remote-root", default="/www/wwwroot/perler-beads")
    parser.add_argument("--domain", default="app-pd.shop888.vip")
    parser.add_argument("--api-upstream", default="http://127.0.0.1:8012")
    return parser.parse_args()


def sftp_mkdir_p(sftp: paramiko.SFTPClient, remote_dir: str) -> None:
    parts = remote_dir.strip("/").split("/")
    curr = "/"
    for p in parts:
        curr = posixpath.join(curr, p)
        try:
            sftp.stat(curr)
        except IOError:
            sftp.mkdir(curr)


def sftp_put_dir(sftp: paramiko.SFTPClient, local_dir: Path, remote_dir: str) -> None:
    sftp_mkdir_p(sftp, remote_dir)
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir.as_posix())
        remote_curr = remote_dir if rel == "." else posixpath.join(remote_dir, rel.replace("\\", "/"))
        sftp_mkdir_p(sftp, remote_curr)
        for d in dirs:
            sftp_mkdir_p(sftp, posixpath.join(remote_curr, d))
        for f in files:
            local_file = os.path.join(root, f)
            remote_file = posixpath.join(remote_curr, f)
            sftp.put(local_file, remote_file)


def exec_cmd(ssh: paramiko.SSHClient, command: str) -> tuple[int, str, str]:
    stdin, stdout, stderr = ssh.exec_command(command)
    out = stdout.read().decode("utf-8", "ignore")
    err = stderr.read().decode("utf-8", "ignore")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def exec_cmd_pty(ssh: paramiko.SSHClient, command: str) -> tuple[int, str, str]:
    stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
    out = stdout.read().decode("utf-8", "ignore")
    err = stderr.read().decode("utf-8", "ignore")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def sudo_bash(command: str, password: str) -> str:
    quoted_password = shlex.quote(password)
    quoted_command = shlex.quote(command)
    return f"printf '%s\\n' {quoted_password} | sudo -S -p '' bash -lc {quoted_command}"


def main() -> int:
    args = parse_args()
    local_dist = Path(args.local_dist).resolve()
    if not local_dist.exists():
        print(f"[ERR] local dist not found: {local_dist}")
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname=args.host, username=args.user, password=args.password, timeout=15)
    sftp = ssh.open_sftp()

    ts = int(time.time())
    remote_tmp = f"/home/{args.user}/deploy_dist_{ts}"
    print(f"[INFO] upload to temp: {remote_tmp}")
    sftp_put_dir(sftp, local_dist, remote_tmp)

    nginx_http_conf = f"""
server {{
    listen 80;
    server_name {args.domain};
    root {args.remote_root};
    index index.html;

    location /.well-known/acme-challenge/ {{
        root {args.remote_root};
        allow all;
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    location /assets {{
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}

    location /api {{
        proxy_pass {args.api_upstream};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location /thumbnails {{
        proxy_pass {args.api_upstream};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location /finished-works {{
        proxy_pass {args.api_upstream};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}
""".strip()
    nginx_https_conf = f"""
server {{
    listen 80;
    server_name {args.domain};
    root {args.remote_root};

    location /.well-known/acme-challenge/ {{
        root {args.remote_root};
        allow all;
    }}

    location / {{
        return 301 https://$host$request_uri;
    }}
}}

server {{
    listen 443 ssl;
    http2 on;
    server_name {args.domain};
    root {args.remote_root};
    index index.html;

    ssl_certificate /etc/letsencrypt/live/{args.domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{args.domain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=31536000" always;
    error_page 497 https://$host$request_uri;

    location /.well-known/acme-challenge/ {{
        root {args.remote_root};
        allow all;
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    location /assets {{
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}

    location /api {{
        proxy_pass {args.api_upstream};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location /thumbnails {{
        proxy_pass {args.api_upstream};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location /finished-works {{
        proxy_pass {args.api_upstream};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}
""".strip()
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", suffix=".conf") as f:
        f.write(nginx_http_conf + "\n")
        local_http_conf_tmp = f.name
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", suffix=".conf") as f:
        f.write(nginx_https_conf + "\n")
        local_https_conf_tmp = f.name

    remote_http_conf_tmp = f"/home/{args.user}/{args.domain}.http.conf"
    remote_https_conf_tmp = f"/home/{args.user}/{args.domain}.https.conf"
    sftp.put(local_http_conf_tmp, remote_http_conf_tmp)
    sftp.put(local_https_conf_tmp, remote_https_conf_tmp)
    os.unlink(local_http_conf_tmp)
    os.unlink(local_https_conf_tmp)

    remote_conf = f"/www/server/panel/vhost/nginx/{args.domain}.conf"
    deploy_http_cmd = f"""
set -e
mkdir -p {args.remote_root}
if [ -d {args.remote_root} ]; then
  cp -a {args.remote_root} {args.remote_root}_backup_{ts} || true
fi
rsync -a --delete {remote_tmp}/ {args.remote_root}/
cp {remote_http_conf_tmp} {remote_conf}
nginx -t
nginx -s reload
""".strip()
    code, out, err = exec_cmd_pty(ssh, sudo_bash(deploy_http_cmd, args.password))
    print(out)
    if err.strip():
        print(err)
    if code != 0:
        print(f"[ERR] http deploy failed with code {code}")
        return code

    certbot_cmd = f"""
set -e
mkdir -p {args.remote_root}/.well-known/acme-challenge
certbot certonly --webroot -w {args.remote_root} -d {args.domain} --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring
cp {remote_https_conf_tmp} {remote_conf}
nginx -t
nginx -s reload
rm -rf {remote_tmp}
""".strip()
    code, out, err = exec_cmd_pty(ssh, sudo_bash(certbot_cmd, args.password))
    print(out)
    if err.strip():
        print(err)
    if code != 0:
        print(f"[ERR] https deploy failed with code {code}")
        return code

    check_cmd = f"curl -I -sS http://127.0.0.1 -H 'Host: {args.domain}' | head -n 5 && echo ---- && curl -k -I -sS https://127.0.0.1 -H 'Host: {args.domain}' | head -n 8"
    code, out, err = exec_cmd(ssh, check_cmd)
    print("[INFO] nginx host check:")
    print(out)
    if err.strip():
        print(err)

    sftp.close()
    ssh.close()
    print("[OK] deploy completed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

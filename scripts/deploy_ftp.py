#!/usr/bin/env python3
"""Mirror site/dist to Libyan Spider over explicit FTPS (TLS on port 21).

Reads FTP_HOST, FTP_USER, FTP_PASS and optionally FTP_DIR from ../.deploy.env (gitignored).
Uploads every built file, then removes stale files from the folders the build owns
(assets/, img/, en/, fr/, zh/, ja/). Never touches api/config.php, .well-known/ or cgi-bin/.
"""
import ftplib
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "site" / "dist"
OWNED_DIRS = ["assets", "img", "en", "fr", "zh", "ja"]
NEVER_TOUCH = {"api/config.php"}


def load_env():
    env_file = ROOT / ".deploy.env"
    if not env_file.exists():
        sys.exit("Create .deploy.env with FTP_HOST, FTP_USER, FTP_PASS (and optional FTP_DIR).")
    env = {}
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    for k in ("FTP_HOST", "FTP_USER", "FTP_PASS"):
        if not env.get(k):
            sys.exit(f"{k} is missing in .deploy.env")
    return env


def ensure_dir(ftp, path):
    cur = ""
    for part in path.split("/"):
        cur = f"{cur}/{part}" if cur else part
        try:
            ftp.mkd(cur)
        except ftplib.error_perm:
            pass  # already exists


def remote_files(ftp, folder):
    try:
        return [n for n in ftp.nlst(folder) if not n.endswith(("/.", "/.."))]
    except ftplib.error_perm:
        return []


def main():
    if not (DIST / "index.html").exists():
        sys.exit("site/dist is empty. Run the build first.")
    env = load_env()
    ftp = ftplib.FTP_TLS(env["FTP_HOST"], timeout=60)
    ftp.login(env["FTP_USER"], env["FTP_PASS"])
    ftp.prot_p()  # encrypt the data channel too
    base = env.get("FTP_DIR", "").strip("/")
    if base:
        ftp.cwd(base)

    local = sorted(p.relative_to(DIST).as_posix() for p in DIST.rglob("*") if p.is_file() and p.name != ".DS_Store")
    for rel in local:
        if rel in NEVER_TOUCH:
            continue
        if "/" in rel:
            ensure_dir(ftp, rel.rsplit("/", 1)[0])
        with open(DIST / rel, "rb") as fh:
            ftp.storbinary(f"STOR {rel}", fh)
        print("up ", rel)

    keep = set(local)
    for folder in OWNED_DIRS:
        for name in remote_files(ftp, folder):
            rel = name if name.startswith(folder + "/") else f"{folder}/{os.path.basename(name)}"
            if rel not in keep:
                try:
                    ftp.delete(rel)
                    print("del", rel)
                except ftplib.error_perm:
                    pass  # a sub-folder or already gone
    ftp.quit()
    print(f"Deployed {len(local)} files.")


if __name__ == "__main__":
    main()

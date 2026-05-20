import csv
import time
import sys

try:
    import httpx
    def post(url, json):
        r = httpx.post(url, json=json, timeout=15)
        return r.status_code, r.json() if r.content else {}
except ImportError:
    import urllib.request, urllib.error, json as _json
    def post(url, payload):
        data = _json.dumps(payload).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.status, _json.loads(r.read())
        except urllib.error.HTTPError as e:
            body = {}
            try:
                body = _json.loads(e.read())
            except Exception:
                pass
            return e.code, body

ENVIRONMENTS = {
    "local":      "http://localhost:8000/api/v1/auth/register",
    # "production": "https://ealixir-reput-production.up.railway.app/api/v1/auth/register",
    # "develop":    "https://ealixir-reput-develop.up.railway.app/api/v1/auth/register",
}
CSV_FILE = "accounts.csv"
DELAY = 0.5  # seconds between requests

def register_all(rows, env_name, api_url):
    print(f"\n{'='*60}")
    print(f"  {env_name.upper()}: {api_url}")
    print(f"{'='*60}")
    success, failed = 0, 0

    for i, row in enumerate(rows, 1):
        email = row.get("email", "").strip()
        password = row.get("password", "").strip()

        if not email or not password:
            print(f"[{i}/{len(rows)}] SKIP    — missing email or password")
            failed += 1
            continue

        status, body = post(api_url, {"email": email, "password": password})

        if status == 201:
            print(f"[{i}/{len(rows)}] OK      {email}")
            success += 1
        elif status == 409:
            print(f"[{i}/{len(rows)}] EXISTS  {email} — already registered")
            failed += 1
        elif status == 422:
            detail = body.get("detail", body)
            print(f"[{i}/{len(rows)}] INVALID {email} — {detail}")
            failed += 1
        else:
            detail = body.get("detail", body)
            print(f"[{i}/{len(rows)}] ERROR   {email} — HTTP {status}: {detail}")
            failed += 1

        if i < len(rows):
            time.sleep(DELAY)

    print(f"\n  Result: {success} registered, {failed} failed out of {len(rows)} accounts.")
    return success, failed

def main():
    try:
        with open(CSV_FILE, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except FileNotFoundError:
        print(f"ERROR: {CSV_FILE} not found.")
        sys.exit(1)

    for env_name, api_url in ENVIRONMENTS.items():
        register_all(rows, env_name, api_url)

if __name__ == "__main__":
    main()

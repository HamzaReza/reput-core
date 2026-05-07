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
            try: body = _json.loads(e.read())
            except Exception: pass
            return e.code, body

ENVIRONMENTS = {
    "local":      "http://localhost:8000/api/v1/auth/register-operator",
    "develop":    "https://ealixir-reput-develop.up.railway.app/api/v1/auth/register-operator",
    "production": "https://ealixir-reput-production.up.railway.app/api/v1/auth/register-operator",
}

OPERATORS = [
    {"name": "Operator 1", "email": "Operator1@test.com", "password": "Operator12345"},
    {"name": "Operator 2", "email": "Operator2@test.com", "password": "Operator12345"},
    {"name": "Operator 3", "email": "Operator3@test.com", "password": "Operator12345"},
    {"name": "Operator 4", "email": "Operator4@test.com", "password": "Operator12345"},
    {"name": "Operator 5", "email": "Operator5@test.com", "password": "Operator12345"},
]

def register_all(env_name, api_url):
    print(f"\n{'='*60}")
    print(f"  {env_name.upper()}: {api_url}")
    print(f"{'='*60}")
    success, failed = 0, 0
    for i, op in enumerate(OPERATORS, 1):
        status, body = post(api_url, op)
        if status == 201:
            print(f"[{i}/{len(OPERATORS)}] OK      {op['email']}")
            success += 1
        elif status == 409:
            print(f"[{i}/{len(OPERATORS)}] EXISTS  {op['email']} — already registered")
            failed += 1
        else:
            print(f"[{i}/{len(OPERATORS)}] ERROR   {op['email']} — HTTP {status}: {body.get('detail', body)}")
            failed += 1
        if i < len(OPERATORS):
            time.sleep(0.3)
    print(f"\n  Result: {success} created, {failed} skipped/failed out of {len(OPERATORS)} operators.")

def main():
    for env_name, api_url in ENVIRONMENTS.items():
        register_all(env_name, api_url)

if __name__ == "__main__":
    main()

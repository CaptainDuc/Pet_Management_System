"""Read-only Docker stack checks. Run: python scripts/check-services.py"""

import json
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


failures = 0
checks = 0


def check(url, expected_status=200, *, field=None, value=None, origin=None):
    global failures, checks
    checks += 1
    headers = {}
    if origin:
        headers = {
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
    request = Request(url, headers=headers, method="OPTIONS" if origin else "GET")
    started = time.monotonic()
    try:
        try:
            response = urlopen(request, timeout=15)
        except HTTPError as error:
            response = error
        with response:
            body = response.read()
            if response.status != expected_status:
                raise ValueError(f"HTTP {response.status}, expected {expected_status}")
            if field:
                actual = json.loads(body).get(field)
                if actual != value:
                    raise ValueError(f"{field}={actual!r}, expected {value!r}")
            if origin and expected_status == 200:
                allowed = response.headers.get_all("Access-Control-Allow-Origin")
                if allowed != [origin]:
                    raise ValueError(f"CORS origins={allowed!r}")
        print(f"PASS {time.monotonic() - started:.3f}s {url}" +
              (f" Origin={origin}" if origin else ""))
    except (OSError, URLError, ValueError) as error:
        failures += 1
        print(f"FAIL {url}: {error}")


for port in (8080, 8082, 8083, 8000):
    check(f"http://localhost:{port}/actuator/health", field="status", value="UP")

for port in (8001, 8002, 8003, 8004):
    check(f"http://localhost:{port}/openapi.json", field="openapi", value="3.1.0")

for port in (80, 3000):
    check(f"http://localhost:{port}/")
    check(f"http://localhost:{port}/api/v1/services", field="success", value=True)
    check(f"http://localhost:{port}/api/v1/notifications", 401,
          field="success", value=False)
    check(f"http://localhost:{port}/api/v1/orders/service-health-check/status", 401)

for port in (8080, 8000):
    base = f"http://localhost:{port}"
    check(f"{base}/api/v1/services", field="success", value=True)
    check(f"{base}/api/v1/branches", field="success", value=True)
    check(f"{base}/api-docs", field="openapi", value="3.0.1")
    check(f"{base}/api-docs/swagger-config", field="url", value="/api-docs")
    # A protected endpoint must reject a request without a bearer token.
    check(f"{base}/api/v1/pets", 401, field="success", value=False)
    check(f"{base}/api/v1/internal/bookings/00000000-0000-0000-0000-000000000000/payable",
          401, field="status", value=401)
    for origin in ("http://localhost", "http://localhost:3000",
                   "http://127.0.0.1", "http://127.0.0.1:3000"):
        check(f"{base}/api/v1/auth/login", origin=origin)
    check(f"{base}/api/v1/auth/login", 403, origin="https://untrusted.example")

# Exercise gateway routes without creating orders or notifications.
for port in (8083, 8000):
    check(f"http://localhost:{port}/api/v1/notifications", 401,
          field="success", value=False)
for port in (8082, 8000):
    check(f"http://localhost:{port}/api/v1/orders/service-health-check/status", 401)

print(f"\n{checks - failures}/{checks} checks passed")
sys.exit(1 if failures else 0)

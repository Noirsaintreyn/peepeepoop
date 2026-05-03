# Testing the peepeepoop Backend

## Prerequisites

### Python Dependencies
```bash
pip install flask flask-cors yfinance pandas numpy scikit-learn hdbscan scipy "arch>=6.3.0" statsmodels
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Note: If you get numpy dtype size mismatch errors with `arch`, reinstall it:
```bash
pip install --force-reinstall arch
```

## Running the Backend

The Flask backend runs on port 5001:
```bash
python backend.py
```

Database is SQLite (`users.db`) and auto-initializes on startup with test accounts.

### Test Accounts
- Admin: `rey` / `flood`
- Test user 1: `test1` / `pw`
- Test user 2: `test2` / `pw`

## Auth Flow

The backend uses Flask session cookies. Most API endpoints require authentication via `require_auth()` which checks `session['user_id']`.

To authenticate via curl:
```bash
curl -c /tmp/cookies.txt -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rey","password":"flood"}'
```

Then use `-b /tmp/cookies.txt` on subsequent requests.

## Testing the Backtest API

The backtest endpoint is `POST /api/backtest`. It requires auth.

```bash
# Levels only (fastest)
curl -b /tmp/cookies.txt -X POST http://localhost:5001/api/backtest \
  -H "Content-Type: application/json" \
  -d '{"ticker":"SPY","timeframe":"1d","mode":"levels","max_eval_points":3}'

# HOD/LOD only
curl -b /tmp/cookies.txt -X POST http://localhost:5001/api/backtest \
  -H "Content-Type: application/json" \
  -d '{"ticker":"SPY","timeframe":"1d","mode":"hodlod","max_eval_points":3}'

# Full (both levels + HOD/LOD)
curl -b /tmp/cookies.txt -X POST http://localhost:5001/api/backtest \
  -H "Content-Type: application/json" \
  -d '{"ticker":"SPY","timeframe":"1d","mode":"full","max_eval_points":3}'
```

Use `max_eval_points: 3` for quick tests. Higher values (10-100) take much longer.

## Testing the Frontend UI

The `backtest.html` page is a standalone static file. Flask does NOT serve static files by default. To test the frontend alongside the backend:

1. Create a temporary wrapper that serves static files from the same Flask port:
```python
# /tmp/test_server.py
import sys
sys.path.insert(0, '/path/to/repo')
from backend import app
from flask import send_from_directory

@app.route('/backtest.html')
def serve_backtest():
    return send_from_directory('/path/to/repo', 'backtest.html')

@app.route('/backtest-frontend.js')
def serve_js():
    return send_from_directory('/path/to/repo', 'backtest-frontend.js')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

2. Start the server: `python /tmp/test_server.py`
3. Login via browser DevTools console (F12 > Console):
```javascript
fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({username: 'rey', password: 'flood'})
}).then(r => r.json()).then(d => console.log(d));
```
4. Navigate to `http://localhost:5001/backtest.html`
5. Set max eval points to a small number (3-5) and click Run Backtest

### Important: Cross-Origin Issues
The frontend must be served from the same origin as the backend (port 5001) for session cookies to work. CORS is configured for `localhost:5173` and `localhost:3000` but `SameSite=Lax` in dev mode blocks cross-origin POST with credentials. Serving from the same origin avoids this.

## Common Issues

- **`arch` numpy dtype mismatch**: Reinstall arch with `pip install --force-reinstall arch`
- **`browser_console` tool not working**: Use F12 to open DevTools manually, click in the Console input area, and type JavaScript commands directly
- **DeepSupp/TDA showing 0 levels**: These require pre-trained models (deepsupp_v4.pt) or optional dependencies (ripser/persim) that may not be installed
- **Backtest taking too long**: Use `max_eval_points: 3` for quick tests. Full mode with 100 points can take several minutes

## Devin Secrets Needed

No secrets are required for local testing. The backend uses hardcoded test accounts.

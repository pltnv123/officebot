# WebStudio Live Run Contract

## Overview

Live Run allows executing scripts with real-time output streaming via Server-Sent Events (SSE).

## Endpoints

### 1. Start Live Run

**POST** `/api/demo/webstudio-order/project-artifact/:artifactId/run-live`

**Request Body:**
```json
{
  "edited_source": "optional Python source code string",
  "save_edited": false
}
```

**Response (201):**
```json
{
  "ok": true,
  "run_id": "ws-live-run-1746432000000-a1b2c3d4",
  "events_url": "/api/demo/webstudio-order/project-artifact/ws-artifact-123/run-live/ws-live-run-1746432000000-a1b2c3d4/events",
  "stop_url": "/api/demo/webstudio-order/project-artifact/ws-artifact-123/run-live/ws-live-run-1746432000000-a1b2c3d4/stop"
}
```

**Errors:**
- `404 artifact_not_found` — artifact doesn't exist
- `400 live_run_only_for_script` — artifact is not a script project type
- `500` — internal server error

---

### 2. Subscribe to Events (SSE)

**GET** `/api/demo/webstudio-order/project-artifact/:artifactId/run-live/:runId/events`

**Response Headers:**
```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

**Event Types:**

| Event | Data Fields | Description |
|-------|-------------|-------------|
| `started` | `run_id`, `command`, `status`, `source_mode`, `version_id` | Process started |
| `stdout` | `chunk` | Stdout output chunk |
| `stderr` | `chunk` | Stderr output chunk |
| `done` | `exit_code`, `duration_ms`, `status` | Process completed |
| `stopping` | `message` | Stop requested |
| `error` | `message` | Error occurred |
| `connected` | `run_id` | SSE connection established |

**Example SSE Stream:**
```
event: started
data: {"type":"started","run_id":"ws-live-run-...","command":"python3 -u script.py","status":"running","source_mode":"saved_version","version_id":"v1"}

event: stdout
data: {"type":"stdout","chunk":"Hello World\n"}

event: done
data: {"type":"done","exit_code":0,"duration_ms":150,"status":"ok"}
```

**Errors:**
- `404` — run not found (with SSE error event)

---

### 3. Stop Live Run

**POST** `/api/demo/webstudio-order/project-artifact/:artifactId/run-live/:runId/stop`

**Response:**
```json
{
  "ok": true,
  "run_id": "ws-live-run-1746432000000-a1b2c3d4"
}
```

**Response (already stopped):**
```json
{
  "ok": true,
  "run_id": "ws-live-run-1746432000000-a1b2c3d4",
  "already_done": true
}
```

**Errors:**
- `run_not_found` — run doesn't exist or already cleaned up

---

## Source Modes

| Mode | Description |
|------|-------------|
| `saved_version` | Running current saved script.py from artifact |
| `saved_edited` | Running saved edited source (after save) |
| `edited_unsaved` | Running temporary unsaved edited source |

---

## Run Status Values

| Status | Description |
|--------|-------------|
| `running` | Process is executing |
| `ok` | Completed successfully (exit code 0) |
| `failed` | Completed with error (non-zero exit code) |
| `stopped` | Stopped by user request |

---

## Client Integration Example

```javascript
// Start live run
const startResp = await fetch(`/api/demo/webstudio-order/project-artifact/${artifactId}/run-live`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
const { run_id, events_url } = await startResp.json();

// Subscribe to SSE
const eventSource = new EventSource(events_url);
eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  if (event.type === 'stdout') console.log(event.chunk);
  if (event.type === 'done') eventSource.close();
};

// Stop if needed
await fetch(`${events_url.replace('/events', '/stop')}`, { method: 'POST' });
```

---

## Implementation Files

- `backend/controlPlane/services/webStudio/webStudioLiveRunService.js` — core service
- `backend/webStudioDemoServer.js` — HTTP endpoints
- `backend/webStudioDemoPage.js` — UI panel
- `scripts/webstudio-live-run-smoke.js` — smoke test

---

## Testing

Run smoke test:
```bash
cd /home/antonbot/.openclaw/workspace/office
node scripts/webstudio-live-run-smoke.js
```

Expected output:
```
✅ All live run checks passed!
```

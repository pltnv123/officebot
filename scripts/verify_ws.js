const WebSocket = require('ws');
const endpoint = process.env.WS_ENDPOINT || 'ws://127.0.0.1:8787/ws';
const ws = new WebSocket(endpoint);
const timeout = setTimeout(() => { console.error('FAIL: timeout no message'); process.exit(1); }, 10000);
let hasState=false;
ws.on('open', () => {
  console.log('PASS: connected to endpoint');
  console.log('[verify_ws] connected to', endpoint);
  ws.send(JSON.stringify({ type: 'ping' }));
  console.log('PASS: ping sent');
});
ws.on('message', (msg) => {
  clearTimeout(timeout);
  try {
    const payload = JSON.parse(msg.toString());
    console.log('PASS: state message received', payload);
  } catch (err) {
    console.error('FAIL: invalid message payload', err.message);
    process.exit(1);
  }
  clearTimeout(timeout);
  console.log('[verify_ws] message', msg.toString().slice(0, 256));
  hasState=true;
  ws.close();
});
ws.on('close', () => {
  if (!hasState) {
    console.error('[verify_ws] closed without state message');
    process.exit(1);
  } else {
    console.log('[verify_ws] state message received, closing');
    process.exit(0);
  }
});
ws.on('error', (err) => {
  console.error('[verify_ws] error', err.message);
  process.exit(1);
});
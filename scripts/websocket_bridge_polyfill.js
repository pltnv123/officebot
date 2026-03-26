window.__officeWebSocket = {
  target: null,
  ws: null,
  heartbeat: null,
};
window.WebSocketSetTarget = function(targetPtr) {
  const target = targetPtr && targetPtr.toString ? targetPtr.toString() : targetPtr;
  window.__officeWebSocket.target = target;
};
window.WebSocketConnect = function(urlPtr) {
  const url = urlPtr && urlPtr.toString ? urlPtr.toString() : urlPtr;
  if (window.__officeWebSocket.ws) {
    window.__officeWebSocket.ws.close();
  }
  window.__officeWebSocket.ws = new WebSocket(url);
  window.__officeWebSocket.ws.onopen = function() {
    if (window.__officeWebSocket.target && window.unityInstance) {
      window.unityInstance.SendMessage(window.__officeWebSocket.target, 'OnWSOpen', '');
    }
    window.__officeWebSocket.heartbeat = setInterval(function() {
      if (window.__officeWebSocket.target && window.unityInstance) {
        window.unityInstance.SendMessage(window.__officeWebSocket.target, 'OnJsHeartbeat', Date.now().toString());
      }
    }, 5000);
  };
  window.__officeWebSocket.ws.onmessage = function(event) {
    if (window.__officeWebSocket.target && window.unityInstance) {
      const payload = typeof event.data === 'string' ? event.data : '';
      window.unityInstance.SendMessage(window.__officeWebSocket.target, 'OnWSMessage', payload);
    }
  };
  window.__officeWebSocket.ws.onclose = function() {
    if (window.__officeWebSocket.heartbeat) {
      clearInterval(window.__officeWebSocket.heartbeat);
      window.__officeWebSocket.heartbeat = null;
    }
    if (window.__officeWebSocket.target && window.unityInstance) {
      window.unityInstance.SendMessage(window.__officeWebSocket.target, 'OnWSClose', '');
    }
  };
  window.__officeWebSocket.ws.onerror = function() {
    if (window.__officeWebSocket.target && window.unityInstance) {
      window.unityInstance.SendMessage(window.__officeWebSocket.target, 'OnWSError', '');
    }
  };
};
window.WebSocketClose = function() {
  if (window.__officeWebSocket.heartbeat) {
    clearInterval(window.__officeWebSocket.heartbeat);
    window.__officeWebSocket.heartbeat = null;
  }
  if (window.__officeWebSocket.ws) {
    window.__officeWebSocket.ws.close();
    window.__officeWebSocket.ws = null;
  }
};
window.WebSocketIsConnected = function() {
  return window.__officeWebSocket.ws && window.__officeWebSocket.ws.readyState === WebSocket.OPEN ? 1 : 0;
};

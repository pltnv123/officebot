var _officeTarget = null;
var _officeWS = null;
var _heartbeatInterval = null;

mergeInto(LibraryManager.library, {
  WebSocketSetTarget: function(targetPtr) {
    _officeTarget = UTF8ToString(targetPtr);
  },

  WebSocketConnect: function(urlPtr) {
    var url = UTF8ToString(urlPtr);

    if (_officeWS) {
      _officeWS.onopen = null;
      _officeWS.onmessage = null;
      _officeWS.onclose = null;
      _officeWS.onerror = null;
      _officeWS.close();
      _officeWS = null;
    }

    if (_heartbeatInterval) {
      clearInterval(_heartbeatInterval);
      _heartbeatInterval = null;
    }

    _officeWS = new WebSocket(url);

    _officeWS.onopen = function() {
      SendMessage(_officeTarget, 'OnWSOpen', '');
      _heartbeatInterval = setInterval(function() {
        if (_officeTarget) {
          SendMessage(_officeTarget, 'OnJsHeartbeat', String(Date.now()));
        }
      }, 5000);
    };

    _officeWS.onmessage = function(event) {
      SendMessage(_officeTarget, 'OnWSMessage', typeof event.data === 'string' ? event.data : '');
    };

    _officeWS.onclose = function(event) {
      if (_heartbeatInterval) {
        clearInterval(_heartbeatInterval);
        _heartbeatInterval = null;
      }
      SendMessage(_officeTarget, 'OnWSClose', '');
    };

    _officeWS.onerror = function(err) {
      SendMessage(_officeTarget, 'OnWSError', '');
    };
  },

  WebSocketClose: function() {
    if (_officeWS) {
      if (_heartbeatInterval) {
        clearInterval(_heartbeatInterval);
        _heartbeatInterval = null;
      }
      _officeWS.onopen = null;
      _officeWS.onmessage = null;
      _officeWS.onclose = null;
      _officeWS.onerror = null;
      _officeWS.close();
      _officeWS = null;
    }
  },

  WebSocketIsConnected: function() {
    return _officeWS && _officeWS.readyState === WebSocket.OPEN ? 1 : 0;
  }
});

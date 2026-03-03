(async function(){
  const overlay = document.getElementById('unity-overlay');
  const canvas = document.getElementById('unity-canvas');

  const setMessage = (text) => {
    if (overlay) overlay.textContent = text;
  };

  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(script);
    });
  }

  async function runFallback(reason) {
    setMessage(`Unity build fallback (${reason})`);
    try {
      const mod = await import('./fallback-scene.js?v=3');
      mod.launchFallbackScene(canvas);
    } catch (error) {
      setMessage('Ошибка fallback-сцены: ' + error);
    }
  }

  try {
    // Prefer new CI artifact naming first, then legacy office.*
    await loadScript('./Build/WebGL.loader.js');
  } catch (e1) {
    try {
      await loadScript('./Build/office.loader.js');
    } catch (e2) {
      await runFallback('loader not found');
      return;
    }
  }

  if (typeof createUnityInstance !== 'function') {
    await runFallback('нет createUnityInstance');
    return;
  }

  const hasWebGLNames = true; // build currently deploys WebGL.*.gz files
  const config = hasWebGLNames ? {
    dataUrl: './Build/WebGL.data.gz',
    frameworkUrl: './Build/WebGL.framework.js.gz',
    codeUrl: './Build/WebGL.wasm.gz',
    streamingAssetsUrl: 'StreamingAssets',
    companyName: 'Office',
    productName: 'FrogOffice',
    productVersion: '1.0'
  } : {
    dataUrl: './Build/office.data',
    frameworkUrl: './Build/office.framework.js',
    codeUrl: './Build/office.wasm',
    streamingAssetsUrl: 'StreamingAssets',
    companyName: 'Office',
    productName: 'FrogOffice',
    productVersion: '1.0'
  };

  createUnityInstance(canvas, config, (progress) => {
    setMessage(`Загрузка Unity: ${Math.round(progress * 100)}%`);
  }).then((instance) => {
    window.OfficeUnity = { instance, loadedAt: Date.now() };
    setMessage('Unity сцена загружена');
    setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 1200);
  }).catch(async (error) => {
    await runFallback(String(error));
  });
})();

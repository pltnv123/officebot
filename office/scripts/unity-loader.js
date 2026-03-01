(async function(){
  const overlay = document.getElementById('unity-overlay');
  const canvas = document.getElementById('unity-canvas');

  const config = {
    dataUrl: './Build/office.data',
    frameworkUrl: './Build/office.framework.js',
    codeUrl: './Build/office.wasm',
    streamingAssetsUrl: 'StreamingAssets',
    companyName: 'Office',
    productName: 'FrogOffice',
    productVersion: '1.0'
  };

  const setMessage = (text) => {
    if (overlay) overlay.textContent = text;
  };

  async function runFallback(reason) {
    setMessage(`Unity build ещё не готов (${reason}). Показан стартовый fallback-офис.`);
    try {
      const mod = await import('./fallback-scene.js?v=2');
      mod.launchFallbackScene(canvas);
    } catch (error) {
      setMessage('Ошибка fallback-сцены: ' + error);
    }
  }

  if (typeof createUnityInstance !== 'function') {
    await runFallback('нет createUnityInstance');
    return;
  }

  createUnityInstance(canvas, config, (progress) => {
    setMessage(`Загрузка Unity: ${Math.round(progress * 100)}%`);
  }).then(() => {
    setMessage('Unity сцена загружена');
    setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 1200);
  }).catch(async (error) => {
    await runFallback(String(error));
  });
})();

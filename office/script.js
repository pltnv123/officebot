function tick() {
  const now = new Date();
  const text = now.toISOString().slice(11, 19);
  const el = document.getElementById('clock');
  if (el) el.textContent = text;
}

tick();
setInterval(tick, 1000);

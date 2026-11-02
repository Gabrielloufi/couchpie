// The hidden preview card (see netflix.css) still starts its trailer; keep it silent.
// Media events don't bubble, so listen while they're captured on the way down.
document.addEventListener("play", (event) => {
  if (event.target.closest(".mini-modal")) {
    event.target.muted = true;
    event.target.pause();
  }
}, true);

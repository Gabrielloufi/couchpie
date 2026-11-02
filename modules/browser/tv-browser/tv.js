// Back: the remote's Back button arrives as Esc, which first leaves a text field,
// then goes back a page. (The arrows and OK are nav.js.)
addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.defaultPrevented || document.fullscreenElement) {
    return;
  }
  const focused = document.activeElement;
  if (focused && (focused.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName))) {
    focused.blur();
    return;
  }
  history.back();
});

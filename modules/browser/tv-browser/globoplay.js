// A click on a poster (see globoplay.css) opens its title through the preview card's link.
document.addEventListener("click", (event) => {
  const poster = event.target instanceof Element && event.target.closest(".item-with-preview > .poster");
  const link = poster && poster.parentElement.querySelector("a.item-preview__link-wrapper[href]");
  if (!link) return;
  event.preventDefault();
  event.stopPropagation();
  link.click();
}, true);

export class Cover {
  static apply(image, fallback, url, alt) {
    image.alt = alt || "Book cover";
    image.onerror = () => {
      image.hidden = true;
      if (fallback) {
        fallback.hidden = false;
      }
    };

    if (!url) {
      image.removeAttribute("src");
      image.hidden = true;
      if (fallback) {
        fallback.hidden = false;
      }
      return;
    }

    if (fallback) {
      fallback.hidden = true;
    }

    image.hidden = false;
    image.src = url;
  }
}

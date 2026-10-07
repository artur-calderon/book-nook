export class Navigation {
  constructor(pages) {
    this.pages = pages;
    this.listeners = [];
    window.addEventListener("hashchange", () => this.handleHash());
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  start() {
    this.handleHash();
  }

  goHome() {
    window.location.hash = "home";
  }

  goDetails(bookId) {
    window.location.hash = `book/${bookId}`;
  }

  goFavorites() {
    window.location.hash = "favorites";
  }

  getRoute() {
    const hash = window.location.hash.replace(/^#/, "") || "home";

    if (hash.startsWith("book/")) {
      return { name: "details", id: decodeURIComponent(hash.slice(5)) };
    }

    if (hash === "favorites") {
      return { name: "favorites" };
    }

    return { name: "home" };
  }

  handleHash() {
    const route = this.getRoute();
    this.show(route.name);

    for (const callback of this.listeners) {
      callback(route);
    }
  }

  show(name) {
    for (const [key, page] of Object.entries(this.pages)) {
      const isActive = key === name;
      page.hidden = !isActive;
      page.inert = !isActive;
    }
  }
}

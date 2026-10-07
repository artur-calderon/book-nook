export class Storage {
  constructor() {
    this.key = "booknook-favorites";
  }

  getFavorites() {
    const data = localStorage.getItem(this.key);

    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  saveFavorites(books) {
    localStorage.setItem(this.key, JSON.stringify(books));
  }
}

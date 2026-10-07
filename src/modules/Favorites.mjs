export class Favorites {
  constructor(storage) {
    this.storage = storage;
  }

  getAll() {
    return this.storage.getFavorites();
  }

  isFavorite(id) {
    return this.getAll().some((book) => book.id === id);
  }

  add(book) {
    const books = this.getAll();

    if (this.isFavorite(book.id)) {
      return;
    }

    books.push(book);
    this.storage.saveFavorites(books);
  }

  remove(id) {
    const books = this.getAll().filter((book) => book.id !== id);
    this.storage.saveFavorites(books);
  }

  toggle(book) {
    if (this.isFavorite(book.id)) {
      this.remove(book.id);
      return false;
    }

    this.add(book);
    return true;
  }
}

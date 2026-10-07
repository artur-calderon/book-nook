import { Cover } from "./Cover.mjs";

export class BookDisplay {
  constructor(container) {
    this.container = container;
  }

  showBooks(books) {
    this.container.innerHTML = "";

    for (const book of books) {
      this.container.append(this.#createCard(book));
    }
  }

  clear() {
    this.container.innerHTML = "";
  }

  #createCard(book) {
    const card = document.createElement("a");
    card.className = "book-card";
    card.href = `#book/${encodeURIComponent(book.id)}`;

    const coverFrame = document.createElement("div");
    coverFrame.className = "cover-frame";

    const image = document.createElement("img");
    const fallback = document.createElement("span");
    fallback.className = "cover-fallback";
    fallback.textContent = "No cover";

    Cover.apply(image, fallback, book.cover, `${book.title} cover`);

    coverFrame.append(image, fallback);

    const title = document.createElement("p");
    title.className = "book-card-title";
    title.textContent = book.title;

    const author = document.createElement("p");
    author.className = "book-card-author";
    author.textContent = book.authors.length ? book.authors.join(", ") : "Unknown author";

    card.append(coverFrame, title, author);
    return card;
  }
}

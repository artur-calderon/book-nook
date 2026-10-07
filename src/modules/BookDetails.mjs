import { Cover } from "./Cover.mjs";

export class BookDetails {
  constructor(root, favorites) {
    this.root = root;
    this.favorites = favorites;
    this.book = null;
    this.content = root.querySelector("#details-content");
    this.status = root.querySelector("#details-status");
    this.cover = root.querySelector("#details-cover");
    this.coverFallback = root.querySelector("#details-cover-fallback");
    this.title = root.querySelector("#details-title");
    this.author = root.querySelector("#details-author");
    this.chips = root.querySelector("#details-chips");
    this.description = root.querySelector("#details-description");
    this.publisher = root.querySelector("#details-publisher");
    this.language = root.querySelector("#details-language");
    this.isbn = root.querySelector("#details-isbn");
    this.format = root.querySelector("#details-format");
    this.favoriteButton = root.querySelector("#favorite-button");
    this.favoriteLabel = root.querySelector("#favorite-button-label");

    this.favoriteButton.addEventListener("click", () => this.toggleFavorite());
  }

  showLoading() {
    this.book = null;
    this.content.hidden = true;
    this.showStatus("Loading book details...");
  }

  showError(message, canRetry, onRetry) {
    this.book = null;
    this.content.hidden = true;
    this.status.hidden = false;
    this.status.innerHTML = "";

    const text = document.createElement("p");
    text.textContent = message;
    this.status.append(text);

    if (canRetry && onRetry) {
      const button = document.createElement("button");
      button.className = "btn btn-primary";
      button.type = "button";
      button.textContent = "Try again";
      button.addEventListener("click", onRetry);
      this.status.append(button);
    }
  }

  showBook(book) {
    this.book = book;
    this.status.hidden = true;
    this.status.innerHTML = "";
    this.content.hidden = false;

    document.title = `${book.title} · BookNook`;
    this.title.textContent = book.title;
    this.author.textContent = book.authors.length
      ? `by ${book.authors.join(", ")}`
      : "by Unknown author";
    this.description.textContent = book.description;
    this.publisher.textContent = book.publisher;
    this.language.textContent = book.language;
    this.isbn.textContent = book.isbn;
    this.format.textContent = book.format;

    Cover.apply(this.cover, this.coverFallback, book.cover, `${book.title} cover`);
    this.renderChips(book);
    this.updateFavoriteButton();
    this.title.focus();
  }

  showStatus(message) {
    this.status.hidden = false;
    this.status.innerHTML = "";
    const text = document.createElement("p");
    text.textContent = message;
    this.status.append(text);
  }

  renderChips(book) {
    this.chips.innerHTML = "";
    const chips = [];

    if (book.categories[0]) {
      chips.push(book.categories[0]);
    }

    if (book.pageCount) {
      chips.push(`${book.pageCount} pages`);
    }

    if (book.publishedDate) {
      chips.push(book.publishedDate.slice(0, 4));
    }

    if (book.rating) {
      chips.push(`★ ${book.rating}`);
    }

    for (const label of chips) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = label;
      this.chips.append(chip);
    }
  }

  toggleFavorite() {
    if (!this.book) {
      return;
    }

    this.favorites.toggle(this.book);
    this.updateFavoriteButton();
  }

  updateFavoriteButton() {
    const saved = this.book && this.favorites.isFavorite(this.book.id);
    this.favoriteButton.classList.toggle("is-saved", Boolean(saved));
    this.favoriteLabel.textContent = saved ? "Remove from Favorites" : "Add to Favorites";
  }
}

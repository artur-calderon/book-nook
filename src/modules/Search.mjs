export class Search {
  constructor(form, input, button, api, onResults) {
    this.form = form;
    this.input = input;
    this.button = button;
    this.api = api;
    this.onResults = onResults;
    this.requestId = 0;

    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.search();
    });
  }

  async search(queryFromOutside) {
    const query = (queryFromOutside ?? this.input.value).trim();

    if (!query) {
      this.onResults({
        status: "empty-query",
        query: "",
        books: [],
        total: 0,
      });
      return;
    }

    this.input.value = query;
    const requestId = ++this.requestId;
    this.setLoading(true);
    this.onResults({ status: "loading", query, books: [], total: 0 });

    try {
      const result = await this.api.searchBooks(query);
      if (requestId !== this.requestId) {
        return;
      }
      this.onResults({
        status: "success",
        query,
        books: result.books,
        total: result.total,
      });
    } catch (error) {
      if (requestId !== this.requestId) {
        return;
      }
      this.onResults({
        status: "error",
        query,
        books: [],
        total: 0,
        message: error.message || "Could not load books. Please try again.",
      });
    } finally {
      if (requestId === this.requestId) {
        this.setLoading(false);
      }
    }
  }

  setLoading(isLoading) {
    this.button.disabled = isLoading;
    this.button.textContent = isLoading ? "Searching..." : "Search";
  }
}

export class Api {
  constructor() {
    this.googleUrl = "https://www.googleapis.com/books/v1/volumes";
    this.openLibraryUrl = "https://openlibrary.org/api/books";
    this.openLibrarySearchUrl = "https://openlibrary.org/search.json";
    this.cache = new Map();
  }

  async searchBooks(query) {
    try {
      const result = await this.#searchGoogle(query);
      this.#rememberAll(result.books);
      return result;
    } catch (error) {
      const result = await this.#searchOpenLibrary(query);
      this.#rememberAll(result.books);
      return result;
    }
  }

  async getBookById(id) {
    const cached = this.cache.get(id);

    if (this.#isOpenLibraryId(id)) {
      const extra = await this.#getOpenLibraryWork(id);
      const book = this.#mergeBooks(cached, extra);
      this.cache.set(id, book);
      return book;
    }

    try {
      const book = await this.#getGoogleById(id);
      if (book.isbn && book.isbn !== "Not available") {
        const extra = await this.#getOpenLibraryByIsbn(book.isbn);
        const merged = this.#mergeBooks(book, extra);
        this.cache.set(id, merged);
        return merged;
      }
      this.cache.set(id, book);
      return book;
    } catch (error) {
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  async #searchGoogle(query) {
    const url = `${this.googleUrl}?q=${encodeURIComponent(query)}&maxResults=20`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not load books. Please try again.");
    }

    const data = await response.json();
    const books = (data.items || []).map((item) => this.#fromGoogle(item));

    return {
      books,
      total: data.totalItems || books.length,
    };
  }

  async #searchOpenLibrary(query) {
    const fields = [
      "key",
      "title",
      "author_name",
      "first_publish_year",
      "cover_i",
      "isbn",
      "publisher",
      "language",
      "subject",
      "number_of_pages_median",
    ].join(",");
    const url = `${this.openLibrarySearchUrl}?q=${encodeURIComponent(query)}&limit=20&fields=${fields}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not load books. Please try again.");
    }

    const data = await response.json();
    const books = (data.docs || []).map((doc) => this.#fromOpenLibraryDoc(doc));

    return {
      books,
      total: data.numFound || books.length,
    };
  }

  async #getGoogleById(id) {
    const response = await fetch(`${this.googleUrl}/${encodeURIComponent(id)}`);

    if (response.status === 404) {
      throw new Error("not-found");
    }

    if (!response.ok) {
      throw new Error("Could not load this book. Please try again.");
    }

    return this.#fromGoogle(await response.json());
  }

  async #getOpenLibraryWork(id) {
    const workResponse = await fetch(`https://openlibrary.org/works/${encodeURIComponent(id)}.json`);

    if (workResponse.status === 404) {
      throw new Error("not-found");
    }

    if (!workResponse.ok) {
      throw new Error("Could not load this book. Please try again.");
    }

    const data = await workResponse.json();
    let description = data.description;

    if (description && typeof description === "object") {
      description = description.value;
    }

    const coverId = data.covers?.[0];
    const edition = await this.#getOpenLibraryEdition(id);
    const authors = await this.#getAuthorNames(data.authors);

    return {
      id,
      title: data.title || "Untitled",
      authors,
      description: this.#plainText(description),
      publishedDate: edition.publishDate,
      categories: this.#cleanSubjects(data.subjects),
      cover: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
      pageCount: edition.pageCount,
      publisher: edition.publisher,
      language: edition.language,
      isbn: edition.isbn,
      format: "Book",
      rating: 0,
    };
  }

  async #getOpenLibraryEdition(workId) {
    try {
      const response = await fetch(
        `https://openlibrary.org/works/${encodeURIComponent(workId)}/editions.json?limit=10`,
      );

      if (!response.ok) {
        return {
          publishDate: "",
          pageCount: 0,
          publisher: "Not available",
          language: "Not available",
          isbn: "Not available",
        };
      }

      const data = await response.json();
      const edition = this.#pickEdition(data.entries);
      const isbn = edition.isbn_13?.[0] || edition.isbn_10?.[0] || "";
      const languageKey = edition.languages?.[0]?.key || "";
      const languageCode = languageKey.replace("/languages/", "");

      return {
        publishDate: edition.publish_date || "",
        pageCount: edition.number_of_pages || 0,
        publisher: edition.publishers?.[0] || "Not available",
        language: this.#languageName(this.#normalizeLang(languageCode)),
        isbn: isbn || "Not available",
      };
    } catch (error) {
      return {
        publishDate: "",
        pageCount: 0,
        publisher: "Not available",
        language: "Not available",
        isbn: "Not available",
      };
    }
  }

  #fromGoogle(item) {
    const info = item.volumeInfo || {};
    const images = info.imageLinks || {};
    const isbn = this.#findIsbn(info.industryIdentifiers);
    let cover = images.thumbnail || images.smallThumbnail || "";
    cover = cover.replace("http://", "https://");

    if (!cover && isbn) {
      cover = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
    }

    return {
      id: item.id,
      title: info.title || "Untitled",
      authors: info.authors || [],
      description: this.#plainText(info.description),
      publishedDate: info.publishedDate || "",
      categories: info.categories || [],
      cover,
      pageCount: info.pageCount || 0,
      publisher: info.publisher || "Not available",
      language: this.#languageName(info.language),
      isbn: isbn || "Not available",
      format: this.#formatName(info.printType),
      rating: info.averageRating || 0,
    };
  }

  #fromOpenLibraryDoc(doc) {
    const id = (doc.key || "").replace("/works/", "") || doc.cover_edition_key || doc.title;
    const isbn = doc.isbn?.[0] || "";
    let cover = "";

    if (doc.cover_i) {
      cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    } else if (isbn) {
      cover = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
    }

    return {
      id,
      title: doc.title || "Untitled",
      authors: doc.author_name || [],
      description: "No description available.",
      publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : "",
      categories: this.#cleanSubjects(doc.subject),
      cover,
      pageCount: doc.number_of_pages_median || 0,
      publisher: doc.publisher?.[0] || "Not available",
      language: this.#languageName(this.#normalizeLang(this.#pickLanguage(doc.language))),
      isbn: isbn || "Not available",
      format: "Book",
      rating: 0,
    };
  }

  async #getOpenLibraryByIsbn(isbn) {
    try {
      const url = `${this.openLibraryUrl}?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
      const response = await fetch(url);

      if (!response.ok) {
        return {};
      }

      const data = await response.json();
      const entry = data[`ISBN:${isbn}`];

      if (!entry) {
        return {};
      }

      return {
        cover: entry.cover?.large || entry.cover?.medium || "",
        publisher: entry.publishers?.[0]?.name || "",
        description: this.#plainText(entry.notes || entry.excerpts?.[0]?.text || ""),
      };
    } catch (error) {
      return {};
    }
  }

  #rememberAll(books) {
    for (const book of books) {
      this.cache.set(book.id, book);
    }
  }

  #mergeBooks(base = {}, extra = {}) {
    return {
      ...base,
      ...extra,
      title: extra.title || base.title || "Untitled",
      authors: base.authors?.length ? base.authors : extra.authors || [],
      description:
        extra.description && extra.description !== "No description available."
          ? extra.description
          : base.description || "No description available.",
      cover: extra.cover || base.cover || "",
      categories: extra.categories?.length ? extra.categories : base.categories || [],
      publishedDate: base.publishedDate || extra.publishedDate || "",
      pageCount: base.pageCount || extra.pageCount || 0,
      publisher:
        base.publisher && base.publisher !== "Not available"
          ? base.publisher
          : extra.publisher || "Not available",
      language:
        base.language && base.language !== "Not available"
          ? base.language
          : extra.language || "Not available",
      isbn:
        base.isbn && base.isbn !== "Not available"
          ? base.isbn
          : extra.isbn || "Not available",
      format: base.format || extra.format || "Book",
      rating: base.rating || extra.rating || 0,
      id: base.id || extra.id,
    };
  }

  #isOpenLibraryId(id) {
    return /^OL\d+W$/i.test(id);
  }

  #findIsbn(identifiers = []) {
    const isbn13 = identifiers.find((item) => item.type === "ISBN_13");
    const isbn10 = identifiers.find((item) => item.type === "ISBN_10");
    return isbn13?.identifier || isbn10?.identifier || "";
  }

  #plainText(value) {
    if (!value) {
      return "No description available.";
    }

    const text = String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text || "No description available.";
  }

  #normalizeLang(code) {
    if (!code) {
      return "";
    }

    if (code === "eng") {
      return "en";
    }

    if (code === "spa") {
      return "es";
    }

    if (code === "por") {
      return "pt";
    }

    if (code === "fre" || code === "fra") {
      return "fr";
    }

    if (code === "ger" || code === "deu") {
      return "de";
    }

    return code.length > 2 ? code.slice(0, 2) : code;
  }

  #languageName(code) {
    const languages = {
      en: "English",
      es: "Spanish",
      pt: "Portuguese",
      fr: "French",
      de: "German",
      it: "Italian",
      ja: "Japanese",
      ur: "Urdu",
      he: "Hebrew",
      zh: "Chinese",
      ru: "Russian",
    };

    if (!code) {
      return "Not available";
    }

    return languages[code] || code;
  }

  async #getAuthorNames(authors = []) {
    const names = [];

    for (const item of authors.slice(0, 3)) {
      const key = item.author?.key;

      if (!key) {
        continue;
      }

      try {
        const response = await fetch(`https://openlibrary.org${key}.json`);
        if (!response.ok) {
          continue;
        }
        const data = await response.json();
        if (data.name) {
          names.push(data.name);
        }
      } catch (error) {
        // Skip authors that fail to load.
      }
    }

    return names;
  }

  #pickEdition(entries = []) {
    const hasIsbn = (entry) => entry.isbn_13?.[0] || entry.isbn_10?.[0];
    const isEnglish = (entry) =>
      (entry.languages || []).some((lang) => String(lang.key).includes("/eng"));

    return (
      entries.find((entry) => isEnglish(entry) && hasIsbn(entry)) ||
      entries.find((entry) => isEnglish(entry)) ||
      entries.find((entry) => hasIsbn(entry)) ||
      entries[0] ||
      {}
    );
  }

  #cleanSubjects(subjects = []) {
    return subjects
      .map((subject) => String(subject).replaceAll("_", " ").trim())
      .filter((subject) => subject && !subject.includes(":") && subject.length < 32)
      .slice(0, 2);
  }

  #pickLanguage(codes = []) {
    return codes.find((code) => code === "eng" || code === "en") || codes[0] || "";
  }

  #formatName(printType) {
    if (printType === "MAGAZINE") {
      return "Magazine";
    }

    if (printType === "BOOK") {
      return "Book";
    }

    return "Not available";
  }
}

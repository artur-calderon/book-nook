import { Api } from "./modules/Api.mjs";
import { Storage } from "./modules/Storage.mjs";
import { Favorites } from "./modules/Favorites.mjs";
import { Navigation } from "./modules/Navigation.mjs";
import { Search } from "./modules/Search.mjs";
import { BookDisplay } from "./modules/BookDisplay.mjs";
import { BookDetails } from "./modules/BookDetails.mjs";

const api = new Api();
const storage = new Storage();
const favorites = new Favorites(storage);

const homePage = document.querySelector("#home-page");
const detailsPage = document.querySelector("#details-page");
const favoritesPage = document.querySelector("#favorites-page");
const headerBack = document.querySelector("#header-back");
const favoritesLink = document.querySelector("#favorites-link");
const resultsSection = document.querySelector("#results-section");
const resultsCount = document.querySelector("#results-count");
const resultsStatus = document.querySelector("#results-status");
const favoritesCount = document.querySelector("#favorites-count");
const favoritesStatus = document.querySelector("#favorites-status");

const navigation = new Navigation({
  home: homePage,
  details: detailsPage,
  favorites: favoritesPage,
});

const bookDisplay = new BookDisplay(document.querySelector("#results-grid"));
const favoritesDisplay = new BookDisplay(document.querySelector("#favorites-grid"));
const bookDetails = new BookDetails(detailsPage, favorites);

const search = new Search(
  document.querySelector("#search-form"),
  document.querySelector("#search-input"),
  document.querySelector("#search-button"),
  api,
  showSearchResults,
);

let lastSearch = {
  query: sessionStorage.getItem("booknook-last-query") || "",
  books: [],
  total: 0,
};
let needsRestore = Boolean(lastSearch.query);

navigation.onChange(handleRoute);

if (!window.location.hash) {
  window.location.hash = "home";
}

navigation.start();

function handleRoute(route) {
  document.body.classList.toggle("is-details", route.name === "details");
  headerBack.hidden = route.name === "home";
  if (route.name === "favorites") {
    favoritesLink.setAttribute("aria-current", "page");
  } else {
    favoritesLink.removeAttribute("aria-current");
  }
  setPageTitle(route);

  if (route.name === "home") {
    headerBack.href = "#home";
    if (needsRestore && lastSearch.query && !lastSearch.status) {
      needsRestore = false;
      search.search(lastSearch.query);
    } else if (lastSearch.status) {
      needsRestore = false;
      showSearchResults(lastSearch);
    }
    return;
  }

  if (route.name === "details") {
    headerBack.href = "#home";
    loadBookDetails(route.id);
    return;
  }

  if (route.name === "favorites") {
    headerBack.href = "#home";
    showFavorites();
  }
}

function showSearchResults(result) {
  resultsSection.hidden = false;
  lastSearch = result;
  sessionStorage.setItem("booknook-last-query", result.query || "");

  if (result.status === "empty-query") {
    bookDisplay.clear();
    setStatus(
      resultsStatus,
      "Enter a title or author to search.",
      false,
    );
    resultsCount.textContent = "";
    return;
  }

  if (result.status === "loading") {
    setStatus(resultsStatus, "Loading books...");
    resultsCount.textContent = "";
    return;
  }

  if (result.status === "error") {
    bookDisplay.clear();
    setStatus(resultsStatus, result.message, true, () => search.search(result.query));
    resultsCount.textContent = "";
    return;
  }

  if (result.books.length === 0) {
    bookDisplay.clear();
    setStatus(
      resultsStatus,
      `No books found for “${result.query}”. Check the spelling or try another title or author.`,
    );
    resultsCount.innerHTML = countMarkup(0, "book", "found");
    return;
  }

  resultsStatus.hidden = true;
  resultsStatus.innerHTML = "";
  bookDisplay.showBooks(result.books);
  resultsCount.innerHTML = countMarkup(result.total, "book", "found");
}

async function loadBookDetails(id) {
  bookDetails.showLoading();

  try {
    const book = await api.getBookById(id);
    bookDetails.showBook(book);
  } catch (error) {
    if (error.message === "not-found") {
      bookDetails.showError("This book could not be found.", false);
      return;
    }

    bookDetails.showError(
      error.message || "Could not load this book. Please try again.",
      true,
      () => loadBookDetails(id),
    );
  }
}

function showFavorites() {
  const books = favorites.getAll();
  favoritesDisplay.showBooks(books);

  if (books.length === 0) {
    favoritesCount.textContent = "";
    setStatus(
      favoritesStatus,
      "You have no favorite books yet. Search for a book and add it to favorites.",
    );
    return;
  }

  favoritesStatus.hidden = true;
  favoritesStatus.innerHTML = "";
  favoritesCount.innerHTML = countMarkup(books.length, "book", "saved");
}

function setStatus(element, message, canRetry = false, onRetry) {
  element.hidden = false;
  element.setAttribute("role", canRetry ? "alert" : "status");
  element.innerHTML = "";

  const text = document.createElement("p");
  text.textContent = message;
  element.append(text);

  if (canRetry && onRetry) {
    const button = document.createElement("button");
    button.className = "btn btn-primary";
    button.type = "button";
    button.textContent = "Try again";
    button.addEventListener("click", onRetry);
    element.append(button);
  }
}

function countMarkup(total, noun, suffix) {
  const label = total === 1 ? `1 ${noun} ${suffix}` : `${total} ${noun}s ${suffix}`;
  return `<span class="count-full">${label}</span><span class="count-short">${total} ${suffix}</span>`;
}

function setPageTitle(route) {
  if (route.name === "favorites") {
    document.title = "Favorites · BookNook";
    return;
  }

  if (route.name === "details") {
    document.title = "Book details · BookNook";
    return;
  }

  document.title = "BookNook";
}

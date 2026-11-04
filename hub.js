(function () {
  "use strict";
  const search = document.querySelector("#activity-search");
  const filters = [...document.querySelectorAll(".filter")];
  const cards = [...document.querySelectorAll(".activity-card")];
  const count = document.querySelector("#result-count");
  const empty = document.querySelector("#no-results");
  let activeFilter = "all";

  function updateResults() {
    const query = search.value.toLowerCase().trim();
    let visible = 0;
    cards.forEach((card) => {
      const categories = card.dataset.categories.split(" ");
      const text = `${card.textContent} ${card.dataset.search}`.toLowerCase();
      const show = (activeFilter === "all" || categories.includes(activeFilter)) && (!query || text.includes(query));
      card.hidden = !show;
      if (show) visible += 1;
    });
    count.textContent = activeFilter === "all" && !query ? `Showing all ${visible} activities` : `Showing ${visible} ${visible === 1 ? "activity" : "activities"}`;
    empty.hidden = visible !== 0;
  }

  search.addEventListener("input", updateResults);
  filters.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    updateResults();
  }));
})();

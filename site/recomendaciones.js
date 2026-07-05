(function () {
  "use strict";

  const categoryIds = {
    "Música": "musica",
    "Peliculas y Series": "peliculas-y-series",
    "Películas y Series": "peliculas-y-series",
    "Musicales": "musicales"
  };

  const categoryNotes = {
    "Música": "Bandas, artistas y eras visuales para construir un look reconocible.",
    "Peliculas y Series": "Personajes, universos, villanas, vampiros, fantasía y clásicos.",
    "Películas y Series": "Personajes, universos, villanas, vampiros, fantasía y clásicos.",
    "Musicales": "Teatro, cine musical, canciones icónicas y drama escénico."
  };

  const displayTitles = {
    "Peliculas y Series": "Películas y Series"
  };

  function parseMarkdown(source) {
    const categories = [];
    let current = null;

    source.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      if (line.startsWith("# ")) {
        current = {
          title: line.replace(/^#\s+/, ""),
          items: []
        };
        categories.push(current);
        return;
      }

      if (current) current.items.push(line);
    });

    return categories;
  }

  function createItem(text, index) {
    const item = document.createElement("li");
    item.textContent = text;
    item.style.setProperty("--item-delay", `${Math.min(index * 8, 240)}ms`);
    return item;
  }

  function renderCategories(categories) {
    const target = document.getElementById("theme-lists");
    const status = document.getElementById("theme-status");
    if (!target || !status) return;

    target.innerHTML = "";
    categories.forEach((category) => {
      const section = document.createElement("section");
      section.className = "theme-category";
      section.id = categoryIds[category.title] || category.title.toLowerCase().replace(/\s+/g, "-");

      const header = document.createElement("div");
      header.className = "theme-category-header";

      const kicker = document.createElement("p");
      kicker.className = "kicker";
      kicker.textContent = `${category.items.length} referencias`;

      const title = document.createElement("h2");
      title.textContent = displayTitles[category.title] || category.title;

      const note = document.createElement("p");
      note.textContent = categoryNotes[category.title] || "Referencias para construir un disfraz con intención.";

      header.append(kicker, title, note);

      const list = document.createElement("ol");
      list.className = "theme-list";
      category.items.forEach((entry, index) => {
        list.appendChild(createItem(entry, index));
      });

      section.append(header, list);
      target.appendChild(section);
    });

    status.hidden = true;
  }

  async function init() {
    const status = document.getElementById("theme-status");
    try {
      const response = await fetch("tematica.md", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar tematica.md");
      const markdown = await response.text();
      renderCategories(parseMarkdown(markdown));
    } catch (error) {
      if (status) status.textContent = "No se pudieron cargar las recomendaciones.";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

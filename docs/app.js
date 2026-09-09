(function () {
  "use strict";

  const app = document.getElementById("app");
  let library = null;
  let testGroups = [];

  const categoryStyles = [
    { accent: "#67ddd4", icon: "◌" },
    { accent: "#c81787", icon: "♡" },
    { accent: "#f9c234", icon: "✦" },
    { accent: "#ef7439", icon: "✧" },
    { accent: "#4f8cff", icon: "◈" }
  ];

  const categoryDescriptions = {
    "instrumentos-evaluacion": "Baterías, pruebas y materiales organizados por componente del lenguaje.",
    "material-trabajo": "Cuadernillos, fichas, cuentos y actividades para intervención.",
    "libros-complementarios": "Material de consulta complementario para acompañar la intervención.",
    regalos: "Material adicional de apoyo, actividades y recursos para enriquecer las sesiones."
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char];
    });
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
    return (index === 0 ? Math.round(value) : value.toFixed(value >= 10 ? 0 : 1)) + " " + units[index];
  }

  function segmentPath(path) {
    return String(path || "").split("/").map(encodeURIComponent).join("/");
  }

  function releaseUrl(assetName, localPath) {
    const base = String(window.SITE_CONFIG?.releaseBaseUrl || "").replace(/\/$/, "");
    if (base && assetName) return base + "/" + encodeURIComponent(assetName);
    return localPath ? segmentPath(localPath) : "#";
  }

  function downloadControl(assetName, localPath, label, extraClass) {
    const base = String(window.SITE_CONFIG?.releaseBaseUrl || "").trim();
    const classes = "download-button" + (extraClass ? " " + extraClass : "");
    if (!base && !localPath) return '<span class="' + classes + ' is-disabled" aria-disabled="true">' + esc(label) + "</span>";
    return '<a class="' + classes + '" download href="' + esc(releaseUrl(assetName, localPath)) + '">' + esc(label) + "</a>";
  }

  function styleFor(index) { return categoryStyles[index % categoryStyles.length]; }

  function previewUrl(resource) {
    return resource.preview ? segmentPath(resource.preview) : "";
  }

  function resourceType(resource) {
    return resource.type || resource.extension || "Archivo";
  }

  function renderResource(resource, style) {
    const preview = previewUrl(resource);
    const type = resourceType(resource);
    const media = preview
      ? '<img loading="lazy" src="' + esc(preview) + '" alt="Vista previa de ' + esc(resource.name) + '" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden class="resource-type" style="--accent:' + style.accent + '">' + esc(resource.extension || type) + "</span>"
      : '<span class="resource-type" style="--accent:' + style.accent + '">' + esc(resource.extension || type) + "</span>";
    const largeMark = resource.largeFile ? ' <span class="large-mark">· archivo grande</span>' : "";
    return '<article class="resource-card">' +
      '<div class="resource-preview" style="--preview:' + style.accent + '">' + media + "</div>" +
      '<div class="resource-body"><h3>' + esc(resource.name) + '</h3>' +
      '<p class="resource-meta">' + esc(type) + ' · ' + esc(resource.sizeLabel || formatBytes(resource.sizeBytes)) + largeMark + "</p>" +
      downloadControl(resource.assetName, resource.localPath, "⇩ Descargar") +
      "</div></article>";
  }

  function currentRoute() {
    const hash = window.location.hash.replace(/^#/, "") || "catalogo";
    if (hash === "tests") return { type: "tests" };
    if (hash.startsWith("test/")) return { type: "testGroup", id: decodeURIComponent(hash.slice(5)) };
    if (hash.startsWith("categoria/")) return { type: "category", id: decodeURIComponent(hash.slice(10)) };
    return { type: "catalog" };
  }

  function renderShell(title, kicker, countText) {
    return '<p class="eyebrow">' + esc(kicker) + '</p>' +
      '<div class="page-heading"><h1>' + esc(title) + '</h1><p>' + esc(countText) + "</p></div>";
  }

  function renderCatalog() {
    const categories = library.categories;
    app.innerHTML = renderShell("Kit de Terapia del Lenguaje", "KIT · BIBLIOTECA PROFESIONAL", library.totalFiles + " recursos organizados") +
      '<div class="toolbar"><label class="search-box"><span>⌕</span><input id="category-search" type="search" placeholder="Buscar categoría…" aria-label="Buscar categoría"></label><span class="count-pill">' + categories.length + " categorías disponibles</span></div>" +
      '<div id="category-grid" class="category-grid"></div>';
    const search = document.getElementById("category-search");
    const grid = document.getElementById("category-grid");
    function draw() {
      const query = search.value.trim().toLowerCase();
      const filtered = categories.filter(function (category) {
        return (category.name + " " + (category.description || "")).toLowerCase().includes(query);
      });
      grid.innerHTML = filtered.length ? filtered.map(renderCategoryCard).join("") : '<div class="empty-state"><strong>No encontramos esa categoría</strong>Prueba con otra palabra.</div>';
    }
    search.addEventListener("input", draw);
    draw();
  }

  function renderCategoryCard(category) {
    const style = styleFor(library.categories.indexOf(category));
    const description = category.description || categoryDescriptions[category.id] || "Recursos organizados para consulta y apoyo profesional.";
    return '<a class="category-card" style="--accent:' + style.accent + '" href="#categoria/' + encodeURIComponent(category.id) + '">' +
      '<div class="category-top"><span>COLECCIÓN</span><span>' + category.count + " archivos</span></div>" +
      '<div class="category-icon" aria-hidden="true">' + style.icon + "</div>" +
      '<h2>' + esc(category.name) + '</h2><p>' + esc(description) + '</p>' +
      '<div class="category-action"><span>Explorar recursos →</span><span aria-hidden="true">+</span></div></a>';
  }

  function categoryResources(categoryId) {
    return library.resources.filter(function (resource) { return resource.categoryId === categoryId; });
  }

  function renderCategory(category) {
    const style = styleFor(library.categories.indexOf(category));
    const resources = categoryResources(category.id);
    const description = category.description || categoryDescriptions[category.id] || "Recursos organizados para consulta y apoyo profesional.";
    app.innerHTML = '<a class="back-link" href="#catalogo">← Volver al catálogo</a>' +
      '<div class="category-summary"><div><p class="eyebrow">COLECCIÓN</p><h1>' + esc(category.name) + '</h1></div><p>' + resources.length + " archivos</p></div>" +
      '<p class="group-description">' + esc(description) + "</p>" +
      '<div class="toolbar"><label class="search-box"><span>⌕</span><input id="resource-search" type="search" placeholder="Buscar en esta sección…" aria-label="Buscar en esta sección"></label>' +
      downloadControl(category.packageAsset, "", "⇩ Descargar sección", "download-section") + "</div>" +
      '<div id="resource-grid" class="resource-grid"></div>';
    const search = document.getElementById("resource-search");
    const grid = document.getElementById("resource-grid");
    function draw() {
      const query = search.value.trim().toLowerCase();
      const filtered = resources.filter(function (resource) { return resource.name.toLowerCase().includes(query); });
      grid.innerHTML = filtered.length ? filtered.map(function (resource) { return renderResource(resource, style); }).join("") : '<div class="empty-state"><strong>No encontramos ese archivo</strong>Prueba con otra palabra.</div>';
    }
    search.addEventListener("input", draw);
    draw();
  }

  function testCategory() {
    return library.categories.find(function (item) { return item.id === "instrumentos-evaluacion"; });
  }

  function resourcesForGroup(group) {
    const ids = new Set(group.resourceIds || []);
    return library.resources.filter(function (resource) { return ids.has(resource.id); });
  }

  function groupFileTypes(resources) {
    const types = [];
    resources.forEach(function (resource) {
      const type = resourceType(resource);
      if (!types.includes(type)) types.push(type);
    });
    return types.slice(0, 5).map(function (type) { return '<span class="format-pill">' + esc(type) + "</span>"; }).join("");
  }

  function groupDescription(group) {
    return group.description || "Manuales, cuadernillos, protocolos, hojas de registro y materiales relacionados organizados en un solo instrumento.";
  }

  function renderTestGroupCard(group, index) {
    const style = styleFor(index);
    const resources = resourcesForGroup(group);
    return '<a class="category-card test-group-card" style="--accent:' + style.accent + '" href="#test/' + encodeURIComponent(group.id) + '">' +
      '<div class="category-top"><span>INSTRUMENTO</span><span>' + resources.length + " archivos</span></div>" +
      '<div class="category-icon" aria-hidden="true">' + style.icon + "</div>" +
      '<h2>' + esc(group.name) + '</h2><p>' + esc(groupDescription(group)) + '</p>' +
      '<div class="group-formats">' + groupFileTypes(resources) + "</div>" +
      '<div class="category-action"><span>Ver materiales →</span><span aria-hidden="true">+</span></div></a>';
  }

  function renderTestGroups() {
    const category = testCategory();
    const style = styleFor(library.categories.indexOf(category));
    app.innerHTML = '<a class="back-link" href="#catalogo">← Volver al catálogo</a>' +
      '<div class="category-summary"><div><p class="eyebrow">INSTRUMENTOS DE EVALUACIÓN</p><h1>Instrumentos agrupados</h1></div><p>' + testGroups.length + " instrumentos · " + category.count + " archivos</p></div>" +
      '<p class="group-description">Cada instrumento reúne sus manuales, cuadernillos, protocolos, hojas y archivos complementarios.</p>' +
      '<div class="toolbar"><label class="search-box"><span>⌕</span><input id="test-search" type="search" placeholder="Buscar instrumento…" aria-label="Buscar instrumento"></label>' +
      downloadControl(category.packageAsset, "", "⇩ Descargar todos los instrumentos", "download-section") + "</div>" +
      '<div id="test-grid" class="category-grid"></div>';
    const search = document.getElementById("test-search");
    const grid = document.getElementById("test-grid");
    function draw() {
      const query = search.value.trim().toLowerCase();
      const filtered = testGroups.filter(function (group) {
        const resources = resourcesForGroup(group);
        const names = resources.map(function (resource) { return resource.name; }).join(" ");
        return (group.name + " " + group.component + " " + groupDescription(group) + " " + names).toLowerCase().includes(query);
      });
      grid.innerHTML = filtered.length ? filtered.map(function (group, index) { return renderTestGroupCard(group, index); }).join("") : '<div class="empty-state"><strong>No encontramos ese instrumento</strong>Prueba con otra palabra.</div>';
    }
    search.addEventListener("input", draw);
    draw();
  }

  function renderTestGroup(group) {
    const category = testCategory();
    const index = testGroups.indexOf(group);
    const style = styleFor(index);
    const resources = resourcesForGroup(group);
    app.innerHTML = '<a class="back-link" href="#tests">← Volver a instrumentos</a>' +
      '<div class="category-summary"><div><p class="eyebrow">INSTRUMENTO DE EVALUACIÓN</p><h1>' + esc(group.name) + '</h1></div><p>' + resources.length + " archivos</p></div>" +
      '<p class="group-description">' + esc(groupDescription(group)) + "</p>" +
      '<div class="toolbar"><label class="search-box"><span>⌕</span><input id="resource-search" type="search" placeholder="Buscar en este instrumento…" aria-label="Buscar en este instrumento"></label>' +
      downloadControl(group.packageAsset, "", "⇩ Descargar instrumento completo", "download-section") + "</div>" +
      '<div id="resource-grid" class="resource-grid"></div>';
    const search = document.getElementById("resource-search");
    const grid = document.getElementById("resource-grid");
    function draw() {
      const query = search.value.trim().toLowerCase();
      const filtered = resources.filter(function (resource) { return resource.name.toLowerCase().includes(query); });
      grid.innerHTML = filtered.length ? filtered.map(function (resource) { return renderResource(resource, style); }).join("") : '<div class="empty-state"><strong>No encontramos ese archivo</strong>Prueba con otra palabra.</div>';
    }
    search.addEventListener("input", draw);
    draw();
  }

  function updateNav(route) {
    const isTests = route.type === "tests" || route.type === "testGroup";
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      link.classList.toggle("is-active", (isTests && link.dataset.nav === "tests") || (!isTests && link.dataset.nav === "catalogo"));
    });
  }

  function render() {
    if (!library) return;
    const route = currentRoute();
    updateNav(route);
    if (route.type === "tests") return renderTestGroups();
    if (route.type === "testGroup") {
      const group = testGroups.find(function (item) { return item.id === route.id; });
      return group ? renderTestGroup(group) : renderTestGroups();
    }
    if (route.type === "category") {
      const category = library.categories.find(function (item) { return item.id === route.id; });
      return category ? renderCategory(category) : renderCatalog();
    }
    renderCatalog();
  }

  window.addEventListener("hashchange", function () {
    window.scrollTo(0, 0);
    render();
  });

  Promise.all([
    fetch("resources.json").then(function (response) { if (!response.ok) throw new Error("resources"); return response.json(); }),
    fetch("test-groups.json").then(function (response) { if (!response.ok) throw new Error("test-groups"); return response.json(); })
  ]).then(function (results) {
    library = results[0];
    const groupsData = results[1];
    testGroups = groupsData.groups.map(function (group, index) {
      const resources = resourcesForGroup(group);
      return Object.assign({}, group, { index: index, resources: resources });
    }).filter(function (group) { return group.resources.length; });
    document.getElementById("side-total").textContent = library.totalFiles + " recursos disponibles.";
    document.getElementById("catalogVersion").textContent = "versión " + library.version;
    render();
  }).catch(function () {
    app.innerHTML = '<div class="empty-state"><strong>No se pudo cargar la biblioteca</strong>Revisa que los datos estén publicados junto a esta página.</div>';
  });
}());

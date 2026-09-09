(() => {
  "use strict";

  const config = window.SITE_CONFIG || {};
  const state = { catalog: null, groups: null, mode: "catalog", category: "all", query: "" };
  const $ = (selector) => document.querySelector(selector);

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const slugText = (value) => String(value ?? "").toLocaleLowerCase("es").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** exponent)).toLocaleString("es", { maximumFractionDigits: exponent ? 1 : 0 })} ${units[exponent]}`;
  };

  const getBaseUrl = () => String(config.releaseBaseUrl || "").replace(/\/$/, "");

  const downloadUrl = (assetName, localPath) => {
    const base = getBaseUrl();
    return base ? `${base}/${encodeURIComponent(assetName)}` : (localPath || "#");
  };

  const canDownload = () => Boolean(getBaseUrl());

  const downloadControl = (assetName, localPath, label = "Descargar", compact = false) => {
    if (!canDownload()) {
      return `<button class="download-button ${compact ? "compact" : ""}" type="button" disabled title="La publicación todavía no está conectada a un repositorio">${label}</button>`;
    }
    return `<a class="download-button ${compact ? "compact" : ""}" href="${escapeHtml(downloadUrl(assetName, localPath))}" download>${label}</a>`;
  };

  const typeIcon = (type) => ({ PDF: "PDF", Audio: "♫", Video: "▶", Imagen: "▧", Presentación: "▤", "Hoja de cálculo": "▦", "Documento Word": "W" }[type] || "•");

  const resourceMatches = (resource) => {
    const query = slugText(state.query);
    if (!query) return true;
    const haystack = slugText([resource.name, resource.categoryName, resource.section, resource.component, resource.groupId].join(" "));
    return haystack.includes(query);
  };

  const categoryMatches = (resource) => state.category === "all" || resource.categoryId === state.category;

  const resourceCard = (resource) => {
    const tag = resource.groupId ? "Instrumento" : resource.categoryName;
    return `<article class="resource-card">
      <div class="file-icon file-${escapeHtml(resource.type.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(typeIcon(resource.type))}</div>
      <div class="resource-body">
        <div class="resource-topline"><span class="file-type">${escapeHtml(resource.extension)}</span><span class="resource-tag">${escapeHtml(tag)}</span></div>
        <h4>${escapeHtml(resource.name)}</h4>
        <p>${escapeHtml(resource.section)}</p>
        <div class="resource-meta"><span>${escapeHtml(resource.sizeLabel)}</span>${resource.largeFile ? '<span class="large-mark">archivo grande</span>' : ""}</div>
      </div>
      <div class="resource-action">${downloadControl(resource.assetName, resource.localPath, "Descargar", true)}</div>
    </article>`;
  };

  const categoryBlock = (category, resources) => {
    const categoryResources = resources.filter((resource) => resource.categoryId === category.id);
    if (!categoryResources.length) return "";
    return `<section class="category-block" id="category-${escapeHtml(category.id)}">
      <div class="section-heading">
        <div><p class="eyebrow accent">COLECCIÓN</p><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description)}</p></div>
        <div class="section-heading-action">${downloadControl(category.packageAsset, "", "Descargar sección")}</div>
      </div>
      <div class="section-summary"><span>${categoryResources.length} recursos</span><span>·</span><span>${formatBytes(categoryResources.reduce((sum, resource) => sum + resource.sizeBytes, 0))}</span></div>
      <div class="resource-grid">${categoryResources.map(resourceCard).join("")}</div>
    </section>`;
  };

  const groupCard = (group, resourceMap) => {
    const resources = (group.resourceIds || []).map((id) => resourceMap.get(id)).filter(Boolean).filter(resourceMatches);
    if (state.query && !resources.length && !slugText(`${group.name} ${group.component}`).includes(slugText(state.query))) return "";
    const allResources = (group.resourceIds || []).map((id) => resourceMap.get(id)).filter(Boolean);
    return `<details class="test-card" ${state.query ? "open" : ""}>
      <summary><span class="test-mark">✦</span><span class="test-copy"><span class="test-component">${escapeHtml(group.component)}</span><strong>${escapeHtml(group.name)}</strong><small>${allResources.length} materiales · ${formatBytes(group.sizeBytes)}</small></span><span class="test-summary-action">${downloadControl(group.packageAsset, "", "Descargar test", true)}<span class="chevron">⌄</span></span></summary>
      <div class="test-materials">${resources.length ? resources.map(resourceCard).join("") : '<p class="empty-state">No hay coincidencias dentro de este instrumento.</p>'}</div>
    </details>`;
  };

  const renderNav = () => {
    $("#categoryNav").innerHTML = state.catalog.categories.map((category) => `<button class="nav-item ${state.mode === "catalog" && state.category === category.id ? "is-active" : ""}" data-mode="catalog" data-category="${escapeHtml(category.id)}"><span class="nav-icon">◇</span><span>${escapeHtml(category.name)}</span><small>${category.count}</small></button>`).join("");
    document.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode && (state.mode === "tests" || (button.dataset.category || "all") === state.category)));
  };

  const renderCatalog = () => {
    const visible = state.catalog.resources.filter(categoryMatches).filter(resourceMatches);
    if (!visible.length) {
      $("#catalogPanel").innerHTML = '<div class="empty-state large-empty"><span>⌕</span><h3>No encontramos recursos</h3><p>Prueba con otro término o cambia la categoría seleccionada.</p></div>';
      return;
    }
    const categories = state.category === "all" ? state.catalog.categories : state.catalog.categories.filter((category) => category.id === state.category);
    $("#catalogPanel").innerHTML = categories.map((category) => categoryBlock(category, visible)).join("");
  };

  const renderTests = () => {
    const resourceMap = new Map(state.catalog.resources.map((resource) => [resource.id, resource]));
    const cards = state.groups.groups.map((group) => groupCard(group, resourceMap)).filter(Boolean).join("");
    $("#testsPanel").innerHTML = `<div class="section-heading tests-heading"><div><p class="eyebrow accent">ORGANIZADOS POR INSTRUMENTO</p><h3>Instrumentos agrupados</h3><p>Consulta cada instrumento con sus manuales, cuadernillos, hojas y materiales relacionados.</p></div></div><div class="tests-list">${cards || '<div class="empty-state large-empty"><span>⌕</span><h3>No encontramos instrumentos</h3><p>Prueba con otro término de búsqueda.</p></div>'}</div>`;
  };

  const render = () => {
    const isTests = state.mode === "tests";
    $("#catalogPanel").classList.toggle("is-hidden", isTests);
    $("#testsPanel").classList.toggle("is-hidden", !isTests);
    $("#currentView").textContent = isTests ? "Instrumentos agrupados" : state.category === "all" ? "Todos los recursos" : (state.catalog.categories.find((category) => category.id === state.category)?.name || "Catálogo");
    document.querySelectorAll(".filter-chip").forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    renderNav();
    isTests ? renderTests() : renderCatalog();
  };

  const showSetupState = () => {
    const notice = $("#setupNotice");
    if (canDownload()) {
      notice.classList.add("is-hidden");
      return;
    }
    notice.classList.remove("is-hidden");
    notice.innerHTML = `<strong>Catálogo listo para publicar.</strong> Las descargas se activarán al conectar la página con el repositorio de distribución.`;
  };

  const bindEvents = () => {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mode]");
      if (button) {
        state.mode = button.dataset.mode;
        state.category = button.dataset.category || "all";
        render();
        if (window.innerWidth < 900) $("#sidebar").classList.remove("is-open");
      }
      if (event.target.closest("#mobileMenu")) { $("#sidebar").classList.add("is-open"); $("#mobileOverlay").classList.add("is-visible"); }
      if (event.target.closest("#mobileOverlay")) { $("#sidebar").classList.remove("is-open"); $("#mobileOverlay").classList.remove("is-visible"); }
    });
    $("#searchInput").addEventListener("input", (event) => { state.query = event.target.value; render(); });
  };

  const boot = async () => {
    try {
      const [catalogResponse, groupsResponse] = await Promise.all([fetch("resources.json"), fetch("test-groups.json")]);
      if (!catalogResponse.ok || !groupsResponse.ok) throw new Error("No se pudo cargar el catálogo");
      state.catalog = await catalogResponse.json();
      state.groups = await groupsResponse.json();
      $("#totalFiles").textContent = state.catalog.totalFiles.toLocaleString("es");
      $("#totalCategories").textContent = state.catalog.categories.length;
      $("#totalTests").textContent = state.groups.totalGroups;
      $("#totalSize").textContent = formatBytes(state.catalog.totalBytes);
      $("#catalogVersion").textContent = config.versionLabel || `versión ${state.catalog.version}`;
      showSetupState();
      bindEvents();
      render();
    } catch (error) {
      $("#catalogPanel").innerHTML = `<div class="empty-state large-empty"><span>!</span><h3>No se pudo cargar el catálogo</h3><p>${escapeHtml(error.message)}</p></div>`;
    }
  };

  boot();
})();

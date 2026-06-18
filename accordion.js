const accordionSections = document.querySelectorAll("main .section:not(.no-accordion)");

function getFixedMenuOffset() {
  const nav = document.querySelector(".top-nav");

  if (!nav) {
    return 0;
  }

  return nav.getBoundingClientRect().height + 14;
}

function openAccordionSection(section, shouldCloseOthers = false) {
  if (!section) {
    return;
  }

  if (shouldCloseOthers) {
    accordionSections.forEach((otherSection) => {
      if (otherSection !== section) {
        otherSection.classList.remove("open");
      }
    });
  }

  section.classList.add("open");
}

function scrollToSection(section) {
  if (!section) {
    return;
  }

  const top = section.getBoundingClientRect().top + window.scrollY - getFixedMenuOffset();

  window.scrollTo({
    top: top,
    behavior: "smooth"
  });
}

function openSectionFromHash(hash, shouldScroll = true) {
  if (!hash || hash === "#") {
    return false;
  }

  const sectionId = decodeURIComponent(hash.replace("#", ""));
  const section = document.getElementById(sectionId);

  if (!section || !section.classList.contains("accordion-section")) {
    return false;
  }

  openAccordionSection(section, true);

  if (shouldScroll) {
    setTimeout(() => scrollToSection(section), 40);
  }

  return true;
}

accordionSections.forEach((section, index) => {
  const title = section.querySelector("h2");

  if (!title) {
    return;
  }

  const icon = section.dataset.icon ? `<span class="accordion-title-icon">${section.dataset.icon}</span>` : "";

  const button = document.createElement("button");
  button.className = "accordion-title";
  button.type = "button";
  button.innerHTML = `
    <span class="accordion-title-main">${icon}<span>${title.textContent}</span></span>
    <span class="accordion-icon">⌄</span>
  `;

  title.replaceWith(button);

  const body = document.createElement("div");
  body.className = "accordion-body";

  while (button.nextSibling) {
    body.appendChild(button.nextSibling);
  }

  section.appendChild(body);
  section.classList.add("accordion-section");

  if (index === 0) {
    section.classList.add("open");
  }

  button.addEventListener("click", () => {
    section.classList.toggle("open");
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");

    if (!hash || hash === "#") {
      return;
    }

    const opened = openSectionFromHash(hash, true);

    if (opened) {
      event.preventDefault();
      history.pushState(null, "", hash);
    }
  });
});

window.addEventListener("hashchange", () => {
  openSectionFromHash(window.location.hash, true);
});

setTimeout(() => {
  openSectionFromHash(window.location.hash, true);
}, 80);

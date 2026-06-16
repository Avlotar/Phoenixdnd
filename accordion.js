const accordionSections = document.querySelectorAll("main .section");

accordionSections.forEach((section, index) => {
  const title = section.querySelector("h2");

  if (!title) {
    return;
  }

  const button = document.createElement("button");
  button.className = "accordion-title";
  button.type = "button";
  button.innerHTML = `
    <span>${title.textContent}</span>
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
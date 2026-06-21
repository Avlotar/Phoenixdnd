/* ============================= */
/* Сводка Гарда — отдельный скрипт */
/* Эта страница НЕ использует основной script.js */
/* ============================= */

const gamesCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vScdOaeIeH3w3Uo_Rvh-DX3yRbV4htmrFEM1oM5miAGl4rLnAlhMD1b8IYBtpAViWx3IJsCQd7lYPF9/pub?gid=0&single=true&output=csv";
const digestsCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vScdOaeIeH3w3Uo_Rvh-DX3yRbV4htmrFEM1oM5miAGl4rLnAlhMD1b8IYBtpAViWx3IJsCQd7lYPF9/pub?gid=320358313&single=true&output=csv";
const newsCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vScdOaeIeH3w3Uo_Rvh-DX3yRbV4htmrFEM1oM5miAGl4rLnAlhMD1b8IYBtpAViWx3IJsCQd7lYPF9/pub?gid=1011337459&single=true&output=csv";

/*
  Когда создадим новый лист для сводки, сюда нужно будет вставить его CSV-ссылку.
  Пример:
  const gardReportCsvUrl = "https://docs.google.com/spreadsheets/d/e/.../pub?gid=НОМЕР_ЛИСТА&single=true&output=csv";
*/
const gardReportCsvUrl = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      }
      continue;
    }

    currentCell += char;
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => String(cell).trim() !== ""));
}

function rowsToObjects(csvText) {
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => String(header ?? "").trim().replace(/\uFEFF/g, ""));

  return rows.slice(1).map((row) => {
    const item = {};

    headers.forEach((header, index) => {
      if (!header) {
        return;
      }

      item[header] = row[index] || "";
    });

    return item;
  });
}

async function fetchCsv(url) {
  if (!url) {
    return [];
  }

  const response = await fetch(`${url}&cacheBust=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить таблицу: ${url}`);
  }

  const text = await response.text();
  return rowsToObjects(text);
}

function setText(id, value) {
  const element = document.querySelector(`#${id}`);

  if (!element || !value) {
    return;
  }

  element.textContent = value;
}

function getLatestReport(reports) {
  if (!reports.length) {
    return null;
  }

  return reports
    .filter((report) => String(report.visible ?? "yes").toLowerCase() !== "no")
    .sort((a, b) => Number(b.id || b.issueNumber || 0) - Number(a.id || a.issueNumber || 0))[0];
}

function renderReport(report) {
  if (!report) {
    return;
  }

  setText("reportKicker", report.kicker || "Тавернная газета живого мира");
  setText("reportTitle", report.title || "Сводка от Гарда");
  setText("reportDate", report.date);
  setText("reportIssue", report.issueNumber ? `Выпуск ${report.issueNumber}` : "");
  setText("leadTitle", report.leadTitle);
  setText("leadText", report.leadText);
  setText("disasterTitle", report.disasterTitle);
  setText("disasterText", report.disasterText);
  setText("wellbeingTitle", report.wellbeingTitle);
  setText("wellbeingText", report.wellbeingText);
  setText("reportFooter", report.footerText);

  const omens = [report.omen1, report.omen2, report.omen3, report.omen4, report.omen5]
    .filter((omen) => String(omen ?? "").trim());

  if (omens.length) {
    document.querySelector("#omensList").innerHTML = omens
      .map((omen) => `<li>${escapeHtml(omen)}</li>`)
      .join("");
  }
}

function renderList(id, items, emptyText, mapItem) {
  const container = document.querySelector(`#${id}`);

  if (!container) {
    return;
  }

  if (!items.length) {
    container.innerHTML = `<p class="loading-note">${escapeHtml(emptyText)}</p>`;
    return;
  }

  container.innerHTML = items.map(mapItem).join("");
}

function normalizeDate(value) {
  return String(value ?? "").trim() || "Дата не указана";
}

function renderGames(games) {
  const visibleGames = games
    .filter((game) => String(game.title ?? "").trim())
    .slice(0, 5);

  renderList(
    "gamesColumn",
    visibleGames,
    "На доске пока нет игр для сводки.",
    (game) => {
      const title = escapeHtml(game.title || "Без названия");
      const date = escapeHtml(normalizeDate(game.date));
      const master = escapeHtml(game.master || "Мастер не указан");
      const seats = `${escapeHtml(game.freeSeats || "0")} / ${escapeHtml(game.totalSeats || "0")} мест`;

      return `
        <article class="paper-item">
          <h3>${title}</h3>
          <p>${date} • ${master} • ${seats}</p>
        </article>
      `;
    }
  );
}

function renderNews(news) {
  const visibleNews = news
    .filter((item) => String(item.title ?? "").trim())
    .slice(0, 4);

  renderList(
    "newsColumn",
    visibleNews,
    "Свежие новости пока не дошли до стойки.",
    (item) => {
      const title = escapeHtml(item.title || "Без названия");
      const type = escapeHtml(item.type || "Новость");
      const date = escapeHtml(normalizeDate(item.date));
      const description = escapeHtml(item.description || "");

      return `
        <article class="paper-item">
          <h3>${title}</h3>
          <p>${type} • ${date}</p>
          ${description ? `<p>${description}</p>` : ""}
        </article>
      `;
    }
  );
}

function renderDigests(digests) {
  const visibleDigests = digests
    .filter((item) => String(item.title ?? "").trim())
    .slice(0, 4);

  renderList(
    "digestsColumn",
    visibleDigests,
    "Архив хроник пока молчит.",
    (item) => {
      const title = escapeHtml(item.title || "Без названия");
      const date = escapeHtml(normalizeDate(item.date));
      const category = escapeHtml(item.category || "Хроника");

      return `
        <article class="paper-item">
          <h3>${title}</h3>
          <p>${category} • ${date}</p>
        </article>
      `;
    }
  );
}

async function initGardReport() {
  try {
    const [games, news, digests, reports] = await Promise.all([
      fetchCsv(gamesCsvUrl),
      fetchCsv(newsCsvUrl),
      fetchCsv(digestsCsvUrl),
      fetchCsv(gardReportCsvUrl).catch(() => [])
    ]);

    renderGames(games);
    renderNews(news);
    renderDigests(digests);
    renderReport(getLatestReport(reports));
  } catch (error) {
    console.error(error);

    renderList("gamesColumn", [], "Не удалось загрузить игры из таблицы.", () => "");
    renderList("newsColumn", [], "Не удалось загрузить новости из таблицы.", () => "");
    renderList("digestsColumn", [], "Не удалось загрузить дайджесты из таблицы.", () => "");
  }
}

initGardReport();

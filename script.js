const vkLink = "https://vk.com/phoenixdnd";

const googleSheetGvizUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vScdOaeIeH3w3Uo_Rvh-DX3yRbV4htmrFEM1oM5miAGl4rLnAlhMD1b8IYBtpAViWx3IJsCQd7lYPF9/gviz/tq?gid=0";
const googleSheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vScdOaeIeH3w3Uo_Rvh-DX3yRbV4htmrFEM1oM5miAGl4rLnAlhMD1b8IYBtpAViWx3IJsCQd7lYPF9/pub?gid=0&single=true&output=csv";
const googleDigestCsvUrl = "https://docs.google.com/spreadsheets/d/1yYN3bEeUVrbMzx09afUlC6-qJxljGGG-beEG8U7UZWo/edit?gid=320358313";

let games = [];

let digests = [];

let activeFilters = {
  status: "all",
  playFormat: "all",
  master: "all"
};

let calendarDate = new Date();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSafeUrl(value) {
  const rawUrl = String(value ?? "").trim();

  if (!rawUrl) {
    return vkLink;
  }

  try {
    const url = new URL(rawUrl);
    const isAllowedProtocol = url.protocol === "https:" || url.protocol === "http:";

    if (!isAllowedProtocol) {
      return vkLink;
    }

    return url.href;
  } catch (error) {
    return vkLink;
  }
}
function getSafeImageUrl(value) {
  const rawUrl = String(value ?? "").trim();

  if (!rawUrl) {
    return "";
  }

  const googleDriveFileMatch = rawUrl.match(/\/file\/d\/([^/]+)/);
  const googleDriveIdMatch = rawUrl.match(/[?&]id=([^&]+)/);

  const googleDriveFileId = googleDriveFileMatch?.[1] || googleDriveIdMatch?.[1];

  if (googleDriveFileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(googleDriveFileId)}&sz=w1200`;
  }

  try {
    const url = new URL(rawUrl);

    const isAllowedProtocol = url.protocol === "https:" || url.protocol === "http:";

    if (!isAllowedProtocol) {
      return "";
    }

    return url.href;
  } catch (error) {
    return "";
  }
}

function getSafeNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number) || number < 0) {
    return 0;
  }

  return number;
}

function getCellValue(cell) {
  if (!cell) {
    return "";
  }

  if (cell.f !== undefined && cell.f !== null) {
    return cell.f;
  }

  if (cell.v !== undefined && cell.v !== null) {
    return cell.v;
  }

  return "";
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\uFEFF/g, "");
}

function isOpenDate(dateText) {
  const normalizedDate = String(dateText).toLowerCase().trim();

  return normalizedDate === "открытая дата" ||
    normalizedDate === "дата открыта" ||
    normalizedDate === "открыто" ||
    normalizedDate === "";
}

function normalizeDateForDisplay(value) {
  const rawDate = String(value ?? "").trim();

  if (!rawDate || isOpenDate(rawDate)) {
    return "Открытая дата";
  }

  if (rawDate.includes(".")) {
    return rawDate;
  }

  if (rawDate.includes("-")) {
    const onlyDate = rawDate.split(" ")[0];
    const parts = onlyDate.split("-");

    if (parts.length >= 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];

      return `${day}.${month}.${year}`;
    }
  }

  return rawDate;
}

function normalizeTimeForDisplay(value) {
  const rawTime = String(value ?? "").trim();

  if (!rawTime) {
    return "19:00";
  }

  if (rawTime.includes(":")) {
    const parts = rawTime.split(":");
    const hours = parts[0];
    const minutes = parts[1];

    return `${hours}:${minutes}`;
  }

  return rawTime;
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

  return rows.filter((row) => {
    return row.some((cell) => String(cell).trim() !== "");
  });
}

function buildGameFromObject(game, index) {
  return {
    id: getSafeNumber(game.id) || Date.now() + index,
    type: game.type || "Ваншот",
    title: game.title || "Без названия",
    description: game.description || "",
    date: normalizeDateForDisplay(game.date),
    time: normalizeTimeForDisplay(game.time),
    master: game.master || "Не указан",
    level: game.level || "Не указан",
    price: game.price || game.prise || "Не указана",
    totalSeats: getSafeNumber(game.totalSeats),
    freeSeats: getSafeNumber(game.freeSeats),
    announcementUrl: getSafeUrl(game.announcementUrl),
    imageUrl: getSafeImageUrl(game.imageUrl),
    playFormat: game.playFormat || "Онлайн"
  };
}

function convertCsvToGames(csvText) {
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeHeader(header));

  return rows.slice(1).map((row, index) => {
    const game = {};

    headers.forEach((header, cellIndex) => {
      if (!header) {
        return;
      }

      game[header] = row[cellIndex] || "";
    });

    return buildGameFromObject(game, index);
  }).filter((game) => {
    return game.title && game.title !== "Без названия";
  });
}

function convertGoogleTableToGames(response) {
  if (!response || response.status !== "ok" || !response.table) {
    console.warn("Google Таблица вернула неожиданный ответ:", response);
    return [];
  }

  let headers = response.table.cols.map((column) => {
    return normalizeHeader(column.label);
  });

  let rows = response.table.rows || [];

  const normalHeaders = [
    "id",
    "type",
    "title",
    "description",
    "date",
    "time",
    "master",
    "level",
    "price",
    "totalSeats",
    "freeSeats",
    "announcementUrl"
  ];

  const hasNormalHeaders = headers.includes("title") && headers.includes("date");

  if (!hasNormalHeaders && rows.length > 0) {
    const firstRowAsHeaders = rows[0].c.map((cell) => {
      return normalizeHeader(getCellValue(cell));
    });

    const firstRowLooksLikeHeaders =
      firstRowAsHeaders.includes("title") &&
      firstRowAsHeaders.includes("date");

    if (firstRowLooksLikeHeaders) {
      headers = firstRowAsHeaders;
      rows = rows.slice(1);
    } else {
      headers = normalHeaders;
    }
  }

  return rows.map((row, index) => {
    const game = {};

    headers.forEach((header, cellIndex) => {
      if (!header) {
        return;
      }

      game[header] = getCellValue(row.c[cellIndex]);
    });

    return buildGameFromObject(game, index);
  }).filter((game) => {
    return game.title && game.title !== "Без названия";
  });
}

function showLoadingMessage(message) {
  const gamesList = document.querySelector("#gamesList");

  if (!gamesList) {
    return;
  }

  gamesList.innerHTML = `
    <div class="empty-message">
      ${escapeHtml(message)}
    </div>
  `;
}

function finishGamesLoading(loadedGames, sourceName) {
  games = loadedGames;
  console.log(`Игры загружены через ${sourceName}:`, games);
  renderAll();
}

function loadGamesFromGviz() {
  return new Promise((resolve, reject) => {
    const callbackName = `phoenixSheetCallback_${Date.now()}`;
    const script = document.createElement("script");

    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) {
        return;
      }

      finished = true;
      delete window[callbackName];
      script.remove();
      reject(new Error("GVIZ не ответил за 8 секунд"));
    }, 8000);

    window[callbackName] = function(response) {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();

      try {
        const loadedGames = convertGoogleTableToGames(response);
        resolve(loadedGames);
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = function() {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      reject(new Error("Не удалось загрузить Google Таблицу через GVIZ"));
    };

    script.src = `${googleSheetGvizUrl}&headers=1&tqx=out:json;responseHandler:${callbackName}&tq=${encodeURIComponent("select *")}&cacheBust=${Date.now()}`;

    document.body.appendChild(script);
  });
}

async function loadGamesFromCsv() {
  const response = await fetch(`${googleSheetCsvUrl}&cacheBust=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`CSV вернул ошибку: ${response.status}`);
  }

  const csvText = await response.text();
  return convertCsvToGames(csvText);
}

async function loadGamesFromGoogleSheet() {
  showLoadingMessage("Загружаю игры из Google Таблицы...");

  try {
    const gvizGames = await loadGamesFromGviz();

    if (gvizGames.length > 0) {
      finishGamesLoading(gvizGames, "GVIZ");
      return;
    }

    console.warn("GVIZ загрузился, но игр не нашёл. Пробую CSV...");
  } catch (error) {
    console.warn("GVIZ не сработал. Пробую CSV...", error);
  }

  try {
    const csvGames = await loadGamesFromCsv();

    if (csvGames.length > 0) {
      finishGamesLoading(csvGames, "CSV");
      return;
    }

    console.warn("CSV загрузился, но игр не нашёл.");
  } catch (error) {
    console.warn("CSV не сработал.", error);
  }

  games = [];
  renderAll();
  showLoadingMessage("Не удалось загрузить игры. Проверь публикацию Google Таблицы и первую строку с названиями колонок.");
}

function getGameStatus(game) {
  const freeSeats = getSafeNumber(game.freeSeats);

  if (freeSeats <= 0) {
    return "Мест нет";
  }

  return "Набор открыт";
}

function getStatusClass(status) {
  if (status === "Набор открыт") {
    return "status-open";
  }

  if (status === "Мест нет") {
    return "status-closed";
  }

  if (status === "Скоро") {
    return "status-soon";
  }

  return "status-default";
}

function parseGameDate(dateText) {
  if (isOpenDate(dateText)) {
    return null;
  }

  const rawDate = String(dateText).trim();

  if (rawDate.includes(".")) {
    const parts = rawDate.split(".");

    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = parts[2] ? Number(parts[2]) : calendarDate.getFullYear();

    if (!day || month < 0 || month > 11) {
      return null;
    }

    return new Date(year, month, day);
  }

  if (rawDate.includes("-")) {
    const onlyDate = rawDate.split(" ")[0];
    const parts = onlyDate.split("-");

    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);

    if (!day || month < 0 || month > 11 || !year) {
      return null;
    }

    return new Date(year, month, day);
  }

  return null;
}

function getFilteredGames() {
  let filteredGames = games;

  if (activeFilters.status !== "all") {
    filteredGames = filteredGames.filter((game) => {
      return getGameStatus(game) === activeFilters.status;
    });
  }

  if (activeFilters.playFormat !== "all") {
    filteredGames = filteredGames.filter((game) => {
      const gamePlayFormat = String(game.playFormat || "Онлайн").trim().toLowerCase();
      const selectedPlayFormat = String(activeFilters.playFormat).trim().toLowerCase();

      return gamePlayFormat === selectedPlayFormat;
    });
  }

  if (activeFilters.master !== "all") {
    filteredGames = filteredGames.filter((game) => {
      const gameMaster = String(game.master || "").trim().toLowerCase();
      const selectedMaster = String(activeFilters.master).trim().toLowerCase();

      return gameMaster === selectedMaster;
    });
  }

  return filteredGames;
}

function renderGames() {
  const gamesList = document.querySelector("#gamesList");
  const gamesCounter = document.querySelector("#gamesCounter");

  if (!gamesList) {
    return;
  }

  const filteredGames = getFilteredGames();

  if (gamesCounter) {
    gamesCounter.textContent = `Показано игр: ${filteredGames.length}`;
  }

  if (filteredGames.length === 0) {
    gamesList.innerHTML = `
      <div class="empty-message">
        Игр пока нет или Google Таблица ещё не загрузилась.
      </div>
    `;
    return;
  }

  gamesList.innerHTML = filteredGames.map((game) => {
    const status = getGameStatus(game);
    const statusClass = getStatusClass(status);
    const announcementUrl = getSafeUrl(game.announcementUrl);
    const imageUrl = getSafeImageUrl(game.imageUrl);
    const hasImageClass = imageUrl ? "has-image" : "";

    const safeImageForCss = imageUrl.replaceAll("'", "%27");
    const imageStyle = imageUrl ? `style="--game-image-url: url('${safeImageForCss}');"` : "";

    const descriptionBlock = game.description ? `
      <details class="game-description-details">
        <summary>Описание</summary>
        <p>${escapeHtml(game.description)}</p>
      </details>
    ` : "";

    return `
      <div class="game-card ${hasImageClass}" ${imageStyle}>
        <div class="game-card-content">
          <div class="game-card-top">
            <p class="game-type">${escapeHtml(game.type)}</p>
            <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
          </div>

          <h3>${escapeHtml(game.title)}</h3>

          ${descriptionBlock}

          <div class="game-meta">
  <span>📅 ${escapeHtml(game.date)}</span>
  <span>🕖 ${escapeHtml(game.time)}</span>
  <span>📍 ${escapeHtml(game.playFormat)}</span>
  <span>🎭 ${escapeHtml(game.master)}</span>
  <span>⭐ ${escapeHtml(game.level)}</span>
  <span>💰 ${escapeHtml(game.price)}</span>
  <span>🪑 ${escapeHtml(game.freeSeats)} / ${escapeHtml(game.totalSeats)} мест</span>
</div>

          <a class="button game-button" href="${announcementUrl}" target="_blank" rel="noopener noreferrer">
            Анонс / запись ВК
          </a>
        </div>
      </div>
    `;
  }).join("");
}

function renderSchedule() {
  const scheduleBox = document.querySelector("#scheduleBox");

  if (!scheduleBox) {
    return;
  }

  const filteredGames = getFilteredGames();

  scheduleBox.innerHTML = `
    <div class="schedule-row schedule-head">
      <strong>Дата</strong>
      <span>Игра</span>
      <span>Время</span>
      <span>Статус</span>
    </div>

    ${filteredGames.map((game) => {
      const status = getGameStatus(game);
      const statusClass = getStatusClass(status);

      return `
        <div class="schedule-row">
          <strong>${escapeHtml(game.date)}</strong>
          <span>${escapeHtml(game.title)}</span>
          <span>${escapeHtml(game.time)}</span>
          <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
        </div>
      `;
    }).join("")}
  `;
}

function renderCalendar() {
  const calendarTitle = document.querySelector("#calendarTitle");
  const calendarGrid = document.querySelector("#calendarGrid");

  if (!calendarTitle || !calendarGrid) {
    return;
  }

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  calendarTitle.textContent = `${monthNames[month]} ${year}`;

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let firstWeekDay = firstDayOfMonth.getDay();

  if (firstWeekDay === 0) {
    firstWeekDay = 7;
  }

  const emptyCellsBefore = firstWeekDay - 1;
  const daysInMonth = lastDayOfMonth.getDate();

  let calendarHtml = "";

  for (let i = 0; i < emptyCellsBefore; i++) {
    calendarHtml += `<div class="calendar-day calendar-empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const gamesOnThisDay = games.filter((game) => {
      const parsedDate = parseGameDate(game.date);

      if (!parsedDate) {
        return false;
      }

      return parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month &&
        parsedDate.getDate() === day;
    });

    const hasGames = gamesOnThisDay.length > 0;
    const dayClass = hasGames ? "calendar-day busy-day" : "calendar-day free-day";
    const dayLabel = hasGames ? "Игра" : "Свободно";

    calendarHtml += `
      <div class="${dayClass}">
        <div class="calendar-day-number">${day}</div>
        <div class="calendar-day-label">${dayLabel}</div>

        ${gamesOnThisDay.map((game) => {
          const status = getGameStatus(game);
          const statusClass = getStatusClass(status);

          return `
            <div class="calendar-game">
              <strong>${escapeHtml(game.title)}</strong>
              <span>${escapeHtml(game.time)}</span>
              <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  calendarGrid.innerHTML = calendarHtml;
}

function renderOpenDateGames() {
  const openDateGamesList = document.querySelector("#openDateGamesList");

  if (!openDateGamesList) {
    return;
  }

  const openDateGames = games.filter((game) => isOpenDate(game.date));

  if (openDateGames.length === 0) {
    openDateGamesList.innerHTML = `
      <div class="empty-message">
        Игр с открытой датой пока нет.
      </div>
    `;
    return;
  }

  openDateGamesList.innerHTML = openDateGames.map((game) => {
    const status = getGameStatus(game);
    const statusClass = getStatusClass(status);

    return `
      <div class="open-date-game">
        <div>
          <strong>${escapeHtml(game.title)}</strong>
          <p>${escapeHtml(game.master)} • ${escapeHtml(game.time)} • ${escapeHtml(game.freeSeats)} / ${escapeHtml(game.totalSeats)} мест</p>
        </div>

        <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
      </div>
    `;
  }).join("");
}
function buildDigestFromObject(digest, index) {
  return {
    id: getSafeNumber(digest.id) || Date.now() + index,
    title: digest.title || "Без названия",
    description: digest.description || "",
    date: normalizeDateForDisplay(digest.date),
    link: getSafeUrl(digest.link),
    category: digest.category || "Общее"
  };
}

function convertCsvToDigests(csvText) {
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);

  return rows.slice(1)
    .map((row, index) => {
      const digest = {};

      headers.forEach((header, columnIndex) => {
        digest[header] = row[columnIndex] || "";
      });

      return buildDigestFromObject(digest, index);
    })
    .filter((digest) => digest.title && digest.link);
}

function renderDigests() {
  const digestSelect = document.querySelector("#digestSelect");
  const digestPreview = document.querySelector("#digestPreview");

  if (!digestSelect || !digestPreview) {
    return;
  }

  if (digests.length === 0) {
    digestSelect.innerHTML = `<option value="">Дайджесты пока не загружены</option>`;
    digestPreview.innerHTML = `
      <p class="digest-empty">
        Дайджесты пока не найдены или Google Таблица ещё не обновилась.
      </p>
    `;
    return;
  }

  digestSelect.innerHTML = `
    <option value="">Выберите дайджест</option>
    ${digests.map((digest) => `
      <option value="${escapeHtml(digest.id)}">
        ${escapeHtml(digest.title)}
      </option>
    `).join("")}
  `;

  digestPreview.innerHTML = `
    <p class="digest-empty">
      Выберите дайджест из списка, чтобы открыть описание и ссылку.
    </p>
  `;

  digestSelect.addEventListener("change", () => {
    const selectedId = getSafeNumber(digestSelect.value);
    const selectedDigest = digests.find((digest) => digest.id === selectedId);

    if (!selectedDigest) {
      digestPreview.innerHTML = `
        <p class="digest-empty">
          Выберите дайджест из списка, чтобы открыть описание и ссылку.
        </p>
      `;
      return;
    }

    digestPreview.innerHTML = `
      <article class="digest-card">
        <p class="digest-category">${escapeHtml(selectedDigest.category)}</p>
        <h3>${escapeHtml(selectedDigest.title)}</h3>
        <p class="digest-date">📅 ${escapeHtml(selectedDigest.date)}</p>
        <p>${escapeHtml(selectedDigest.description)}</p>

        <a class="button digest-button" href="${selectedDigest.link}" target="_blank" rel="noopener noreferrer">
          Открыть дайджест
        </a>
      </article>
    `;
  });
}

async function loadDigestsFromGoogleSheet() {
  const digestSelect = document.querySelector("#digestSelect");
  const digestPreview = document.querySelector("#digestPreview");

  if (!digestSelect || !digestPreview) {
    return;
  }

  try {
    digestSelect.innerHTML = `<option value="">Загружаем дайджесты...</option>`;

    const response = await fetch(googleDigestCsvUrl);

    if (!response.ok) {
      throw new Error("Не удалось загрузить таблицу дайджестов");
    }

    const csvText = await response.text();
    digests = convertCsvToDigests(csvText);

    renderDigests();
  } catch (error) {
    console.error(error);

    digestSelect.innerHTML = `<option value="">Ошибка загрузки</option>`;
    digestPreview.innerHTML = `
      <p class="digest-empty">
        Не удалось загрузить дайджесты. Проверь ссылку на Google Таблицу.
      </p>
    `;
  }
}
function bindCalendarButtons() {
  const prevMonthButton = document.querySelector("#prevMonthButton");
  const nextMonthButton = document.querySelector("#nextMonthButton");

  if (prevMonthButton) {
    prevMonthButton.addEventListener("click", () => {
      calendarDate.setMonth(calendarDate.getMonth() - 1);
      renderCalendar();
      renderOpenDateGames();
    });
  }

  if (nextMonthButton) {
    nextMonthButton.addEventListener("click", () => {
      calendarDate.setMonth(calendarDate.getMonth() + 1);
      renderCalendar();
      renderOpenDateGames();
    });
  }
}

function bindFilterButtons() {
  const statusFilter = document.querySelector("#statusFilter");
  const playFormatFilter = document.querySelector("#playFormatFilter");
  const masterFilter = document.querySelector("#masterFilter");
  const resetFiltersButton = document.querySelector("#resetFilters");

  function applyDropdownFilters() {
    activeFilters.status = statusFilter ? statusFilter.value : "all";
    activeFilters.playFormat = playFormatFilter ? playFormatFilter.value : "all";
    activeFilters.master = masterFilter ? masterFilter.value : "all";

    renderAll();
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", applyDropdownFilters);
  }

  if (playFormatFilter) {
    playFormatFilter.addEventListener("change", applyDropdownFilters);
  }

  if (masterFilter) {
    masterFilter.addEventListener("change", applyDropdownFilters);
  }

  if (resetFiltersButton) {
    resetFiltersButton.addEventListener("click", () => {
      activeFilters.status = "all";
      activeFilters.playFormat = "all";
      activeFilters.master = "all";

      if (statusFilter) {
        statusFilter.value = "all";
      }

      if (playFormatFilter) {
        playFormatFilter.value = "all";
      }

      if (masterFilter) {
        masterFilter.value = "all";
      }

      renderAll();
    });
  }
}

function bindSoonButtons() {
  const soonButtons = document.querySelectorAll(".soon");

  soonButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const serviceName = button.dataset.soon;
      alert(`${serviceName} скоро появится.`);
    });
  });
}

function renderAll() {
  renderGames();
  renderSchedule();
  renderCalendar();
  renderOpenDateGames();
}

renderAll();
bindCalendarButtons();
bindFilterButtons();
bindSoonButtons();
loadGamesFromGoogleSheet();
loadDigestsFromGoogleSheet();
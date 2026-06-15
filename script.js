const vkLink = "https://vk.com/phoenixdnd";

const googleSheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vScdOaeIeH3w3Uo_Rvh-DX3yRbV4htmrFEM1oM5miAGl4rLnAlhMD1b8IYBtpAViWx3IJsCQd7lYPF9/pub?gid=0&single=true&output=csv";

let games = [];

let activeFilter = {
  type: "all",
  value: "all"
};

let calendarDate = new Date();

/*
  Защита текста.
  Всё, что приходит из Google Таблицы, сначала превращаем в безопасный текст.
  Так вредный HTML/JS не сможет выполниться на странице.
*/
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  Защита ссылок.
  Мы разрешаем только нормальные https/http ссылки.
  Если ссылка битая или странная — ведём на основную группу ВК.
*/
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

/*
  Числа тоже приводим к безопасному виду.
*/
function getSafeNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number) || number < 0) {
    return 0;
  }

  return number;
}

/*
  CSV-парсер.
  Он нужен, чтобы правильно читать Google Таблицу,
  даже если в описании есть запятые или кавычки.
*/
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

  return rows;
}

function convertCsvToGames(csvText) {
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((row, index) => {
    const game = {};

    headers.forEach((header, cellIndex) => {
      game[header] = row[cellIndex] || "";
    });

    return {
      id: getSafeNumber(game.id) || Date.now() + index,
      type: game.type || "Ваншот",
      title: game.title || "Без названия",
      description: game.description || "",
      date: game.date || "Открытая дата",
      time: game.time || "19:00",
      master: game.master || "Не указан",
      level: game.level || "Не указан",
      price: game.price || "Не указана",
      totalSeats: getSafeNumber(game.totalSeats),
      freeSeats: getSafeNumber(game.freeSeats),
      announcementUrl: getSafeUrl(game.announcementUrl)
    };
  }).filter((game) => game.title && game.title !== "Без названия");
}

async function loadGamesFromGoogleSheet() {
  try {
    const response = await fetch(`${googleSheetCsvUrl}&cacheBust=${Date.now()}`);

    if (!response.ok) {
      throw new Error("Не удалось загрузить Google Таблицу");
    }

    const csvText = await response.text();
    games = convertCsvToGames(csvText);
  } catch (error) {
    console.warn("Не удалось загрузить Google Таблицу.", error);
    games = [];
  }

  renderAll();
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

function isOpenDate(dateText) {
  const normalizedDate = String(dateText).toLowerCase().trim();

  return normalizedDate === "открытая дата" ||
    normalizedDate === "дата открыта" ||
    normalizedDate === "открыто" ||
    normalizedDate === "";
}

function parseGameDate(dateText) {
  if (isOpenDate(dateText)) {
    return null;
  }

  const parts = String(dateText).split(".");

  if (parts.length < 2) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = parts[2] ? Number(parts[2]) : calendarDate.getFullYear();

  if (!day || month < 0 || month > 11) {
    return null;
  }

  return new Date(year, month, day);
}

function getFilteredGames() {
  if (activeFilter.type === "all") {
    return games;
  }

  if (activeFilter.type === "status") {
    return games.filter((game) => getGameStatus(game) === activeFilter.value);
  }

  if (activeFilter.type === "master") {
    return games.filter((game) => game.master === activeFilter.value);
  }

  return games;
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

    return `
      <div class="game-card">
        <div class="game-card-top">
          <p class="game-type">${escapeHtml(game.type)}</p>
          <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
        </div>

        <h3>${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.description)}</p>

        <div class="game-meta">
          <span>📅 ${escapeHtml(game.date)}</span>
          <span>🕖 ${escapeHtml(game.time)}</span>
          <span>🎭 ${escapeHtml(game.master)}</span>
          <span>⭐ ${escapeHtml(game.level)}</span>
          <span>💰 ${escapeHtml(game.price)}</span>
          <span>🪑 ${escapeHtml(game.freeSeats)} / ${escapeHtml(game.totalSeats)} мест</span>
        </div>

        <a class="button game-button" href="${announcementUrl}" target="_blank" rel="noopener noreferrer">
          Анонс / запись ВК
        </a>
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
  const filterButtons = document.querySelectorAll(".filter-button");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      activeFilter = {
        type: button.dataset.filter,
        value: button.dataset.value
      };

      renderGames();
      renderSchedule();
    });
  });
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
(function () {
  "use strict";

  const SEASONS = ["Лето", "Осень", "Зима", "Весна"];
  const SEASON_ICONS = ["☀", "◉", "❄", "✿"];
  const EMPTY_COUNTS = { accepted: 0, completed: 0, cancelled: 0, hired: 0, fired: 0 };
  const HOUSE_CARDS = [
    { name: "Дом на Садовой", address: "ул. Садовая, 12", area: 8 }, { name: "Дом у парка", address: "ул. Парковая, 5", area: 10 }, { name: "Дом на Речной", address: "наб. Речная, 8", area: 12 },
    { name: "Дом на площади", address: "пл. Центральная, 3", area: 15 }, { name: "Дом у вокзала", address: "ул. Вокзальная, 21", area: 20 }
  ];
  const INITIAL_STATE = { turn: 1, year: 1, seasonIndex: 0, capital: 100, reputation: 1, houses: 1, area: 10, houseName: "Первый дом", houseAddress: "ул. Центральная, 1", baseMaintenance: 30, houseDebt: 0, collectionStats: { billed: 0, collected: 0, periods: 0 }, houseDeck: [], phase: "staffing", hiresThisTurn: 0, pendingHireIds: [], pendingFireActions: {}, lawyerActionTaken: false, lawyerActionsUsed: [], requests: [], cancelledRequests: [], penalties: [], compensations: [], employees: [], market: [], log: [], deck: [], yearStats: { capitalStart: 100, ...EMPTY_COUNTS }, totals: { ...EMPTY_COUNTS } };
  const TARIFF = 10;
  const BANKRUPTCY_THRESHOLD = -500;
  const DEV_MODE = new URLSearchParams(window.location.search).has("dev");
  const SAVE_KEY = DEV_MODE ? "domouprav-game-dev-v1" : "domouprav-game-v1";
  const ROLES = {
    plumber: { name: "Сантехник", category: "Сантехника", salary: 20, productivity: 3, icon: "⌁", kind: "executor" },
    electrician: { name: "Электрик", category: "Электрика", salary: 15, productivity: 3, icon: "ϟ", kind: "executor" },
    janitor: { name: "Дворник", category: "Уборка", salary: 15, productivity: 4, icon: "⌖", kind: "executor" },
    handyman: { name: "Разнорабочий", category: "Общестрой", salary: 20, productivity: 5, icon: "⚒", kind: "executor" },
    lawyer: { name: "Юрист", category: null, salary: 20, productivity: 0, icon: "§", kind: "specialist", detail: "Взыскание долгов и снижение требований" },
    hr: { name: "HR-менеджер", category: null, salary: 20, productivity: 0, icon: "♙", kind: "specialist", detail: "Снимает лимит найма, вводит испытательный срок" },
    accountant: { name: "Бухгалтер", category: null, salary: 20, productivity: 0, icon: "▤", kind: "specialist", detail: "Суммирует задолженность дома за периоды" }
  };
  const CARDS = [
    { title: "Перегорела лампа", category: "Электрика", description: "Жильцы сообщают, что не горит лампа на лестничной площадке.", labor: 1, cost: 15, materialCost: 3, icon: "✳" },
    { title: "Протекает кран", category: "Сантехника", description: "В квартире капает кран. Вода расходуется, жильцы ждут ремонта.", labor: 1, cost: 25, materialCost: 5, icon: "⌁" },
    { title: "Сломан доводчик", category: "Общестрой", description: "Входная дверь не закрывается самостоятельно и хлопает от сквозняка.", labor: 2, cost: 30, materialCost: 8, icon: "⌑" },
    { title: "Мусор во дворе", category: "Уборка", description: "После выходных во дворе остались пакеты и бытовой мусор.", labor: 1, cost: 20, materialCost: 0, icon: "⌖" },
    { title: "Засорилась труба", category: "Сантехника", description: "Вода медленно уходит в кухонной раковине на первом этаже.", labor: 3, cost: 40, materialCost: 10, icon: "⌁" },
    { title: "Не работает домофон", category: "Электрика", description: "Жильцы не могут открыть входную дверь с домофона.", labor: 2, cost: 35, materialCost: 6, icon: "⌗" },
    { title: "Яма у подъезда", category: "Общестрой", description: "На дорожке у входа появилась небольшая выбоина.", labor: 3, cost: 45, materialCost: 12, icon: "⌖" },
    { title: "Разбито окно", category: "Общестрой", description: "На лестничной площадке разбито стекло, в подъезде холодно.", labor: 3, cost: 50, materialCost: 15, icon: "▦" },
    { title: "Грязная лестничная клетка", category: "Уборка", description: "Жильцы просят убрать лестничную площадку и пролет.", labor: 2, cost: 30, materialCost: 3, icon: "⌖" },
    { title: "Искрит выключатель", category: "Электрика", description: "В коридоре искрит выключатель, жильцы опасаются короткого замыкания.", labor: 2, cost: 35, materialCost: 5, icon: "ϟ" },
    { title: "Обрыв провода в подъезде", category: "Электрика", description: "Повреждённый провод искрит на лестничной площадке — нужна срочная изоляция.", labor: 2, cost: 45, materialCost: 8, type: "emergency", icon: "ϟ" },
    { title: "Прорыв трубы в подвале", category: "Сантехника", description: "Вода быстро заливает техническое помещение. Аварийная бригада нужна немедленно.", labor: 3, cost: 55, materialCost: 15, type: "emergency", icon: "⌁" },
    { title: "Протечка затопила квартиру", category: "Сантехника", description: "Авария повредила отделку квартиры. Требуется устранить протечку и компенсировать ущерб жильцам.", labor: 3, cost: 60, materialCost: 15, damageCompensation: 80, type: "emergencyDamage", icon: "⌁" },
    { title: "Установить розетку в квартире", category: "Электрика", description: "Жилец заказал монтаж дополнительной розетки.", labor: 2, cost: 30, materialCost: 8, payout: 65, type: "paid", icon: "✳" },
    { title: "Заменить смеситель в квартире", category: "Сантехника", description: "Платная замена смесителя по заявке собственника.", labor: 2, cost: 35, materialCost: 12, payout: 75, type: "paid", icon: "⌁" },
    { title: "Закрепить карниз в квартире", category: "Общестрой", description: "Жилец заказал мелкий монтаж и крепление карниза.", labor: 1, cost: 20, materialCost: 5, payout: 45, type: "paid", icon: "⚒" }
  ];

  const elements = {
    turn: document.getElementById("turn-label"), round: document.getElementById("round-number"), capital: document.getElementById("capital-value"), stickyCapital: document.getElementById("sticky-capital-value"),
    capitalFill: document.getElementById("capital-bar-fill"), houses: document.getElementById("houses-value"), area: document.getElementById("area-value"),
    income: document.getElementById("income-value"), collection: document.getElementById("collection-value"), payrollValue: document.getElementById("payroll-value"), count: document.getElementById("request-count"), list: document.getElementById("requests-list"),
    hint: document.getElementById("requests-hint"), draw: document.getElementById("draw-button"), end: document.getElementById("end-turn-button"),
    title: document.getElementById("action-title"), copy: document.getElementById("action-copy"), log: document.getElementById("event-log"), toast: document.getElementById("toast"),
    market: document.getElementById("market-list"), marketCopy: document.getElementById("market-copy"), staffCount: document.getElementById("staff-count"),
    team: document.getElementById("team-list"), payroll: document.getElementById("team-payroll"), timelineYear: document.getElementById("timeline-year"),
    seasonTrack: document.getElementById("season-track"), phaseLabel: document.getElementById("phase-label"), annualReport: document.getElementById("annual-report"), cancelled: document.getElementById("cancelled-value"), reputation: document.getElementById("reputation-value"), upkeep: document.getElementById("upkeep-value"),
    bankruptcyPanel: document.getElementById("bankruptcy-panel"), penalties: document.getElementById("penalties-list"), penaltySummary: document.getElementById("penalties-summary"),
    legalPanel: document.getElementById("legal-panel"), houseDebt: document.getElementById("house-debt-value"), houseCard: document.getElementById("house-card")
  };

  let state = loadState();
  let toastTimer;

  function normalizeState(saved) {
    const normalized = { ...INITIAL_STATE, ...saved };
    normalized.reputation = Number.isFinite(saved.reputation) ? saved.reputation : 1;
    normalized.year = Number.isInteger(saved.year) ? saved.year : Math.floor((normalized.turn - 1) / 4) + 1;
    normalized.seasonIndex = Math.max(0, Math.min(3, Number.isInteger(saved.seasonIndex) ? saved.seasonIndex : (normalized.turn - 1) % 4));
    normalized.yearStats = { capitalStart: normalized.capital, ...EMPTY_COUNTS, ...(saved.yearStats || {}) };
    normalized.totals = { ...EMPTY_COUNTS, ...(saved.totals || {}) };
    normalized.baseMaintenance = Number.isFinite(normalized.baseMaintenance) ? normalized.baseMaintenance : 30;
    normalized.houseDebt = Number.isFinite(normalized.houseDebt) ? normalized.houseDebt : 0;
    normalized.houseDebtRecoverable = Number.isFinite(saved.houseDebtRecoverable) ? saved.houseDebtRecoverable : normalized.houseDebt;
    normalized.houseDebtIrrecoverable = Number.isFinite(saved.houseDebtIrrecoverable) ? saved.houseDebtIrrecoverable : 0;
    normalized.collectionStats = { ...INITIAL_STATE.collectionStats, ...(saved.collectionStats || {}) };
    Object.keys(INITIAL_STATE.collectionStats).forEach(key => { if (!Number.isFinite(normalized.collectionStats[key])) normalized.collectionStats[key] = 0; });
    normalized.hiresThisTurn = Number.isInteger(saved.hiresThisTurn) ? saved.hiresThisTurn : (Array.isArray(saved.employees) ? saved.employees : []).filter(employee => employee.hiredTurn === normalized.turn).length;
    normalized.lawyerActionTaken = Boolean(normalized.lawyerActionTaken);
    normalized.pendingHireIds = Array.isArray(saved.pendingHireIds) ? saved.pendingHireIds : [];
    normalized.pendingFireActions = saved.pendingFireActions && typeof saved.pendingFireActions === "object" ? saved.pendingFireActions : {};
    normalized.lawyerActionsUsed = Array.isArray(saved.lawyerActionsUsed) ? saved.lawyerActionsUsed : [];
    normalized.houseName = normalized.houseName || "Первый дом";
    normalized.houseAddress = normalized.houseAddress || (HOUSE_CARDS.find(house => house.name === normalized.houseName)?.address || INITIAL_STATE.houseAddress);
    normalized.houseDeck = (Array.isArray(normalized.houseDeck) ? normalized.houseDeck : shuffle([...HOUSE_CARDS])).map(house => ({ ...house, address: house.address || HOUSE_CARDS.find(item => item.name === house.name)?.address || INITIAL_STATE.houseAddress }));
    normalized.bankruptcyCount = Number.isInteger(normalized.bankruptcyCount) ? normalized.bankruptcyCount : 0;
    normalized.cancelledRequests = Array.isArray(normalized.cancelledRequests) ? normalized.cancelledRequests : [];
    normalized.penalties = Array.isArray(normalized.penalties) ? normalized.penalties : [];
    normalized.compensations = Array.isArray(normalized.compensations) ? normalized.compensations : [];
    normalized.employees = Array.isArray(normalized.employees) ? normalized.employees.map(employee => {
      const role = ROLES[employee.role] || ROLES.handyman;
      return { ...employee, salary: role.salary, productivity: role.productivity, probationTurns: Number.isInteger(employee.probationTurns) ? employee.probationTurns : 0, assignedLabor: employee.assignedLabor ?? (employee.usedThisTurn ? 1 : 0), unhappy: Boolean(employee.unhappy), unhappyNextTurn: Boolean(employee.unhappyNextTurn), unpaidOvertime: Boolean(employee.unpaidOvertime) };
    }) : [];
    normalized.market = Array.isArray(normalized.market) ? normalized.market : [];
    normalized.deck = Array.isArray(normalized.deck) ? normalized.deck : [];
    normalized.requests = Array.isArray(normalized.requests) ? normalized.requests.map(card => ({
      ...card,
      category: ({ "Освещение": "Электрика", "Водоснабжение": "Сантехника", "Благоустройство": "Общестрой", "Подъезд": "Общестрой", "Безопасность": "Электрика" })[card.category] || card.category || "Общестрой",
      labor: Math.max(1, Math.min(3, card.labor || 1)), materialCost: card.type === "paid" ? 0 : (Number.isFinite(card.materialCost) ? card.materialCost : 0),
      type: ["ordinary", "emergency", "emergencyDamage", "paid"].includes(card.type) ? card.type : "ordinary",
      damageCompensation: Number.isFinite(card.damageCompensation) ? (card.resolved && !Array.isArray(saved.compensations) ? 0 : card.damageCompensation) : 0,
      payout: Number.isFinite(card.payout) ? card.payout : 0,
      receivedTurn: card.receivedTurn ?? normalized.turn,
      houseName: card.houseName || normalized.houseName
    })) : [];
    normalized.cancelledRequests = normalized.cancelledRequests.map(card => ({ ...card, houseName: card.houseName || normalized.houseName }));
    const compensationRequestIds = new Set(normalized.compensations.map(item => item.requestId));
    normalized.requests.filter(card => !card.resolved && !card.cancelled && card.damageCompensation > 0 && !compensationRequestIds.has(card.id)).forEach(card => {
      const claim = { id: `comp-${card.id}`, requestId: card.id, title: card.title, amount: card.damageCompensation, year: normalized.year, paid: false, writtenOff: false };
      normalized.compensations.push(claim);
      card.compensationId = claim.id;
    });
    normalized.log = Array.isArray(normalized.log) ? normalized.log : [];
    if (!["staffing", "drawing", "resolving", "legal", "annualReport", "bankruptcy"].includes(normalized.phase)) normalized.phase = "staffing";
    // A previously saved base-game turn already has its requests; proceed to resolving it.
    if (normalized.phase === "drawing" && normalized.requests.length) normalized.phase = "resolving";
    return normalized;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && Number.isInteger(saved.turn) && Number.isFinite(saved.capital) && Array.isArray(saved.requests) && Array.isArray(saved.log)) return normalizeState(saved);
    } catch (_) { /* Start a fresh game if saved data is unavailable. */ }
    const fresh = normalizeState({ ...INITIAL_STATE, log: [{ text: "Компания открыла первый дом под управлением.", turn: 1 }] });
    fresh.market = makeMarket();
    return fresh;
  }

  function saveState() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function money(value) { return new Intl.NumberFormat("ru-RU").format(value); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
  function requestTypeLabel(type) { return ({ ordinary: "Обычная", emergency: "Аварийная", emergencyDamage: "Аварийная · ущерб", paid: "Платная" })[type] || "Обычная"; }
  function isEmergency(card) { return card.type === "emergency" || card.type === "emergencyDamage"; }
  function requestMoneyCost(card) {
    const specialist = Object.values(ROLES).find(role => role.category === card.category);
    return (specialist?.salary || 20) + (card.type === "paid" ? 0 : (card.materialCost || 0)) + 10;
  }
  function registerDamageClaim(card) {
    if (!card.damageCompensation || state.compensations.some(claim => claim.requestId === card.id)) return;
    const claim = { id: `comp-${card.id}`, requestId: card.id, title: card.title, amount: card.damageCompensation, year: state.year, houseName: state.houseName, paid: false, writtenOff: false };
    card.compensationId = claim.id;
    state.compensations.push(claim);
  }
  function unpaidFineTotal() { return state.penalties.filter(penalty => !penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared).reduce((sum, penalty) => sum + penalty.amount, 0); }
  function unpaidCompensationTotal() { return state.compensations.filter(claim => !claim.paid && !claim.writtenOff).reduce((sum, claim) => sum + claim.amount, 0); }
  function hasNoDebts() { return state.capital >= 0 && unpaidFineTotal() === 0 && unpaidCompensationTotal() === 0; }
  function hasLawyer() { return state.employees.some(employee => employee.role === "lawyer"); }
  function hasHR() { return state.employees.some(employee => employee.role === "hr"); }
  function hasAccountant() { return state.employees.some(employee => employee.role === "accountant"); }
  function pendingHireHasHR() { return state.pendingHireIds.some(id => state.market.some(candidate => candidate.id === id && candidate.role === "hr")); }
  function activeLawyers() { return state.employees.filter(employee => employee.role === "lawyer"); }
  function lawyersDone() { const lawyers = activeLawyers(); return !lawyers.length || lawyers.every(employee => state.lawyerActionsUsed.includes(employee.id)); }
  function markLawyerDone(employeeId) { if (!state.lawyerActionsUsed.includes(employeeId)) state.lawyerActionsUsed.push(employeeId); state.lawyerActionTaken = lawyersDone(); }
  function renderCompanyDebt() {
    const total = state.houseDebtRecoverable + state.houseDebtIrrecoverable;
    const yellow = Math.min(state.houseDebtRecoverable, activeLawyers().length * 30);
    const red = Math.max(0, state.houseDebtRecoverable - yellow);
    const black = state.houseDebtIrrecoverable;
    elements.houseDebt.innerHTML = `<div class="debt-total">${money(total)} ₽ <small>общий долг</small></div><div class="debt-bar" role="img" aria-label="Можно отсудить ${money(red)} рублей, доступно юристам сейчас ${money(yellow)} рублей, невозвратный долг ${money(black)} рублей"><i class="debt-segment debt-red" style="width:${total ? red / total * 100 : 0}%"></i><i class="debt-segment debt-yellow" style="width:${total ? yellow / total * 100 : 0}%"></i><i class="debt-segment debt-black" style="width:${total ? black / total * 100 : 0}%"></i></div><div class="debt-legend"><span>Можно отсудить ${money(red)} ₽</span><span>Юристы могут взыскать сейчас ${money(yellow)} ₽</span><span>Не возместить ${money(black)} ₽</span></div>`;
  }
  function effectiveSalary(employee) { return employee.salary * (employee.probationTurns > 0 ? 0.5 : 1); }
  function shuffle(cards) { for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; } return cards; }
  function addLog(text) { state.log.unshift({ text, turn: state.turn }); state.log = state.log.slice(0, 30); }
  function countEvent(name, amount = 1) { state.yearStats[name] += amount; state.totals[name] += amount; }

  function effectiveProductivity(employee) { return Math.max(1, employee.productivity - (employee.unhappy ? 1 : 0)); }
  function overtimeFor(employee, additionalLabor) {
    const productivity = employee.productivity;
    const oldOvertime = Math.max(0, employee.assignedLabor - productivity);
    const newOvertime = Math.max(0, employee.assignedLabor + additionalLabor - productivity);
    const additionalOvertime = newOvertime - oldOvertime;
    const hrMultiplier = hasHR() ? 0.5 : 1;
    const premium = Math.round(additionalOvertime * employee.salary / productivity * 100) / 100;
    return { laborAfter: employee.assignedLabor + additionalLabor, overtime: newOvertime, premium: premium * hrMultiplier };
  }

  function render() {
    const baseIncome = state.area * TARIFF;
    const payroll = state.employees.reduce((sum, employee) => sum + effectiveSalary(employee), 0);
    const unresolved = state.requests.filter(card => !card.resolved && !card.cancelled);
    const newRequests = state.requests.filter(card => card.receivedTurn === state.turn).length;
    const carried = unresolved.filter(card => card.receivedTurn !== state.turn).length;
    elements.turn.textContent = state.phase === "annualReport" ? `ОТЧЁТ · ${state.year} ГОД` : `${SEASONS[state.seasonIndex]} · ГОД ${state.year}`;
    elements.round.textContent = `${state.seasonIndex + 1}/4`;
    elements.timelineYear.textContent = `Год ${state.year}`;
    elements.seasonTrack.innerHTML = SEASONS.map((season, index) => `<div class="season-node ${index < state.seasonIndex || state.phase === "annualReport" ? "season-done" : ""} ${index === state.seasonIndex && state.phase !== "annualReport" ? "season-current" : ""}"><span class="season-icon">${SEASON_ICONS[index]}</span><span>${season}</span><i></i></div>`).join("");
    const phaseNames = { staffing: "Найм и увольнение", drawing: "Приём заявок", resolving: "Выполнение заявок", legal: "Работа юриста", annualReport: "Годовой отчёт", bankruptcy: "Объявление банкротства" };
    elements.phaseLabel.textContent = phaseNames[state.phase];
    const activeStep = { staffing: 0, drawing: 1, resolving: 2, legal: 3, annualReport: 4, bankruptcy: 5 }[state.phase];
    document.querySelectorAll(".phase-step").forEach((step, index) => { step.classList.toggle("active", index === activeStep); step.classList.toggle("phase-done", index < activeStep); });
    elements.annualReport.hidden = state.phase !== "annualReport";
    elements.bankruptcyPanel.hidden = state.phase !== "bankruptcy";
    elements.legalPanel.hidden = state.phase !== "legal";
    if (state.phase === "annualReport") renderAnnualReport();
    if (state.phase === "bankruptcy") renderBankruptcy();
    if (state.phase === "legal") renderLegalPanel();
    elements.capital.innerHTML = `${money(state.capital)} <span>₽</span>`;
    if (elements.stickyCapital) elements.stickyCapital.textContent = `${money(state.capital)} ₽`;
    elements.capital.classList.toggle("negative", state.capital < 0);
    elements.reputation.textContent = `${state.reputation > 0 ? "+" : ""}${state.reputation}`;
    elements.reputation.classList.toggle("negative", state.reputation < 0);
    elements.capitalFill.style.width = `${Math.max(0, Math.min(100, state.capital / 500 * 100))}%`;
    elements.houses.innerHTML = `${state.houses} <span>${state.houses === 1 ? "дом" : "дома"}</span>`;
    elements.area.innerHTML = `${money(state.area)} <span>м²</span>`;
    elements.income.innerHTML = `${money(baseIncome)} <span>₽</span>`;
    if (elements.collection) elements.collection.textContent = `${state.lastCollectionRate ?? "—"}%`;
    elements.cancelled.innerHTML = `${money(state.yearStats.cancelled)} <span>заявок</span>`;
    elements.upkeep.innerHTML = `${money(state.houses * state.baseMaintenance)} <span>₽</span>`;
    if (elements.payrollValue) elements.payrollValue.innerHTML = `${money(payroll)} <span>₽</span>`;
    elements.penaltySummary.textContent = `Обязательства: ${money(unpaidFineTotal() + unpaidCompensationTotal())} ₽`;
    renderCompanyDebt();
    elements.count.textContent = state.phase === "resolving" ? `${newRequests} новых · ${carried} перенесено` : `${unresolved.length} перенесено`;
    elements.hint.textContent = state.phase === "staffing" ? "Сначала найми или уволь сотрудников" : state.phase === "drawing" ? "Прими новые заявки, чтобы продолжить ход" : state.phase === "legal" ? "Выбери работу для юриста" : unresolved.length ? "Решай заявки специалистами или деньгами" : "Все заявки этого хода решены";
    elements.draw.disabled = !["staffing", "drawing"].includes(state.phase);
    elements.draw.querySelector("span:first-child").textContent = state.phase === "staffing" ? `Применить кадровые изменения${state.pendingHireIds.length || Object.keys(state.pendingFireActions).length ? " и продолжить" : ""}` : state.phase === "drawing" ? "Принять заявки" : "Компания закрыта";
    elements.end.disabled = state.phase === "legal" ? !lawyersDone() : state.phase !== "resolving";
    elements.end.querySelector("span:first-child").textContent = state.phase === "resolving" && hasLawyer() ? "Распределение завершено · к юристу" : "Выплатить зарплаты и завершить";
    elements.title.textContent = state.phase === "bankruptcy" ? "Нужна новая управляющая компания" : state.phase === "annualReport" ? "Год завершён" : state.phase === "legal" ? "Реши, что делает юрист" : state.phase === "staffing" ? "Собери команду" : state.phase === "drawing" ? "Прими заявки" : unresolved.length ? "Разбираем заявки" : "Заявки решены";
    elements.copy.textContent = state.phase === "bankruptcy" ? "Баланс достиг −500 ₽. Текущая компания не может продолжать работу." : state.phase === "annualReport" ? "Просмотри результаты года. Все незакрытые заявки отменены; после отчёта начнётся лето нового года." : state.phase === "legal" ? "Каждый юрист выполняет одно поручение за ход." : state.phase === "staffing" ? "Добавляй сотрудников в кадровый пул или отмечай увольнение. Изменения применятся при переходе дальше; до этого их можно отменить." : state.phase === "drawing" ? "Кадровые изменения применены. Теперь открой заявки жильцов." : unresolved.length ? "Распределяй заявки в пределах продуктивности или назначай переработку за премию. Любую заявку можно оплатить." : "Переходи к выплате зарплат и базового обслуживания.";
    elements.staffCount.textContent = `${state.employees.length} В ШТАТЕ`;
    elements.payroll.textContent = `Зарплатный фонд: ${money(payroll)} ₽ / ход`;
    elements.marketCopy.textContent = state.phase === "staffing" ? `Выбранные сотрудники попадут в кадровый пул до перехода к заявкам. ${hasHR() || pendingHireHasHR() ? "HR снимает лимит; новые сотрудники два хода получают половину зарплаты." : "Без HR можно выбрать до двух новых сотрудников."}` : "Рынок закрыт до начала следующего хода.";
    const guideStep = { staffing: 0, drawing: 1, resolving: 2, legal: 3 }[state.phase] ?? -1;
    document.querySelectorAll("[data-guide-step]").forEach((step, index) => {
      step.classList.toggle("guide-current", index === guideStep);
      step.classList.toggle("guide-done", guideStep > index);
      step.classList.toggle("guide-skipped", index === 3 && guideStep > 2 && !hasLawyer());
    });
    renderHouseCard(); renderPenalties(); renderMarket(); renderTeam(); renderRequests(); renderLog();
    if (DEV_MODE) renderDevTools();
  }

  function renderHouseCard() {
    if (!elements.houseCard) return;
    const active = state.requests.filter(card => !card.resolved && !card.cancelled);
    const cancelled = state.cancelledRequests.filter(card => card.houseName === state.houseName);
    const requestRows = (cards, empty) => cards.length
      ? cards.map(card => `<li><span>${escapeHtml(card.title)}</span><small>${escapeHtml(card.category)} · ${requestTypeLabel(card.type)}</small></li>`).join("")
      : `<li class="house-request-empty">${empty}</li>`;
    const totalCollection = state.collectionStats.billed > 0 ? Math.round(state.collectionStats.collected / state.collectionStats.billed * 100) : null;
    elements.houseCard.innerHTML = `<div class="house-card-heading"><div><p class="section-label">КАРТОЧКА ДОМА</p><h2>${escapeHtml(state.houseName)}</h2></div><span class="house-card-mark">⌂</span></div><div class="house-card-stats"><div><span>Адрес</span><b>${escapeHtml(state.houseAddress)}</b></div><div><span>Площадь</span><b>${money(state.area)} м²</b></div><div><span>Тариф</span><b>${money(TARIFF)} ₽ / м²</b></div><div><span>Собираемость · текущая</span><b>${state.lastCollectionRate == null ? "—" : `${state.lastCollectionRate}%`}</b></div><div><span>Собираемость · общая</span><b>${totalCollection == null ? "—" : `${totalCollection}%`}</b></div><div><span>Долг дома</span><b>${money(state.houseDebt)} ₽</b></div><div><span>Базовое обслуживание</span><b>${money(state.houses * state.baseMaintenance)} ₽ / ход</b></div></div><div class="house-request-columns"><div><h3>Действующие заявки <span>${active.length}</span></h3><ul>${requestRows(active, "Нет действующих заявок")}</ul></div><div><h3>Отменённые заявки <span>${cancelled.length}</span></h3><ul>${requestRows(cancelled, "Нет отменённых заявок")}</ul></div></div>`;
  }

  function renderDevTools() {
    const panel = document.getElementById("dev-tools-panel");
    if (!panel) return;
    panel.hidden = false;
    if (!panel.dataset.controlsBound) {
      panel.dataset.controlsBound = "true";
      panel.querySelectorAll("[data-dev-action]").forEach(button => button.addEventListener("click", () => runDevAction(button.dataset.devAction)));
    }
    const form = document.getElementById("dev-request-form");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "true";
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!["staffing", "drawing", "resolving"].includes(state.phase)) {
        showToast("Добавлять заявки можно только во время игрового хода.");
        return;
      }
      const data = new FormData(form);
      const type = String(data.get("type"));
      const damageCompensation = type === "emergencyDamage" ? Number(data.get("damageCompensation") || 0) : 0;
      const card = {
        id: `dev-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: String(data.get("title")).trim(),
        description: String(data.get("description")).trim(),
        category: String(data.get("category")),
        type,
        labor: Number(data.get("labor")),
        cost: 0,
        materialCost: type === "paid" ? 0 : Number(data.get("materialCost") || 0),
        damageCompensation,
        payout: type === "paid" ? Number(data.get("payout") || 0) : 0,
        icon: type === "emergencyDamage" ? "⚠" : type === "emergency" ? "ϟ" : type === "paid" ? "₽" : "✎",
        resolved: false,
        cancelled: false,
        receivedTurn: state.turn,
        houseName: state.houseName
      };
      card.cost = requestMoneyCost(card);
      state.requests.push(card);
      registerDamageClaim(card);
      countEvent("accepted");
      addLog(`DEV: добавлена заявка «${card.title}» (${requestTypeLabel(card.type)}).`);
      if (["staffing", "drawing"].includes(state.phase)) state.phase = "resolving";
      saveState(); render(); showToast(`Тестовая заявка добавлена: ${card.title}`);
      form.reset();
      document.getElementById("dev-labor").value = "1";
      document.getElementById("dev-material").value = "0";
      document.getElementById("dev-damage").value = "0";
      document.getElementById("dev-payout").value = "0";
      updateDevRequestFields();
    });
    document.getElementById("dev-type").addEventListener("change", updateDevRequestFields);
    updateDevRequestFields();
  }

  function runDevAction(action) {
    if (action === "reputation-up") state.reputation += 1;
    else if (action === "reputation-down") state.reputation -= 1;
    else if (action === "capital-up") state.capital += 10;
    else if (action === "capital-down") state.capital -= 10;
    else if (action === "reroll-market") state.market = makeMarket();
    else if (action === "clear-fines") {
      const removed = state.penalties.length;
      state.penalties = [];
      addLog(`DEV: очищены штрафы (${removed}).`);
      saveState(); render(); showToast(`Штрафы очищены: ${removed}`);
      return;
    } else if (action === "clear-requests") {
      const activeRequests = state.requests.filter(card => !card.resolved && !card.cancelled);
      const activeIds = new Set(activeRequests.map(card => card.id));
      const active = activeRequests.length;
      state.requests = state.requests.filter(card => card.resolved || card.cancelled);
      state.compensations = state.compensations.filter(claim => !activeIds.has(claim.requestId));
      addLog(`DEV: удалены действующие заявки (${active}).`);
      saveState(); render(); showToast(`Действующие заявки удалены: ${active}`);
      return;
    } else return;
    if (action === "capital-down") checkBankruptcy();
    addLog(`DEV: ${action.startsWith("reputation") ? `репутация ${state.reputation > 0 ? "+" : ""}${state.reputation}` : action.startsWith("capital") ? `бюджет ${money(state.capital)} ₽` : "рынок труда переброшен"}.`);
    saveState(); render();
    showToast(action.startsWith("reputation") ? `Репутация: ${state.reputation > 0 ? "+" : ""}${state.reputation}` : action.startsWith("capital") ? `Бюджет: ${money(state.capital)} ₽` : "Рынок труда обновлён.");
  }

  function updateDevRequestFields() {
    const type = document.getElementById("dev-type")?.value;
    const damageField = document.getElementById("dev-damage-field");
    const payoutField = document.getElementById("dev-payout-field");
    const materialField = document.getElementById("dev-material-field");
    const costHint = document.getElementById("dev-cost-hint");
    if (damageField) damageField.hidden = type !== "emergencyDamage";
    if (payoutField) payoutField.hidden = type !== "paid";
    if (materialField) materialField.hidden = type === "paid";
    if (costHint) costHint.textContent = type === "paid" ? "Цена подрядчика: зарплата категории + 10 ₽; материалы не нужны" : "Цена подрядчика: зарплата категории + материалы + 10 ₽";
  }

  function renderMarket() {
    elements.market.innerHTML = state.market.map(candidate => {
      const role = ROLES[candidate.role];
      const hired = state.pendingHireIds.includes(candidate.id);
      const hireLimit = !hasHR() && !pendingHireHasHR() && state.pendingHireIds.filter(id => state.market.some(person => person.id === id && person.role !== "hr")).length >= 2 && candidate.role !== "hr";
      const detail = role.kind === "specialist" ? role.detail : `${role.category} · продуктивность ${role.productivity}`;
      const offeredSalary = role.salary * (hasHR() || pendingHireHasHR() ? 0.5 : 1);
      return `<article class="worker-card ${hired ? "worker-selected" : ""}"><div class="worker-icon">${role.icon}</div><div class="worker-info"><strong>${role.name}</strong><span>${detail}</span><span>${money(offeredSalary)} ₽ / ход${hasHR() || pendingHireHasHR() ? " · 2 хода испытательного срока" : ""}</span></div><button class="hire-button" data-hire="${escapeHtml(candidate.id)}" ${state.phase !== "staffing" || (!hired && hireLimit) ? "disabled" : ""}>${hired ? "Убрать из пула" : "В пул найма"}</button></article>`;
    }).join("");
    elements.market.querySelectorAll("[data-hire]").forEach(button => button.addEventListener("click", () => toggleHire(button.dataset.hire)));
  }

  function renderTeam() {
    const employeeCards = new Map(state.employees.map(employee => {
      const role = ROLES[employee.role];
      const unhappy = employee.unhappy;
      const employeeDetails = role.kind === "specialist" ? `<span>Специалист · ${role.detail}</span>` : `<span>${role.category}</span><span>Продуктивность: ${effectiveProductivity(employee)} / ${employee.productivity} · назначено ${employee.assignedLabor} трудозатрат</span>`;
      const probation = employee.probationTurns > 0 ? `<span class="probation-note">Испытательный срок · осталось ${employee.probationTurns} хода</span>` : "";
      const status = role.kind === "specialist" ? "Специалист" : unhappy ? "Недоволен · −1 продуктивность" : employee.unpaidOvertime ? "Ждёт решения по премии" : "Исполнитель";
      const currentSalary = effectiveSalary(employee);
      const years = Math.max(0, Math.floor((state.turn - (employee.hiredTurn || 1)) / 4));
      const pending = state.pendingFireActions[employee.id];
      const card = `<article class="team-member role-${role.kind} ${unhappy ? "team-unhappy" : ""} ${employee.probationTurns > 0 ? "team-probation" : ""} ${pending ? "team-pending-fire" : ""}"><div class="worker-icon">${role.icon}</div><div class="worker-info"><strong>${role.name}</strong>${employeeDetails}${probation}<span>${years} ${years === 1 ? "год" : years > 1 && years < 5 ? "года" : "лет"} в компании · ${money(currentSalary)} ₽ / ход${employee.probationTurns > 0 ? " · половина ставки" : ""}</span></div><span class="worker-status ${unhappy ? "unhappy" : employee.unpaidOvertime ? "used" : "available"}">${pending ? `В пуле на увольнение · ${pending === "paid" ? "с выплатой" : "без выплаты"}` : status}</span><div class="fire-actions">${pending ? `<button class="fire-button" data-fire-cancel="${escapeHtml(employee.id)}">Вернуть в штат</button>` : `<button class="fire-button" data-fire="${escapeHtml(employee.id)}" data-pay="true" ${state.phase !== "staffing" ? "disabled" : ""}>В пул · с выплатой</button><button class="fire-unpaid-button" data-fire="${escapeHtml(employee.id)}" data-pay="false" ${state.phase !== "staffing" ? "disabled" : ""}>В пул · без выплаты</button>`}</div></article>`;
      return [employee.id, card];
    }));
    const roleOrders = { specialist: ["lawyer", "accountant", "hr"], executor: ["plumber", "electrician", "handyman", "janitor"] };
    const renderRole = role => {
      const employees = state.employees.filter(employee => employee.role === role);
      const roleInfo = ROLES[role];
      return `<article class="staff-role ${employees.length ? "role-occupied" : "role-vacant"}"><h4>${roleInfo.name}</h4>${employees.length ? employees.map(employee => employeeCards.get(employee.id)).join("") : '<div class="vacancy-label">Свободная вакансия</div>'}</article>`;
    };
    const roleGroup = (kind, title) => {
      const roles = roleOrders[kind];
      const orderedRoles = roles.filter(role => state.employees.some(employee => employee.role === role)).concat(roles.filter(role => !state.employees.some(employee => employee.role === role)));
      return `<section class="staff-block staff-${kind}"><h3>${title}</h3><div class="role-grid">${orderedRoles.map(renderRole).join("")}</div></section>`;
    };
    elements.team.innerHTML = `${roleGroup("specialist", "СПЕЦИАЛИСТЫ")}${roleGroup("executor", "ИСПОЛНИТЕЛИ")}`;
    elements.team.querySelectorAll("[data-fire]").forEach(button => button.addEventListener("click", () => fireEmployee(button.dataset.fire, button.dataset.pay === "true")));
    elements.team.querySelectorAll("[data-fire-cancel]").forEach(button => button.addEventListener("click", () => toggleFire(button.dataset.fireCancel, null)));
  }

  function renderPenalties() {
    const damageClaims = [...state.compensations].reverse();
    if (!state.penalties.length && !damageClaims.length) {
      elements.penalties.innerHTML = '<div class="penalties-empty">Штрафов и компенсаций пока нет.</div>';
      return;
    }
    const fineRows = [...state.penalties].reverse().map(penalty => {
      const status = penalty.paid ? "Выплачен" : penalty.writtenOff ? "Списан при банкротстве" : penalty.lawyerCleared ? "Снят юристом" : penalty.reducedByLawyer ? "Снижен юристом · к оплате" : "К оплате";
      return `<article class="penalty-row ${penalty.paid ? "penalty-paid" : penalty.writtenOff ? "penalty-written-off" : "penalty-due"}"><div class="penalty-icon">${penalty.paid ? "✓" : penalty.writtenOff ? "↺" : "!"}</div><div class="penalty-info"><strong>Штраф трудовой инспекции · ${escapeHtml(penalty.employeeName)}</strong><span>Последняя зарплата ${money(penalty.salary)} ₽ × 3 · год ${penalty.year}${penalty.reducedByLawyer ? ` · исходно ${money(penalty.originalAmount)} ₽` : ""}</span></div><b class="penalty-amount">${money(penalty.amount)} ₽</b><span class="penalty-status">${status}</span>${!penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared ? `<button class="pay-penalty-button" type="button" data-penalty="${escapeHtml(penalty.id)}" ${state.phase === "bankruptcy" || state.capital < penalty.amount ? "disabled" : ""}>Выплатить</button>` : ""}</article>`;
    });
    const compensationRows = damageClaims.map(claim => {
      const status = claim.paid ? "Выплачена" : claim.writtenOff ? "Списана при банкротстве" : claim.amount === 0 ? "Снята юристом" : claim.reducedByLawyer ? "Снижена юристом · к оплате" : "К оплате отдельно";
      return `<article class="penalty-row penalty-compensation ${claim.paid ? "penalty-paid" : claim.writtenOff ? "penalty-written-off" : ""}"><div class="penalty-icon">◇</div><div class="penalty-info"><strong>Компенсация ущерба · ${escapeHtml(claim.title)}</strong><span>Обязательство по аварийной заявке${claim.reducedByLawyer ? ` · исходно ${money(claim.originalAmount)} ₽` : ""}</span></div><b class="penalty-amount">${money(claim.amount)} ₽</b><span class="penalty-status">${status}</span>${!claim.paid && !claim.writtenOff && claim.amount > 0 ? `<button class="pay-penalty-button" type="button" data-compensation="${escapeHtml(claim.id)}" ${state.phase === "bankruptcy" || state.capital < claim.amount ? "disabled" : ""}>Выплатить</button>` : ""}</article>`;
    });
    elements.penalties.innerHTML = [...fineRows, ...compensationRows].join("");
    elements.penalties.querySelectorAll("[data-penalty]").forEach(button => button.addEventListener("click", () => payPenalty(button.dataset.penalty)));
    elements.penalties.querySelectorAll("[data-compensation]").forEach(button => button.addEventListener("click", () => payCompensation(button.dataset.compensation)));
  }

  function renderLegalPanel() {
    const reductionTargets = [
      ...state.penalties.filter(penalty => !penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared).map(penalty => ({ type: "fine", id: penalty.id, title: `Штраф инспекции · ${penalty.employeeName}`, amount: penalty.amount, contestedBy: penalty.contestedBy || [] })),
      ...state.compensations.filter(claim => !claim.paid && !claim.writtenOff && claim.amount > 0).map(claim => ({ type: "compensation", id: claim.id, title: `Компенсация · ${claim.title}`, amount: claim.amount, contestedBy: claim.contestedBy || [] }))
    ];
    const lawyers = activeLawyers();
    const lawyerBlocks = lawyers.map((lawyer, number) => {
      const done = state.lawyerActionsUsed.includes(lawyer.id);
      const debt = state.houseDebtRecoverable > 0 ? `<article class="legal-option"><div><strong>Взыскать долг с дома</strong><span>До ${money(Math.min(30, state.houseDebtRecoverable))} ₽ · взыскиваемый долг ${money(state.houseDebtRecoverable)} ₽</span></div><button type="button" class="legal-action-button" data-lawyer="debt" data-lawyer-id="${escapeHtml(lawyer.id)}" ${done ? "disabled" : ""}>Взыскать</button></article>` : "";
      const claims = reductionTargets.map(target => `<article class="legal-option"><div><strong>${escapeHtml(target.title)}</strong><span>Текущая сумма: ${money(target.amount)} ₽ · шанс снижения 50%</span></div><button type="button" class="legal-action-button" data-lawyer="reduce" data-lawyer-id="${escapeHtml(lawyer.id)}" data-target-type="${target.type}" data-target-id="${escapeHtml(target.id)}" ${done || target.contestedBy.includes(lawyer.id) ? "disabled" : ""}>Оспорить</button></article>`).join("");
      return `<section class="lawyer-task"><h3>${escapeHtml(ROLES[lawyer.role].name)} ${number + 1}${done ? " · задача закрыта" : " · выбери одну задачу"}</h3>${debt}${claims || (!debt ? '<div class="legal-empty">Нет доступных поручений</div>' : "")}${!done ? `<button class="legal-skip-button" data-lawyer-skip="${escapeHtml(lawyer.id)}" type="button">Пропустить задачу</button>` : ""}</section>`;
    }).join("");
    elements.legalPanel.innerHTML = `<div class="legal-heading"><div><p class="section-label">ЗАДАЧИ ЮРИСТАМ</p><h2>Одно поручение на каждого юриста</h2></div><span class="legal-mark">§</span></div><p class="legal-copy">Каждому юристу можно назначить отдельную задачу. Конкретный юрист может оспорить каждый штраф или компенсацию только один раз.</p><div class="legal-options">${lawyerBlocks}</div>${lawyersDone() ? '<div class="legal-complete">Все поручения выполнены или пропущены. Можно завершить сезон.</div>' : ""}`;
    elements.legalPanel.querySelectorAll('[data-lawyer="debt"]').forEach(button => button.addEventListener("click", () => collectHouseDebt(button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll('[data-lawyer="reduce"]').forEach(button => button.addEventListener("click", () => reduceLiability(button.dataset.targetType, button.dataset.targetId, button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll("[data-lawyer-skip]").forEach(button => button.addEventListener("click", () => skipLawyerAction(button.dataset.lawyerSkip)));
  }

  function collectHouseDebt(lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId) || !activeLawyers().some(employee => employee.id === lawyerId) || state.houseDebtRecoverable <= 0) return;
    const recovered = Math.min(30, state.houseDebtRecoverable);
    state.houseDebtRecoverable -= recovered;
    state.houseDebt -= recovered;
    state.capital += recovered;
    markLawyerDone(lawyerId);
    addLog(`Юрист взыскал с дома ${money(recovered)} ₽ задолженности.`);
    saveState(); render(); showToast(`Юрист взыскал ${money(recovered)} ₽`);
  }

  function reduceLiability(targetType, targetId, lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId) || !activeLawyers().some(employee => employee.id === lawyerId)) return;
    const fine = targetType === "fine" ? state.penalties.find(item => item.id === targetId && !item.paid && !item.writtenOff && !item.lawyerCleared) : null;
    const claim = targetType === "compensation" ? state.compensations.find(item => item.id === targetId && !item.paid && !item.writtenOff && item.amount > 0) : null;
    const currentAmount = fine ? fine.amount : claim ? claim.amount : 0;
    if (!currentAmount || (fine?.contestedBy || claim?.contestedBy || []).includes(lawyerId)) return;
    if (fine) { fine.contestedBy = [...(fine.contestedBy || []), lawyerId]; } else { claim.contestedBy = [...(claim.contestedBy || []), lawyerId]; }
    markLawyerDone(lawyerId);
    if (Math.random() < 0.5) {
      const reductionPercent = 10 + Math.floor(Math.random() * 41);
      const reduction = Math.min(currentAmount, Math.max(1, Math.floor(currentAmount * reductionPercent / 100)));
      if (fine) {
        fine.originalAmount = fine.originalAmount || fine.amount;
        fine.amount -= reduction;
        fine.reducedByLawyer = true;
        fine.lawyerCleared = fine.amount === 0;
      } else {
        claim.originalAmount = claim.originalAmount || claim.amount;
        claim.amount -= reduction;
        claim.reducedByLawyer = true;
        const request = state.requests.find(item => item.id === claim.requestId);
        if (request) request.damageCompensation = claim.amount;
      }
      addLog(`Юрист успешно оспорил ${fine ? "штраф" : "компенсацию"}: −${money(reduction)} ₽ (${reductionPercent}%).`);
      saveState(); render(); showToast(`Успех: сумма снижена на ${money(reduction)} ₽`);
    } else {
      addLog(`Юрист не смог снизить ${fine ? "штраф" : "компенсацию"}; сумма не изменилась.`);
      saveState(); render(); showToast("Оспаривание не удалось.");
    }
  }

  function skipLawyerAction(lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId)) return;
    markLawyerDone(lawyerId);
    addLog(`Игрок пропустил поручение юриста ${roleName("lawyer")}.`);
    saveState(); render();
  }

  function renderRequests() {
    if (!state.requests.length) {
      elements.list.innerHTML = '<div class="empty-state"><div class="empty-icon">↘</div><div><strong>Новый день начинается</strong><p>После найма прими заявки, чтобы узнать, что случилось в доме.</p></div></div>';
      return;
    }
    elements.list.innerHTML = state.requests.map((card, index) => {
      const cashPrice = requestMoneyCost(card);
      if (card.cancelled) return `<article class="request-card request-cancelled"><div class="request-icon">×</div><div class="request-info"><div class="request-meta"><span>${escapeHtml(card.category)}</span><span class="request-type-badge type-${card.type}">${requestTypeLabel(card.type)}</span><span class="cancelled-label">ОТМЕНЕНА</span></div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p></div><div class="request-cost"><b>${card.labor} трудозатрат</b><span>${money(cashPrice)} ₽ · не выполнена</span></div></article>`;
      const workers = state.employees.filter(employee => employee.role && ROLES[employee.role].category === card.category && (!employee.unhappy || employee.assignedLabor + card.labor <= effectiveProductivity(employee)));
      const isCarried = card.receivedTurn !== state.turn;
      return `<article class="request-card ${card.resolved ? "resolved" : ""}">
        <div class="request-icon">${escapeHtml(card.icon)}</div><div class="request-info"><div class="request-meta"><span>${escapeHtml(card.category)}</span><span class="request-type-badge type-${card.type}">${requestTypeLabel(card.type)}</span><span class="labor-badge">${card.labor} трудозатрат</span>${card.resolved ? '<span class="resolved-label">РЕШЕНО</span>' : isCarried ? '<span class="carried-label">С ПРОШЛОГО ХОДА</span>' : ""}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p></div>
        <div class="request-cost"><b>${money(cashPrice)} ₽</b><span>${card.type === "paid" ? `Подрядчик · доход +${money(card.payout)} ₽` : "Подрядчик · зарплата + материалы + 10 ₽"}</span>${card.materialCost ? `<span class="material-note">Материалы: ${money(card.materialCost)} ₽</span>` : ""}${card.damageCompensation ? `<span class="damage-note">Компенсация оплачивается отдельно</span>` : ""}${card.payout ? `<span class="payout-note">Доход при выполнении: +${money(card.payout)} ₽</span>` : ""}${card.resolved ? '<span class="done-check">✓</span>' : `<div class="request-actions">${workers.map(worker => {
          const plan = overtimeFor(worker, card.labor);
          const disabled = state.phase !== "resolving";
          const label = plan.premium ? `${roleName(worker.role)} · премия ${money(plan.premium)} ₽` : `${roleName(worker.role)} (${worker.assignedLabor + card.labor}/${effectiveProductivity(worker)})`;
          const workerCost = plan.premium + card.materialCost;
          return `<button type="button" class="staff-solve-button" data-worker="${escapeHtml(worker.id)}" data-index="${index}" ${disabled || state.capital < workerCost ? "disabled" : ""}>Сотрудник: ${label}${card.materialCost ? ` · материалы ${money(card.materialCost)} ₽` : ""}${card.damageCompensation ? " · компенсация отдельно" : ""}${card.payout ? ` · доход +${money(card.payout)} ₽` : ""}</button>${plan.premium ? `<button type="button" class="overtime-unpaid-button" data-worker="${escapeHtml(worker.id)}" data-index="${index}" ${disabled || state.capital < card.materialCost ? "disabled" : ""}>Без премии · недовольство${card.materialCost ? ` · материалы ${money(card.materialCost)} ₽` : ""}${card.damageCompensation ? " · компенсация отдельно" : ""}${card.payout ? ` · доход +${money(card.payout)} ₽` : ""}</button>` : ""}`;
        }).join("")}<button type="button" class="solve-button" data-index="${index}" ${state.phase !== "resolving" || state.capital < cashPrice ? "disabled" : ""}>${card.type === "paid" ? "Подрядчик" : "Оплатить подрядчику"} <span>↗</span></button>${isEmergency(card) ? '<span class="emergency-lock-note">Аварийную нельзя отменить</span>' : `<button type="button" class="request-cancel-button" data-index="${index}" ${state.phase !== "resolving" ? "disabled" : ""}>Отменить заявку</button>`}</div>`}</div>
      </article>`;
    }).join("");
    elements.list.querySelectorAll(".solve-button").forEach(button => button.addEventListener("click", () => resolveWithMoney(Number(button.dataset.index))));
    elements.list.querySelectorAll(".staff-solve-button").forEach(button => button.addEventListener("click", () => resolveWithEmployee(Number(button.dataset.index), button.dataset.worker)));
    elements.list.querySelectorAll(".overtime-unpaid-button").forEach(button => button.addEventListener("click", () => resolveWithoutPremium(Number(button.dataset.index), button.dataset.worker)));
    elements.list.querySelectorAll(".request-cancel-button").forEach(button => button.addEventListener("click", () => cancelRequest(Number(button.dataset.index))));
  }

  function roleName(roleId) { return ROLES[roleId].name; }

  function renderLog() {
    if (!state.log.length) { elements.log.innerHTML = '<div class="log-entry muted-entry"><span class="log-marker"></span><span>История пока пуста.</span></div>'; return; }
    elements.log.innerHTML = state.log.slice(0, 8).map((entry, index) => `<div class="log-entry ${index === 0 ? "latest" : ""}"><span class="log-marker"></span><span>${escapeHtml(entry.text)}</span><time>ХОД ${entry.turn}</time></div>`).join("");
  }

  function renderAnnualReport() {
    const report = state.lastAnnualReport;
    if (!report) { elements.annualReport.innerHTML = ""; return; }
    const counts = values => `<div class="report-count-grid"><div><span>Принято заявок</span><b>${values.accepted}</b></div><div><span>Выполнено заявок</span><b>${values.completed}</b></div><div><span>Отменено заявок</span><b>${values.cancelled}</b></div><div><span>Сотрудников нанято</span><b>${values.hired}</b></div><div><span>Сотрудников уволено</span><b>${values.fired}</b></div></div>`;
    const reputation = report.reputation || { start: state.reputation, end: state.reputation, cancellationPenalty: 0, solvencyBonus: 0, cleanHouseBonus: 0 };
    const repText = value => `${value > 0 ? "+" : ""}${value}`;
    const reputationBlock = `<div class="report-reputation"><div><span>Репутация игрока</span><b>${repText(reputation.start)} → ${repText(reputation.end)}</b></div><ul><li>${reputation.cancellationPenalty ? `−${reputation.cancellationPenalty} за ${report.yearStats.cancelled} отменённые заявки` : "Нет штрафа за отменённые заявки"}</li><li>${reputation.solvencyBonus ? "+1: год закрыт без долгов" : "Бонус за отсутствие долгов не получен"}</li><li>${reputation.cleanHouseBonus ? "+1: на доме нет отменённых заявок" : "Бонус за отсутствие отмен не получен"}</li></ul></div>`;
    elements.annualReport.innerHTML = `<div class="report-heading"><div><p class="section-label">ИТОГИ ГОДА ${report.year}</p><h2>Годовой отчёт</h2></div><span class="report-stamp">ЗАКРЫТ</span></div>${reputationBlock}<div class="report-columns"><section class="report-column"><h3>За прошедший год</h3><div class="report-money"><div><span>Деньги на начало года</span><b>${money(report.capitalStart)} ₽</b></div><div><span>Деньги на конец года</span><b>${money(report.capitalEnd)} ₽</b></div></div>${counts(report.yearStats)}</section><section class="report-column"><h3>За всё время игры</h3>${counts(report.totals)}</section></div><p class="report-footnote">На доме за всю игру отменено заявок: <b>${state.cancelledRequests.length}</b>. Отменённые заявки больше не переносятся на следующий год.</p><button class="primary-button next-year-button" id="next-year-button" type="button"><span>Начать новый год · лето</span><span class="button-arrow">↗</span></button>`;
    document.getElementById("next-year-button").addEventListener("click", startNewYear);
  }

  function renderBankruptcy() {
    elements.bankruptcyPanel.innerHTML = `<div class="bankruptcy-heading"><span class="bankruptcy-mark">!</span><div><p class="section-label">БАЛАНС КОМПАНИИ: ${money(state.capital)} ₽</p><h2>Порог банкротства достигнут</h2></div></div><p>Для продолжения необходимо объявить банкротство. Сотрудники будут распущены, текущий дом и заявки выйдут из управления, долги спишутся. Затем появится новая УК с капиталом 100 ₽, репутацией −1 и новым домом из колоды.</p><button class="bankruptcy-button" id="declare-bankruptcy-button" type="button"><span>Объявить банкротство</span><span>↗</span></button>`;
    document.getElementById("declare-bankruptcy-button").addEventListener("click", declareBankruptcy);
  }

  function recordCancellation(card, reason) {
    if (card.cancelled || card.resolved) return;
    card.cancelled = true;
    card.cancelReason = reason;
    const record = { ...card, year: state.year };
    record.houseName = card.houseName || state.houseName;
    state.cancelledRequests.push(record);
    countEvent("cancelled");
  }

  function checkBankruptcy() {
    if (state.capital <= BANKRUPTCY_THRESHOLD && state.phase !== "bankruptcy") {
      state.phase = "bankruptcy";
      state.bankruptcyBalance = state.capital;
      return true;
    }
    return false;
  }

  function drawHouse() {
    if (!Array.isArray(state.houseDeck) || !state.houseDeck.length) state.houseDeck = shuffle([...HOUSE_CARDS]);
    return state.houseDeck.pop();
  }

  function declareBankruptcy() {
    if (state.phase !== "bankruptcy") return;
    const writtenOffLiabilities = unpaidFineTotal() + unpaidCompensationTotal() + state.houseDebt;
    state.requests.filter(card => !card.resolved && !card.cancelled).forEach(card => recordCancellation(card, "bankruptcy"));
    state.penalties.forEach(penalty => { if (!penalty.paid) penalty.writtenOff = true; });
    state.compensations.forEach(claim => { if (!claim.paid) claim.writtenOff = true; });
    countEvent("fired", state.employees.length);
    const released = state.employees.length;
    const oldHouseName = state.houseName;
    const newHouse = drawHouse();
    state.employees = [];
    state.houses = 1;
    state.area = newHouse.area;
    state.houseName = newHouse.name;
    state.houseAddress = newHouse.address;
    state.baseMaintenance = 30;
    state.houseDebt = 0;
    state.houseDebtRecoverable = 0;
    state.houseDebtIrrecoverable = 0;
    state.collectionStats = { ...INITIAL_STATE.collectionStats };
    state.lastCollectionRate = null;
    state.capital = 100;
    state.reputation = -1;
    state.requests = [];
    state.bankruptcyCount += 1;
    state.market = makeMarket();
    state.phase = "staffing";
    state.hiresThisTurn = 0;
    state.lawyerActionTaken = false;
    addLog(`Объявлено банкротство УК. Распущено сотрудников: ${released}; дом «${oldHouseName}» передан; долги, штрафы и компенсации на ${money(writtenOffLiabilities)} ₽ списаны. Новая УК получила дом «${state.houseName}» (${state.area} м²), капитал 100 ₽ и репутацию −1.`);
    saveState(); render(); showToast(`Новая УК: ${state.houseName} · ${state.area} м² · репутация −1`);
  }

  function makeMarket() {
    const roles = shuffle(Object.keys(ROLES)).slice(0, 5);
    return roles.map((role, index) => ({ id: `staff-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`, role }));
  }

  function hireEmployee(candidateId) {
    if (state.phase !== "staffing") return;
    const candidate = state.market.find(person => person.id === candidateId);
    if (!candidate || state.employees.some(person => person.id === candidateId)) return;
    if (state.pendingHireIds.includes(candidateId)) state.pendingHireIds = state.pendingHireIds.filter(id => id !== candidateId);
    else {
      const count = state.pendingHireIds.filter(id => state.market.some(person => person.id === id && person.role !== "hr")).length;
      if (!hasHR() && !pendingHireHasHR() && count >= 2 && candidate.role !== "hr") return;
      state.pendingHireIds.push(candidateId);
    }
    saveState(); render();
  }

  function fireEmployee(employeeId, payLastSalary) {
    if (state.phase !== "staffing") return;
    const index = state.employees.findIndex(person => person.id === employeeId);
    if (index < 0) return;
    if (state.pendingFireActions[employeeId]) delete state.pendingFireActions[employeeId];
    else state.pendingFireActions[employeeId] = payLastSalary ? "paid" : "unpaid";
    saveState(); render();
  }

  function toggleFire(employeeId, action) {
    if (state.phase !== "staffing") return;
    if (action) state.pendingFireActions[employeeId] = action;
    else delete state.pendingFireActions[employeeId];
    saveState(); render();
  }

  function toggleHire(candidateId) { hireEmployee(candidateId); }

  function applyStaffingChanges() {
    const hrPresent = hasHR() || pendingHireHasHR();
    const hired = state.market.filter(candidate => state.pendingHireIds.includes(candidate.id));
    for (const candidate of hired) {
      const role = ROLES[candidate.role];
      const probationTurns = hrPresent ? 2 : 0;
      state.employees.push({ ...candidate, salary: role.salary, productivity: role.productivity, probationTurns, assignedLabor: 0, unhappy: false, unhappyNextTurn: false, unpaidOvertime: false, hiredTurn: state.turn });
      state.hiresThisTurn += 1; countEvent("hired");
      addLog(`Нанят сотрудник: ${role.name}${probationTurns ? " на двухходовой испытательный срок" : ""}.`);
    }
    for (const [employeeId, action] of Object.entries(state.pendingFireActions)) {
      const index = state.employees.findIndex(person => person.id === employeeId);
      if (index < 0) continue;
      const [employee] = state.employees.splice(index, 1);
      const finalSalary = effectiveSalary(employee);
      countEvent("fired");
      if (action === "paid") { state.capital -= finalSalary; addLog(`Сотрудник уволен: ${roleName(employee.role)}. Выплачена последняя зарплата ${money(finalSalary)} ₽.`); }
      else if (employee.probationTurns <= 0) {
        state.reputation -= 1;
        const complained = Math.random() < Math.random() * 0.5;
        addLog(`Сотрудник уволен без выплаты: ${roleName(employee.role)}; репутация −1.`);
        if (complained) {
          const penalty = { id: `fine-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, employeeName: roleName(employee.role), salary: finalSalary, amount: finalSalary * 3, year: state.year, turn: state.turn, paid: false, writtenOff: false };
          state.penalties.push(penalty); addLog(`Трудовая инспекция назначила штраф ${money(penalty.amount)} ₽.`);
        }
      } else addLog(`Сотрудник уволен без выплаты в период испытательного срока: ${roleName(employee.role)}.`);
    }
    state.pendingHireIds = []; state.pendingFireActions = {};
    if (state.capital <= BANKRUPTCY_THRESHOLD) checkBankruptcy();
  }

  function legacyFireCodeUnused(employee, payLastSalary) {
    const finalSalary = effectiveSalary(employee);
    if (payLastSalary) state.capital -= finalSalary;
    else state.reputation -= 1;
    countEvent("fired");
    let complaintFine = null;
    if (payLastSalary) {
      addLog(`Сотрудник уволен: ${roleName(employee.role)}. Выплачена последняя зарплата ${money(finalSalary)} ₽.`);
    } else {
      const complaintChance = Math.random() * 0.5;
      const complained = Math.random() < complaintChance;
      addLog(`Сотрудник уволен без последней зарплаты: −1 к репутации. Шанс жалобы в трудовую инспекцию: ${Math.round(complaintChance * 100)}%.`);
      if (complained) {
        complaintFine = { id: `fine-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, employeeName: roleName(employee.role), salary: finalSalary, amount: finalSalary * 3, year: state.year, turn: state.turn, paid: false, writtenOff: false };
        state.penalties.push(complaintFine);
        addLog(`Трудовая инспекция назначила штраф за жалобу ${roleName(employee.role)}: ${money(complaintFine.amount)} ₽ (тройная зарплата). Штраф добавлен в отдельный список.`);
      } else {
        addLog(`Сотрудник не обратился в трудовую инспекцию; штраф не назначен.`);
      }
    }
    checkBankruptcy();
  }

  function payPenalty(penaltyId) {
    if (state.phase === "bankruptcy") return;
    const penalty = state.penalties.find(item => item.id === penaltyId && !item.paid && !item.writtenOff);
    if (!penalty) return;
    if (state.capital < penalty.amount) { showToast("Недостаточно средств для выплаты штрафа."); return; }
    state.capital -= penalty.amount;
    penalty.paid = true;
    penalty.paidTurn = state.turn;
    addLog(`Выплачен штраф трудовой инспекции за увольнение ${penalty.employeeName}: −${money(penalty.amount)} ₽.`);
    checkBankruptcy();
    saveState(); render();
    showToast(`Штраф выплачен отдельно: −${money(penalty.amount)} ₽`);
  }

  function payCompensation(compensationId) {
    if (state.phase === "bankruptcy") return;
    const claim = state.compensations.find(item => item.id === compensationId && !item.paid && !item.writtenOff);
    if (!claim || claim.amount <= 0) return;
    if (state.capital < claim.amount) { showToast("Недостаточно средств для выплаты компенсации."); return; }
    state.capital -= claim.amount;
    claim.paid = true;
    claim.paidTurn = state.turn;
    const request = state.requests.find(item => item.id === claim.requestId);
    if (request) request.damageCompensation = 0;
    addLog(`Выплачена компенсация за ущерб по заявке «${claim.title}»: −${money(claim.amount)} ₽.`);
    checkBankruptcy();
    saveState(); render();
    showToast(`Компенсация выплачена отдельно: −${money(claim.amount)} ₽`);
  }

  function acceptRequests() {
    if (state.phase !== "drawing") return;
    const needed = state.houses * 2;
    let pool = [...state.deck];
    if (pool.length < needed) pool = [...pool, ...shuffle([...CARDS])];
    const carriedCount = state.requests.filter(card => !card.resolved && !card.cancelled).length;
    for (let index = 0; index < needed; index++) {
      if (!pool.length) pool = shuffle([...CARDS]);
      const card = pool.pop();
      const accepted = { ...card, type: card.type || "ordinary", materialCost: card.type === "paid" ? 0 : (card.materialCost || 0), damageCompensation: card.damageCompensation || 0, payout: card.payout || 0, resolved: false, id: `${state.turn}-${index}`, receivedTurn: state.turn, houseName: state.houseName };
      state.requests.push(accepted);
      registerDamageClaim(accepted);
    }
    countEvent("accepted", needed);
    state.deck = pool; state.phase = "resolving";
    addLog(carriedCount ? `В дом поступило ${needed} новых заявок; перенесено нерешённых: ${carriedCount}.` : `Получено заявок: ${needed}.`);
    saveState(); render(); showToast(`Принято заявок: ${needed}`);
  }

  function advanceTurnPhase() {
    if (state.phase === "staffing") {
      applyStaffingChanges();
      if (state.phase === "bankruptcy") { saveState(); render(); return; }
      state.phase = "drawing";
      saveState(); render();
      showToast("Кадровые изменения применены. Принимай заявки.");
      return;
    }
    acceptRequests();
  }

  function resolveWithMoney(index) {
    const card = state.requests[index];
    if (!card || card.resolved || state.phase !== "resolving") return;
    const cashCost = requestMoneyCost(card);
    if (state.capital < cashCost) { showToast("Недостаточно капитала для оплаты подрядчику."); return; }
    state.capital -= cashCost;
    state.capital += card.payout;
    card.resolved = true;
    countEvent("completed");
    addLog(card.payout ? `Платная заявка «${card.title}» выполнена через подрядчика. Расход: ${money(cashCost)} ₽, доход: ${money(card.payout)} ₽.` : `Решена заявка «${card.title}» оплатой. Расход: ${money(cashCost)} ₽.`);
    checkBankruptcy();
    saveState(); render(); showToast(card.payout ? `Подрядчик выполнит работу: +${money(card.payout - cashCost)} ₽ прибыли` : `Заявка оплачена: −${money(cashCost)} ₽`);
  }

  function resolveWithEmployee(index, employeeId) {
    const card = state.requests[index];
    const employee = state.employees.find(person => person.id === employeeId);
      if (!card || card.resolved || card.cancelled || !employee || ROLES[employee.role].category !== card.category || state.phase !== "resolving") return;
    const plan = overtimeFor(employee, card.labor);
    if (employee.unhappy && plan.laborAfter > effectiveProductivity(employee)) return;
    const materialAndBonus = plan.premium + card.materialCost;
    if (state.capital < materialAndBonus) { showToast("Не хватает денег на материалы и премию."); return; }
    employee.assignedLabor = plan.laborAfter;
    state.capital -= card.materialCost;
    if (plan.premium) {
      state.capital -= plan.premium;
      addLog(`${roleName(employee.role)} выполнил заявку «${card.title}» с переработкой. Материалы: ${money(card.materialCost)} ₽, премия: ${money(plan.premium)} ₽.`);
    } else {
      addLog(`${roleName(employee.role)} выполнил заявку «${card.title}» в пределах продуктивности. Материалы: ${money(card.materialCost)} ₽.`);
    }
    state.capital += card.payout;
    card.resolved = true;
    countEvent("completed");
    checkBankruptcy();
    saveState(); render(); showToast(card.payout ? `${roleName(employee.role)} выполнил платную заявку: доход +${money(card.payout)} ₽` : plan.premium ? `Работа выполнена, премия −${money(plan.premium)} ₽` : `${roleName(employee.role)} выполнил заявку.`);
  }

  function resolveWithoutPremium(index, employeeId) {
    const card = state.requests[index];
    const employee = state.employees.find(person => person.id === employeeId);
    if (!card || card.resolved || card.cancelled || !employee || state.phase !== "resolving" || employee.unhappy || ROLES[employee.role].category !== card.category) return;
    const plan = overtimeFor(employee, card.labor);
    if (!plan.premium) return;
    if (state.capital < card.materialCost) { showToast("Не хватает денег на материалы."); return; }
    employee.assignedLabor = plan.laborAfter;
    state.capital -= card.materialCost;
    state.capital += card.payout;
    employee.unpaidOvertime = true;
    employee.unhappyNextTurn = true;
    card.resolved = true;
    countEvent("completed");
    checkBankruptcy();
    addLog(`${roleName(employee.role)} выполнил заявку «${card.title}» без премии за переработку (${money(plan.premium)} ₽). Материалы: ${money(card.materialCost)} ₽, доход: ${money(card.payout)} ₽. На следующем ходу сотрудник будет недоволен.`);
    saveState(); render(); showToast(`${roleName(employee.role)} выполнит работу без премии; следующий ход будет недоволен.`);
  }

  function cancelRequest(index) {
    const card = state.requests[index];
    if (!card || card.resolved || card.cancelled || isEmergency(card) || state.phase !== "resolving") return;
    recordCancellation(card, "manual");
    addLog(`Заявка «${card.title}» отменена игроком.`);
    saveState(); render(); showToast("Заявка отменена и учтена в отчёте.");
  }

  function startStaffingPhase() {
    state.phase = "staffing";
    state.hiresThisTurn = 0;
    state.lawyerActionTaken = false;
    state.lawyerActionsUsed = [];
    state.pendingHireIds = [];
    state.pendingFireActions = {};
    state.market = makeMarket();
    state.employees.forEach(employee => { employee.assignedLabor = 0; employee.unpaidOvertime = false; });
  }

  function endTurn() {
    if (state.phase === "resolving" && hasLawyer()) {
      state.phase = "legal";
      state.lawyerActionTaken = false;
      state.lawyerActionsUsed = [];
      saveState(); render(); showToast("Распределение завершено. Выбери действие для юриста.");
      return;
    }
    if (state.phase === "legal") {
      if (!lawyersDone()) return;
      finishSeason();
      return;
    }
    if (state.phase !== "resolving") return;
    finishSeason();
  }

  function finishSeason() {
    if (!['resolving', 'legal'].includes(state.phase)) return;
    const payroll = state.employees.reduce((sum, employee) => sum + effectiveSalary(employee), 0);
    if (payroll) {
      state.capital -= payroll;
      addLog(`Выплачены зарплаты сотрудникам: −${money(payroll)} ₽.`);
    }
    state.employees.forEach(employee => {
      if (employee.probationTurns > 0) employee.probationTurns -= 1;
      if (employee.unhappy) employee.unhappy = false;
      if (employee.unhappyNextTurn) {
        employee.unhappy = true;
        employee.unhappyNextTurn = false;
        addLog(`${roleName(employee.role)} недоволен: продуктивность снижена на 1 до выплаты следующей зарплаты.`);
      }
    });
    const collectionRate = 20 + Math.floor(Math.random() * 81);
    const grossCharge = state.area * TARIFF;
    const income = Math.round(grossCharge * collectionRate / 100);
    const unpaidCharge = grossCharge - income;
    const unresolvedCount = state.requests.filter(card => !card.resolved && !card.cancelled).length;
    const maintenance = state.houses * state.baseMaintenance;
    state.capital -= maintenance;
    if (maintenance) addLog(`Оплачено базовое обслуживание дома: −${money(maintenance)} ₽.`);
    if (checkBankruptcy()) {
      saveState(); render(); showToast("После обязательных расходов баланс достиг −500 ₽. Необходимо объявить банкротство.");
      return;
    }
    state.capital += income;
    state.collectionStats.billed += grossCharge;
    state.collectionStats.collected += income;
    state.collectionStats.periods += 1;
    if (hasAccountant()) state.houseDebtRecoverable += unpaidCharge;
    else {
      state.houseDebtIrrecoverable += state.houseDebtRecoverable;
      state.houseDebtRecoverable = unpaidCharge;
    }
    state.houseDebt = state.houseDebtRecoverable + state.houseDebtIrrecoverable;
    state.lastCollectionRate = collectionRate;
    addLog(`Собираемость дома — ${collectionRate}%. Собрано платежей: +${money(income)} ₽.`);
    if (unpaidCharge) addLog(`${hasAccountant() ? "Бухгалтер добавил" : "Без бухгалтера учтён долг только за текущий период:"} ${money(unpaidCharge)} ₽.`);
    if (state.seasonIndex === 3) {
      const expired = state.requests.filter(card => !card.resolved && !card.cancelled);
      expired.forEach(card => recordCancellation(card, "annual-expiry"));
      const cancelledThisYear = state.cancelledRequests.filter(card => card.year === state.year);
      state.requests = cancelledThisYear.map(card => ({ ...card }));
      if (expired.length) addLog(`Год закрыт. Отменено просроченных заявок: ${expired.length}.`);
      const reputationStart = state.reputation;
      const reputationChanges = {
        cancellationPenalty: Math.floor(state.yearStats.cancelled / 3),
        solvencyBonus: hasNoDebts() ? 1 : 0,
        cleanHouseBonus: state.yearStats.cancelled === 0 ? 1 : 0
      };
      const reputationDelta = -reputationChanges.cancellationPenalty + reputationChanges.solvencyBonus + reputationChanges.cleanHouseBonus;
      state.reputation += reputationDelta;
      addLog(`Годовой расчёт репутации: ${reputationDelta >= 0 ? "+" : ""}${reputationDelta} (${reputationChanges.cancellationPenalty} штраф за отмены, +${reputationChanges.solvencyBonus} за отсутствие долгов, +${reputationChanges.cleanHouseBonus} за отсутствие отмен).`);
      state.lastAnnualReport = { year: state.year, capitalStart: state.yearStats.capitalStart, capitalEnd: state.capital, yearStats: { ...state.yearStats }, totals: { ...state.totals }, reputation: { start: reputationStart, end: state.reputation, ...reputationChanges } };
      state.phase = "annualReport";
    } else {
      if (unresolvedCount) addLog(`На следующий сезон перенесено нерешённых заявок: ${unresolvedCount}.`);
      state.turn += 1;
      state.seasonIndex += 1;
      state.requests = state.requests.filter(card => !card.resolved && !card.cancelled);
      startStaffingPhase();
    }
    saveState(); render();
    showToast(`Зарплаты −${money(payroll)} ₽ · БО −${money(maintenance)} ₽ · собираемость ${collectionRate}% · +${money(income)} ₽`);
  }

  function startNewYear() {
    if (state.phase !== "annualReport") return;
    state.year += 1;
    state.seasonIndex = 0;
    state.turn += 1;
    state.phase = "staffing";
    state.requests = [];
    state.yearStats = { capitalStart: state.capital, ...EMPTY_COUNTS };
    state.hiresThisTurn = 0;
    state.lawyerActionTaken = false;
    state.lawyerActionsUsed = [];
    state.employees.forEach(employee => { employee.assignedLabor = 0; employee.unpaidOvertime = false; });
    state.market = makeMarket();
    addLog(`Начался ${state.year} год. Стартовый капитал: ${money(state.capital)} ₽.`);
    saveState(); render(); showToast(`Год ${state.year}: лето. Начинай новый цикл.`);
  }

  function showToast(message) {
    elements.toast.textContent = message; elements.toast.classList.add("visible");
    window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3200);
  }

  elements.draw.addEventListener("click", advanceTurnPhase);
  elements.end.addEventListener("click", endTurn);
  if (state.capital <= BANKRUPTCY_THRESHOLD && state.phase !== "bankruptcy") checkBankruptcy();
  document.getElementById("clear-log-button").addEventListener("click", () => { state.log = []; saveState(); renderLog(); });
  document.getElementById("reset-button").addEventListener("click", () => {
    if (!window.confirm("Начать новую игру? Текущий прогресс будет удалён.")) return;
    localStorage.removeItem(SAVE_KEY); state = normalizeState({ ...INITIAL_STATE, log: [{ text: "Компания открыла первый дом под управлением.", turn: 1 }] });
    state.market = makeMarket(); saveState(); render(); showToast("Новая игра началась.");
  });

    if (state.market.length !== 5 && state.phase === "staffing") state.market = makeMarket();
  saveState(); render();
}());

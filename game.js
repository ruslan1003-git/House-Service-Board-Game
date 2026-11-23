(function () {
  "use strict";

  const CONFIG = window.DOMOUPRAV_CONFIG;
  if (!CONFIG) throw new Error("Не найден файл game-config.js");
  const SEASONS = CONFIG.seasons;
  const SEASON_ICONS = CONFIG.seasonIcons || ["☀️", "🍂", "❄️", "🌱"];
  const HOUSE_PROBLEMS = CONFIG.houseProblems;
  const EMPTY_COUNTS = { accepted: 0, completed: 0, cancelled: 0, hired: 0, fired: 0 };
  const HOUSE_CARDS = CONFIG.houses;
  const INITIAL_STATE = { turn: 1, year: 1, managedSinceYear: 1, seasonIndex: 0, seasonTurnIndex: 0, seasonDuration: 1, startingSeasonIndex: 0, badGameMode: false, complaintModifierPercent: 100, founderAccount: 0, directorSalaryPercent: 0, founderLoans: [], badGameResult: "", withheldWages: 0, legalCases: [], capital: CONFIG.economy.startingCapital, reputation: CONFIG.economy.startingReputation, houses: 1, area: CONFIG.economy.startingArea, primaryArea: CONFIG.economy.startingArea, additionalHomes: [], newHouseOssUsedTurn: null, houseName: CONFIG.economy.startingHouseName, houseAddress: CONFIG.houses.find(house => house.name === CONFIG.economy.startingHouseName)?.address || "", houseAge: CONFIG.houses.find(house => house.name === CONFIG.economy.startingHouseName)?.age || 0, houseRepairWarranties: {}, tariffPerSquareMeter: CONFIG.economy.tariffPerSquareMeter, companyName: CONFIG.economy.startingCompanyName, baseMaintenance: CONFIG.economy.baseMaintenancePerHouse, houseDebt: 0, materialStock: 0, engineerMaterialsUsed: [], collectionStats: { billed: 0, collected: 0, periods: 0 }, houseDeck: [], phase: "preparation", gameSetupVersion: 2, employeeSalaryRulesVersion: 2, ossRulesVersion: 1, houseUnsafeSinceYear: null, houseUnsafeSinceTurn: null, houseUnsafeCategory: null, houseUnsafeReasons: [], unsafeHousePenaltyYear: null, houseRemoved: false, tariffOssResolvedYear: null, tariffOssAttempts: 0, ossHistory: [], ossVoteTurn: null, ossVoteUsedCategories: [], lastOssAnimationId: null, hiresThisTurn: 0, pendingHireIds: [], pendingFireActions: {}, marketRerollUsedTurn: null, lawyerActionTaken: false, lawyerActionsUsed: [], liabilityTimerRulesVersion: 2, requests: [], cancelledRequests: [], houseRequestCounts: {}, penalties: [], compensations: [], employees: [], market: [], log: [], deck: [], yearStats: { capitalStart: CONFIG.economy.startingCapital, ...EMPTY_COUNTS }, totals: { ...EMPTY_COUNTS } };
  const TARIFF = CONFIG.economy.tariffPerSquareMeter;
  const DEFAULT_COMPANY_NAMES = CONFIG.companyNameDefaults;
  const BANKRUPTCY_THRESHOLD = CONFIG.economy.bankruptcyThreshold;
  const DEV_MODE = new URLSearchParams(window.location.search).has("dev");
  const SAVE_KEY = DEV_MODE ? "domouprav-game-dev-v1" : "domouprav-game-v1";
  const ROLES = CONFIG.roles;
  const EMPLOYEE_ROSTER = CONFIG.employees;
  const PROBLEM_CARD_COUNTS = CONFIG.problemCardCounts;
  const PROBLEM_CONSEQUENCES = CONFIG.problemConsequences;
  const CARDS = CONFIG.requests;
  const MAX_REQUEST_MATERIAL_UNITS = 5;

  const elements = {
    turn: document.getElementById("turn-label"), round: document.getElementById("round-number"), capital: document.getElementById("capital-value"), stickyCapital: document.getElementById("sticky-capital-value"), stickyHouses: document.getElementById("sticky-house-count"), stickyCriticalHouses: document.getElementById("sticky-critical-houses"), stickyCriticalCount: document.getElementById("sticky-critical-count"), stickyUpcomingIncome: document.getElementById("sticky-upcoming-income"), stickyFines: document.getElementById("sticky-fines-value"), stickyCompensation: document.getElementById("sticky-compensation-value"), stickyProblemRepairs: document.getElementById("sticky-problem-repairs"), stickyIncomeTotal: document.getElementById("sticky-income-total"), stickyCollectionIncome: document.getElementById("sticky-collection-income"), stickyPaidIncome: document.getElementById("sticky-paid-income"), stickyPriorUpkeep: document.getElementById("sticky-prior-upkeep"), stickyPriorSalaries: document.getElementById("sticky-prior-salaries"), stickyPriorFines: document.getElementById("sticky-prior-fines"), stickyPriorCompensation: document.getElementById("sticky-prior-compensation"), stickyPriorRepairs: document.getElementById("sticky-prior-repairs"), financialInfographic: document.getElementById("financial-infographic"),
    capitalFill: document.getElementById("capital-bar-fill"), houses: document.getElementById("houses-value"), area: document.getElementById("area-value"),
    income: document.getElementById("income-value"), collection: document.getElementById("collection-value"), payrollValue: document.getElementById("payroll-value"), upkeepValue: document.getElementById("upkeep-value"), operatingExpensesValue: document.getElementById("operating-expenses-value"), expectedChangeValue: document.getElementById("expected-change-value"), materialStockValue: document.getElementById("material-stock-value"), materialCostPrice: document.getElementById("material-cost-price"), materialMarketPrice: document.getElementById("material-market-price"), materialTotalCostPrice: document.getElementById("material-total-cost-price"), materialTotalMarketPrice: document.getElementById("material-total-market-price"), count: document.getElementById("request-count"), requestBreakdown: document.getElementById("request-count-breakdown"), requestDamageMarker: document.getElementById("request-damage-marker"), list: document.getElementById("requests-list"),
    hint: document.getElementById("requests-hint"), draw: document.getElementById("draw-button"), end: document.getElementById("end-turn-button"),
    title: document.getElementById("action-title"), copy: document.getElementById("action-copy"), log: document.getElementById("event-log"), toast: document.getElementById("toast"),
    market: document.getElementById("market-list"), marketCopy: document.getElementById("market-copy"), staffCount: document.getElementById("staff-count"), rosterReference: document.getElementById("employee-roster-reference"),
    team: document.getElementById("team-list"), payroll: document.getElementById("team-payroll"), timelineYear: document.getElementById("timeline-year"), prepPanel: document.getElementById("preparation-controls"), marketPanel: document.getElementById("market-panel"),
    seasonTrack: document.getElementById("season-track"), phaseLabel: document.getElementById("phase-label"), stickySeason: document.getElementById("sticky-season-value"), stickyPhase: document.getElementById("sticky-phase-value"), annualReport: document.getElementById("annual-report"), cancelled: document.getElementById("cancelled-value"), reputation: document.getElementById("reputation-value"), upkeep: document.getElementById("upkeep-value"),
    bankruptcyPanel: document.getElementById("bankruptcy-panel"), inspectionPanel: document.getElementById("inspection-panel"), problemPanel: document.getElementById("problem-panel"), penalties: document.getElementById("penalties-list"), penaltiesCompact: document.getElementById("penalties-list-compact"), compactPenaltyTotal: document.getElementById("compact-penalty-total"), compactPenaltyContestable: document.getElementById("compact-penalty-contestable"), compactPenaltyMarker: document.getElementById("compact-penalty-marker"), penaltySummary: document.getElementById("penalties-summary"),
    legalPanel: document.getElementById("legal-panel"), houseDebt: document.getElementById("house-debt-value"), houseCard: document.getElementById("house-card")
  };

  let state = loadState();
  if (!state.houseRemoved) { const previousUnsafeYear = state.houseUnsafeSinceYear; updateHouseSafetyStatus(); if (previousUnsafeYear !== state.houseUnsafeSinceYear) saveState(); }
  let financialPeriodSelection = "latest";
  let graphMetricSelection = "capital";
  let showPaidPenalties = false;
  let showWrittenOffPenalties = false;
  let showCompletedCourts = false;
  let toastTimer;
  const mobileApp = document.getElementById("mobile-stage-content");
  let mobileManagerScreen = "market";
  let mobileManagerConfirmed = false;
  let mobileFocusIndex = 0;
  let mobilePreviousPhase = "";
  const mobilePlaceholders = new Map();

  function mobileRestorePanels() {
    mobilePlaceholders.forEach((placeholder, element) => {
      if (placeholder.parentNode) placeholder.parentNode.insertBefore(element, placeholder);
      placeholder.remove();
    });
    mobilePlaceholders.clear();
  }

  function mobileMovePanel(element) {
    if (!mobileApp || !element) return;
    if (!mobilePlaceholders.has(element)) {
      const placeholder = document.createComment("mobile-panel-slot");
      element.parentNode?.insertBefore(placeholder, element);
      mobilePlaceholders.set(element, placeholder);
    }
    mobileApp.append(element);
  }

  function mobileCarousel(selector, direction = 0) {
    const items = [...(mobileApp?.querySelectorAll(selector) || [])];
    const allItems = selector.includes("#requests-list") ? [...(mobileApp?.querySelectorAll("#requests-list .request-card") || [])]
      : selector.includes(".penalties-list") ? [...(mobileApp?.querySelectorAll(".penalties-list .penalty-row") || [])]
      : items;
    allItems.forEach(item => { item.classList.remove("mobile-carousel-item", "mobile-carousel-current"); if (!items.includes(item)) item.classList.add("mobile-carousel-item"); });
    items.forEach(item => item.classList.remove("mobile-carousel-item", "mobile-carousel-current"));
    if (!items.length) { mobileFocusIndex = 0; return 0; }
    mobileFocusIndex = ((mobileFocusIndex + direction) % items.length + items.length) % items.length;
    items.forEach((item, index) => { item.classList.add("mobile-carousel-item"); item.classList.toggle("mobile-carousel-current", index === mobileFocusIndex); });
    return items.length;
  }

  function renderMobileInterface() {
    if (!mobileApp) return;
    const phase = state.phase;
    if (elements.marketPanel) elements.marketPanel.hidden = false;
    if (phase !== mobilePreviousPhase) {
      mobilePreviousPhase = phase;
      mobileFocusIndex = 0;
      if (phase !== "staffing") { mobileManagerScreen = "market"; mobileManagerConfirmed = false; }
    }
    mobileRestorePanels();
    const headerSeason = document.getElementById("mobile-season");
    const headerPhase = document.getElementById("mobile-phase");
    const headerBudget = document.getElementById("mobile-capital");
    const phaseNames = { preparation: "Подготовка к игре", staffing: "Менеджмент сотрудников", inspection: "Сезонный осмотр", problems: "Решение проблем", drawing: "Приём заявок", resolving: "Распределение заявок", legal: "Задачи специалистам", payroll: "Выплата зарплат", collection: "Сбор содержания", annualReport: "Годовой отчёт", bankruptcy: "Банкротство", gameOver: "Игра окончена" };
    if (headerSeason) headerSeason.textContent = phase === "annualReport" ? `Год ${state.year}` : `${SEASONS[state.seasonIndex]} · год ${state.year}${state.seasonDuration > 1 ? ` · ход ${state.seasonTurnIndex + 1}/${state.seasonDuration}` : ""}`;
    if (headerPhase) headerPhase.textContent = phaseNames[phase] || phase;
    if (headerBudget) headerBudget.textContent = money(state.capital);
    const tabs = document.getElementById("mobile-staff-tabs");
    const prev = document.getElementById("mobile-prev");
    const next = document.getElementById("mobile-next");
    const confirm = document.getElementById("mobile-confirm");
    const nav = document.getElementById("mobile-nav");
    mobileApp.replaceChildren();
    document.body.classList.remove("mobile-show-market", "mobile-show-team", "mobile-courts-step");
    let itemCount = 0;
    let singleton = false;
    let confirmLabel = "✓";
    let confirmAction = null;

    if (phase === "preparation" || phase === "staffing") {
      mobileMovePanel(elements.marketPanel);
      const marketDisclosure = document.getElementById("market-disclosure");
      const teamDisclosure = document.getElementById("team-disclosure");
      if (tabs) tabs.hidden = phase === "preparation" || (phase === "staffing" && mobileManagerConfirmed);
      if (phase === "preparation") {
        document.body.classList.add("mobile-show-market");
        if (marketDisclosure) marketDisclosure.open = true;
        if (teamDisclosure) teamDisclosure.open = false;
        itemCount = 0;
        confirmLabel = "Начать игру";
        confirmAction = () => document.getElementById("confirm-preparation-button")?.click();
      } else if (!mobileManagerConfirmed) {
        document.body.classList.toggle("mobile-show-team", mobileManagerScreen === "team");
        document.body.classList.toggle("mobile-show-market", mobileManagerScreen === "market");
        if (marketDisclosure) marketDisclosure.open = true;
        if (teamDisclosure) teamDisclosure.open = true;
        itemCount = 2;
        confirmLabel = "✓";
        confirmAction = () => { mobileManagerConfirmed = true; renderMobileInterface(); };
      } else {
        if (tabs) tabs.hidden = true;
        if (elements.marketPanel) elements.marketPanel.hidden = true;
        document.body.classList.add("mobile-courts-step");
        if (headerPhase) headerPhase.textContent = "Суды и обязательства";
        mobileMovePanel(document.querySelector(".penalties-panel:not(.penalties-compact)"));
        itemCount = mobileCarousel(".penalties-list .penalty-row:not(.penalty-paid):not(.penalty-written-off):not(.penalty-court-completed)", 0);
        if (!itemCount) { const empty = document.createElement("div"); empty.className = "mobile-prompt"; empty.innerHTML = "<span>§</span><h2>Нет активных дел</h2><p>Можно переходить к следующему этапу.</p>"; mobileApp.append(empty); }
        confirmLabel = "✓";
        confirmAction = () => elements.end.click();
      }
      singleton = phase === "preparation";
      if (phase === "staffing" && mobileManagerConfirmed) { singleton = itemCount <= 1; }
    } else if (phase === "inspection") {
      mobileMovePanel(elements.inspectionPanel); singleton = true; confirmLabel = "Провести осмотр"; confirmAction = () => elements.end.click();
    } else if (phase === "problems") {
      mobileMovePanel(document.getElementById("oss-agenda-panel")); mobileMovePanel(elements.problemPanel); itemCount = mobileCarousel(".problem-repair-list .problem-repair-card", 0); confirmLabel = "✓"; confirmAction = () => elements.end.click();
    } else if (phase === "drawing") {
      mobileMovePanel(document.getElementById("oss-agenda-panel")); const intro = document.createElement("article"); intro.className = "mobile-prompt"; intro.innerHTML = `<span>📬</span><h2>Заявки жителей</h2><p>Прими новые заявки по домам в управлении.</p>`; mobileApp.append(intro); singleton = true; confirmLabel = "Принять заявки"; confirmAction = () => elements.end.click();
    } else if (phase === "resolving") {
      mobileMovePanel(document.querySelector(".requests-panel"));
      itemCount = mobileCarousel("#requests-list .request-card:not(.resolved):not(.request-cancelled)", 0);
      if (!itemCount) { const empty = document.createElement("div"); empty.className = "mobile-prompt"; empty.innerHTML = "<span>✓</span><h2>Нет заявок для решения</h2><p>Можно переходить к следующему этапу.</p>"; mobileApp.append(empty); }
      confirmLabel = "✓"; confirmAction = () => elements.end.click();
    } else if (phase === "legal") {
      mobileMovePanel(elements.legalPanel);
      itemCount = mobileCarousel("#legal-panel .legal-option", 0);
      confirmLabel = "✓"; confirmAction = () => elements.end.click();
    } else if (phase === "payroll") {
      mobileMovePanel(document.getElementById("team-disclosure"));
      const team = document.getElementById("team-disclosure"); if (team) team.open = true;
      itemCount = mobileCarousel("#team-list .team-member", 0);
      confirmLabel = "✓"; confirmAction = () => elements.end.click();
    } else if (phase === "collection") {
      const intro = document.createElement("article"); intro.className = "mobile-prompt"; intro.innerHTML = `<span>🏠</span><h2>Сбор содержания</h2><p>Собери платежи с домов и заверши ход.</p>`; mobileApp.append(intro); singleton = true; confirmLabel = "Собрать содержание"; confirmAction = () => elements.end.click();
    } else if (phase === "annualReport") {
      mobileMovePanel(elements.annualReport); singleton = true; confirmLabel = "Начать новый год"; confirmAction = () => document.getElementById("next-year-button")?.click();
    } else if (phase === "bankruptcy") {
      mobileMovePanel(elements.bankruptcyPanel); singleton = true; confirmLabel = "Продолжить"; confirmAction = () => document.getElementById("declare-bankruptcy-button")?.click();
    } else if (phase === "gameOver") {
      mobileMovePanel(document.getElementById("bad-game-over")); singleton = true; confirmLabel = "Новая игра"; confirmAction = () => document.getElementById("reset-button")?.click();
    }

    if (tabs) tabs.hidden = !(phase === "staffing" && !mobileManagerConfirmed);
    if (prev) prev.hidden = singleton || itemCount <= 1;
    if (next) next.hidden = singleton || itemCount <= 1;
    if (confirm) { confirm.textContent = confirmLabel; confirm.onclick = confirmAction; confirm.disabled = phase === "legal" && Boolean(elements.end.disabled); }
    if (nav) nav.hidden = false;
    if (prev) prev.onclick = () => {
      if (phase === "staffing" && !mobileManagerConfirmed) { mobileManagerScreen = mobileManagerScreen === "market" ? "team" : "market"; renderMobileInterface(); return; }
      mobileFocusIndex -= 1; renderMobileInterface();
    };
    if (next) next.onclick = () => {
      if (phase === "staffing" && !mobileManagerConfirmed) { mobileManagerScreen = mobileManagerScreen === "market" ? "team" : "market"; renderMobileInterface(); return; }
      mobileFocusIndex += 1; renderMobileInterface();
    };
    tabs?.querySelectorAll("[data-mobile-staff]").forEach(button => { button.classList.toggle("active", button.dataset.mobileStaff === mobileManagerScreen); button.onclick = () => { mobileManagerScreen = button.dataset.mobileStaff; mobileFocusIndex = 0; renderMobileInterface(); }; });
    if (phase === "legal") mobileApp.querySelectorAll("button[data-lawyer], button[data-lawyer-delay], button[data-lawyer-skip], button[data-fraud-win], button[data-fraud-delay], button[data-engineer-buy]").forEach(button => button.addEventListener("click", () => window.setTimeout(() => { mobileFocusIndex += 1; renderMobileInterface(); }, 0), { once: true }));
  }

  function normalizeState(saved) {
    const normalized = { ...INITIAL_STATE, ...saved };
    const migrateLiabilityTimers = saved.liabilityTimerRulesVersion !== 2;
    normalized.liabilityTimerRulesVersion = 2;
    normalized.tariffPerSquareMeter = Number.isFinite(saved.tariffPerSquareMeter) && saved.tariffPerSquareMeter >= 0 ? saved.tariffPerSquareMeter : CONFIG.economy.tariffPerSquareMeter;
    const migrateTariffOssReportMarker = saved.tariffOssReportRulesVersion !== 3;
    normalized.tariffOssReportRulesVersion = 3;
    normalized.tariffOssResolvedYear = Number.isInteger(saved.tariffOssResolvedYear) ? saved.tariffOssResolvedYear : null;
    normalized.ossRulesVersion = 2;
    normalized.tariffOssAttempts = Number.isInteger(saved.tariffOssAttempts) ? saved.tariffOssAttempts : 0;
    normalized.ossHistory = Array.isArray(saved.ossHistory) ? saved.ossHistory : [];
    normalized.ossVoteTurn = Number.isInteger(saved.ossVoteTurn) ? saved.ossVoteTurn : null;
    normalized.ossVoteUsedCategories = Array.isArray(saved.ossVoteUsedCategories) ? saved.ossVoteUsedCategories : [];
    normalized.lastOssAnimationId = typeof saved.lastOssAnimationId === "string" ? saved.lastOssAnimationId : null;
    normalized.capital = Number.isFinite(saved.capital) ? saved.capital : INITIAL_STATE.capital;
    normalized.materialStock = Number.isFinite(saved.materialStock) ? Math.max(0, saved.materialStock) : 0;
    normalized.engineerMaterialsUsed = Array.isArray(saved.engineerMaterialsUsed) ? saved.engineerMaterialsUsed : [];
    normalized.additionalHomes = Array.isArray(saved.additionalHomes) ? saved.additionalHomes.filter(house => house && typeof house.name === "string" && Number.isFinite(house.area)).map(house => ({ ...house, age: Number.isFinite(house.age) ? house.age : 0, managedSinceYear: Number.isInteger(house.managedSinceYear) ? house.managedSinceYear : normalized.year, address: house.address || "Адрес не указан", baseMaintenance: Number.isFinite(house.baseMaintenance) ? house.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse, tariffPerSquareMeter: Number.isFinite(house.tariffPerSquareMeter) ? house.tariffPerSquareMeter : (Number.isFinite(saved.tariffPerSquareMeter) ? saved.tariffPerSquareMeter : CONFIG.economy.tariffPerSquareMeter), debtRecoverable: Number.isFinite(house.debtRecoverable) ? house.debtRecoverable : 0, debtIrrecoverable: Number.isFinite(house.debtIrrecoverable) ? house.debtIrrecoverable : 0, collectionStats: { billed: 0, collected: 0, periods: 0, ...(house.collectionStats || {}) }, lastCollectionRate: Number.isFinite(house.lastCollectionRate) ? house.lastCollectionRate : null, tariffOssResolvedYear: Number.isInteger(house.tariffOssResolvedYear) ? house.tariffOssResolvedYear : null, repairWarranties: house.repairWarranties || {}, warrantyUntilTurn: Number.isInteger(house.warrantyUntilTurn) ? house.warrantyUntilTurn : null })) : [];
    normalized.primaryArea = Number.isFinite(saved.primaryArea) && saved.primaryArea > 0 ? saved.primaryArea : Number.isFinite(saved.area) && saved.area > 0 ? saved.area : INITIAL_STATE.primaryArea;
    normalized.houses = (saved.houseRemoved ? 0 : 1) + normalized.additionalHomes.length;
    normalized.area = (saved.houseRemoved ? 0 : normalized.primaryArea) + normalized.additionalHomes.reduce((sum, house) => sum + house.area, 0);
    normalized.newHouseOssUsedTurn = Number.isInteger(saved.newHouseOssUsedTurn) ? saved.newHouseOssUsedTurn : (saved.newHouseOssUsed ? normalized.turn : null);
    normalized.reputation = Number.isFinite(saved.reputation) ? saved.reputation : INITIAL_STATE.reputation;
    normalized.year = Number.isInteger(saved.year) ? saved.year : Math.floor((normalized.turn - 1) / SEASONS.length) + 1;
    normalized.managedSinceYear = Number.isInteger(saved.managedSinceYear) ? saved.managedSinceYear : 1;
    normalized.tariffOssResolvedYear = Number.isInteger(saved.tariffOssResolvedYear) ? saved.tariffOssResolvedYear : null;
    if (migrateTariffOssReportMarker && normalized.phase === "annualReport" && !(Number(saved.tariffOssAttempts) > 0)) {
      normalized.tariffOssResolvedYear = null;
      normalized.additionalHomes.forEach(home => { home.tariffOssResolvedYear = null; });
    } else if (migrateTariffOssReportMarker && normalized.phase !== "annualReport") {
      if (normalized.tariffOssResolvedYear === normalized.year) normalized.tariffOssResolvedYear = null;
      normalized.additionalHomes.forEach(home => { if (home.tariffOssResolvedYear === normalized.year) home.tariffOssResolvedYear = null; });
    }
    normalized.seasonIndex = Math.max(0, Math.min(SEASONS.length - 1, Number.isInteger(saved.seasonIndex) ? saved.seasonIndex : (normalized.turn - 1) % SEASONS.length));
    normalized.seasonDuration = [1, 2, 3].includes(saved.seasonDuration) ? saved.seasonDuration : 1;
    normalized.seasonTurnIndex = Math.max(0, Math.min(normalized.seasonDuration - 1, Number.isInteger(saved.seasonTurnIndex) ? saved.seasonTurnIndex : 0));
    normalized.startingSeasonIndex = Math.max(0, Math.min(SEASONS.length - 1, Number.isInteger(saved.startingSeasonIndex) ? saved.startingSeasonIndex : 0));
    normalized.badGameMode = Boolean(saved.badGameMode);
    normalized.complaintModifierPercent = Number.isFinite(saved.complaintModifierPercent) ? Math.max(0, Math.min(1000, saved.complaintModifierPercent)) : 100;
    normalized.founderAccount = Number.isFinite(saved.founderAccount) ? saved.founderAccount : 0;
    normalized.directorSalaryPercent = Number.isFinite(saved.directorSalaryPercent) ? Math.max(0, Math.min(50, saved.directorSalaryPercent)) : 0;
    normalized.founderLoans = Array.isArray(saved.founderLoans) ? saved.founderLoans.filter(loan => loan && Number.isFinite(loan.balance) && loan.balance > 0 && Number.isFinite(loan.monthlyPayment) && loan.monthlyPayment > 0).map(loan => ({ ...loan, balance: Math.max(0, loan.balance), monthlyPayment: loan.monthlyPayment, monthlyRate: Number.isFinite(loan.monthlyRate) ? loan.monthlyRate : 0.33 / 12, paymentsRemaining: Number.isInteger(loan.paymentsRemaining) ? Math.max(1, loan.paymentsRemaining) : 12 * Math.max(1, Number(loan.termYears) || 1) })) : [];
    normalized.badGameResult = typeof saved.badGameResult === "string" ? saved.badGameResult : "";
    normalized.withheldWages = Number.isFinite(saved.withheldWages) ? saved.withheldWages : 0;
    normalized.legalCases = Array.isArray(saved.legalCases) ? saved.legalCases : [];
    normalized.yearStats = { capitalStart: normalized.capital, ...EMPTY_COUNTS, ...(saved.yearStats || {}) };
    normalized.totals = { ...EMPTY_COUNTS, ...(saved.totals || {}) };
    normalized.baseMaintenance = Number.isFinite(normalized.baseMaintenance) ? normalized.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse;
    normalized.houseDebt = Number.isFinite(normalized.houseDebt) ? normalized.houseDebt : 0;
    normalized.houseDebtRecoverable = Number.isFinite(saved.houseDebtRecoverable) ? saved.houseDebtRecoverable : normalized.houseDebt;
    normalized.houseDebtIrrecoverable = Number.isFinite(saved.houseDebtIrrecoverable) ? saved.houseDebtIrrecoverable : 0;
    normalized.primaryDebtRecoverable = Number.isFinite(saved.primaryDebtRecoverable) ? saved.primaryDebtRecoverable : normalized.houseDebtRecoverable;
    normalized.primaryDebtIrrecoverable = Number.isFinite(saved.primaryDebtIrrecoverable) ? saved.primaryDebtIrrecoverable : normalized.houseDebtIrrecoverable;
    normalized.collectionStats = { ...INITIAL_STATE.collectionStats, ...(saved.collectionStats || {}) };
    normalized.primaryCollectionStats = { ...normalized.collectionStats, ...(saved.primaryCollectionStats || {}) };
    normalized.primaryLastCollectionRate = Number.isFinite(saved.primaryLastCollectionRate) ? saved.primaryLastCollectionRate : (Number.isFinite(saved.lastCollectionRate) ? saved.lastCollectionRate : null);
    Object.keys(INITIAL_STATE.collectionStats).forEach(key => { if (!Number.isFinite(normalized.collectionStats[key])) normalized.collectionStats[key] = 0; });
    normalized.seasonFinancials = { upkeep: 0, salaries: 0, paidIncome: 0, problemRepairs: 0, contractors: 0, materials: 0, ...(saved.seasonFinancials || {}) };
    Object.keys(normalized.seasonFinancials).forEach(key => { if (!Number.isFinite(normalized.seasonFinancials[key])) normalized.seasonFinancials[key] = 0; });
    const savedSeasonFinancials = saved.lastSeasonFinancials || {};
    normalized.lastSeasonFinancials = { collection: 0, paidIncome: Number.isFinite(savedSeasonFinancials.paidIncome) ? savedSeasonFinancials.paidIncome : (Number.isFinite(savedSeasonFinancials.paidRequests) ? savedSeasonFinancials.paidRequests : 0), upkeep: 0, salaries: 0, fines: 0, compensation: 0, problemRepairs: 0, contractors: 0, materials: 0, averageTariff: 0, ...savedSeasonFinancials };
    if (!Number.isFinite(normalized.lastSeasonFinancials.paidIncome)) normalized.lastSeasonFinancials.paidIncome = Number.isFinite(savedSeasonFinancials.paidRequests) ? savedSeasonFinancials.paidRequests : 0;
    Object.keys(normalized.lastSeasonFinancials).forEach(key => { if (!Number.isFinite(normalized.lastSeasonFinancials[key])) normalized.lastSeasonFinancials[key] = 0; });
    if (saved.lastSeasonFinancials && !Number.isFinite(saved.lastSeasonFinancials.paidIncome) && Number.isFinite(saved.lastSeasonFinancials.paidRequests)) normalized.lastSeasonFinancials.paidIncome = saved.lastSeasonFinancials.paidRequests;
    normalized.financialHistory = (Array.isArray(saved.financialHistory) ? saved.financialHistory : (normalized.turn > 1 ? [{ year: normalized.seasonIndex === 0 ? Math.max(1, normalized.year - 1) : normalized.year, seasonIndex: (normalized.seasonIndex + SEASONS.length - 1) % SEASONS.length, ...normalized.lastSeasonFinancials }] : [])).filter(Boolean).map(record => ({ ...normalized.lastSeasonFinancials, ...record, year: Number.isInteger(record.year) ? record.year : normalized.year, seasonIndex: Number.isInteger(record.seasonIndex) ? record.seasonIndex : 0, capital: Number.isFinite(record.capital) ? record.capital : normalized.capital, collectionRate: Number.isFinite(record.collectionRate) ? record.collectionRate : (Number.isFinite(normalized.lastCollectionRate) ? normalized.lastCollectionRate : 0), reputation: Number.isFinite(record.reputation) ? record.reputation : normalized.reputation }));
    normalized.hiresThisTurn = Number.isInteger(saved.hiresThisTurn) ? saved.hiresThisTurn : (Array.isArray(saved.employees) ? saved.employees : []).filter(employee => employee.hiredTurn === normalized.turn).length;
    normalized.lawyerActionTaken = Boolean(normalized.lawyerActionTaken);
    normalized.pendingHireIds = Array.isArray(saved.pendingHireIds) ? saved.pendingHireIds : [];
    normalized.pendingFireActions = saved.pendingFireActions && typeof saved.pendingFireActions === "object" ? saved.pendingFireActions : {};
    normalized.marketRerollUsedTurn = Number.isInteger(saved.marketRerollUsedTurn) ? saved.marketRerollUsedTurn : null;
    normalized.lawyerActionsUsed = Array.isArray(saved.lawyerActionsUsed) ? saved.lawyerActionsUsed : [];
    normalized.houseName = normalized.houseName || "Первый дом";
    normalized.houseAge = Number.isFinite(saved.houseAge) ? Math.max(0, saved.houseAge) : Math.max(0, Number(HOUSE_CARDS.find(house => house.name === normalized.houseName)?.age) || 0);
    normalized.houseRepairWarranties = saved.houseRepairWarranties && typeof saved.houseRepairWarranties === "object" ? saved.houseRepairWarranties : {};
    normalized.houseWarrantyUntilTurn = Number.isInteger(saved.houseWarrantyUntilTurn) ? saved.houseWarrantyUntilTurn : null;
    normalized.warrantyCourtCases = Array.isArray(saved.warrantyCourtCases) ? saved.warrantyCourtCases : [];
    if (normalized.phase === "preparation" && !HOUSE_CARDS.some(house => house.name === normalized.houseName)) {
      const startingHouse = HOUSE_CARDS.find(house => house.name === "Дом у парка") || HOUSE_CARDS[0];
      normalized.houseName = startingHouse.name; normalized.houseAddress = startingHouse.address; normalized.primaryArea = startingHouse.area; normalized.area = startingHouse.area + normalized.additionalHomes.reduce((sum, house) => sum + house.area, 0);
    }
    normalized.companyName = typeof saved.companyName === "string" ? saved.companyName : "";
    normalized.houseProblems = Array.isArray(saved.houseProblems) ? saved.houseProblems.filter(problem => problem && Number.isFinite(problem.wear) && problem.wear >= 0 && HOUSE_PROBLEMS.some(card => card.category === problem.category)).map((problem, index) => ({ ...problem, id: problem.id || `problem-saved-${index}`, materialPurchased: Boolean(problem.materialPurchased), repairProgress: problem.repairProgress && typeof problem.repairProgress === "object" ? problem.repairProgress : {} })) : [];
    normalized.houseUnsafeSinceYear = Number.isInteger(saved.houseUnsafeSinceYear) ? saved.houseUnsafeSinceYear : null;
    normalized.houseUnsafeSinceTurn = Number.isInteger(saved.houseUnsafeSinceTurn) ? saved.houseUnsafeSinceTurn : (normalized.houseUnsafeSinceYear != null ? normalized.turn : null);
    normalized.houseUnsafeCategory = typeof saved.houseUnsafeCategory === "string" ? saved.houseUnsafeCategory : null;
    normalized.houseUnsafeReasons = Array.isArray(saved.houseUnsafeReasons) ? saved.houseUnsafeReasons.filter(reason => typeof reason === "string") : [];
    normalized.unsafeHousePenaltyYear = Number.isInteger(saved.unsafeHousePenaltyYear) ? saved.unsafeHousePenaltyYear : null;
    normalized.houseRemoved = Boolean(saved.houseRemoved);
    normalized.houseAddress = normalized.houseAddress || (HOUSE_CARDS.find(house => house.name === normalized.houseName)?.address || INITIAL_STATE.houseAddress);
    normalized.houseDeck = (Array.isArray(normalized.houseDeck) ? normalized.houseDeck : shuffle([...HOUSE_CARDS])).map(house => ({ ...house, address: house.address || HOUSE_CARDS.find(item => item.name === house.name)?.address || INITIAL_STATE.houseAddress, age: Number.isFinite(house.age) ? house.age : Number(HOUSE_CARDS.find(item => item.name === house.name)?.age) || 0 })).filter(house => house.name !== normalized.houseName && !normalized.additionalHomes.some(owned => owned.name === house.name));
    normalized.houseProblems = normalized.houseProblems.map(problem => ({ ...problem, houseName: problem.houseName || normalized.houseName, houseAddress: problem.houseAddress || normalized.houseAddress }));
    normalized.additionalHomes.forEach(home => { home.collectionStats = { billed: 0, collected: 0, periods: 0, ...(home.collectionStats || {}) }; Object.keys(home.collectionStats).forEach(key => { if (!Number.isFinite(home.collectionStats[key])) home.collectionStats[key] = 0; }); });
    normalized.primaryCollectionStats = { billed: 0, collected: 0, periods: 0, ...(normalized.primaryCollectionStats || {}) };
    Object.keys(normalized.primaryCollectionStats).forEach(key => { if (!Number.isFinite(normalized.primaryCollectionStats[key])) normalized.primaryCollectionStats[key] = 0; });
    if (normalized.houseRemoved) normalized.primaryCollectionStats = { billed: 0, collected: 0, periods: 0 };
    normalized.houseDebtRecoverable = (normalized.houseRemoved ? 0 : normalized.primaryDebtRecoverable) + normalized.additionalHomes.reduce((sum, home) => sum + home.debtRecoverable, 0);
    normalized.houseDebtIrrecoverable = (normalized.houseRemoved ? 0 : normalized.primaryDebtIrrecoverable) + normalized.additionalHomes.reduce((sum, home) => sum + home.debtIrrecoverable, 0);
    normalized.houseDebt = normalized.houseDebtRecoverable + normalized.houseDebtIrrecoverable;
    normalized.collectionStats = normalized.additionalHomes.reduce((sum, home) => ({ billed: sum.billed + (home.collectionStats?.billed || 0), collected: sum.collected + (home.collectionStats?.collected || 0), periods: sum.periods + (home.collectionStats?.periods || 0) }), normalized.houseRemoved ? { billed: 0, collected: 0, periods: 0 } : normalized.primaryCollectionStats);
    const lastPeriodBase = (normalized.houseRemoved ? 0 : (Number.isFinite(normalized.primaryLastCollectionRate) ? normalized.primaryArea * normalized.tariffPerSquareMeter : 0)) + normalized.additionalHomes.reduce((sum, home) => sum + (Number.isFinite(home.lastCollectionRate) ? home.area * home.tariffPerSquareMeter : 0), 0);
    const lastPeriodCollected = (normalized.houseRemoved || !Number.isFinite(normalized.primaryLastCollectionRate) ? 0 : normalized.primaryArea * normalized.tariffPerSquareMeter * normalized.primaryLastCollectionRate / 100) + normalized.additionalHomes.reduce((sum, home) => sum + (Number.isFinite(home.lastCollectionRate) ? home.area * home.tariffPerSquareMeter * home.lastCollectionRate / 100 : 0), 0);
    normalized.lastCollectionRate = lastPeriodBase > 0 ? Math.round(lastPeriodCollected / lastPeriodBase * 100) : null;
    normalized.problemDeck = saved.problemDeckVersion === 2 && Array.isArray(saved.problemDeck) ? saved.problemDeck : makeProblemDeck();
    normalized.problemDeckVersion = 2;
    normalized.bankruptcyCount = Number.isInteger(normalized.bankruptcyCount) ? normalized.bankruptcyCount : 0;
    normalized.cancelledRequests = Array.isArray(normalized.cancelledRequests) ? normalized.cancelledRequests.map(card => { const cancelledTurn = Number.isInteger(card.cancelledTurn) ? card.cancelledTurn : (Number.isInteger(card.receivedTurn) ? card.receivedTurn : normalized.turn); return { ...card, cancelledTurn, returnAfterTurn: Number.isInteger(card.returnAfterTurn) ? card.returnAfterTurn : cancelledTurn + 4 * normalized.seasonDuration, returnedTurn: Number.isInteger(card.returnedTurn) ? card.returnedTurn : null }; }) : [];
    normalized.penalties = Array.isArray(normalized.penalties) ? normalized.penalties.filter(Boolean).map(item => ({ ...item, contestedBy: Array.isArray(item.contestedBy) ? item.contestedBy : [], salary: Number.isFinite(item.salary) ? item.salary : 0, amount: Number.isFinite(item.amount) ? item.amount : 0, originalAmount: Number.isFinite(item.originalAmount) ? item.originalAmount : undefined })) : [];
    normalized.compensations = Array.isArray(normalized.compensations) ? normalized.compensations.filter(Boolean).map(item => ({ ...item, contestedBy: Array.isArray(item.contestedBy) ? item.contestedBy : [], amount: Number.isFinite(item.amount) ? item.amount : 0, originalAmount: Number.isFinite(item.originalAmount) ? item.originalAmount : undefined, status: ["pretrial", "court", "expired", "settled", "paid", "writtenOff"].includes(item.status) ? item.status : item.paid ? "paid" : item.writtenOff ? "writtenOff" : "pretrial", pretrialStartedTurn: Number.isInteger(item.pretrialStartedTurn) ? item.pretrialStartedTurn : normalized.turn, pretrialDeadlineTurn: !migrateLiabilityTimers && Number.isInteger(item.pretrialDeadlineTurn) ? item.pretrialDeadlineTurn : normalized.turn + (CONFIG.rules.compensationPretrialTurns ?? 8), courtEscalationChance: Number.isFinite(item.courtEscalationChance) ? Math.max(0, Math.min(1, item.courtEscalationChance)) : (CONFIG.rules.compensationCourtEscalationChance ?? 0.1), lastOfferPercent: Number.isFinite(item.lastOfferPercent) ? Math.max(10, Math.min(100, item.lastOfferPercent)) : 10, lastOfferTurn: Number.isInteger(item.lastOfferTurn) ? item.lastOfferTurn : null, courtStage: ["trial", "payment"].includes(item.courtStage) ? item.courtStage : null, courtStartedTurn: Number.isInteger(item.courtStartedTurn) ? item.courtStartedTurn : null, trialDeadlineTurn: !migrateLiabilityTimers && Number.isInteger(item.trialDeadlineTurn) ? item.trialDeadlineTurn : item.status === "court" && item.courtStage === "trial" ? normalized.turn + (CONFIG.rules.compensationTrialTurns ?? 4) : null, paymentDeadlineTurn: !migrateLiabilityTimers && Number.isInteger(item.paymentDeadlineTurn) ? item.paymentDeadlineTurn : item.status === "court" && item.courtStage === "payment" ? normalized.turn + (CONFIG.rules.compensationPaymentTurns ?? 4) : null, delayCount: Number.isInteger(item.delayCount) ? item.delayCount : 0 })) : [];
    const migrateEmployeeSalaries = saved.employeeSalaryRulesVersion !== 2;
    const migrateGameSetup = saved.gameSetupVersion !== 2;
    normalized.employeeSalaryRulesVersion = 2;
    normalized.gameSetupVersion = 2;
    normalized.employees = Array.isArray(normalized.employees) ? normalized.employees.map(employee => {
      const role = ROLES[employee.role] || ROLES.handyman;
      const rosterProfile = EMPLOYEE_ROSTER.find(person => person.role === employee.role && person.name === employee.name);
      const legalStrength = employee.role === "lawyer" ? Math.max(1, Math.min(3, Number.isInteger(employee.legalStrength) ? employee.legalStrength : 1)) : employee.legalStrength;
      const legacyLoyalty = { satisfied: 3, normal: 0, dissatisfied: -4, veryDissatisfied: -8 }[employee.mood] ?? (employee.unhappy || employee.unhappyNextTurn ? -4 : 0);
      return { ...rosterProfile, ...employee, legalStrength, salary: migrateEmployeeSalaries && rosterProfile && Number.isFinite(employee.salary) && role.salary ? employee.salary / role.salary * (employee.role === "lawyer" ? lawyerSalary(legalStrength) : rosterProfile.salary) : Number.isFinite(employee.salary) ? employee.salary : employee.role === "lawyer" ? lawyerSalary(legalStrength) : role.salary, bonus: employee.bonus || rosterProfile?.bonus, bonusDescription: rosterProfile?.bonusDescription || employee.bonusDescription, productivity: Number.isFinite(employee.productivity) ? employee.productivity : role.productivity, age: Number.isInteger(employee.age) ? Math.max(20, Math.min(60, employee.age)) : 20 + Math.floor(Math.random() * 41), loyalty: Number.isInteger(employee.loyalty) ? Math.max(-10, Math.min(5, employee.loyalty)) : legacyLoyalty, loyaltyQuietStreak: Number.isInteger(employee.loyaltyQuietStreak) ? employee.loyaltyQuietStreak : 0, probationTurns: Number.isInteger(employee.probationTurns) ? employee.probationTurns : 0, assignedLabor: Number.isFinite(employee.assignedLabor) ? employee.assignedLabor : (employee.usedThisTurn ? 1 : 0), mood: employee.mood || "normal", fullSalaryStreak: Number.isInteger(employee.fullSalaryStreak) ? employee.fullSalaryStreak : 0, noWithholdPayStreak: Number.isInteger(employee.noWithholdPayStreak) ? employee.noWithholdPayStreak : 0, noPremiumPayStreak: Number.isInteger(employee.noPremiumPayStreak) ? employee.noPremiumPayStreak : 0, withholdPercent: Number.isFinite(employee.withholdPercent) ? Math.max(-50, Math.min(50, employee.withholdPercent)) : 0, withheldAmount: Number.isFinite(employee.withheldAmount) ? employee.withheldAmount : 0, unpaidOvertime: Boolean(employee.unpaidOvertime), deceased: Boolean(employee.deceased) };
    }) : [];
    normalized.employees.forEach(employee => {
      employee.withholdPercent = Number.isFinite(employee.withholdPercent) ? Math.max(-50, Math.min(50, employee.withholdPercent)) : 0;
      employee.anchoredWithholdPercent = Number.isFinite(employee.anchoredWithholdPercent) ? Math.max(-50, Math.min(50, employee.anchoredWithholdPercent)) : employee.withholdPercent;
    });
    const seenEmployeeProfiles = new Set();
    normalized.employees = normalized.employees.filter(employee => {
      const profileKey = `${employee.role}:${employee.name || employee.id}`;
      if (seenEmployeeProfiles.has(profileKey)) return false;
      seenEmployeeProfiles.add(profileKey);
      return true;
    });
    normalized.market = Array.isArray(normalized.market) ? normalized.market.map(candidate => {
      const rosterPerson = EMPLOYEE_ROSTER.find(person => person.role === candidate.role && person.name === candidate.name) || EMPLOYEE_ROSTER.find(person => person.role === candidate.role) || EMPLOYEE_ROSTER[0];
      return { ...rosterPerson, ...candidate, legalStrength: candidate.role === "lawyer" ? Math.max(1, Math.min(3, Number.isInteger(candidate.legalStrength) ? candidate.legalStrength : (rosterPerson.legalStrength || 1))) : candidate.legalStrength, name: candidate.name || rosterPerson.name, salary: candidate.role === "lawyer" ? lawyerSalary(candidate.legalStrength || rosterPerson.legalStrength || 1) : rosterPerson.salary, bonus: candidate.bonus || rosterPerson.bonus, bonusDescription: candidate.bonusDescription || rosterPerson.bonusDescription, productivity: Number.isFinite(candidate.productivity) ? candidate.productivity : rosterPerson.productivity };
    }) : [];
    const seenMarketProfiles = new Set();
    normalized.market = normalized.market.filter(candidate => {
      const profileKey = `${candidate.role}:${candidate.name}`;
      if (seenMarketProfiles.has(profileKey) || normalized.employees.some(employee => employee.role === candidate.role && employee.name === candidate.name)) return false;
      seenMarketProfiles.add(profileKey);
      return true;
    });
    normalized.pendingHireIds = normalized.pendingHireIds.filter(id => normalized.market.some(candidate => candidate.id === id));
    if (migrateGameSetup && normalized.phase === "drawing" && normalized.turn === 1 && normalized.year === 1 && normalized.employees.length === 0 && normalized.requests.length === 0 && normalized.totals.accepted === 0 && normalized.totals.hired === 0) {
      normalized.phase = "preparation";
      normalized.pendingHireIds = [];
    }
    normalized.deck = Array.isArray(normalized.deck) ? normalized.deck : [];
    normalized.requests = Array.isArray(normalized.requests) ? normalized.requests.map(card => ({
      ...card,
      category: ({ "Освещение": "Электрика", "Водоснабжение": "Сантехника", "Благоустройство": "Общестрой", "Подъезд": "Общестрой", "Безопасность": "Электрика" })[card.category] || card.category || "Общестрой",
      labor: Math.max(0, Math.min(CONFIG.rules.maxRequestLabor, Number.isFinite(card.labor) ? card.labor : 1)), materialCost: card.type === "paid" ? 0 : Math.min(MAX_REQUEST_MATERIAL_UNITS, Math.max(0, Math.floor(Number.isFinite(card.materialCost) ? card.materialCost : 0))),
      contractorCost: undefined,
      type: card.problemId && !card.resolved && !card.cancelled ? (card.damageCompensation > 0 ? "emergencyDamage" : "emergency") : ["ordinary", "emergency", "emergencyDamage", "paid"].includes(card.type) ? card.type : "ordinary",
      damageCompensation: Number.isFinite(card.damageCompensation) ? (card.resolved && !Array.isArray(saved.compensations) ? 0 : card.damageCompensation) : 0,
      payout: Number.isFinite(card.payout) ? card.payout : 0,
      receivedTurn: card.receivedTurn ?? normalized.turn,
      houseName: card.houseName || normalized.houseName,
      houseAddress: card.houseAddress || (normalized.additionalHomes.find(home => home.name === card.houseName)?.address) || normalized.houseAddress
    })) : [];
    normalized.cancelledRequests = normalized.cancelledRequests.map(card => ({ ...card, materialCost: card.type === "paid" ? 0 : Math.min(MAX_REQUEST_MATERIAL_UNITS, Math.max(0, Math.floor(Number.isFinite(card.materialCost) ? card.materialCost : 0))), houseName: card.houseName || normalized.houseName, houseAddress: card.houseAddress || normalized.additionalHomes.find(home => home.name === card.houseName)?.address || normalized.houseAddress }));
    normalized.compensations.forEach(claim => { if (!claim.problemId) claim.problemId = normalized.requests.find(card => card.id === claim.requestId)?.problemId || null; });
    const compensationRequestIds = new Set(normalized.compensations.map(item => item.requestId));
    normalized.requests.filter(card => !card.resolved && !card.cancelled && card.damageCompensation > 0 && !compensationRequestIds.has(card.id)).forEach(card => {
      const claim = { id: `comp-${card.id}`, requestId: card.id, problemId: card.problemId || null, title: card.title, amount: card.damageCompensation, year: normalized.year, houseName: card.houseName, houseAddress: card.houseAddress, paid: false, writtenOff: false, contestedBy: [], status: "pretrial", pretrialStartedTurn: normalized.turn, pretrialDeadlineTurn: normalized.turn + (CONFIG.rules.compensationPretrialTurns ?? 8), lastOfferPercent: 10, lastOfferTurn: null, courtStage: null, delayCount: 0 };
      normalized.compensations.push(claim);
      card.compensationId = claim.id;
    });
    normalized.houseRequestCounts = saved.houseRequestCounts && typeof saved.houseRequestCounts === "object" ? { ...saved.houseRequestCounts } : {};
    const trackedHomes = (normalized.houseRemoved ? [] : [{ name: normalized.houseName }]).concat(normalized.additionalHomes);
    trackedHomes.forEach(home => {
      if (normalized.houseRequestCounts[home.name]) return;
      const knownCards = new Map([...normalized.requests, ...normalized.cancelledRequests].filter(card => card.houseName === home.name).map(card => [card.id, card]));
      const accepted = knownCards.size;
      const completed = [...knownCards.values()].filter(card => card.resolved).length;
      const legacySingleHome = trackedHomes.length === 1 && home.name === normalized.houseName;
      normalized.houseRequestCounts[home.name] = { accepted: legacySingleHome ? Math.max(accepted, normalized.totals.accepted) : accepted, completed: legacySingleHome ? Math.max(completed, normalized.totals.completed) : completed };
    });
    normalized.seasonFinancials.paidIncome = Number.isFinite(normalized.seasonFinancials.paidIncome) ? normalized.seasonFinancials.paidIncome : 0;
    ["problemRepairs", "contractors", "materials"].forEach(key => { if (!Number.isFinite(normalized.seasonFinancials[key])) normalized.seasonFinancials[key] = 0; });
    normalized.lastSeasonFinancials.paidIncome = Number.isFinite(normalized.lastSeasonFinancials.paidIncome) ? normalized.lastSeasonFinancials.paidIncome : 0;
    normalized.lastSeasonFinancials.fines = Number.isFinite(normalized.lastSeasonFinancials.fines) ? normalized.lastSeasonFinancials.fines : 0;
    normalized.lastSeasonFinancials.compensation = Number.isFinite(normalized.lastSeasonFinancials.compensation) ? normalized.lastSeasonFinancials.compensation : 0;
    normalized.lastSeasonFinancials.problemRepairs = Number.isFinite(normalized.lastSeasonFinancials.problemRepairs) ? normalized.lastSeasonFinancials.problemRepairs : 0;
    normalized.log = Array.isArray(normalized.log) ? normalized.log : [];
    if (!["preparation", "staffing", "inspection", "problems", "drawing", "resolving", "legal", "payroll", "collection", "annualReport", "bankruptcy", "gameOver"].includes(normalized.phase)) normalized.phase = "staffing";
    // A previously saved base-game turn already has its requests; proceed to resolving it.
    if (normalized.phase === "drawing" && normalized.requests.length) normalized.phase = "resolving";
    if (normalized.phase === "problems" && normalized.houseProblems.length === 0) normalized.phase = "drawing";
    return normalized;
  }

  function createFreshState() {
    const freshData = JSON.parse(JSON.stringify(INITIAL_STATE));
    freshData.log = [{ text: "Компания открыла первый дом под управлением.", turn: 1 }];
    const fresh = normalizeState(freshData);
    fresh.market = makeMarket(fresh.employees);
    return fresh;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && Number.isInteger(saved.turn) && Number.isFinite(saved.capital) && Array.isArray(saved.requests) && Array.isArray(saved.log)) return normalizeState(saved);
    } catch (_) { /* Start a fresh game if saved data is unavailable. */ }
    return createFreshState();
  }

  function saveState() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function complaintProbability(baseChance) {
    const chance = Math.max(0, Math.min(1, Number(baseChance) || 0));
    const modifier = DEV_MODE && state ? Math.max(0, Math.min(1000, Number(state.complaintModifierPercent) || 0)) : 100;
    return Math.min(1, chance * modifier / 100);
  }
  function money(value) { return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
  function founderLoanPayment(amount, years) {
    const monthlyRate = 0.33 / 12;
    const months = Math.max(12, Math.round(years * 12));
    return Math.round(amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)) * 100) / 100;
  }
  function takeFounderLoan() {
    if (["preparation", "annualReport", "bankruptcy", "gameOver"].includes(state.phase)) return;
    const amount = Number(document.getElementById("founder-loan-amount")?.value);
    const years = Number(document.getElementById("founder-loan-years")?.value);
    if (!Number.isFinite(amount) || amount < 100 || amount > 1000 || !Number.isInteger(years) || years < 1 || years > 10) return;
    const monthlyRate = 0.33 / 12;
    const payment = founderLoanPayment(amount, years);
    state.founderAccount += amount;
    state.founderLoans.push({ id: `founder-loan-${state.turn}-${Date.now()}`, principal: amount, balance: amount, termYears: years, monthlyRate, monthlyPayment: payment, paymentsRemaining: years * 12, issuedTurn: state.turn });
    addLog(`Учредитель взял кредит ${money(amount)} ₽ на ${years} лет под 33% годовых. Ежемесячный платёж ${money(payment)} ₽ будет списываться каждый ход.`);
    saveState(); render(); showToast(`Кредит ${money(amount)} ₽ зачислен. Платёж за ход: ${money(payment)} ₽.`);
  }
  function payoffFounderLoan(loanId) {
    if (["preparation", "annualReport", "bankruptcy", "gameOver"].includes(state.phase)) return;
    const loan = state.founderLoans.find(item => item.id === loanId);
    if (!loan) return;
    const amount = Math.max(0, Number(loan.balance) || 0);
    if (state.founderAccount + 0.000001 < amount) {
      showToast(`Для досрочного погашения нужно ${money(amount)} ₽ на счёте учредителя.`);
      return;
    }
    state.founderAccount = Math.round((state.founderAccount - amount) * 100) / 100;
    state.founderLoans = state.founderLoans.filter(item => item.id !== loanId);
    addLog(`Учредитель досрочно погасил кредит на ${money(amount)} ₽.`);
    saveState(); render(); showToast(`Кредит досрочно погашен: ${money(amount)} ₽.`);
  }
  function chargeFounderLoanPayments() {
    if (!state.founderLoans.length) return true;
    const due = state.founderLoans.reduce((sum, loan) => sum + Math.min(loan.balance * (1 + loan.monthlyRate), loan.paymentsRemaining <= 1 ? loan.balance * (1 + loan.monthlyRate) : loan.monthlyPayment), 0);
    if (state.founderAccount + 0.000001 < due) {
      state.phase = "gameOver";
      state.badGameResult = "Вы обанкротились, ваше имущество арестовали";
      addLog(`На счёте учредителя не хватило средств на кредитный платёж ${money(due)} ₽ (доступно ${money(state.founderAccount)} ₽). Игра окончена: ${state.badGameResult}.`);
      return false;
    }
    state.founderAccount = Math.round((state.founderAccount - due) * 100) / 100;
    state.founderLoans = state.founderLoans.map(loan => {
      const interest = loan.balance * loan.monthlyRate;
      const payment = loan.paymentsRemaining <= 1 ? loan.balance + interest : Math.min(loan.balance + interest, loan.monthlyPayment);
      loan.balance = Math.max(0, Math.round((loan.balance + interest - payment) * 100) / 100);
      loan.paymentsRemaining -= 1;
      return loan;
    }).filter(loan => loan.balance > 0.005 && loan.paymentsRemaining > 0);
    addLog(`Списан ежемесячный платёж по кредиту учредителя: −${money(due)} ₽.`);
    return true;
  }
  function quantity(value) { return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value); }
  function changeCapital(delta, operation) {
    if (!Number.isFinite(delta) || !Number.isFinite(state.capital + delta)) {
      addLog(`Операция «${operation}» отменена: обнаружена некорректная денежная сумма.`);
      return false;
    }
    state.capital += delta;
    return true;
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
  function requestTypeLabel(type) { return ({ ordinary: "Обычная", emergency: "Аварийная", emergencyDamage: "Аварийная · ущерб", paid: "Платная" })[type] || "Обычная"; }
  function requestAttributeLabel(type) { return ({ ordinary: "Обычная", emergency: "Аварийная · без ущерба", emergencyDamage: "Аварийная · с ущербом", paid: "Платная" })[type] || "Обычная"; }
  function isEmergency(card) { return card.type === "emergency" || card.type === "emergencyDamage"; }
  function requestMoneyCost(card) {
    return requestContractorWorkCost(card) + requestMaterialPurchaseCost(card);
  }
  function requestContractorWorkCost(card) {
    const specialist = Object.values(ROLES).find(role => role.category === card.category);
    return (specialist?.salary || ROLES.handyman.salary) + CONFIG.economy.contractorMarkup;
  }
  function requestMaterialUnits(card) { return card.type === "paid" ? 0 : Math.min(MAX_REQUEST_MATERIAL_UNITS, Math.max(0, Math.floor(Number.isFinite(card.materialCost) ? card.materialCost : 0))); }
  function materialUnitCost(discounted = false) { const base = Math.max(0.01, Number(CONFIG.economy.materialCostPerUnit) || 1); return discounted ? Math.max(0.01, base * (1 - Math.min(100, employeeBonusCount("engineer", "discountProblemMaterials") * CONFIG.rules.engineerMaterialDiscountPercent) / 100)) : base; }
  function materialShortage(units) { return Math.max(0, units - state.materialStock); }
  function canCoverRequiredCost(cost) { return cost <= 0 || state.capital >= cost; }
  function requestMaterialPurchaseCost(card) { return materialShortage(requestMaterialUnits(card)) * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier; }
  function consumeMaterials(units) { const used = Math.min(state.materialStock, Math.max(0, units)); state.materialStock = Math.max(0, state.materialStock - used); return used; }
  function requestIsOverdue(card) { return state.turn - (card.receivedTurn ?? state.turn) >= 4 * state.seasonDuration; }
  function registerDamageClaim(card) {
    if (!card.damageCompensation || state.compensations.some(claim => claim.requestId === card.id)) return;
    const claim = { id: `comp-${card.id}`, requestId: card.id, problemId: card.problemId || null, title: card.title, amount: card.damageCompensation, year: state.year, houseName: card.houseName || state.houseName, houseAddress: card.houseAddress || state.houseAddress, paid: false, writtenOff: false, contestedBy: [], status: "pretrial", pretrialStartedTurn: state.turn, pretrialDeadlineTurn: state.turn + (CONFIG.rules.compensationPretrialTurns ?? 8), lastOfferPercent: 10, lastOfferTurn: null, courtStage: null, delayCount: 0 };
    card.compensationId = claim.id;
    state.compensations.push(claim);
  }
  function unpaidFineTotal() { return state.penalties.filter(penalty => !penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared).reduce((sum, penalty) => sum + penalty.amount, 0); }
  function unpaidCompensationTotal() { return state.compensations.filter(claim => !claim.paid && !claim.writtenOff).reduce((sum, claim) => sum + claim.amount, 0); }
  function hasNoDebts() { return state.capital >= 0 && unpaidFineTotal() === 0 && unpaidCompensationTotal() === 0; }
  function activeEmployees() { return state.employees.filter(employee => !employee.deceased); }
  function hasLawyer() { return activeEmployees().some(employee => employee.role === "lawyer"); }
  function hasHR() { return activeEmployees().some(employee => employee.role === "hr"); }
  function employeeBonusCount(role, bonus) { return activeEmployees().filter(employee => employee.role === role && employee.bonus === bonus).length; }
  function hasEmployeeBonus(role, bonus) { return employeeBonusCount(role, bonus) > 0; }
  function maintenanceDiscountPercent() { return Math.min(100, employeeBonusCount("accountant", "discountMaintenance") * CONFIG.rules.accountantMaintenanceDiscountPercent); }
  function effectiveBaseMaintenanceTotal() { const gross = managedHomes().reduce((sum, home) => sum + (Number.isFinite(home.baseMaintenance) ? home.baseMaintenance : state.baseMaintenance), 0); return gross * (1 - maintenanceDiscountPercent() / 100); }
  function applyAnnualMaintenanceGrowth() {
    const changes = managedHomes().map(home => {
      const previous = Number.isFinite(home.baseMaintenance) ? home.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse;
      const growthPercent = Math.floor(Math.random() * 10) + 1;
      const updated = Math.round(previous * (1 + growthPercent / 100) * 100) / 100;
      setHomeField(home, "baseMaintenance", updated);
      return { name: home.name, address: home.address, previous, growthPercent, updated };
    });
    if (changes.length) addLogSequence(changes.map(change => `Естественный рост БО дома «${change.name}» (${change.address}): ${money(change.previous)} → ${money(change.updated)} ₽ за ход (+${change.growthPercent}%).`));
    return changes;
  }
  function managedHomes() {
    const primary = { name: state.houseName, managedSinceYear: state.managedSinceYear, address: state.houseAddress, area: state.primaryArea || state.area, age: state.houseAge, baseMaintenance: state.baseMaintenance, primary: true, tariffPerSquareMeter: state.tariffPerSquareMeter, tariffOssResolvedYear: state.tariffOssResolvedYear, debtRecoverable: state.primaryDebtRecoverable || 0, debtIrrecoverable: state.primaryDebtIrrecoverable || 0, collectionStats: state.primaryCollectionStats || { billed: 0, collected: 0, periods: 0 }, lastCollectionRate: state.primaryLastCollectionRate, repairWarranties: state.houseRepairWarranties || {}, warrantyUntilTurn: state.houseWarrantyUntilTurn };
    return (state.houseRemoved ? [] : [primary]).concat(state.additionalHomes || []);
  }
  function availableRealEstateHomes() {
    const ownedNames = new Set(managedHomes().map(home => home.name));
    return (state.houseDeck || []).filter(house => !ownedNames.has(house.name));
  }
  function addHomeToPortfolio(home) {
    if (managedHomes().length) {
      state.additionalHomes.push(home);
    } else {
      state.houseName = home.name; state.managedSinceYear = home.managedSinceYear || state.year; state.houseAddress = home.address;
      state.primaryArea = home.area; state.houseAge = Number(home.age) || 0; state.baseMaintenance = home.baseMaintenance;
      state.tariffPerSquareMeter = home.tariffPerSquareMeter; state.tariffOssResolvedYear = home.tariffOssResolvedYear ?? null;
      state.primaryDebtRecoverable = home.debtRecoverable || 0; state.primaryDebtIrrecoverable = home.debtIrrecoverable || 0;
      state.primaryCollectionStats = home.collectionStats || { billed: 0, collected: 0, periods: 0 }; state.primaryLastCollectionRate = home.lastCollectionRate ?? null;
      state.houseRepairWarranties = home.repairWarranties || {}; state.houseWarrantyUntilTurn = home.warrantyUntilTurn ?? null;
      state.houseUnsafeSinceTurn = home.unsafeSinceTurn ?? null; state.houseUnsafeSinceYear = home.unsafeSinceYear ?? null; state.houseUnsafeReasons = home.unsafeReasons || [];
      state.houseUnsafeCategory = null; state.houseRemoved = false;
    }
    refreshPortfolioTotals();
  }
  function managedHomeByName(name) { return managedHomes().find(home => home.name === name) || null; }
  function averageManagedTariff() {
    const homes = managedHomes();
    const area = homes.reduce((sum, home) => sum + home.area, 0);
    return area > 0 ? homes.reduce((sum, home) => sum + home.area * currentTariff(home), 0) / area : 0;
  }
  function setHomeField(home, field, value) {
    if (!home) return;
    if (home.primary) {
      const fields = { tariffPerSquareMeter: "tariffPerSquareMeter", tariffOssResolvedYear: "tariffOssResolvedYear", debtRecoverable: "primaryDebtRecoverable", debtIrrecoverable: "primaryDebtIrrecoverable", collectionStats: "primaryCollectionStats", lastCollectionRate: "primaryLastCollectionRate", baseMaintenance: "baseMaintenance", repairWarranties: "houseRepairWarranties", warrantyUntilTurn: "houseWarrantyUntilTurn" };
      state[fields[field] || field] = value;
      home[field] = value;
    } else home[field] = value;
  }
  function refreshPortfolioTotals() {
    const homes = managedHomes();
    state.houses = homes.length;
    state.area = homes.reduce((sum, home) => sum + home.area, 0);
    state.houseDebtRecoverable = homes.reduce((sum, home) => sum + (home.debtRecoverable || 0), 0);
    state.houseDebtIrrecoverable = homes.reduce((sum, home) => sum + (home.debtIrrecoverable || 0), 0);
    state.houseDebt = state.houseDebtRecoverable + state.houseDebtIrrecoverable;
    state.collectionStats = homes.reduce((sum, home) => ({ billed: sum.billed + (home.collectionStats?.billed || 0), collected: sum.collected + (home.collectionStats?.collected || 0), periods: sum.periods + (home.collectionStats?.periods || 0) }), { billed: 0, collected: 0, periods: 0 });
    const recentHomes = homes.filter(home => Number.isFinite(home.lastCollectionRate));
    const recentBilled = recentHomes.reduce((sum, home) => sum + home.area * currentTariff(home), 0);
    const recentCollected = recentHomes.reduce((sum, home) => sum + home.area * currentTariff(home) * home.lastCollectionRate / 100, 0);
    state.lastCollectionRate = recentBilled > 0 ? Math.round(recentCollected / recentBilled * 100) : null;
  }
  function currentMarketExecutors() { return state.market.filter(person => ROLES[person.role]?.kind === "executor").length; }
  function currentMarketSpecialists() { return state.market.filter(person => ROLES[person.role]?.kind === "specialist").length; }
  function hasAvailableMarketReroll() { return hasEmployeeBonus("hr", "marketReroll") && state.phase === "staffing" && state.marketRerollUsedTurn !== state.turn && state.pendingHireIds.length === 0; }
  function hasAccountant() { return activeEmployees().some(employee => employee.role === "accountant"); }
  function hasEngineer() { return activeEmployees().some(employee => employee.role === "engineer"); }
  function pendingHireHasHR() { return state.pendingHireIds.some(id => state.market.some(candidate => candidate.id === id && candidate.role === "hr")); }
  function activeLawyers() { return activeEmployees().filter(employee => employee.role === "lawyer"); }
  function lawyerHasAvailableTask(lawyer) {
    if (state.houseDebtRecoverable > 0) return true;
    if (state.penalties.some(penalty => !penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared && !(penalty.contestedBy || []).length)) return true;
    if (state.compensations.some(claim => !claim.paid && !claim.writtenOff && claim.amount > 0 && claim.status === "court" && claim.courtStage === "trial" && (!(claim.contestedBy || []).length || claim.lastDelayTurn !== state.turn))) return true;
    return state.legalCases.some(caseFile => caseFile.status === "trial" && (caseFile.lastWinAttemptTurn !== state.turn || caseFile.lastDelayTurn !== state.turn));
  }
  function lawyersDone() { const lawyers = activeLawyers(); return !lawyers.length || lawyers.every(employee => state.lawyerActionsUsed.includes(employee.id) || !lawyerHasAvailableTask(employee)); }
  function markLawyerDone(employeeId) { if (!state.lawyerActionsUsed.includes(employeeId)) state.lawyerActionsUsed.push(employeeId); state.lawyerActionTaken = lawyersDone(); }
  const MOOD_ORDER = ["veryDissatisfied", "dissatisfied", "normal", "satisfied"];
  const MOOD_LABELS = { veryDissatisfied: "Очень недоволен", dissatisfied: "Недоволен", normal: "Норм", satisfied: "Доволен" };
  function loyaltyOf(employee) { return Math.max(-10, Math.min(5, Number.isInteger(employee.loyalty) ? employee.loyalty : 0)); }
  function moodOf(employee) { const loyalty = loyaltyOf(employee); return loyalty <= -7 ? "veryDissatisfied" : loyalty <= -3 ? "dissatisfied" : loyalty <= 1 ? "normal" : "satisfied"; }
  function changeLoyalty(employee, amount) { employee.loyalty = Math.max(-10, Math.min(5, loyaltyOf(employee) + amount)); employee.mood = moodOf(employee); return employee.loyalty; }
  function changeMood(employee, steps) { return changeLoyalty(employee, steps); }
  function projectedWithholdingMood(employee, percent = employee.withholdPercent || 0) {
    const loyalty = loyaltyOf(employee);
    if (percent > 0) return `${loyalty} → ${Math.max(-10, loyalty - 1)} (${percent}% шанс)`;
    if (percent < 0) return `${loyalty} → ${Math.min(5, loyalty + 1)} (${Math.abs(percent)}% шанс)`;
    const needed = loyalty === 5 ? 4 : loyalty === 4 ? 3 : loyalty === 3 ? 2 : loyalty === 2 || loyalty === -3 || loyalty === -4 ? 2 : loyalty <= -5 ? 3 : 0;
    return needed ? `${loyalty} → ${loyalty > 0 ? loyalty - 1 : loyalty + 1} через ${Math.max(0, needed - (employee.loyaltyQuietStreak || 0))} ход.` : `${loyalty} (стремится к норме)`;
  }
  function setDissatisfied(employee, reason) { employee.unpaidOvertime = true; employee.fullSalaryStreak = 0; employee.noWithholdPayStreak = 0; employee.noPremiumPayStreak = 0; addLog(`${employee.name}: переработка без доплаты зафиксирована; лояльность будет пересчитана после выплаты ЗП и БО${reason ? ` (${reason})` : ""}.`); }
  function averageWithholdingPercent() { const team = state.employees.filter(employee => !employee.deceased); return team.length ? team.reduce((sum, employee) => sum + Math.max(0, Number(employee.withholdPercent) || 0), 0) / team.length : 0; }
  function boundedProbability(percent) { return Math.max(0, Math.min(100, percent)) / 100; }
  function lowReputationDepartureChance(employee) {
    if (state.reputation >= 0) return 0;
    const loyalty = loyaltyOf(employee), reputation = Math.abs(state.reputation);
    const modifier = loyalty >= 2 ? -50 : loyalty >= -2 ? -10 : loyalty >= -6 ? 0 : 10;
    return boundedProbability(reputation + modifier);
  }
  function outsideOfferChance(employee) { return boundedProbability(averageWithholdingPercent() + (loyaltyOf(employee) >= 2 ? 0 : 10)); }
  function moodTurnoverChance(employee) { return boundedProbability(Math.max(0, -loyaltyOf(employee))); }
  function moodComplaintChance(employee) { const loyalty = loyaltyOf(employee); return boundedProbability((loyalty <= -7 ? 20 : loyalty <= -3 ? 10 : 0) + averageWithholdingPercent()); }
  function neutralLoyaltyRecovery(employee) {
    const value = loyaltyOf(employee);
    const needed = value === 5 ? 4 : value === 4 ? 3 : value === 3 ? 2 : value === 2 || value === -3 || value === -4 ? 2 : value <= -5 ? 3 : Infinity;
    employee.loyaltyQuietStreak = (employee.loyaltyQuietStreak || 0) + 1;
    if (employee.loyaltyQuietStreak >= needed) { changeLoyalty(employee, value > 0 ? -1 : 1); employee.loyaltyQuietStreak = 0; return true; }
    return false;
  }
  function respondToOutsideOffer(employeeId, keep) {
    if (state.phase !== "staffing" && !DEV_MODE) return;
    const employee = state.employees.find(item => item.id === employeeId && item.pendingDeparture?.needsResponse && (!keep || ["outsideOffer", "lowReputation"].includes(item.pendingDeparture.reason)));
    if (!employee) return;
    if (keep) {
      if (employee.retentionRaiseYear === state.year) { showToast(`${employee.name} уже получил встречное повышение зарплаты в этом году.`); return; }
      const increase = hasHR() ? 10 : (CONFIG.rules.employeeRetentionSalaryIncreasePercent ?? 20);
      employee.salary *= 1 + increase / 100;
      employee.retentionRaiseYear = state.year;
      employee.pendingDeparture = null;
      addLog(`Сотрудник ${employee.name} согласился остаться после повышения зарплаты на ${increase}%; новая ставка ${money(employee.salary)} ₽ за ход.`);
      showToast(`${employee.name} остаётся в компании с повышением зарплаты.`);
    } else {
      employee.pendingDeparture.needsResponse = false;
      addLog(`${employee.name} отказался от встречного предложения и доработает положенный срок; причина ухода: «${employee.pendingDeparture.label}».`);
      showToast(`${employee.name} уйдёт после завершения положенного срока.`);
    }
    saveState(); render();
  }
  function resolveHealthDeparture(employeeId, treat) {
    const employee = state.employees.find(item => item.id === employeeId && item.pendingDeparture?.reason === "health" && item.pendingDeparture.needsResponse);
    if (!employee) return;
    if (treat) {
      const cost = effectiveSalary(employee) * 3;
      if (state.capital < cost || !changeCapital(-cost, "лечение сотрудника")) { showToast(`Для лечения нужно ${money(cost)} ₽.`); return; }
      state.seasonFinancials.salaries += cost;
      employee.loyalty = 5; employee.mood = "satisfied"; employee.loyaltyQuietStreak = 0; employee.pendingDeparture = null;
      addLog(`Сотрудник ${employee.name} вылечен за ${money(cost)} ₽; лояльность установлена на +5.`);
      showToast(`${employee.name} остаётся после лечения; лояльность +5.`);
    } else {
      employee.pendingDeparture.needsResponse = false;
      showToast(`${employee.name} доработает положенный срок и уйдёт.`);
    }
    saveState(); render();
  }
  function resolveDissatisfactionDeparture(employeeId, premiumPercent, departureReason = "dissatisfaction") {
    const employee = state.employees.find(item => item.id === employeeId && item.pendingDeparture?.reason === departureReason && item.pendingDeparture.needsResponse);
    if (!employee) return;
    const premium = departureReason === "outsideOffer" ? Math.max(0, Math.min(50, -(Number(employee.withholdPercent) || 0))) : Math.max(0, Math.min(50, Number(premiumPercent) || 0));
    const withheld = Number(employee.withheldAmount) || 0;
    const bonus = effectiveSalary(employee) * premium / 100;
    const cost = withheld + bonus;
    if (state.capital < cost) { showToast(`Нужно ${money(cost)} ₽, чтобы выплатить удержания и премию.`); return; }
    if (departureReason === "outsideOffer") {
      if (cost > 0 && !changeCapital(-cost, "удержания и премия при предложении конкурента")) return;
      employee.withheldAmount = 0;
      state.withheldWages = Math.max(0, state.withheldWages - withheld);
      employee.withholdPercent = 0;
      state.seasonFinancials.salaries += cost;
      const stayed = Math.random() < 0.5;
      if (stayed) {
        employee.loyalty = -2;
        employee.mood = moodOf(employee);
        employee.loyaltyQuietStreak = 0;
        employee.pendingDeparture = null;
        addLog(`${employee.name} получил удержания ${money(withheld)} ₽ и премию ${money(bonus)} ₽. После выплаты согласился остаться с вероятностью 50%; лояльность установлена на −2 (Норм).`);
        showToast(`${employee.name} получил ${money(cost)} ₽ и решил остаться. Лояльность −2.`);
      } else {
        employee.pendingDeparture.needsResponse = false;
        addLog(`${employee.name} получил удержания ${money(withheld)} ₽ и премию ${money(bonus)} ₽, но с вероятностью 50% решил уйти после последнего рабочего срока. Лояльность не изменилась.`);
        showToast(`${employee.name} получил ${money(cost)} ₽, но решил уйти.`);
      }
      saveState(); render();
      return;
    }
    const stayChance = (50 + premium) / 100;
    if (Math.random() < stayChance) {
      if (cost > 0 && !changeCapital(-cost, "удержанные зарплаты и премия для сохранения сотрудника")) return;
      employee.withheldAmount = 0; state.withheldWages = Math.max(0, state.withheldWages - withheld); employee.loyalty = departureReason === "outsideOffer" ? -2 : 5; employee.mood = moodOf(employee); employee.loyaltyQuietStreak = 0; employee.pendingDeparture = null;
      state.seasonFinancials.salaries += cost;
      addLog(`${employee.name} согласился остаться после выплаты удержаний ${money(withheld)} ₽ и премии ${money(bonus)} ₽; шанс остаться ${Math.round(stayChance * 100)}%, лояльность установлена на ${employee.loyalty} (${MOOD_LABELS[moodOf(employee)]}).`);
      showToast(`${employee.name} остался в штате.`);
    } else {
      employee.pendingDeparture.needsResponse = false;
      addLog(`${employee.name} не принял предложение остаться (шанс согласия ${Math.round(stayChance * 100)}%).`);
      showToast(`${employee.name} всё равно уйдёт после положенного срока.`);
    }
    saveState(); render();
  }
  function renderCompanyDebt() {
    const total = state.houseDebtRecoverable + state.houseDebtIrrecoverable;
    const lawyerCapacity = activeLawyers().reduce((sum, lawyer) => sum + lawyerDebtLimit(lawyer), 0);
    const yellow = Math.min(state.houseDebtRecoverable, lawyerCapacity);
    const red = Math.max(0, state.houseDebtRecoverable - yellow);
    const black = state.houseDebtIrrecoverable;
    elements.houseDebt.innerHTML = `<div class="debt-total">${money(total)} ₽ <small>общий долг</small></div><div class="debt-bar" role="img" aria-label="Можно отсудить ${money(red)} рублей, доступно юристам сейчас ${money(yellow)} рублей, невозвратный долг ${money(black)} рублей"><i class="debt-segment debt-red" style="width:${total ? red / total * 100 : 0}%"></i><i class="debt-segment debt-yellow" style="width:${total ? yellow / total * 100 : 0}%"></i><i class="debt-segment debt-black" style="width:${total ? black / total * 100 : 0}%"></i></div><div class="debt-legend"><span>Можно отсудить ${money(red)} ₽</span><span>Юристы могут взыскать сейчас ${money(yellow)} ₽</span><span>Не возместить ${money(black)} ₽</span></div>`;
  }
  function effectiveSalary(employee) { return employee.salary * (employee.probationTurns > 0 ? CONFIG.rules.probationSalaryMultiplier : 1); }
  function outsideOfferRetentionPayment(employee, adjustment = employee?.withholdPercent || 0) { return (Number(employee?.withheldAmount) || 0) + effectiveSalary(employee) * Math.max(0, -Number(adjustment || 0)) / 100; }
  function payableSalary(employee) { return effectiveSalary(employee) * (1 - (employee.withholdPercent || 0) / 100); }
  function upcomingPayroll() {
    const firingIds = new Set(Object.keys(state.pendingFireActions || {}));
    const currentPayroll = state.employees.filter(employee => !employee.deceased && !firingIds.has(employee.id)).reduce((sum, employee) => sum + payableSalary(employee), 0);
    const hireIds = new Set(state.pendingHireIds || []);
    const pendingHires = state.market.filter(candidate => hireIds.has(candidate.id));
    const probation = hasHR() || pendingHireHasHR();
    return currentPayroll + pendingHires.reduce((sum, candidate) => sum + ROLES[candidate.role].salary * (probation ? CONFIG.rules.probationSalaryMultiplier : 1), 0);
  }
  function upcomingFines() {
    return state.penalties.filter(item => !item.paid && !item.writtenOff && !item.lawyerCleared).reduce((sum, item) => sum + item.amount, 0);
  }
  function upcomingCompensations() {
    return state.compensations.filter(item => !item.paid && !item.writtenOff && item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  }
  function seasonFinePayments() {
    return state.penalties.filter(item => item.paid && item.paidTurn === state.turn).reduce((sum, item) => sum + item.amount, 0);
  }
  function seasonCompensationPayments() {
    return state.compensations.filter(item => item.paid && item.paidTurn === state.turn).reduce((sum, item) => sum + item.amount, 0);
  }
  function lastSeasonIncome() {
    return state.lastSeasonFinancials;
  }
  function renderFinancialInfographic() {
    if (!elements.financialInfographic) return;
    const history = state.financialHistory || [];
    const periodKey = (record, index) => `${record.year}:${record.seasonIndex}:${index}`;
    const periodPart = (record, index) => {
      if (state.seasonDuration <= 1) return "";
      const inferred = Number.isInteger(record.seasonTurnIndex) ? record.seasonTurnIndex : history.slice(0, index + 1).filter(item => item.year === record.year && item.seasonIndex === record.seasonIndex).length - 1;
      return ` · ${Math.max(0, Math.min(state.seasonDuration - 1, inferred)) + 1}/${state.seasonDuration}`;
    };
    const periodLabelFor = (record, index) => `${SEASONS[record.seasonIndex]} · год ${record.year}${periodPart(record, index)}`;
    const numeric = (record, key) => Number.isFinite(record?.[key]) ? record[key] : 0;
    const latestRecord = history[history.length - 1] || { year: state.year, seasonIndex: (state.seasonIndex + SEASONS.length - 1) % SEASONS.length, ...state.lastSeasonFinancials };
    let financials;
    let periodLabel;
    if (financialPeriodSelection === "all") {
      financials = history.reduce((total, record) => {
        ["collection", "paidIncome", "upkeep", "salaries", "fines", "compensation", "problemRepairs", "contractors", "materials"].forEach(key => { total[key] += numeric(record, key); });
        return total;
      }, { collection: 0, paidIncome: 0, upkeep: 0, salaries: 0, fines: 0, compensation: 0, problemRepairs: 0, contractors: 0, materials: 0 });
      periodLabel = "Все завершённые периоды";
    } else if (financialPeriodSelection === "latest") {
      financials = history.length ? latestRecord : state.lastSeasonFinancials;
      periodLabel = history.length ? periodLabelFor(latestRecord, history.length - 1) : "Сезон ещё не завершён";
    } else {
      const selectedIndex = history.findIndex((record, index) => periodKey(record, index) === financialPeriodSelection);
      const record = selectedIndex >= 0 ? history[selectedIndex] : latestRecord;
      financials = record;
      periodLabel = periodLabelFor(record, selectedIndex);
    }
    const totalIncome = numeric(financials, "collection") + numeric(financials, "paidIncome");
    const totalExpenses = ["upkeep", "salaries", "fines", "compensation", "problemRepairs", "contractors", "materials"].reduce((sum, key) => sum + numeric(financials, key), 0);
    const net = totalIncome - totalExpenses;
    const max = Math.max(totalIncome, totalExpenses, 1);
    const tariffHistory = history.filter(record => Number.isFinite(record.averageTariff) && record.averageTariff > 0);
    const averageTariff = financialPeriodSelection === "all"
      ? tariffHistory.length ? tariffHistory.reduce((sum, record) => sum + record.averageTariff, 0) / tariffHistory.length : averageManagedTariff()
      : Number.isFinite(financials.averageTariff) && financials.averageTariff > 0 ? financials.averageTariff : averageManagedTariff();
    const rows = [
      { label: "Содержание", value: numeric(financials, "collection"), type: "income" },
      { label: "Платные заявки", value: numeric(financials, "paidIncome"), type: "income" },
      { label: "Базовое обслуживание", value: numeric(financials, "upkeep"), type: "expense" },
      { label: "Зарплаты", value: numeric(financials, "salaries"), type: "expense" },
      { label: "Штрафы", value: numeric(financials, "fines"), type: "expense" },
      { label: "Возмещение ущерба", value: numeric(financials, "compensation"), type: "expense" },
      { label: "Расходы на подрядчиков", value: numeric(financials, "contractors"), type: "expense" },
      { label: "Расходы на материалы", value: numeric(financials, "materials"), type: "expense" },
      { label: "Прочие расходы", value: numeric(financials, "problemRepairs"), type: "expense" }
    ];
    const options = `<option value="all">Все завершённые периоды</option><option value="latest">Последний сезон</option>${history.map((record, index) => `<option value="${periodKey(record, index)}">${periodLabelFor(record, index)}</option>`).join("")}`;
    const graphMetrics = { capital: { label: "Бюджет", key: "capital", format: value => `${money(value)} ₽` }, collection: { label: "Собираемость", key: "collectionRate", format: value => `${Math.round(value)}%` }, reputation: { label: "Репутация", key: "reputation", format: value => `${value > 0 ? "+" : ""}${value}` }, upkeep: { label: "Расходы на БО", key: "upkeep", format: value => `${money(value)} ₽` }, salaries: { label: "Расходы на зарплаты", key: "salaries", format: value => `${money(value)} ₽` }, compensation: { label: "Возмещение ущерба", key: "compensation", format: value => `${money(value)} ₽` }, averageTariff: { label: "Средний тариф содержания УО", key: "averageTariff", format: value => `${money(value)} ₽/м²` }, contractors: { label: "Расходы на подрядчиков", key: "contractors", format: value => `${money(value)} ₽` }, materials: { label: "Расходы на материалы", key: "materials", format: value => `${money(value)} ₽` } };
    const graphMetric = graphMetrics[graphMetricSelection] || graphMetrics.capital;
    const graphData = history.map((record, index) => ({ label: `${SEASONS[record.seasonIndex]} · ${record.year}${periodPart(record, index)}`, value: numeric(record, graphMetric.key) }));
    let graphMarkup = '<div class="history-graph-empty">График появится после завершения первого сезона.</div>';
    if (graphData.length) {
      const width = 800, plotLeft = 52, plotRight = 780, plotTop = 24, plotBottom = 174;
      const values = graphData.map(point => point.value);
      let min = Math.min(...values), maxValue = Math.max(...values);
      if (min === maxValue) { min -= 1; maxValue += 1; }
      const xAt = index => graphData.length === 1 ? (plotLeft + plotRight) / 2 : plotLeft + index * (plotRight - plotLeft) / (graphData.length - 1);
      const yAt = value => plotBottom - (value - min) / (maxValue - min) * (plotBottom - plotTop);
      const linePath = graphData.map((point, index) => `${index ? "L" : "M"}${xAt(index).toFixed(1)},${yAt(point.value).toFixed(1)}`).join(" ");
      const markers = graphData.map((point, index) => `<circle cx="${xAt(index).toFixed(1)}" cy="${yAt(point.value).toFixed(1)}" r="4"><title>${escapeHtml(point.label)}: ${escapeHtml(graphMetric.format(point.value))}</title></circle>`).join("");
      const labelStep = Math.max(1, Math.ceil(graphData.length / 5));
      const xLabels = graphData.map((point, index) => index % labelStep === 0 || index === graphData.length - 1 ? `<text x="${xAt(index).toFixed(1)}" y="211" text-anchor="middle">${escapeHtml(point.label)}</text>` : "").join("");
      graphMarkup = `<svg class="history-graph-svg" viewBox="0 0 ${width} 225" role="img" aria-label="${graphMetric.label} по сезонам"><line x1="${plotLeft}" y1="${plotTop}" x2="${plotRight}" y2="${plotTop}" class="graph-gridline"/><line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" class="graph-gridline"/><text x="4" y="${plotTop + 4}">${escapeHtml(graphMetric.format(maxValue))}</text><text x="4" y="${plotBottom + 4}">${escapeHtml(graphMetric.format(min))}</text><path d="${linePath}" class="history-graph-line"/>${markers}${xLabels}</svg>`;
    }
    elements.financialInfographic.innerHTML = `<div class="financial-chart-heading"><div><p class="section-label">ФИНАНСОВЫЕ ИТОГИ</p><h2>Движение денег за выбранный период</h2></div><div class="financial-period-controls"><label for="financial-period-select">Период</label><select id="financial-period-select">${options}</select><span class="financial-season-badge">${periodLabel}</span></div></div><div class="financial-summary"><article><span>Приходы</span><b class="financial-positive">+${money(totalIncome)} ₽</b></article><article><span>Расходы</span><b class="financial-negative">−${money(totalExpenses)} ₽</b></article><article><span>Разница</span><b class="${net >= 0 ? "financial-positive" : "financial-negative"}">${net >= 0 ? "+" : "−"}${money(Math.abs(net))} ₽</b></article><article><span>Средний тариф содержания УО</span><b>${money(averageTariff)} ₽/м²</b></article></div><div class="financial-bars">${rows.map(row => `<div class="financial-bar-row"><span>${row.label}</span><div class="financial-bar-track"><i class="financial-bar-fill ${row.type}" style="width:${Math.max(row.value > 0 ? 2 : 0, row.value / max * 100)}%"></i></div><b>${row.type === "income" ? "+" : "−"}${money(row.value)} ₽</b></div>`).join("")}</div><section class="history-graph-panel"><div class="history-graph-heading"><div><p class="section-label">ГРАФИКИ</p><h3>${graphMetric.label} по сезонам и годам</h3></div><label for="graph-metric-select">Показатель<select id="graph-metric-select">${Object.entries(graphMetrics).map(([key, metric]) => `<option value="${key}">${metric.label}</option>`).join("")}</select></label></div>${graphMarkup}</section>`;
    const select = elements.financialInfographic.querySelector("#financial-period-select");
    select.value = financialPeriodSelection;
    select.addEventListener("change", () => { financialPeriodSelection = select.value; renderFinancialInfographic(); });
    const graphSelect = elements.financialInfographic.querySelector("#graph-metric-select");
    graphSelect.value = graphMetricSelection;
    graphSelect.addEventListener("change", () => { graphMetricSelection = graphSelect.value; renderFinancialInfographic(); });
  }
  function shuffle(cards) { for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; } return cards; }
  function addLog(text) { state.log.unshift({ text, turn: state.turn }); state.log = state.log.slice(0, CONFIG.rules.logEntriesKept); }
  function addLogSequence(messages) {
    const entries = messages.filter(Boolean).map(text => ({ text, turn: state.turn }));
    state.log = [...entries, ...state.log].slice(0, CONFIG.rules.logEntriesKept);
  }
  function countEvent(name, amount = 1) { state.yearStats[name] += amount; state.totals[name] += amount; }
  function recordHouseRequest(houseName, kind, amount = 1) {
    const name = houseName || state.houseName;
    state.houseRequestCounts ||= {};
    state.houseRequestCounts[name] ||= { accepted: 0, completed: 0 };
    state.houseRequestCounts[name][kind] = (state.houseRequestCounts[name][kind] || 0) + amount;
  }
  function completeRequest(card, resolvedBy = "employee") {
    if (!card || card.resolved || card.cancelled) return false;
    card.resolved = true;
    card.resolvedBy = resolvedBy;
    card.resolvedTurn = state.turn;
    recordHouseRequest(card.houseName, "completed");
    countEvent("completed");
    return true;
  }

  function effectiveProductivity(employee) { const mood = moodOf(employee); return employee.deceased ? 0 : Math.max(1, employee.productivity + (mood === "satisfied" ? 1 : mood === "dissatisfied" || mood === "veryDissatisfied" ? -1 : 0)); }
  function effectiveBaseProductivity(employee) { return effectiveProductivity(employee); }
  function overtimeFor(employee, additionalLabor) {
    const productivity = effectiveBaseProductivity(employee);
    const oldOvertime = Math.max(0, employee.assignedLabor - productivity);
    const newOvertime = Math.max(0, employee.assignedLabor + additionalLabor - productivity);
    const additionalOvertime = newOvertime - oldOvertime;
    const hrMultiplier = hasHR() ? CONFIG.rules.overtimeSalaryMultiplierWithHR : 1;
    const basePremium = Math.round(additionalOvertime * employee.salary / productivity * 100) / 100;
    const premium = Math.round(basePremium * hrMultiplier * 100) / 100;
    return { laborAfter: employee.assignedLabor + additionalLabor, overtime: newOvertime, basePremium, premium, hrMultiplier };
  }

  function currentTariff(home = null) { const tariff = home?.tariffPerSquareMeter; return Number.isFinite(tariff) ? tariff : Number.isFinite(state.tariffPerSquareMeter) ? state.tariffPerSquareMeter : TARIFF; }
  function maximumPortfolioCollection() { return managedHomes().reduce((sum, home) => sum + (Number(home.area) || 0) * currentTariff(home), 0); }

  function courtDateLabel(turn, year = null, seasonIndex = null, seasonTurnIndex = null) {
    if (!Number.isInteger(turn)) return "Дата не указана";
    if (Number.isInteger(year) && Number.isInteger(seasonIndex) && SEASONS[seasonIndex]) {
      const turnInSeason = Number.isInteger(seasonTurnIndex) ? ` · ход ${seasonTurnIndex + 1}/${state.seasonDuration}` : "";
      return `${SEASONS[seasonIndex]} · год ${year}${turnInSeason}`;
    }
    const duration = Math.max(1, state.seasonDuration || 1);
    const startSeason = Number.isInteger(state.startingSeasonIndex) ? state.startingSeasonIndex : 0;
    const currentOrdinal = (state.year - 1) * 4 + ((state.seasonIndex - startSeason + 4) % 4);
    const currentAbsoluteTurn = currentOrdinal * duration + (state.seasonTurnIndex || 0);
    const targetAbsoluteTurn = currentAbsoluteTurn - (state.turn - turn);
    const targetOrdinal = Math.floor(targetAbsoluteTurn / duration);
    const targetYear = Math.floor(targetOrdinal / 4) + 1;
    const targetSeason = (startSeason + ((targetOrdinal % 4) + 4) % 4) % 4;
    const turnOfSeason = ((targetAbsoluteTurn % duration) + duration) % duration + 1;
    return `${SEASONS[targetSeason]} · год ${targetYear} · ход ${turnOfSeason}`;
  }

  function render() {
    refreshPortfolioTotals();
    const homes = managedHomes();
    const baseIncome = homes.reduce((sum, home) => sum + home.area * currentTariff(home), 0);
    const payroll = state.employees.reduce((sum, employee) => sum + (employee.deceased ? 0 : effectiveSalary(employee)), 0);
    const unresolved = state.requests.filter(card => !card.resolved && !card.cancelled);
    const newRequests = state.requests.filter(card => card.receivedTurn === state.turn).length;
    const carried = unresolved.filter(card => card.receivedTurn !== state.turn).length;
    elements.turn.textContent = state.phase === "annualReport" ? `ОТЧЁТ · ${state.year} ГОД` : `${SEASONS[state.seasonIndex]} · ГОД ${state.year}`;
    elements.round.textContent = state.phase === "annualReport" ? "Год завершён" : `${state.seasonIndex + 1}/4 · ход ${state.seasonTurnIndex + 1}/${state.seasonDuration}`;
    elements.timelineYear.textContent = `Год ${state.year}`;
    elements.seasonTrack.innerHTML = SEASONS.map((season, index) => `<div class="season-node ${index < state.seasonIndex || state.phase === "annualReport" ? "season-done" : ""} ${index === state.seasonIndex && state.phase !== "annualReport" ? "season-current" : ""}"><span class="season-icon">${SEASON_ICONS[index]}</span><span>${season}</span><i></i></div>`).join("");
    document.body.classList.toggle("game-preparation", state.phase === "preparation");
    const settingsLink = document.querySelector(".settings-link");
    if (settingsLink) settingsLink.hidden = state.phase !== "preparation";
    const turnStatusTopbar = document.querySelector(".topbar");
    const stickyTurnStatus = document.getElementById("sticky-turn-status");
    if (turnStatusTopbar && stickyTurnStatus) requestAnimationFrame(() => { stickyTurnStatus.style.top = `${Math.ceil(turnStatusTopbar.getBoundingClientRect().height)}px`; });
    document.querySelector(".dashboard").classList.toggle("preparing", state.phase === "preparation");
    document.getElementById("company-name-label").textContent = state.companyName || "Домоуправ";
    const companyInput = document.getElementById("company-name-input");
    if (companyInput && companyInput.value !== state.companyName) companyInput.value = state.companyName;
    const startingHouseSelect = document.getElementById("starting-house-select");
    if (startingHouseSelect) {
      if (!startingHouseSelect.options.length) startingHouseSelect.innerHTML = HOUSE_CARDS.map(house => `<option value="${escapeHtml(house.name)}">${escapeHtml(house.name)} · ${quantity(house.area)} м² · ${quantity(house.age || 0)} лет · ${escapeHtml(house.address)}</option>`).join("");
      if (HOUSE_CARDS.some(house => house.name === state.houseName)) startingHouseSelect.value = state.houseName;
      startingHouseSelect.onchange = () => {
        if (state.phase !== "preparation") return;
        const house = HOUSE_CARDS.find(item => item.name === startingHouseSelect.value);
        if (!house) return;
        state.houseName = house.name; state.managedSinceYear = state.year; state.houseAddress = house.address; state.primaryArea = house.area; state.area = house.area + state.additionalHomes.reduce((sum, owned) => sum + owned.area, 0);
        state.houseAge = Number(house.age) || 0; state.houseRepairWarranties = {};
        state.houseDeck = state.houseDeck.filter(item => item.name !== house.name);
        saveState(); render();
      };
    }
    const startingSeasonSelect = document.getElementById("starting-season-select");
    const seasonDurationSelect = document.getElementById("season-duration-select");
    const badGameCheckbox = document.getElementById("bad-game-mode-checkbox");
    if (startingSeasonSelect) { startingSeasonSelect.value = String(state.startingSeasonIndex); startingSeasonSelect.onchange = () => { if (state.phase === "preparation") { state.startingSeasonIndex = Number(startingSeasonSelect.value); saveState(); } }; }
    if (seasonDurationSelect) { seasonDurationSelect.value = String(state.seasonDuration); seasonDurationSelect.onchange = () => { if (state.phase === "preparation") { state.seasonDuration = Math.max(1, Math.min(3, Number(seasonDurationSelect.value) || 1)); saveState(); render(); } }; }
    if (badGameCheckbox) { badGameCheckbox.checked = state.badGameMode; badGameCheckbox.onchange = () => { if (state.phase === "preparation") { state.badGameMode = badGameCheckbox.checked; saveState(); render(); } }; }
    if (elements.marketPanel) elements.marketPanel.classList.toggle("preparing", state.phase === "preparation");
    if (elements.prepPanel) elements.prepPanel.hidden = state.phase !== "preparation";
    const phaseNames = { preparation: "Подготовка к игре", staffing: "Менеджмент сотрудников", inspection: `Сезонный осмотр · ${SEASONS[state.seasonIndex]}`, problems: "Решение проблем", drawing: "Приём заявок", resolving: "Распределение заявок", legal: "Задачи специалистам", payroll: "Выплата зарплат", collection: "Сбор содержания", annualReport: "Годовой отчёт", bankruptcy: "Объявление банкротства", gameOver: "Игра окончена" };
    elements.phaseLabel.textContent = phaseNames[state.phase];
    if (elements.stickySeason) elements.stickySeason.textContent = state.phase === "annualReport" ? `Год ${state.year} · годовой отчёт` : `${SEASONS[state.seasonIndex]} · год ${state.year}${state.seasonDuration > 1 ? ` · ${state.seasonTurnIndex + 1}/${state.seasonDuration}` : ""}`;
    if (elements.stickyPhase) elements.stickyPhase.textContent = phaseNames[state.phase];
    const activeStep = { preparation: 0, staffing: 1, inspection: 2, problems: 3, drawing: 4, resolving: 5, legal: 6, payroll: 7, collection: 8, annualReport: 9, bankruptcy: 10 }[state.phase];
    document.querySelectorAll(".phase-step").forEach((step, index) => {
      const skippedInspection = index === 2 && !CONFIG.rules.inspectionSeasonIndices.includes(state.seasonIndex) && !["preparation", "staffing"].includes(state.phase);
      step.classList.toggle("active", index === activeStep);
      step.classList.toggle("phase-done", index < activeStep && !skippedInspection);
      step.classList.toggle("phase-skipped", skippedInspection);
    });
    elements.annualReport.hidden = state.phase !== "annualReport";
    const badGameOverPanel = document.getElementById("bad-game-over");
    if (badGameOverPanel) { badGameOverPanel.hidden = state.phase !== "gameOver"; if (state.phase === "gameOver") badGameOverPanel.innerHTML = `<p class="section-label">ИТОГ ИГРЫ</p><h2>${escapeHtml(state.badGameResult || "Игра окончена")}</h2><p>На счёте учредителя: <b>${money(state.founderAccount)} ₽</b>.</p>`; }
    elements.bankruptcyPanel.hidden = state.phase !== "bankruptcy";
    elements.legalPanel.hidden = state.phase !== "legal";
    elements.inspectionPanel.hidden = state.phase !== "inspection";
    elements.problemPanel.hidden = state.phase !== "problems";
    if (state.phase === "annualReport") renderAnnualReport();
    if (state.phase === "bankruptcy") renderBankruptcy();
    if (state.phase === "legal") renderLegalPanel();
    if (state.phase === "inspection") renderInspectionPanel();
    if (state.phase === "problems") renderProblemPanel();
    elements.capital.innerHTML = `${money(state.capital)} <span>₽</span>`;
    if (elements.stickyCapital) elements.stickyCapital.textContent = `${money(state.capital)} ₽`;
    const founderBlock = document.getElementById("founder-account-block");
    const founderValue = document.getElementById("founder-account-value");
    const founderPanel = document.getElementById("founder-panel");
    const founderTools = founderPanel?.querySelector(".founder-tools");
    if (founderTools) founderTools.classList.toggle("regular-founder-tools", !state.badGameMode);
    const founderPanelBalance = document.getElementById("founder-panel-balance");
    const withdrawToggle = document.getElementById("withdraw-toggle");
    const founderTransferButton = document.getElementById("founder-transfer-button");
    const buyReputationButton = document.getElementById("buy-reputation-button");
    if (founderBlock) founderBlock.hidden = !state.badGameMode;
    if (founderValue) founderValue.textContent = `${money(state.founderAccount)} ₽`;
    if (founderPanel) founderPanel.hidden = state.phase === "preparation";
    if (founderPanelBalance) founderPanelBalance.textContent = `${money(state.founderAccount)} ₽`;
    const badGameWithdrawTool = document.getElementById("founder-illegal-withdraw-tool");
    const badGameReputationTool = document.getElementById("founder-reputation-tool");
    if (badGameWithdrawTool) badGameWithdrawTool.hidden = !state.badGameMode;
    if (badGameReputationTool) badGameReputationTool.hidden = !state.badGameMode;
    if (withdrawToggle) withdrawToggle.onclick = withdrawFunds;
    if (founderTransferButton) founderTransferButton.onclick = transferFounderFunds;
    if (buyReputationButton) buyReputationButton.onclick = buyReputation;
    const loanAmountSlider = document.getElementById("founder-loan-amount");
    const loanYearsSlider = document.getElementById("founder-loan-years");
    const loanAmountValue = document.getElementById("founder-loan-amount-value");
    const loanYearsValue = document.getElementById("founder-loan-years-value");
    const loanPaymentValue = document.getElementById("founder-loan-payment");
    const loanStatus = document.getElementById("founder-loan-status");
    const loanButton = document.getElementById("founder-loan-button");
    const updateLoanPreview = () => {
      const amount = Number(loanAmountSlider?.value) || 100;
      const years = Number(loanYearsSlider?.value) || 1;
      if (loanAmountValue) loanAmountValue.textContent = `${quantity(amount)} ₽`;
      if (loanYearsValue) loanYearsValue.textContent = `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}`;
      if (loanPaymentValue) loanPaymentValue.textContent = `${money(founderLoanPayment(amount, years))} ₽ / ход`;
    };
    if (loanAmountSlider && loanYearsSlider) {
      updateLoanPreview();
      loanAmountSlider.oninput = updateLoanPreview;
      loanYearsSlider.oninput = updateLoanPreview;
    }
    if (loanButton) { loanButton.onclick = takeFounderLoan; loanButton.disabled = ["preparation", "annualReport", "bankruptcy", "gameOver"].includes(state.phase); }
    if (loanStatus) {
      const debt = state.founderLoans.reduce((sum, loan) => sum + loan.balance, 0);
      const payment = state.founderLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
      loanStatus.innerHTML = state.founderLoans.length
        ? `<div class="founder-loan-summary">Общий долг: ${money(debt)} ₽ · платежи: ${money(payment)} ₽ / ход</div>${state.founderLoans.map((loan, index) => `<article class="founder-loan-row"><div><b>Кредит ${index + 1}</b><span>Остаток: ${money(loan.balance)} ₽ · платёж: ${money(loan.monthlyPayment)} ₽ / ход</span><span>Срок: ${loan.termYears} ${loan.termYears === 1 ? "год" : loan.termYears < 5 ? "года" : "лет"} · осталось платежей: ${quantity(loan.paymentsRemaining)}</span></div><button type="button" class="founder-loan-payoff" data-loan-payoff="${escapeHtml(loan.id)}" ${state.founderAccount + 0.000001 < loan.balance || ["annualReport", "bankruptcy", "gameOver"].includes(state.phase) ? "disabled" : ""}>Погасить досрочно · ${money(loan.balance)} ₽</button></article>`).join("")}`
        : "Активных кредитов нет.";
      loanStatus.querySelectorAll("[data-loan-payoff]").forEach(button => { button.onclick = () => payoffFounderLoan(button.dataset.loanPayoff); });
    }
    const loanStickySummary = document.getElementById("founder-loan-sticky-summary");
    const loanStickyPayment = document.getElementById("founder-loan-sticky-payment");
    const upcomingLoanPayments = state.founderLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
    if (loanStickySummary) loanStickySummary.hidden = !state.badGameMode || state.founderLoans.length === 0;
    if (loanStickyPayment) loanStickyPayment.textContent = `−${money(upcomingLoanPayments)} ₽`;
    if (elements.stickyHouses) elements.stickyHouses.textContent = quantity(state.houses);
    const criticalHouseCount = managedHomes().filter(home => home.primary ? state.houseUnsafeSinceTurn != null : home.unsafeSinceTurn != null).length;
    if (elements.stickyCriticalHouses) elements.stickyCriticalHouses.hidden = criticalHouseCount === 0;
    if (elements.stickyCriticalCount) elements.stickyCriticalCount.textContent = quantity(criticalHouseCount);
    const priorIncome = lastSeasonIncome();
    if (elements.stickyUpcomingIncome) elements.stickyUpcomingIncome.textContent = `+${money(baseIncome)} ₽`;
    const stickyExpenseTotal = document.getElementById("sticky-expense-total");
    if (stickyExpenseTotal) stickyExpenseTotal.textContent = `−${money(effectiveBaseMaintenanceTotal() + payroll)} ₽`;
    const stickyMaterialStock = document.getElementById("sticky-material-stock");
    if (stickyMaterialStock) stickyMaterialStock.textContent = `${quantity(state.materialStock)} шт.`;
    const priorSeasonTotal = priorIncome.collection + priorIncome.paidIncome;
    const priorSeasonExpenses = priorIncome.upkeep + priorIncome.salaries + priorIncome.fines + priorIncome.compensation + priorIncome.problemRepairs;
    const priorSeasonNet = priorSeasonTotal - priorSeasonExpenses;
    const stickyTopbar = document.querySelector(".topbar");
    if (stickyTopbar) stickyTopbar.classList.toggle("preparation-no-sticky-finances", state.phase === "preparation");
    const stickyNet = document.getElementById("sticky-season-net");
    if (stickyNet) { stickyNet.textContent = `${priorSeasonNet >= 0 ? "+" : "−"}${money(Math.abs(priorSeasonNet))} ₽`; stickyNet.classList.toggle("negative", priorSeasonNet < 0); }
    const priorExpenseTotal = document.getElementById("sticky-prior-expense-total");
    if (priorExpenseTotal) priorExpenseTotal.textContent = `−${money(priorSeasonExpenses)} ₽`;
    if (elements.stickyIncomeTotal) elements.stickyIncomeTotal.textContent = `+${money(priorSeasonTotal)} ₽`;
    if (elements.stickyCollectionIncome) elements.stickyCollectionIncome.textContent = `+${money(priorIncome.collection)} ₽`;
    if (elements.stickyPaidIncome) elements.stickyPaidIncome.textContent = `+${money(priorIncome.paidIncome)} ₽`;
    if (elements.stickyPriorUpkeep) elements.stickyPriorUpkeep.textContent = `−${money(priorIncome.upkeep)} ₽`;
    if (elements.stickyPriorSalaries) elements.stickyPriorSalaries.textContent = `−${money(priorIncome.salaries)} ₽`;
    if (elements.stickyPriorFines) elements.stickyPriorFines.textContent = `−${money(priorIncome.fines)} ₽`;
    if (elements.stickyPriorCompensation) elements.stickyPriorCompensation.textContent = `−${money(priorIncome.compensation)} ₽`;
    if (elements.stickyPriorRepairs) elements.stickyPriorRepairs.textContent = `−${money(priorIncome.problemRepairs)} ₽`;
    renderFinancialInfographic();
    elements.capital.classList.toggle("negative", state.capital < 0);
    elements.reputation.textContent = `${state.reputation > 0 ? "+" : ""}${state.reputation}`;
    elements.reputation.classList.toggle("negative", state.reputation < 0);
    elements.capitalFill.style.width = `${Math.max(0, Math.min(CONFIG.economy.capitalBarFillMaxPercent, state.capital / CONFIG.economy.capitalBarScale * 100))}%`;
    elements.houses.innerHTML = `${state.houses} <span>${state.houses === 1 ? "дом" : "дома"}</span>`;
    elements.area.innerHTML = `${quantity(state.area)} <span>м²</span>`;
    const portfolioTariff = document.getElementById("portfolio-tariff-value");
    const averageTariff = state.area > 0 ? baseIncome / state.area : currentTariff();
    if (portfolioTariff) portfolioTariff.textContent = `${money(averageTariff)} ₽ / м²`;
    elements.income.innerHTML = `${money(baseIncome)} <span>₽</span>`;
    const upkeepTotal = effectiveBaseMaintenanceTotal();
    const operatingExpenses = upkeepTotal + payroll;
    const expectedChange = baseIncome - operatingExpenses;
    if (elements.upkeepValue) elements.upkeepValue.textContent = `${money(upkeepTotal)} ₽`;
    if (elements.operatingExpensesValue) elements.operatingExpensesValue.textContent = `${money(operatingExpenses)} ₽`;
    if (elements.expectedChangeValue) { elements.expectedChangeValue.textContent = `${expectedChange >= 0 ? "+" : "−"}${money(Math.abs(expectedChange))} ₽`; elements.expectedChangeValue.classList.toggle("negative", expectedChange < 0); }
    if (elements.materialStockValue) elements.materialStockValue.textContent = `${quantity(state.materialStock)} ед.`;
    if (elements.materialCostPrice) elements.materialCostPrice.textContent = `${money(materialUnitCost())} ₽/ед.`;
    const marketUnitPrice = materialUnitCost() * CONFIG.economy.materialMarketPriceMultiplier;
    if (elements.materialMarketPrice) elements.materialMarketPrice.textContent = `${money(marketUnitPrice)} ₽/ед.`;
    if (elements.materialTotalCostPrice) elements.materialTotalCostPrice.textContent = `${money(state.materialStock * materialUnitCost())} ₽`;
    if (elements.materialTotalMarketPrice) elements.materialTotalMarketPrice.textContent = `${money(state.materialStock * marketUnitPrice)} ₽`;
    if (elements.collection) elements.collection.textContent = state.collectionStats.billed > 0 ? `${Math.round(state.collectionStats.collected / state.collectionStats.billed * 100)}%` : "—";
    elements.cancelled.innerHTML = `${quantity(state.yearStats.cancelled)} <span>заявок</span>`;
    elements.upkeep.innerHTML = `${money(effectiveBaseMaintenanceTotal())} <span>₽</span>`;
    if (elements.payrollValue) elements.payrollValue.innerHTML = `${money(payroll)} <span>₽</span>`;
    elements.penaltySummary.textContent = `Обязательства: ${money(unpaidFineTotal() + unpaidCompensationTotal())} ₽`;
    renderCompanyDebt();
    const emergencyCount = unresolved.filter(isEmergency).length;
    const paidCount = unresolved.filter(card => card.type === "paid").length;
    const ordinaryCount = unresolved.length - emergencyCount - paidCount;
    elements.count.textContent = `${quantity(unresolved.length)} активных`;
    elements.requestBreakdown.textContent = `Аварийные: ${quantity(emergencyCount)} · Обычные: ${quantity(ordinaryCount)} · Платные: ${quantity(paidCount)}`;
    elements.requestDamageMarker.hidden = !unresolved.some(isEmergency);
    const requiredExpenses = document.getElementById("phase-required-expenses");
    if (requiredExpenses) {
      const showRequiredExpenses = state.phase === "problems" || state.phase === "resolving";
      requiredExpenses.hidden = !showRequiredExpenses;
      if (showRequiredExpenses && state.phase === "problems") {
        const remainingMaterialUnits = state.houseProblems.reduce((sum, problem) => problem.materialPurchased || Number.isFinite(problem.materialCostPaid) ? sum : sum + problemRequirements(problem).materials, 0);
        const materialTotal = materialShortage(remainingMaterialUnits) * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier;
        const contractorTotal = state.houseProblems.reduce((sum, problem) => sum + remainingProblemContractorWork(problem), 0);
        requiredExpenses.innerHTML = `<div><span>Требуется материалов</span><b>${quantity(remainingMaterialUnits)} шт.</b></div><div><span>Расходы на материалы</span><b>${money(materialTotal)} ₽</b></div><div><span>Расходы на подрядчика</span><b>${money(contractorTotal)} ₽</b></div>`;
      } else if (showRequiredExpenses) {
        const pendingRequests = unresolved;
        const materialUnits = pendingRequests.reduce((sum, card) => sum + requestMaterialUnits(card), 0);
        const materialTotal = materialShortage(materialUnits) * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier;
        const contractorTotal = pendingRequests.reduce((sum, card) => {
          const specialist = Object.values(ROLES).find(role => role.category === card.category);
          return sum + (specialist?.salary || ROLES.handyman.salary) + CONFIG.economy.contractorMarkup;
        }, 0);
        requiredExpenses.innerHTML = `<div><span>Требуется материалов</span><b>${quantity(materialUnits)} шт.</b></div><div><span>Расходы на материалы</span><b>${money(materialTotal)} ₽</b></div><div><span>Расходы на подрядчика</span><b>${money(contractorTotal)} ₽</b></div>`;
      }
    }
    elements.hint.textContent = state.phase === "staffing" ? "Сначала найми или уволь сотрудников" : state.phase === "inspection" ? "Проведи сезонный осмотр дома" : state.phase === "problems" ? "При желании вызови подрядчика для ремонта проблем" : state.phase === "drawing" ? "Прими новые заявки, чтобы продолжить ход" : state.phase === "legal" ? "Юристы выбирают поручения, инженеры могут купить материалы" : state.phase === "payroll" ? "Выплати зарплаты перед сбором содержания" : state.phase === "collection" ? "Собери содержание и заверши сезон" : unresolved.length ? "Решай заявки специалистами или деньгами" : "Все заявки этого хода решены";
    elements.draw.hidden = true;
    elements.end.hidden = ["preparation", "bankruptcy", "annualReport", "gameOver"].includes(state.phase);
    const gameOverActionMessage = document.getElementById("game-over-action-message");
    if (gameOverActionMessage) {
      gameOverActionMessage.hidden = state.phase !== "gameOver";
      gameOverActionMessage.textContent = state.badGameResult || "Игра окончена";
    }
    elements.end.disabled = !["staffing", "inspection", "problems", "drawing", "resolving", "legal", "payroll", "collection"].includes(state.phase);
    elements.end.querySelector("span:first-child").textContent = phaseActionLabel();
    elements.title.textContent = state.phase === "gameOver" ? "Игра окончена" : state.phase === "preparation" ? "Создай свою управляющую компанию" : state.phase === "bankruptcy" ? "Нужна новая управляющая компания" : state.phase === "annualReport" ? "Год завершён" : state.phase === "legal" ? "Реши, что делают специалисты" : state.phase === "staffing" ? "Собери команду" : state.phase === "inspection" ? "Проведи сезонный осмотр" : state.phase === "problems" ? "Реши, что делать с проблемами дома" : state.phase === "drawing" ? "Прими заявки" : state.phase === "payroll" ? "Выплати зарплаты" : state.phase === "collection" ? "Собери содержание" : unresolved.length ? "Разбираем заявки" : "Заявки решены";
    elements.copy.textContent = state.phase === "gameOver" ? state.badGameResult || "Игра окончена" : state.phase === "bankruptcy" ? `Баланс достиг ${money(BANKRUPTCY_THRESHOLD)} ₽. Текущая компания не может продолжать работу.` : state.phase === "annualReport" ? "Просмотри результаты года. Перед отчётом все невыполненные заявки, включая аварийные, автоматически отменяются; каждые 5 штрафных единиц отмен снижают репутацию на 1." : state.phase === "legal" ? "Юристы выполняют поручения, инженеры могут закупить материалы по себестоимости." : state.phase === "staffing" ? "Добавляй сотрудников в кадровый пул или отмечай увольнение. Изменения применятся при переходе дальше; до этого их можно отменить." : state.phase === "inspection" ? "Осмотр проводится осенью и весной; инженер уменьшает число выявленных проблем на одну." : state.phase === "problems" ? "Подрядчик может устранить проблему целиком. Если оставить её, она создаст сезонные заявки." : state.phase === "drawing" ? "Кадровые изменения применены. Теперь открой заявки жильцов." : state.phase === "payroll" ? "Зарплаты рассчитаны по составу команды и испытательным срокам." : state.phase === "collection" ? "Оплатится базовое обслуживание и случайно определится собираемость." : unresolved.length ? "Распределяй заявки в пределах продуктивности или назначай переработку за премию. Любую заявку можно оплатить." : "Переходи к выплате зарплат.";
    elements.staffCount.textContent = `${state.employees.length} В ШТАТЕ`;
    elements.payroll.textContent = `Зарплатный фонд: ${money(payroll)} ₽ / ход`;
    document.getElementById("market-kicker").textContent = state.phase === "preparation" ? "ПОДГОТОВКА · НАЧАЛЬНЫЙ НАЙМ" : "НАЧАЛО ХОДА · НАЙМ И УВОЛЬНЕНИЕ";
    document.getElementById("market-heading").textContent = state.phase === "preparation" ? "Стартовая команда" : "Рынок труда";
    elements.marketCopy.textContent = state.phase === "preparation" ? `На рынке ${currentMarketExecutors()} исполнителя и ${currentMarketSpecialists()} специалиста. Отметь сотрудников для стартовой команды. На старте нанятые сотрудники сохраняют зарплату на 30% ниже установленной, пока работают в компании. ${pendingHireHasHR() ? "Стартовый HR снимает лимит найма и даёт команде испытательный срок." : `Без HR можно выбрать до ${CONFIG.rules.hiresWithoutHR} сотрудников; можно начать и без команды.`}` : state.phase === "staffing" ? `На рынке ${currentMarketExecutors()} исполнителя и ${currentMarketSpecialists()} специалиста. Выбранные сотрудники попадут в кадровый пул до перехода к заявкам. ${hasHR() || pendingHireHasHR() ? `HR снимает лимит; новые сотрудники ${CONFIG.rules.probationTurns} хода получают ${Math.round(CONFIG.rules.probationSalaryMultiplier * 100)}% зарплаты.` : `Без HR можно выбрать до ${CONFIG.rules.hiresWithoutHR} новых сотрудников.`}` : "Рынок закрыт до начала следующего хода. В активной фазе инженер может закупить материалы по себестоимости.";
    const guideStep = { staffing: 0, inspection: 1, problems: 2, drawing: 3, resolving: 4, legal: 5, payroll: 6, collection: 7 }[state.phase] ?? -1;
    document.querySelectorAll("[data-guide-step]").forEach((step, index) => {
      step.classList.toggle("guide-current", index === guideStep);
      step.classList.toggle("guide-done", guideStep > index);
      step.classList.toggle("guide-skipped", (index === 1 && !CONFIG.rules.inspectionSeasonIndices.includes(state.seasonIndex) && guideStep > 1) || (index === 5 && guideStep > 5 && !hasLawyer()));
    });
    renderRealEstateMarket(); renderHouseCard(); renderPenalties(); renderMarket(); renderTeam(); renderRosterReference(); renderRequests(); renderOssCapitalRepairButtons(); showOssHistory(); renderLog();
    renderMobileInterface();
    if (DEV_MODE) renderDevTools();
  }

  function renderRealEstateMarket() {
    const list = document.getElementById("real-estate-list");
    const market = document.getElementById("real-estate-market");
    if (!list || !market) return;
    market.hidden = state.phase === "preparation" || state.phase === "bankruptcy" || state.phase === "gameOver";
    const properties = availableRealEstateHomes();
    const usedThisTurn = state.newHouseOssUsedTurn === state.turn;
    if (usedThisTurn) {
      list.innerHTML = properties.length ? `<p class="real-estate-note">В этом ходу ОСС «Новый дом» уже проводилось. Новая попытка будет доступна в следующем ходу.</p>${properties.map(house => realEstateCard(house, true)).join("")}` : '<p class="real-estate-note">В колоде недвижимости не осталось доступных объектов.</p>';
      list.querySelectorAll("[data-forge-house]").forEach(button => button.addEventListener("click", () => runForgedHouseTake(button.dataset.forgeHouse)));
      return;
    }
    list.innerHTML = properties.length ? properties.map(house => realEstateCard(house, false)).join("") : '<p class="real-estate-note">В колоде недвижимости не осталось доступных объектов.</p>';
    list.querySelectorAll("[data-new-house-oss]").forEach(button => button.addEventListener("click", () => runNewHouseOss(button.dataset.newHouseOss)));
    list.querySelectorAll("[data-forge-house]").forEach(button => button.addEventListener("click", () => runForgedHouseTake(button.dataset.forgeHouse)));
  }

  function realEstateCard(house, alreadyUsed) {
    const maintenance = Number.isFinite(house.baseMaintenance) ? house.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse;
    const forgedTake = state.badGameMode ? `<button type="button" class="forge-house-button" data-forge-house="${escapeHtml(house.name)}">Подделать подписи и взять</button>` : "";
    return `<article class="real-estate-card"><strong>${escapeHtml(house.name)}</strong><span>Адрес: ${escapeHtml(house.address)}</span><span>Площадь: ${quantity(house.area)} м²</span><span>БО: ${money(maintenance)} ₽ / ход</span><span>Возраст: ${quantity(house.age || 0)} лет</span><button type="button" data-new-house-oss="${escapeHtml(house.name)}" ${alreadyUsed ? "disabled" : ""}>${alreadyUsed ? "ОСС проведено в этом ходу" : "Провести ОСС «Новый дом»"}</button>${forgedTake}</article>`;
  }

  function runNewHouseOss(houseName) {
    const house = state.houseDeck.find(item => item.name === houseName);
    if (!house || state.newHouseOssUsedTurn === state.turn || state.phase === "preparation" || state.phase === "bankruptcy") return;
    state.newHouseOssUsedTurn = state.turn;
    const cancelledAllTime = state.cancelledRequests.length;
    const vote = ossVote(`Новый дом: ${house.name}`, 0, { includeReputation: true, area: house.area, cancelledCountOverride: cancelledAllTime, cancelledMultiplier: 1, logHouseAddress: house.address });
    if (vote.success) {
      addHomeToPortfolio({ ...house, baseMaintenance: Number.isFinite(house.baseMaintenance) ? house.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse, tariffPerSquareMeter: CONFIG.economy.tariffPerSquareMeter, tariffOssResolvedYear: null, managedSinceYear: state.year, debtRecoverable: 0, debtIrrecoverable: 0, collectionStats: { billed: 0, collected: 0, periods: 0 }, lastCollectionRate: null, repairWarranties: {}, warrantyUntilTurn: null, unsafeSinceTurn: null, unsafeSinceYear: null, unsafeReasons: [], removed: false });
      state.houseDeck = state.houseDeck.filter(item => item.name !== house.name);
      addLog(`По ОСС «Новый дом» в управление принят дом «${house.name}», ${house.address}, площадь ${house.area} м². Портфель: ${state.houses} домов, ${state.area} м².`);
      showToast(`ОСС принято: дом «${house.name}» добавлен в управление.`);
    } else {
      addLog(`ОСС «Новый дом» по объекту «${house.name}» не принято; объект остаётся на рынке. Новая попытка будет доступна в следующем ходу.`);
      showToast("ОСС не набрало порог. Попытка использована.");
    }
    saveState(); render();
  }

  function runForgedHouseTake(houseName) {
    if (!state.badGameMode || ["preparation", "bankruptcy", "gameOver"].includes(state.phase)) return;
    const house = state.houseDeck.find(item => item.name === houseName);
    if (!house) return;
    addHomeToPortfolio({ ...house, managedSinceYear: state.year, baseMaintenance: Number.isFinite(house.baseMaintenance) ? house.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse, tariffPerSquareMeter: CONFIG.economy.tariffPerSquareMeter, tariffOssResolvedYear: null, debtRecoverable: 0, debtIrrecoverable: 0, collectionStats: { billed: 0, collected: 0, periods: 0 }, lastCollectionRate: null, repairWarranties: {}, warrantyUntilTurn: null, unsafeSinceTurn: null, unsafeSinceYear: null, unsafeReasons: [], removed: false });
    state.houseDeck = state.houseDeck.filter(item => item.name !== house.name);
    addLog(`Подделаны подписи собственников дома «${house.name}» (${house.address}); дом добавлен в управление.`);
    const lawsuitChance = complaintProbability(CONFIG.rules.badGameForgeryLawsuitChance ?? 0.2);
    if (Math.random() < lawsuitChance) {
      const caseId = `fraud-${state.turn}-${Date.now()}`;
      state.legalCases.push({ id: caseId, caseType: "forgedHouse", houseName: house.name, houseAddress: house.address, status: "trial", filedTurn: state.turn, filedYear: state.year, filedSeasonIndex: state.seasonIndex, filedSeasonTurnIndex: state.seasonTurnIndex, deadlineTurn: state.turn + SEASONS.length, delayCount: 0, lastDelayTurn: null, lastWinAttemptTurn: null });
      const filingReputationPenalty = CONFIG.rules.badGameForgeryFilingReputationPenalty ?? 2;
      state.reputation -= filingReputationPenalty;
      addLog(`Собственники дома «${house.name}» (${house.address}) подали в суд (шанс ${Math.round(lawsuitChance * 100)}%). Дело добавлено в «Суды и обязательства». Репутация −${filingReputationPenalty}.`);
      showToast(`Дом получен, но собственники подали в суд.`);
    } else showToast(`Дом «${house.name}» получен в управление.`);
    saveState(); render();
  }

  function removeManagedHome(houseName) {
    const home = managedHomeByName(houseName);
    if (!home) return false;
    if (!home.primary) state.additionalHomes = state.additionalHomes.filter(item => item.name !== houseName);
    else if (state.additionalHomes.length) {
      const promoted = state.additionalHomes.shift();
      state.houseName = promoted.name; state.managedSinceYear = promoted.managedSinceYear || state.year; state.houseAddress = promoted.address; state.primaryArea = promoted.area; state.houseAge = promoted.age || 0;
      state.baseMaintenance = promoted.baseMaintenance; state.tariffPerSquareMeter = promoted.tariffPerSquareMeter; state.tariffOssResolvedYear = promoted.tariffOssResolvedYear;
      state.primaryDebtRecoverable = promoted.debtRecoverable || 0; state.primaryDebtIrrecoverable = promoted.debtIrrecoverable || 0;
      state.primaryCollectionStats = promoted.collectionStats || { billed: 0, collected: 0, periods: 0 }; state.primaryLastCollectionRate = promoted.lastCollectionRate;
      state.houseRepairWarranties = promoted.repairWarranties || {}; state.houseWarrantyUntilTurn = promoted.warrantyUntilTurn;
      state.houseUnsafeSinceTurn = promoted.unsafeSinceTurn; state.houseUnsafeSinceYear = promoted.unsafeSinceYear; state.houseUnsafeReasons = promoted.unsafeReasons || []; state.houseRemoved = false;
    } else state.houseRemoved = true;
    state.houseProblems = state.houseProblems.filter(problem => problem.houseName !== houseName);
    state.requests = state.requests.filter(card => card.houseName !== houseName);
    refreshPortfolioTotals();
    if (state.houses === 0 && availableRealEstateHomes().length === 0) { state.phase = "gameOver"; state.badGameResult = "Вы потеряли все дома в управлении и на рынке нет доступных домов"; }
    return true;
  }

  function resolveForgedHouseCase(caseFile, won, seasonLog = null) {
    if (!caseFile || caseFile.status !== "trial") return;
    caseFile.status = won ? "won" : "lost"; caseFile.resolvedTurn = state.turn; caseFile.resolvedYear = state.year; caseFile.resolvedSeasonIndex = state.seasonIndex; caseFile.resolvedSeasonTurnIndex = state.seasonTurnIndex;
    if (won) {
      const message = `Суд по дому «${caseFile.houseName}» (${caseFile.houseAddress}): УК выиграла дело, дом остался в управлении.`;
      if (seasonLog) seasonLog.push(message); else addLog(message);
    } else {
      removeManagedHome(caseFile.houseName);
      state.penalties.push({ id: `fine-fraud-${caseFile.id}`, employeeName: "Штраф за проигранный суд по дому", salary: 0, amount: 200, year: state.year, turn: state.turn, houseName: caseFile.houseName, houseAddress: caseFile.houseAddress, source: "fraud", paid: false, writtenOff: false, contestedBy: [] });
      const message = `Суд по дому «${caseFile.houseName}» (${caseFile.houseAddress}): УК проиграла дело. Дом изъят из управления, назначен штраф 200 ₽.`;
      if (seasonLog) seasonLog.push(message); else addLog(message);
    }
  }

  function runReputationHouseVotes(seasonLog) {
    if (state.badGameMode || state.reputation >= (CONFIG.rules.reputationHouseExitThreshold ?? -10)) return;
    for (const home of [...managedHomes()]) {
      const chance = CONFIG.rules.reputationHouseExitChance ?? 0.5;
      const left = Math.random() < chance;
      if (left) { removeManagedHome(home.name); seasonLog.push(`Дом с адресом ${home.address} попытался сменить управляющую организацию и ему удалось. Дом ушёл из вашего обслуживания.`); }
      else seasonLog.push(`Дом с адресом ${home.address} попытался сменить управляющую организацию и ему не удалось. Дом остался в вашем обслуживании.`);
    }
  }

  function renderHouseCard() {
    if (!elements.houseCard) return;
    const renderHome = home => {
      const homeProblems = state.houseProblems.filter(problem => (problem.houseName || state.houseName) === home.name);
      const wearByCategory = Object.fromEntries(HOUSE_PROBLEMS.map(item => [item.category, homeProblems.filter(problem => problem.category === item.category).reduce((sum, problem) => sum + problem.wear, 0)]));
      const overallWear = Math.round(Object.values(wearByCategory).reduce((sum, wear) => sum + wear, 0) / HOUSE_PROBLEMS.length);
      const problems = HOUSE_PROBLEMS.filter(definition => wearByCategory[definition.category] > 0).sort((a, b) => wearByCategory[b.category] - wearByCategory[a.category]).map(definition => {
        const categoryProblems = homeProblems.filter(problem => problem.category === definition.category);
        const cost = categoryProblems.reduce((sum, problem) => sum + problemRepairCost(problem), 0);
        const severity = Math.max(0, Math.min(100, wearByCategory[definition.category]));
        const hue = Math.max(0, 120 - severity * 4);
        return `<li style="background:hsl(${hue} 72% 94%);border-color:hsl(${hue} 45% 80%);color:hsl(${hue} 48% 30%)"><span><b>${escapeHtml(definition.category)}</b><small>Износ ${wearByCategory[definition.category]}% · ремонт ${money(cost)} ₽<br>Если проблему не устранить: ${escapeHtml(PROBLEM_CONSEQUENCES[definition.category])}</small></span></li>`;
      }).join("");
      const requestTotals = state.houseRequestCounts?.[home.name] || { accepted: 0, completed: 0 };
      const warrantyByCategory = home.primary ? state.houseRepairWarranties : home.repairWarranties;
      const homeWarrantyUntil = home.primary ? state.houseWarrantyUntilTurn : home.warrantyUntilTurn;
      const warrantyStatus = Object.entries(warrantyByCategory || {}).filter(([, warranty]) => warranty.expiresTurn >= state.turn).map(([category, warranty]) => `<span>${escapeHtml(category)}: осталось сезонов гарантии ${Math.max(0, warranty.expiresTurn - state.turn + 1)}</span>`).join("");
      const activeHouseWarranty = Number.isInteger(homeWarrantyUntil) && homeWarrantyUntil >= state.turn;
      const unsafeSinceTurn = home.primary ? state.houseUnsafeSinceTurn : home.unsafeSinceTurn;
      const unsafeReasons = home.primary ? state.houseUnsafeReasons : (home.unsafeReasons || []);
      const unsafeNotice = unsafeSinceTurn != null ? `<div class="house-unsafe-notice"><strong>ДОМ ПОД УГРОЗОЙ АВАРИЙНОГО ПРИЗНАНИЯ</strong><span>${unsafeReasons.map(escapeHtml).join(" · ")}</span><span>До автоматического признания: ${unsafeHouseSeasonsRemaining(home.name)} полных сезонов.</span><button class="recognize-house-unsafe" data-house="${escapeHtml(home.name)}" type="button">Признать дом аварийным</button></div>` : "";
      const collectionRate = home.collectionStats?.billed > 0 ? Math.round(home.collectionStats.collected / home.collectionStats.billed * 100) : null;
      const homeDebt = (home.debtRecoverable || 0) + (home.debtIrrecoverable || 0);
      const maintenance = (Number.isFinite(home.baseMaintenance) ? home.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse) * (1 - maintenanceDiscountPercent() / 100);
      const serviceYears = Math.max(0, state.year - (Number.isInteger(home.managedSinceYear) ? home.managedSinceYear : state.year) + (state.phase === "annualReport" ? 1 : 0));
      return `<article class="house-property-card">${unsafeNotice}<div class="house-card-heading"><div><p class="section-label">ДОМ В УПРАВЛЕНИИ</p><h2>${escapeHtml(home.name)}</h2></div><span class="house-card-mark">⌂</span></div><table class="house-info-table"><tbody><tr><th>Адрес</th><td colspan="3">${escapeHtml(home.address)}</td></tr><tr><th>Лет в обслуживании</th><td>${quantity(serviceYears)}</td><th title="Возраст дома">t</th><td>${quantity(home.age || 0)} лет</td></tr><tr><th title="Площадь">S</th><td>${quantity(home.area)} м²</td><th title="Тариф">Т</th><td>${money(currentTariff(home))} ₽ / м²</td></tr><tr><th>БО</th><td>${money(maintenance)} ₽ / ход</td><th title="Собираемость">%</th><td>${home.lastCollectionRate == null ? "—" : `${home.lastCollectionRate}%`} / ${collectionRate == null ? "—" : `${collectionRate}%`}</td></tr><tr><th title="Общий износ">🛠️</th><td>${overallWear}%</td><th title="Долг жителей"><span class="house-debt-symbol">💰❌</span></th><td>${money(homeDebt)} ₽</td></tr><tr><th>Заявки</th><td colspan="3">${requestTotals.completed || 0}/${requestTotals.accepted || 0}</td></tr></tbody></table>${activeHouseWarranty || warrantyStatus ? `<div class="house-warranty-status"><b>Гарантия</b>${activeHouseWarranty ? `<span>Общий срок после гарантийных работ: осталось сезонов ${Math.max(0, homeWarrantyUntil - state.turn + 1)}</span>` : ""}${warrantyStatus}</div>` : ""}<div class="house-problems"><h3>Проблемы дома <span>оценка по категориям</span></h3><ul>${problems || '<li class="no-home-problems">Проблем не выявлено</li>'}</ul></div></article>`;
    };
    elements.houseCard.innerHTML = managedHomes().map(renderHome).join("");
    elements.houseCard.querySelectorAll(".recognize-house-unsafe").forEach(button => button.addEventListener("click", () => {
      if (!recognizeHouseAsUnsafe(true, button.dataset.house)) return;
      saveState(); render(); showToast("Дом признан аварийным и изъят из управления.");
    }));
  }

  function renderInspectionPanel() {
    const season = SEASONS[state.seasonIndex];
    elements.inspectionPanel.innerHTML = `<div class="inspection-heading"><div><p class="section-label">СЕЗОННОЕ ОБСЛУЖИВАНИЕ · ${escapeHtml(season.toUpperCase())}</p><h2>Проведи ${SEASONS[state.seasonIndex] === SEASONS[1] ? "осенний" : "весенний"} осмотр</h2></div><span class="inspection-icon">⌕</span></div><p>Нажми кнопку осмотра в панели хода. Случайно выявится от ${CONFIG.rules.problemCardsPerInspectionMin} до ${CONFIG.rules.problemCardsPerInspectionMax} проблем из колоды; инженер уменьшает это число на ${CONFIG.rules.engineerInspectionReduction}.</p><div class="inspection-result">Проблем на доме сейчас: <b>${state.houseProblems.length}</b></div>`;
  }

  function problemRequirements(problem) {
    const definition = HOUSE_PROBLEMS.find(item => item.category === problem.category);
    const work = {};
    let materials = 0;
    let contractorWork = 0;
    const contractorWorkByCategory = {};
    const baseWork = {};
    for (const task of definition?.tasks || []) {
      const rawMaterialCost = task.materialCost ?? (definition.materialOnly ? definition.materialCost : 0);
      materials += rawMaterialCost;
      if (task.labor > 0) {
        baseWork[task.category] = (baseWork[task.category] || 0) + task.labor;
        const role = Object.values(ROLES).find(item => item.category === task.category);
        const taskWorkCost = ((role?.salary || ROLES.handyman.salary) + CONFIG.economy.contractorMarkup) * CONFIG.rules.problemRepairLaborCostMultiplier;
        contractorWork += taskWorkCost;
        contractorWorkByCategory[task.category] = (contractorWorkByCategory[task.category] || 0) + taskWorkCost;
      }
    }
    const minimumMaterialCost = Math.max(0.01, Number(CONFIG.rules.problemMinimumMaterialCost) || 5);
    materials = Math.max(minimumMaterialCost, materials);
    const undiscountedMaterials = materials;
    const materialDiscount = Math.min(100, employeeBonusCount("engineer", "discountProblemMaterials") * CONFIG.rules.engineerMaterialDiscountPercent);
    Object.assign(work, baseWork);
    let laborReduction = employeeBonusCount("engineer", "reduceProblemLabor") * CONFIG.rules.problemLaborReductionWithEngineer;
    for (const category of Object.keys(work)) { const reduction = Math.min(work[category], laborReduction); work[category] -= reduction; laborReduction -= reduction; }
    for (const category of Object.keys(work)) if (work[category] <= 0) delete work[category];
    return { work, baseWork, materials, undiscountedMaterials, materialDiscount, contractorWork, contractorWorkByCategory };
  }

  function remainingProblemContractorWork(problem) {
    const requirements = problemRequirements(problem);
    const progress = problemProgress(problem);
    return Object.entries(requirements.baseWork).reduce((sum, [category, totalLabor]) => {
      const remaining = Math.max(0, totalLabor - (progress[category] || 0));
      const taskWork = requirements.contractorWorkByCategory[category] || 0;
      return sum + Math.ceil(taskWork * remaining / totalLabor * 100) / 100;
    }, 0);
  }

  function problemRepairCost(problem) {
    const requirements = problemRequirements(problem);
    const materialCost = Number.isFinite(problem.materialCostPaid) ? problem.materialCostPaid : (problem.materialPurchased ? 0 : materialShortage(requirements.materials) * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier);
    return materialCost + remainingProblemContractorWork(problem);
  }

  function problemProgress(problem) {
    return problem.repairProgress && typeof problem.repairProgress === "object" ? problem.repairProgress : {};
  }

  function unsafeHouseSeasonsRemaining(houseName = state.houseName) {
    const home = managedHomeByName(houseName);
    const sinceTurn = home?.primary ? state.houseUnsafeSinceTurn : home?.unsafeSinceTurn;
    if (sinceTurn == null) return 0;
    const completedSeasonsAfterTrigger = Math.max(0, Math.floor((state.turn - sinceTurn - 1) / state.seasonDuration));
    return Math.max(0, CONFIG.rules.unsafeHouseGraceSeasons - completedSeasonsAfterTrigger);
  }

  function problemLaborAdjustmentMessages(problem) {
    if (problem.laborReductionLogged) return [];
    const requirements = problemRequirements(problem);
    const baseLabor = Object.values(requirements.baseWork).reduce((sum, value) => sum + value, 0);
    const remainingLabor = Object.values(requirements.work).reduce((sum, value) => sum + value, 0);
    const reduction = baseLabor - remainingLabor;
    if (reduction <= 0) return [];
    const engineers = activeEmployees().filter(employee => employee.role === "engineer" && employee.bonus === "reduceProblemLabor");
    problem.laborReductionLogged = true;
    return engineers.map(engineer => `Инженер ${engineer.name} сократил требуемые работы по проблеме «${problem.category}» на ${reduction} трудозатраты.`);
  }

  function phaseActionLabel() {
    return ({
      staffing: `Применить кадровые изменения${state.pendingHireIds.length || Object.keys(state.pendingFireActions).length ? " и продолжить" : ""}`,
      inspection: `Провести ${SEASONS[state.seasonIndex] === "Осень" ? "осенний" : "весенний"} осмотр`,
      problems: "Перейти к приёму заявок",
      drawing: "Принять заявки",
      resolving: state.phase === "resolving" && (hasLawyer() || hasEngineer()) ? "Завершить распределение · к специалистам" : "Завершить распределение",
      legal: "Завершить задачи специалистам",
      payroll: "Выплатить зарплаты",
      collection: "Собрать содержание и завершить сезон",
      annualReport: "Начать новый год"
    })[state.phase] || "Продолжить";
  }

  function renderProblemPanel() {
    const rows = state.houseProblems.map(problem => {
      const requirements = problemRequirements(problem);
      const progress = problemProgress(problem);
      const materialPurchased = problem.materialPurchased === true;
      const workRows = Object.entries(requirements.work).map(([category, required]) => {
        const done = Math.min(required, progress[category] || 0);
        const remaining = required - done;
        const workers = activeEmployees().filter(employee => ROLES[employee.role]?.category === category);
        const regularButtons = [];
        const paidOvertimeButtons = [];
        const unpaidOvertimeButtons = [];
        workers.forEach(employee => {
          const name = escapeHtml(employee.name || roleName(employee.role));
          const workerLabel = `${roleName(employee.role)}: ${name}`;
          const available = Math.max(0, effectiveProductivity(employee) - employee.assignedLabor);
          const regularWork = Math.min(remaining, available);
          const productivityLabel = `<span class="worker-productivity-count">(${quantity(available)}/${quantity(effectiveProductivity(employee))})</span>`;
          if (regularWork) regularButtons.push(`<button class="problem-work-button" type="button" data-problem-work="${escapeHtml(problem.id)}" data-problem-worker="${escapeHtml(employee.id)}" data-problem-category="${escapeHtml(category)}" data-problem-overtime="none" ${!materialPurchased ? "disabled" : ""}>${workerLabel} · ${productivityLabel} · без премии</button>`);
          if (remaining <= regularWork) return;
          const overtimePlan = overtimeFor(employee, remaining);
          paidOvertimeButtons.push(`<button class="problem-work-button problem-overtime-paid" type="button" data-problem-work="${escapeHtml(problem.id)}" data-problem-worker="${escapeHtml(employee.id)}" data-problem-category="${escapeHtml(category)}" data-problem-overtime="paid" ${!materialPurchased || !canCoverRequiredCost(overtimePlan.premium) ? "disabled" : ""}>${workerLabel} · ${productivityLabel} · премия ${money(overtimePlan.premium)} ₽</button>`);
          unpaidOvertimeButtons.push(`<button class="problem-work-button problem-overtime-unpaid" type="button" data-problem-work="${escapeHtml(problem.id)}" data-problem-worker="${escapeHtml(employee.id)}" data-problem-category="${escapeHtml(category)}" data-problem-overtime="unpaid" ${!materialPurchased ? "disabled" : ""}>${workerLabel} · ${productivityLabel} · без премии, недовольство</button>`);
        });
        const workerButtons = [...regularButtons, ...paidOvertimeButtons, ...unpaidOvertimeButtons].join("");
        return `<div class="problem-work-row"><div><strong>${escapeHtml(category)}</strong><span>Выполнено ${done} / ${required} · осталось ${remaining}</span></div><div class="problem-work-actions">${workerButtons || `<span class="problem-work-empty">${remaining ? "Нет доступного исполнителя этой категории" : "Категория завершена"}</span>`}</div></div>`;
      }).join("");
      const materialNeed = problem.materialUnits || requirements.materials;
      const materialShortageUnits = materialPurchased ? 0 : materialShortage(materialNeed);
      const materialPurchaseCost = materialPurchased ? (problem.materialCostPaid || 0) : materialShortageUnits * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier;
      const materialButton = !materialPurchased ? `<button class="problem-material-button" type="button" data-problem-material="${escapeHtml(problem.id)}" ${!canCoverRequiredCost(materialPurchaseCost) ? "disabled" : ""}>${materialShortageUnits === 0 ? `Списать со склада · ${materialNeed} ед.` : `Материалы ${materialNeed} ед. · докупить ${materialShortageUnits} ед. за ${money(materialPurchaseCost)} ₽`}</button><span class="problem-material-paid">На складе: ${quantity(state.materialStock)} ед.</span>` : `<span class="problem-material-paid">Материалы закуплены · ${materialNeed} ед.</span>`;
      const contractorCost = remainingProblemContractorWork(problem);
      const contractorButton = `<button class="problem-contract-button" type="button" data-problem-contract="${escapeHtml(problem.id)}" ${!materialPurchased || state.capital < contractorCost ? "disabled" : ""}>Подрядчик · работы ${money(contractorCost)} ₽</button>`;
      const combinedMaterialCost = materialPurchased ? 0 : materialNeed * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier;
      const combinedContractorCost = contractorCost + combinedMaterialCost;
      const combinedContractorButton = !materialPurchased && materialNeed > 0 ? `<button class="problem-contract-button" type="button" data-problem-contract-combined="${escapeHtml(problem.id)}" ${state.capital < combinedContractorCost ? "disabled" : ""}>Подрядчик + Материал: ${money(combinedContractorCost)} ₽</button>` : "";
      const problemHome = managedHomeByName(problem.houseName || state.houseName);
      const unsafeSince = problemHome?.primary ? state.houseUnsafeSinceTurn : problemHome?.unsafeSinceTurn;
      const status = unsafeSince != null ? `<span class="unsafe-countdown">До автоматического признания дома аварийным: ${unsafeHouseSeasonsRemaining(problemHome.name)} полных сезонов</span>` : "";
      return `<article class="problem-repair-card"><div class="problem-repair-main"><strong>${escapeHtml(problem.houseAddress || managedHomeByName(problem.houseName)?.address || state.houseAddress)} · ${escapeHtml(problem.category)} · износ ${problem.wear}%</strong><span>Сначала приобрети материалы. Затем полностью устрани работы подрядчиком или штатными сотрудниками. Трудозатраты можно накапливать между ходами. Общая оценка: ${money(problemRepairCost(problem))} ₽</span></div>${status}<div class="problem-material-actions">${materialButton}</div><div class="problem-work-list">${workRows || `<div class="problem-work-row"><div><strong>Работы без затрат продуктивности</strong><span>Для завершения ремонта всё равно нужна покупка материалов и подтверждение способа выполнения.</span></div></div>`}</div><div class="problem-repair-actions">${contractorButton}${combinedContractorButton}</div></article>`;
    }).join("");
    elements.problemPanel.innerHTML = `<div class="problem-panel-heading"><div><p class="section-label">ЭТАП · РЕШЕНИЕ ПРОБЛЕМ</p><h2>Материалы и ремонт дома</h2></div><span class="inspection-icon">⚒</span></div><p>Сначала приобрети материалы. Затем оплати подрядчику только работы или распределяй трудозатраты между штатными исполнителями. Работы можно завершать поэтапно в разные сезоны.</p><div class="problem-repair-list">${rows || '<div class="problem-none">На доме нет известных проблем. Переходи к приёму заявок.</div>'}</div>`;
    elements.problemPanel.querySelectorAll("[data-problem-material]").forEach(button => button.addEventListener("click", () => purchaseProblemMaterials(button.dataset.problemMaterial)));
    elements.problemPanel.querySelectorAll("[data-problem-contract]").forEach(button => button.addEventListener("click", () => hireProblemContractor(button.dataset.problemContract)));
    elements.problemPanel.querySelectorAll("[data-problem-contract-combined]").forEach(button => button.addEventListener("click", () => hireProblemContractor(button.dataset.problemContractCombined, true)));
    elements.problemPanel.querySelectorAll("[data-problem-work]").forEach(button => button.addEventListener("click", () => assignProblemWork(button.dataset.problemWork, button.dataset.problemWorker, button.dataset.problemCategory, button.dataset.problemOvertime)));
  }

  function updateHouseSafetyStatus() {
    if (!state.houses || state.houseRemoved) return;
    for (const home of managedHomes()) {
      const homeProblems = state.houseProblems.filter(problem => problem.houseName === home.name);
      const totals = Object.fromEntries(HOUSE_PROBLEMS.map(definition => [definition.category, homeProblems.filter(problem => problem.category === definition.category).reduce((sum, problem) => sum + problem.wear, 0)]));
      const critical = Object.entries(totals).find(([, wear]) => wear >= CONFIG.rules.unsafeWearThresholdPercent);
      const reasons = [];
      if (critical) reasons.push(`Износ категории «${critical[0]}» достиг ${critical[1]}%`);
      if (homeProblems.length >= CONFIG.rules.unsafeProblemCardThreshold) reasons.push(`На доме ${homeProblems.length} карт проблем (порог ${CONFIG.rules.unsafeProblemCardThreshold})`);
      const sinceTurn = home.primary ? state.houseUnsafeSinceTurn : home.unsafeSinceTurn;
      const oldReasons = home.primary ? state.houseUnsafeReasons : (home.unsafeReasons || []);
      if (reasons.length) {
        if (sinceTurn == null) {
          if (home.primary) { state.houseUnsafeSinceTurn = state.turn; state.houseUnsafeSinceYear = state.year; state.houseUnsafeReasons = reasons; state.houseUnsafeCategory = critical?.[0] || null; }
          else { home.unsafeSinceTurn = state.turn; home.unsafeSinceYear = state.year; home.unsafeReasons = reasons; }
          addLog(`Возникла угроза аварийного дома «${home.name}» (${home.address}): ${reasons.join("; ")}. На исправление дано ${CONFIG.rules.unsafeHouseGraceSeasons} полных сезонов.`);
        } else if (reasons.join(";") !== oldReasons.join(";")) {
          if (home.primary) state.houseUnsafeReasons = reasons; else home.unsafeReasons = reasons;
          addLog(`Условия аварийного состояния дома «${home.name}» обновлены: ${reasons.join("; ")}. Срок отсчитывается от первого условия.`);
        }
      } else if (sinceTurn != null) {
        if (home.primary) { state.houseUnsafeSinceYear = null; state.houseUnsafeSinceTurn = null; state.houseUnsafeCategory = null; state.houseUnsafeReasons = []; }
        else { home.unsafeSinceYear = null; home.unsafeSinceTurn = null; home.unsafeReasons = []; }
        addLog(`Все условия аварийности дома «${home.name}» устранены. Таймер сброшен.`);
      }
    }
  }

  function recognizeHouseAsUnsafe(voluntary, houseName = state.houseName) {
    const home = managedHomeByName(houseName);
    if (!home) return false;
    const sinceTurn = home.primary ? state.houseUnsafeSinceTurn : home.unsafeSinceTurn;
    if (sinceTurn == null) return false;
    const homeReasons = home.primary ? state.houseUnsafeReasons : (home.unsafeReasons || []);
    const reasons = homeReasons.length ? homeReasons.join("; ") : "достигнут порог аварийности";
    const reputationPenalty = CONFIG.rules.unsafeHouseReputationPenalty;
    const removedArea = home.area;
    const oldHouseName = home.name;
    if (home.primary && state.additionalHomes.length) {
      const promoted = state.additionalHomes.shift();
      state.houseName = promoted.name; state.managedSinceYear = promoted.managedSinceYear || state.year; state.houseAddress = promoted.address; state.primaryArea = promoted.area; state.houseAge = promoted.age;
      state.houseRepairWarranties = promoted.repairWarranties || {}; state.houseWarrantyUntilTurn = promoted.warrantyUntilTurn;
      state.baseMaintenance = Number.isFinite(promoted.baseMaintenance) ? promoted.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse;
      state.tariffPerSquareMeter = promoted.tariffPerSquareMeter; state.tariffOssResolvedYear = promoted.tariffOssResolvedYear;
      state.primaryDebtRecoverable = promoted.debtRecoverable || 0; state.primaryDebtIrrecoverable = promoted.debtIrrecoverable || 0;
      state.primaryCollectionStats = promoted.collectionStats || { billed: 0, collected: 0, periods: 0 }; state.primaryLastCollectionRate = promoted.lastCollectionRate;
      state.houseUnsafeSinceTurn = promoted.unsafeSinceTurn; state.houseUnsafeSinceYear = promoted.unsafeSinceYear; state.houseUnsafeReasons = promoted.unsafeReasons || []; state.houseUnsafeCategory = null;
      state.houses -= 1; state.area -= removedArea;
      state.houseProblems = state.houseProblems.filter(problem => problem.houseName !== oldHouseName);
      state.houseRemoved = false;
    } else if (!home.primary) {
      state.additionalHomes = state.additionalHomes.filter(item => item.name !== home.name);
      state.houses -= 1; state.area -= removedArea;
      state.houseProblems = state.houseProblems.filter(problem => problem.houseName !== home.name);
    } else {
      state.houseRemoved = true; state.houses = 0; state.area = 0; state.primaryArea = 0;
      state.houseProblems = state.houseProblems.filter(problem => problem.houseName !== home.name);
      state.houseUnsafeSinceYear = null; state.houseUnsafeSinceTurn = null; state.houseUnsafeCategory = null; state.houseUnsafeReasons = [];
    }
    state.reputation -= reputationPenalty;
    state.unsafeHousePenaltyYear = state.year;
    addLog(voluntary ? `Игрок признал дом «${oldHouseName}» аварийным и изъял его из управления. Адрес: ${home.address}. Причина: ${reasons}. Репутация −${reputationPenalty}.` : `По истечении ${CONFIG.rules.unsafeHouseGraceSeasons} полных сезонов дом «${oldHouseName}» (${home.address}) автоматически признан аварийным и изъят из управления. Причина: ${reasons}. Репутация −${reputationPenalty}.`);
    if (CONFIG.rules.unsafeHouseEndsGame && state.houses === 0 && availableRealEstateHomes().length === 0) {
      if (state.phase !== "annualReport") {
        const closingThroughCollection = state.phase === "collection";
        const comparisonStart = previousAnnualReportReputation();
        if (!closingThroughCollection) cancelUnresolvedForAnnualReport();
        const annualReputation = closingThroughCollection ? null : applyAnnualReputation();
        state.lastAnnualReport = {
          year: state.year,
          capitalStart: state.yearStats.capitalStart,
          capitalEnd: state.capital,
          yearStats: { ...state.yearStats },
          totals: { ...state.totals },
          reputation: annualReputation
            ? { start: annualReputation.start, comparisonStart, end: state.reputation, ...annualReputation.changes }
            : { start: state.reputation + reputationPenalty, comparisonStart, end: state.reputation, cancellationPenalty: 0, marketerBonus: 0, unsafeHousePenalty: reputationPenalty, solvencyBonus: 0, cleanHouseBonus: 0 }
        };
      } else if (state.lastAnnualReport?.year === state.year) {
        state.lastAnnualReport.capitalEnd = state.capital;
        state.lastAnnualReport.reputation = { ...(state.lastAnnualReport.reputation || {}), end: state.reputation, unsafeHousePenalty: reputationPenalty };
      }
      state.phase = "annualReport";
    } else updateHouseSafetyStatus();
    return true;
  }

  function finishProblemRepair(problem) {
    state.houseProblems = state.houseProblems.filter(item => item.id !== problem.id);
    const stillInCategory = state.houseProblems.some(item => item.category === problem.category && item.houseName === problem.houseName);
    if (!stillInCategory) {
      state.reputation += CONFIG.rules.clearedProblemCategoryReputationBonus;
      addLog(`Все проблемы категории «${problem.category}» устранены. Репутация +1.`);
    }
    updateHouseSafetyStatus();
    if (!state.houseProblems.length) {
      state.phase = "drawing";
      addLog("На доме не осталось проблем. Этап решения проблем завершён.");
    }
  }

  function purchaseProblemMaterials(problemId) {
    if (state.phase !== "problems") return;
    const problem = state.houseProblems.find(item => item.id === problemId);
    if (!problem || problem.materialPurchased) return;
    const requirements = problemRequirements(problem);
    const materials = problem.materialUnits || requirements.materials;
    const shortage = materialShortage(materials);
    const purchaseCost = shortage * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier;
    if (!canCoverRequiredCost(purchaseCost)) { showToast(`На покупку ${shortage} ед. материалов нужно ${money(purchaseCost)} ₽.`); return; }
    const materialStockUsed = Math.min(state.materialStock, materials);
    if (!changeCapital(-purchaseCost, "материалы для проблемы дома")) return;
    consumeMaterials(materials);
    problem.materialUnits = materials;
    problem.materialCostPaid = purchaseCost;
    state.seasonFinancials.materials += purchaseCost;
    problem.materialPurchased = true;
    const materialLog = [`Материалы для проблемы «${problem.category}»: потребность ${quantity(materials)} условных единиц.`];
    const materialDiscountEmployees = activeEmployees().filter(employee => employee.role === "engineer" && employee.bonus === "discountProblemMaterials");
    if (requirements.materialDiscount > 0) materialDiscountEmployees.forEach(employee => materialLog.push(`Инженер ${employee.name} снизил себестоимость единицы материала на ${requirements.materialDiscount}%; потребность в материалах не изменилась.`));
    else materialLog.push("Скидки специалистов на материалы не применялись.");
    materialLog.push(`Потребность: ${materials} ед.; со склада использовано ${materialStockUsed} ед., докуплено ${shortage} ед. по рыночной цене. Итого: −${money(purchaseCost)} ₽.`);
    materialLog.push(...problemLaborAdjustmentMessages(problem));
    addLogSequence(materialLog);
    saveState(); render(); showToast(shortage === 0
      ? `Со склада списано: ${quantity(materialStockUsed)} ед.`
      : `Материалы приобретены: ${quantity(materials)} ед. · −${money(purchaseCost)} ₽`);
  }

  function assignProblemWork(problemId, employeeId, category, overtimeMode = "none") {
    if (state.phase !== "problems") return;
    const problem = state.houseProblems.find(item => item.id === problemId);
    const employee = state.employees.find(item => item.id === employeeId);
    if (!problem || !employee || employee.deceased || !problem.materialPurchased || ROLES[employee.role]?.category !== category) return;
    const required = problemRequirements(problem).work[category] || 0;
    const progress = problemProgress(problem);
    const remaining = Math.max(0, required - (progress[category] || 0));
    const available = Math.max(0, effectiveProductivity(employee) - employee.assignedLabor);
    const regularWork = Math.min(remaining, available);
    let contribution = regularWork;
    let premium = 0;
    if (overtimeMode !== "none") {
      if (remaining <= regularWork) return;
      contribution = remaining;
      const plan = overtimeFor(employee, contribution);
      if (overtimeMode === "paid") {
        premium = plan.premium;
        if (state.capital < premium) { showToast(`На премию за переработку нужно ${money(premium)} ₽.`); return; }
        if (premium && !changeCapital(-premium, "премия за переработку при решении проблемы")) return;
        state.seasonFinancials.salaries += premium;
        if (premium) addLog(`Премия за переработку ${roleName(employee.role)} ${employee.name}: ${money(plan.basePremium)} ₽${plan.hrMultiplier < 1 ? ` · HR снизил до ${money(premium)} ₽` : ""}.`);
      } else {
        setDissatisfied(employee);
      }
    }
    if (!contribution) { showToast("У сотрудника нет свободной продуктивности нужной категории."); return; }
    employee.assignedLabor += contribution;
    problem.repairProgress = { ...progress, [category]: (progress[category] || 0) + contribution };
    const requirements = problemRequirements(problem).work;
    const completed = Object.entries(requirements).every(([workCategory, amount]) => (problem.repairProgress[workCategory] || 0) >= amount);
    addLogSequence([...problemLaborAdjustmentMessages(problem), `${roleName(employee.role)} ${employee.name} выполнил ${contribution} трудозатрат по проблеме «${problem.category}» (${category})${overtimeMode === "paid" ? ` с премией ${money(premium)} ₽` : overtimeMode === "unpaid" ? ` без премии; в следующем сезоне будет недоволен` : " в пределах продуктивности"}.`]);
    if (completed) finishProblemRepair(problem);
    if (checkBankruptcy()) { saveState(); render(); showToast(`После премии баланс достиг ${money(BANKRUPTCY_THRESHOLD)} ₽. Необходимо объявить банкротство.`); return; }
    saveState(); render(); showToast(completed ? `Проблема «${problem.category}» устранена силами штата.` : `Работа выполнена: ${contribution} трудозатрат.`);
  }

  function hireProblemContractor(problemId, contractorSuppliesMaterials = false) {
    if (state.phase !== "problems") return;
    const problem = state.houseProblems.find(item => item.id === problemId);
    if (!problem || (!problem.materialPurchased && !contractorSuppliesMaterials)) return;
    const contractorWork = remainingProblemContractorWork(problem);
    const requirements = problemRequirements(problem);
    const materialNeed = problem.materialUnits || requirements.materials;
    const contractorMaterialCost = contractorSuppliesMaterials && !problem.materialPurchased
      ? materialNeed * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier
      : 0;
    const totalCost = contractorWork + contractorMaterialCost;
    if (state.capital < totalCost) { showToast(`На подрядчика и материалы нужно ${money(totalCost)} ₽.`); return; }
    if (contractorSuppliesMaterials && !problem.materialPurchased) {
      if (!changeCapital(-contractorMaterialCost, "материалы от подрядчика")) return;
      problem.materialUnits = materialNeed;
      problem.materialCostPaid = contractorMaterialCost;
      problem.materialPurchased = true;
      problem.materialProvidedByContractor = true;
      state.seasonFinancials.materials += contractorMaterialCost;
      addLog(`Подрядчик предоставил ${quantity(materialNeed)} ед. материалов для проблемы «${problem.category}» по рыночной цене ${money(contractorMaterialCost)} ₽; склад не затронут.`);
    }
    if (!changeCapital(-contractorWork, "подрядные работы по проблеме дома")) return;
    state.seasonFinancials.contractors += contractorWork;
    addLog(`Подрядчик полностью устранил проблему «${problem.category}». Стоимость работ: ${money(contractorWork)} ₽${contractorSuppliesMaterials ? `; общая стоимость с материалами ${money(totalCost)} ₽.` : "; материалы оплачены отдельно."}`);
    finishProblemRepair(problem);
    saveState(); render(); showToast(`Проблема устранена подрядчиком: −${money(totalCost)} ₽`);
  }

  function renderDevTools() {
    const panel = document.getElementById("dev-tools-panel");
    if (!panel) return;
    panel.hidden = false;
    ensureDevEmployeeTools(panel);
    renderDevEmployeeControls(panel);
    if (!panel.dataset.controlsBound) {
      panel.dataset.controlsBound = "true";
      panel.querySelectorAll("[data-dev-action]").forEach(button => button.addEventListener("click", () => runDevAction(button.dataset.devAction)));
    }
    const complaintSlider = document.getElementById("dev-complaint-modifier");
    const complaintValue = document.getElementById("dev-complaint-modifier-value");
    if (complaintSlider) {
      complaintSlider.value = String(state.complaintModifierPercent);
      if (complaintValue) complaintValue.textContent = `${state.complaintModifierPercent}%`;
      if (!complaintSlider.dataset.bound) {
        complaintSlider.dataset.bound = "true";
        complaintSlider.addEventListener("input", () => {
          state.complaintModifierPercent = Math.max(0, Math.min(1000, Number(complaintSlider.value) || 0));
          if (complaintValue) complaintValue.textContent = `${state.complaintModifierPercent}%`;
          saveState();
        });
      }
    }    const problemSelect = document.getElementById("dev-solve-problem-select");
    if (problemSelect) {
      const selected = problemSelect.value;
      problemSelect.innerHTML = state.houseProblems.map(problem => `<option value="${escapeHtml(problem.id)}">${escapeHtml(problem.houseAddress || managedHomeByName(problem.houseName)?.address || "Адрес не указан")} · ${escapeHtml(problem.category)} · ${problem.wear}%</option>`).join("") || '<option value="">Проблем нет</option>';
      if (state.houseProblems.some(problem => problem.id === selected)) problemSelect.value = selected;
    }
    renderDevHomeControls(panel);
    const timelineForm = panel.querySelector("#dev-timeline-form");
    if (timelineForm) { timelineForm.elements.year.value = state.year; timelineForm.elements.season.value = state.seasonIndex; }
    bindDevToolForms(panel);
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
        materialCost: type === "paid" ? 0 : Math.min(MAX_REQUEST_MATERIAL_UNITS, Math.max(0, Math.floor(Number(data.get("materialCost") || 0)))),
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
      recordHouseRequest(card.houseName, "accepted");
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

  function ensureDevEmployeeTools(panel) {
    const form = panel.querySelector("#dev-add-employee-form");
    if (form && !form.querySelector("#dev-employee-age")) {
      const profileLabel = form.elements.profile.closest("label");
      if (profileLabel?.firstChild?.nodeType === Node.TEXT_NODE) profileLabel.firstChild.textContent = "Профиль и способность";
      form.querySelector('[type="submit"]')?.insertAdjacentHTML("beforebegin", `<div class="dev-form-row"><label>Возраст<input id="dev-employee-age" type="number" min="20" max="60" value="35"></label><label>Лет в компании<input id="dev-employee-years" type="number" min="0" max="60" value="0"></label></div><div class="dev-form-row"><label>Зарплата, ₽/ход<input id="dev-employee-salary" type="number" min="0" step="0.01" value="15"></label><label>Лояльность<input id="dev-employee-loyalty" type="number" min="-10" max="5" step="1" value="0"></label></div>`);
    }
    if (!panel.querySelector("#dev-staff-control-list")) {
      const timeline = panel.querySelector("#dev-timeline-form")?.closest(".dev-control-group");
      const markup = `<section class="dev-control-group"><h3>Команда: события и лояльность</h3><p class="dev-panel-copy">Измени лояльность или принудительно вызови кадровое событие для сотрудника.</p><div id="dev-staff-control-list"></div></section>`;
      if (timeline) timeline.insertAdjacentHTML("beforebegin", markup);
      else panel.insertAdjacentHTML("beforeend", markup);
    }
    const list = panel.querySelector("#dev-staff-control-list");
    if (list && !list.dataset.bound) {
      list.dataset.bound = "true";
      list.addEventListener("click", event => {
        const button = event.target.closest("[data-dev-staff-action]");
        if (!button) return;
        const employee = state.employees.find(item => item.id === button.dataset.employeeId);
        if (!employee) return;
        const action = button.dataset.devStaffAction;
        if (action === "loyalty-up") employee.loyalty = Math.min(5, loyaltyOf(employee) + 1);
        else if (action === "loyalty-down") employee.loyalty = Math.max(-10, loyaltyOf(employee) - 1);
        else if (action === "health") employee.pendingDeparture = { reason: "health", label: "Проблемы со здоровьем", chance: 1, turn: state.turn, needsResponse: true };
        else if (action === "death") { employee.deceased = true; employee.pendingDeparture = { reason: "death", label: "Смерть сотрудника", chance: 1, turn: state.turn, settlementDueTurn: state.turn + 1 }; }
        else if (action === "competitor") employee.pendingDeparture = { reason: "outsideOffer", label: "Получил предложение от конкурента", chance: 1, turn: state.turn, needsResponse: true };
        else if (action === "resign") employee.pendingDeparture = { reason: "dissatisfaction", label: "Увольнение по собственному желанию", chance: 1, turn: state.turn, needsResponse: true };
        else if (action === "fire") {
          state.withheldWages = Math.max(0, state.withheldWages - (Number(employee.withheldAmount) || 0));
          state.pendingHireIds = state.pendingHireIds.filter(id => id !== employee.id);
          state.employees = state.employees.filter(item => item.id !== employee.id);
          countEvent("fired");
          addLog(`DEV: сотрудник ${employee.name} уволен без финансовых последствий.`);
          showToast(`${employee.name} уволен инструментом разработчика.`);
        }
        if (action === "loyalty-up" || action === "loyalty-down") { employee.mood = moodOf(employee); addLog(`DEV: лояльность ${employee.name} изменена на ${loyaltyOf(employee)} (${MOOD_LABELS[moodOf(employee)]}).`); }
        if (["health", "death", "competitor", "resign"].includes(action)) addLog(`DEV: вызвано кадровое событие «${employee.pendingDeparture.label}» для ${employee.name}.`);
        saveState(); render();
      });
    }
  }

  function renderDevEmployeeControls(panel) {
    const list = panel.querySelector("#dev-staff-control-list");
    if (!list) return;
    list.innerHTML = state.employees.map(employee => `<article class="dev-control-group"><strong>${escapeHtml(roleName(employee.role))} · ${escapeHtml(employee.name)}</strong><span>${employee.deceased ? "Умер" : `${quantity(employee.age || 0)} лет · лояльность ${loyaltyOf(employee)} · ${MOOD_LABELS[moodOf(employee)]}`}</span><div class="dev-tool-actions"><button type="button" class="dev-control-button" data-dev-staff-action="loyalty-down" data-employee-id="${escapeHtml(employee.id)}" title="Лояльность −1">−1</button><button type="button" class="dev-control-button" data-dev-staff-action="loyalty-up" data-employee-id="${escapeHtml(employee.id)}" title="Лояльность +1">+1</button><button type="button" class="dev-control-button" data-dev-staff-action="health" data-employee-id="${escapeHtml(employee.id)}">Проблемы со здоровьем</button><button type="button" class="dev-control-button" data-dev-staff-action="death" data-employee-id="${escapeHtml(employee.id)}">Смерть</button><button type="button" class="dev-control-button" data-dev-staff-action="competitor" data-employee-id="${escapeHtml(employee.id)}">Позвать к конкурентам</button><button type="button" class="dev-control-button" data-dev-staff-action="resign" data-employee-id="${escapeHtml(employee.id)}">Вызвать увольнение по собственному</button><button type="button" class="dev-control-button dev-wide-danger" data-dev-staff-action="fire" data-employee-id="${escapeHtml(employee.id)}">Уволить</button></div></article>`).join("") || '<p class="dev-panel-copy">В штате пока нет сотрудников.</p>';
  }

  function bindDevToolForms(panel) {
    const addHouseForm = panel.querySelector("#dev-add-house-form");
    if (addHouseForm && !addHouseForm.dataset.bound) {
      addHouseForm.dataset.bound = "true";
      addHouseForm.addEventListener("submit", event => {
        event.preventDefault();
        const data = new FormData(addHouseForm);
        addDevHouse({ name: String(data.get("name")).trim(), address: String(data.get("address")).trim(), area: Number(data.get("area")), age: Number(data.get("age")), baseMaintenance: Number(data.get("baseMaintenance")) });
      });
    }
    const removeHouseButton = panel.querySelector("#dev-remove-house-button");
    if (removeHouseButton && !removeHouseButton.dataset.bound) {
      removeHouseButton.dataset.bound = "true";
      removeHouseButton.addEventListener("click", () => removeDevHouse(panel.querySelector("#dev-remove-house-select").value));
    }
    const problemForm = panel.querySelector("#dev-add-problem-form");
    if (problemForm && !problemForm.dataset.bound) {
      problemForm.dataset.bound = "true";
      problemForm.addEventListener("submit", event => { event.preventDefault(); addDevProblem(problemForm.elements.category.value, problemForm.elements.houseName.value); });
      panel.querySelector("#dev-add-random-problem").addEventListener("click", () => addDevProblem(null, problemForm.elements.houseName.value));
    }
    const solveButton = panel.querySelector("#dev-solve-problem-button");
    if (solveButton && !solveButton.dataset.bound) {
      solveButton.dataset.bound = "true";
      solveButton.addEventListener("click", () => solveDevProblems(panel.querySelector("#dev-solve-problem-select").value));
      panel.querySelector("#dev-solve-all-problems").addEventListener("click", () => solveDevProblems("all"));
    }
    const fineForm = panel.querySelector("#dev-add-fine-form");
    if (fineForm && !fineForm.dataset.bound) {
      fineForm.dataset.bound = "true";
      fineForm.addEventListener("submit", event => {
        event.preventDefault();
        const amount = Number(fineForm.elements.amount.value);
        if (!Number.isFinite(amount) || amount < 0) return;
        const kind = fineForm.elements.kind.value;
        const status = fineForm.elements.status.value;
        const title = String(fineForm.elements.title.value).trim() || (kind === "fine" ? "Тестовый штраф" : "Тестовая компенсация");
        if (kind === "fine") state.penalties.push({ id: `dev-fine-${state.turn}-${Date.now()}`, employeeName: title, salary: 0, amount, year: state.year, turn: state.turn, houseName: state.houseName, houseAddress: state.houseAddress, paid: false, writtenOff: status === "writtenOff", contestedBy: [], devStatus: status });
        else {
          const claimId = `dev-comp-${state.turn}-${Date.now()}`;
          const isPretrial = status === "pretrial";
          const isWrittenOff = status === "writtenOff";
          const isPaid = status === "paid";
          state.compensations.push({ id: claimId, requestId: claimId, title, amount, originalAmount: amount, year: state.year, turn: state.turn, houseName: state.houseName, houseAddress: state.houseAddress, paid: isPaid, writtenOff: isWrittenOff, status: isWrittenOff ? "expired" : isPaid ? "paid" : isPretrial ? "pretrial" : "court", courtStage: status === "payment" ? "payment" : status === "court" ? "trial" : null, pretrialStartedTurn: state.turn, pretrialDeadlineTurn: state.turn + (CONFIG.rules.compensationPretrialTurns ?? 8), trialDeadlineTurn: ["court", "payment"].includes(status) ? state.turn + (CONFIG.rules.compensationTrialTurns ?? 4) : null, paymentDeadlineTurn: status === "payment" ? state.turn + (CONFIG.rules.compensationPaymentTurns ?? 4) : null, lastOfferPercent: 10, contestedBy: [], delayCount: 0 });
        }
        addLog(`DEV: добавлено обязательство «${title}» (${kind === "fine" ? "штраф" : "компенсация"}, ${status}) на ${money(amount)} ₽.`);
        saveState(); render(); showToast(`Обязательство добавлено: ${money(amount)} ₽`);
      });
    }
    const employeeForm = panel.querySelector("#dev-add-employee-form");
    if (employeeForm && !employeeForm.dataset.bound) {
      employeeForm.dataset.bound = "true";
      employeeForm.elements.role.addEventListener("change", () => updateDevEmployeeProfiles(employeeForm));
      employeeForm.elements.profile.addEventListener("change", () => updateDevEmployeeParameters(employeeForm));
      employeeForm.elements.legalStrength.addEventListener("change", () => updateDevEmployeeParameters(employeeForm));
      updateDevEmployeeProfiles(employeeForm);
      employeeForm.addEventListener("submit", event => {
        event.preventDefault();
        const roleId = employeeForm.elements.role.value;
        const role = ROLES[roleId];
        const profile = EMPLOYEE_ROSTER.find(person => person.role === roleId && person.name === employeeForm.elements.profile.value);
        if (!role || !profile) return;
        if (state.employees.some(person => person.role === roleId && person.name === profile.name) || state.pendingHireIds.some(id => { const candidate = state.market.find(person => person.id === id); return candidate?.role === roleId && candidate.name === profile.name; })) { showToast("Этот сотрудник уже выбран или работает в компании."); return; }
        const legalStrength = roleId === "lawyer" ? Number(employeeForm.elements.legalStrength.value) : profile.legalStrength;
        const productivity = role.kind === "executor" ? Number(employeeForm.elements.productivity.value) : role.productivity;
        const age = Number(panel.querySelector("#dev-employee-age")?.value ?? 35);
        const yearsWorked = Number(panel.querySelector("#dev-employee-years")?.value ?? 0);
        const salary = Number(panel.querySelector("#dev-employee-salary")?.value ?? profile.salary);
        const loyalty = Number(panel.querySelector("#dev-employee-loyalty")?.value ?? 0);
        if ((role.kind === "executor" && (!Number.isInteger(productivity) || productivity < 1)) || (roleId === "lawyer" && ![1, 2, 3].includes(legalStrength)) || !Number.isInteger(age) || age < 20 || age > 60 || !Number.isInteger(yearsWorked) || yearsWorked < 0 || !Number.isFinite(salary) || salary < 0 || !Number.isInteger(loyalty) || loyalty < -10 || loyalty > 5) return;
        const employee = { ...profile, id: `dev-employee-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, age, salary, productivity, legalStrength, probationTurns: 0, assignedLabor: 0, loyalty, loyaltyQuietStreak: 0, mood: "normal", fullSalaryStreak: 0, noWithholdPayStreak: 0, noPremiumPayStreak: 0, withholdPercent: 0, anchoredWithholdPercent: 0, withheldAmount: 0, unpaidOvertime: false, hiredTurn: state.turn, tenureOffsetYears: yearsWorked };
        state.employees.push(employee); countEvent("hired");
        addLog(`DEV: добавлен ${role.name.toLowerCase()} ${employee.name}${roleId === "lawyer" ? ` · ЮС ${legalStrength}` : role.kind === "executor" ? ` · продуктивность ${productivity}` : employee.bonusDescription ? ` · ${employee.bonusDescription}` : ""}.`);
        saveState(); render(); showToast(`${role.name} добавлен в штат`);
      });
    }
    const timelineForm = panel.querySelector("#dev-timeline-form");
    if (timelineForm && !timelineForm.dataset.bound) {
      timelineForm.dataset.bound = "true";
      timelineForm.addEventListener("submit", event => {
        event.preventDefault();
        const year = Number(timelineForm.elements.year.value);
        const seasonIndex = Number(timelineForm.elements.season.value);
        if (!Number.isInteger(year) || year < 1 || !Number.isInteger(seasonIndex) || seasonIndex < 0 || seasonIndex >= SEASONS.length) return;
        state.year = year; state.seasonIndex = seasonIndex; state.turn = (year - 1) * 4 + seasonIndex + 1;
        if (["annualReport", "bankruptcy"].includes(state.phase)) state.phase = "staffing";
        addLog(`DEV: таймлайн установлен на ${SEASONS[seasonIndex]}, год ${year}.`);
        saveState(); render(); showToast(`Таймлайн: ${SEASONS[seasonIndex]}, год ${year}`);
      });
    }
  }

  function renderDevHomeControls(panel) {
    const homes = managedHomes();
    const removeSelect = panel.querySelector("#dev-remove-house-select");
    const problemHomeSelect = panel.querySelector("#dev-problem-house-select");
    const fill = (select, emptyText, preferredValue) => {
      if (!select) return;
      const selected = preferredValue ?? select.value;
      select.innerHTML = homes.map(home => `<option value="${escapeHtml(home.name)}">${escapeHtml(home.address)} · ${escapeHtml(home.name)}</option>`).join("") || `<option value="">${emptyText}</option>`;
      if (homes.some(home => home.name === selected)) select.value = selected;
    };
    fill(removeSelect, "Домов нет");
    fill(problemHomeSelect, "Сначала добавьте дом");
    const removeButton = panel.querySelector("#dev-remove-house-button");
    if (removeButton) removeButton.disabled = homes.length === 0;
  }

  function addDevHouse(details) {
    const { name, address, area, age, baseMaintenance } = details;
    if (!name || !address || !Number.isFinite(area) || area <= 0 || !Number.isInteger(age) || age < 0 || !Number.isFinite(baseMaintenance) || baseMaintenance < 0) {
      showToast("Проверь название, адрес, площадь, возраст и стоимость БО дома."); return;
    }
    if (managedHomes().some(home => home.name.toLowerCase() === name.toLowerCase() || home.address.toLowerCase() === address.toLowerCase())) {
      showToast("Дом с таким названием или адресом уже находится в управлении."); return;
    }
    const home = { name, address, area, age, managedSinceYear: state.year, baseMaintenance, tariffPerSquareMeter: currentTariff(), tariffOssResolvedYear: null, debtRecoverable: 0, debtIrrecoverable: 0, collectionStats: { billed: 0, collected: 0, periods: 0 }, lastCollectionRate: null, repairWarranties: {}, warrantyUntilTurn: null, unsafeSinceTurn: null, unsafeSinceYear: null, unsafeReasons: [], removed: false };
    if (!managedHomes().length) {
      state.houseName = home.name; state.managedSinceYear = home.managedSinceYear; state.houseAddress = home.address; state.primaryArea = home.area; state.houseAge = home.age;
      state.baseMaintenance = home.baseMaintenance; state.houseRepairWarranties = {}; state.houseWarrantyUntilTurn = null;
      state.houseRemoved = false; state.houseUnsafeSinceTurn = null; state.houseUnsafeSinceYear = null; state.houseUnsafeReasons = [];
      state.tariffPerSquareMeter = home.tariffPerSquareMeter; state.tariffOssResolvedYear = home.tariffOssResolvedYear;
      state.primaryDebtRecoverable = 0; state.primaryDebtIrrecoverable = 0; state.primaryCollectionStats = { billed: 0, collected: 0, periods: 0 }; state.primaryLastCollectionRate = null;
    } else state.additionalHomes.push(home);
    state.houses = managedHomes().length;
    state.area = managedHomes().reduce((sum, item) => sum + item.area, 0);
    state.houseRemoved = false;
    addLog(`DEV: дом «${home.name}» добавлен в управление: ${home.address}, ${quantity(home.area)} м², возраст ${home.age} лет, БО ${money(home.baseMaintenance)} ₽ / ход.`);
    saveState(); render(); showToast(`Дом «${home.name}» добавлен в управление.`);
  }

  function removeDevHouse(houseName) {
    const home = managedHomeByName(houseName);
    if (!home) { showToast("Выбери дом для удаления из управления."); return; }
    const removedAddress = home.address;
    if (home.primary && state.additionalHomes.length) {
      const promoted = state.additionalHomes.shift();
      state.houseName = promoted.name; state.houseAddress = promoted.address; state.primaryArea = promoted.area; state.houseAge = promoted.age;
      state.baseMaintenance = Number.isFinite(promoted.baseMaintenance) ? promoted.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse;
      state.houseRepairWarranties = promoted.repairWarranties || {}; state.houseWarrantyUntilTurn = promoted.warrantyUntilTurn;
      state.houseUnsafeSinceTurn = promoted.unsafeSinceTurn; state.houseUnsafeSinceYear = promoted.unsafeSinceYear; state.houseUnsafeReasons = promoted.unsafeReasons || [];
      state.tariffPerSquareMeter = promoted.tariffPerSquareMeter; state.tariffOssResolvedYear = promoted.tariffOssResolvedYear;
      state.primaryDebtRecoverable = promoted.debtRecoverable || 0; state.primaryDebtIrrecoverable = promoted.debtIrrecoverable || 0; state.primaryCollectionStats = promoted.collectionStats || { billed: 0, collected: 0, periods: 0 }; state.primaryLastCollectionRate = promoted.lastCollectionRate;
    } else if (home.primary) {
      state.houseRemoved = true; state.primaryArea = 0; state.houseUnsafeSinceTurn = null; state.houseUnsafeSinceYear = null; state.houseUnsafeReasons = [];
    } else state.additionalHomes = state.additionalHomes.filter(item => item.name !== home.name);
    state.houses = managedHomes().length;
    state.area = managedHomes().reduce((sum, item) => sum + item.area, 0);
    state.houseProblems = state.houseProblems.filter(problem => problem.houseName !== home.name);
    const activeIds = new Set(state.requests.filter(card => card.houseName === home.name && !card.resolved && !card.cancelled).map(card => card.id));
    state.requests = state.requests.filter(card => !activeIds.has(card.id));
    state.compensations = state.compensations.filter(claim => !activeIds.has(claim.requestId));
    if (state.houses > 0) state.houseRemoved = false;
    addLog(`DEV: дом «${home.name}» (${removedAddress}) и связанные активные заявки удалены из обслуживания.`);
    saveState(); render(); showToast(`Дом «${home.name}» удалён из управления.`);
  }

  function updateDevEmployeeProfiles(form) {
    const roleId = form.elements.role.value;
    const role = ROLES[roleId];
    const usedNames = new Set(state.employees.map(person => `${person.role}:${person.name}`));
    const profiles = EMPLOYEE_ROSTER.filter(person => person.role === roleId && !usedNames.has(`${person.role}:${person.name}`));
    form.elements.profile.innerHTML = profiles.length ? profiles.map(person => `<option value="${escapeHtml(person.name)}">${escapeHtml(person.name)}${person.bonusDescription ? ` · ${escapeHtml(person.bonusDescription)}` : ""}</option>`).join("") : '<option value="">Все сотрудники этой роли уже в штате</option>';
    form.querySelector("#dev-employee-productivity-wrap").hidden = role?.kind !== "executor";
    form.querySelector("#dev-employee-legal-wrap").hidden = roleId !== "lawyer";
    updateDevEmployeeParameters(form);
  }

  function updateDevEmployeeParameters(form) {
    const roleId = form.elements.role.value;
    const profile = EMPLOYEE_ROSTER.find(person => person.role === roleId && person.name === form.elements.profile.value);
    if (!profile) return;
    form.elements.productivity.value = profile.productivity || ROLES[roleId].productivity || 1;
    form.elements.legalStrength.value = profile.legalStrength || 1;
    const salaryInput = form.querySelector("#dev-employee-salary");
    if (salaryInput) salaryInput.value = roleId === "lawyer" ? lawyerSalary(Number(form.elements.legalStrength.value)) : profile.salary;
  }
  function addDevProblem(category, houseName) {
    const home = managedHomeByName(houseName);
    if (!home) { showToast("Выбери дом, на который добавить проблему."); return; }
    let definition;
    if (category) definition = HOUSE_PROBLEMS.find(problem => problem.category === category);
    else {
      if (!state.problemDeck.length) state.problemDeck = makeProblemDeck();
      definition = HOUSE_PROBLEMS[state.problemDeck.pop()];
    }
    if (!definition) return;
    const problem = { id: `dev-problem-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, category: definition.category, wear: definition.wear, materialPurchased: false, repairProgress: {}, houseName: home.name, houseAddress: home.address };
    state.houseProblems.push(problem);
    updateHouseSafetyStatus();
    addLog(`DEV: добавлена проблема «${problem.category}», износ ${problem.wear}%, дом «${home.name}» (${home.address}).`);
    saveState(); render(); showToast(`Проблема добавлена на дом «${home.name}»: ${problem.category}`);
  }

  function solveDevProblems(problemId) {
    const problems = problemId === "all" ? [...state.houseProblems] : state.houseProblems.filter(problem => problem.id === problemId);
    if (!problems.length) { showToast("Нет проблем для решения."); return; }
    for (const problem of problems) {
      state.houseProblems = state.houseProblems.filter(item => item.id !== problem.id);
      if (!state.houseProblems.some(item => item.category === problem.category && item.houseName === problem.houseName)) state.reputation += 1;
    }
    updateHouseSafetyStatus();
    if (!state.houseProblems.length && state.phase === "problems") state.phase = "drawing";
    addLog(`DEV: бесплатно решено проблем ${problems.length}. Связанные заявки и компенсации остаются отдельными.`);
    saveState(); render(); showToast(`Бесплатно решено проблем: ${problems.length}`);
  }

  function runDevAction(action) {
    if (action === "reputation-up") state.reputation += 1;
    else if (action === "reputation-down") state.reputation -= 1;
    else if (action === "capital-up") changeCapital(10, "DEV: увеличение бюджета");
    else if (action === "capital-down") changeCapital(-10, "DEV: уменьшение бюджета");
    else if (["materials-down", "materials-zero", "materials-up"].includes(action)) {
      const before = state.materialStock;
      state.materialStock = action === "materials-zero" ? 0 : Math.max(0, before + (action === "materials-up" ? 10 : -10));
      const delta = state.materialStock - before;
      addLog(`DEV: склад материалов ${quantity(before)} → ${quantity(state.materialStock)} ед.`);
      saveState(); render(); showToast(`Склад: ${quantity(state.materialStock)} ед. (${delta > 0 ? "+" : ""}${quantity(delta)} ед.)`);
      return;
    }
    else if (action === "reroll-market") { state.pendingHireIds = []; state.market = makeMarket(state.employees); }
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
    if (costHint) costHint.textContent = type === "paid" ? `Цена подрядчика: зарплата категории + ${money(CONFIG.economy.contractorMarkup)} ₽; материалы не нужны` : `Цена подрядчика: зарплата категории + материалы + ${money(CONFIG.economy.contractorMarkup)} ₽`;
  }

  function renderMarket() {
    const cards = state.market.map(candidate => {
      const role = ROLES[candidate.role];
      const hired = state.pendingHireIds.includes(candidate.id);
      const alreadyEmployed = state.employees.some(employee => employee.role === candidate.role && employee.name === candidate.name);
      const roleStaffCount = state.employees.filter(employee => employee.role === candidate.role).length;
      const hireLimit = !hasHR() && !pendingHireHasHR() && state.pendingHireIds.filter(id => state.market.some(person => person.id === id && person.role !== "hr")).length >= CONFIG.rules.hiresWithoutHR && candidate.role !== "hr";
      const offeredSalary = candidate.salary * (state.phase === "preparation" ? CONFIG.rules.preparationSalaryMultiplier : 1) * (hasHR() || pendingHireHasHR() ? CONFIG.rules.probationSalaryMultiplier : 1);
      const heading = role.kind === "executor" ? `${role.name} · продуктивность ${candidate.productivity}` : `${role.name} · специалист${candidate.role === "lawyer" ? ` · ЮС ${candidate.legalStrength || 1}` : ""}`;
      return `<article class="worker-card ${hired ? "worker-selected" : ""} ${roleStaffCount ? "worker-has-incumbents" : ""}">${roleStaffCount ? `<span class="worker-incumbent-count">Уже есть в штате: ${quantity(roleStaffCount)}</span>` : ""}<div class="worker-icon">${role.icon}</div><div class="worker-info"><strong>${heading}</strong><span>${escapeHtml(candidate.name)}</span><span>Возраст: ${quantity(candidate.age || 0)} лет</span>${candidate.bonusDescription ? `<span>${escapeHtml(candidate.bonusDescription)}</span>` : ""}<span>ЗП: ${money(offeredSalary)} ₽ / ход${hasHR() || pendingHireHasHR() ? " · испытательный срок" : ""}</span></div><button class="hire-button" data-hire="${escapeHtml(candidate.id)}" ${alreadyEmployed || !( ["staffing", "preparation"].includes(state.phase)) || (!hired && hireLimit) ? "disabled" : ""}>${alreadyEmployed ? "Уже в штате" : hired ? "Убрать из пула" : state.phase === "preparation" ? "В стартовый штат" : "В пул найма"}</button></article>`;
    }).join("");
    const reroll = hasAvailableMarketReroll() || (hasEmployeeBonus("hr", "marketReroll") && state.phase === "staffing") ? `<button type="button" class="dev-wide-button market-reroll-button" data-hr-reroll ${hasAvailableMarketReroll() ? "" : "disabled"}>↻ Перебросить рынок труда (1 раз за ход)</button>` : "";
    elements.market.innerHTML = `${reroll}${cards}`;
    elements.market.querySelector("[data-hr-reroll]")?.addEventListener("click", rerollMarketByHR);
    elements.market.querySelectorAll("[data-hire]").forEach(button => button.addEventListener("click", () => toggleHire(button.dataset.hire)));
  }

  function renderTeam() {
    const employeeCards = new Map(state.employees.map(employee => {
      const role = ROLES[employee.role];
      const mood = moodOf(employee);
      const projectedMood = projectedWithholdingMood(employee);
      const probation = employee.probationTurns > 0 ? `<span class="probation-note">Испытательный срок · осталось ${employee.probationTurns} хода</span>` : "";
      const departure = employee.pendingDeparture;
      const status = employee.deceased ? "Умер · решение о последней зарплате" : departure ? departure.needsResponse ? departure.reason === "health" ? "Нужно решить вопрос с лечением" : departure.reason === "dissatisfaction" ? "Просит улучшить условия или уйти" : "Предложили работу в другом месте" : `Уходит после хода ${departure.turn}` : `Лояльность: ${loyaltyOf(employee)} · ${MOOD_LABELS[mood]}${employee.unpaidOvertime ? " · ждёт решения по премии" : ""}`;
      const currentSalary = effectiveSalary(employee);
      const years = Math.max(0, Number(employee.tenureOffsetYears) || 0) + Math.max(0, Math.floor((state.turn - (employee.hiredTurn || 1)) / (SEASONS.length * state.seasonDuration)));
      const pending = state.pendingFireActions[employee.id];
      const heading = role.kind === "executor" ? `${role.name} · продуктивность ${effectiveProductivity(employee)}/${employee.productivity}` : `${role.name} · специалист${employee.role === "lawyer" ? ` · ЮС ${employee.legalStrength || 1}` : ""}`;
      const detail = role.kind === "executor" ? `Назначено ${employee.assignedLabor} трудозатрат` : `Способность: ${role.detail}`;
      const adjustment = employee.withholdPercent || 0;
      const adjustmentKind = adjustment > 0 ? "Удержание" : adjustment < 0 ? "Премия" : "Без изменений";
      const retentionRaiseUsed = employee.retentionRaiseYear === state.year;
      const anchoredAdjustment = Number(employee.anchoredWithholdPercent) || 0;
      const withheldControl = !employee.deceased ? `<div class="withhold-control"><div class="withhold-slider-track"><div class="withhold-anchor-caption"><span><i>⚓</i> Постоянно</span><b>${anchoredAdjustment > 0 ? "Удержание" : anchoredAdjustment < 0 ? "Премия" : "Без изменений"} · ${Math.abs(anchoredAdjustment)}%</b></div><input class="withhold-range withhold-anchor-range" type="range" min="-50" max="50" step="1" value="${-anchoredAdjustment}" data-withhold-anchor="${escapeHtml(employee.id)}" aria-label="Постоянный процент удержания или премии"><div class="withhold-current-caption"><span>Ближайший ход</span><b><span class="withhold-adjustment-kind">${adjustmentKind}</span> · <span class="withhold-value">${Math.abs(adjustment)}</span>%</b></div><input class="withhold-range withhold-current-range" type="range" min="-50" max="50" step="1" value="${-adjustment}" data-withhold="${escapeHtml(employee.id)}" aria-label="Процент удержания или премии на ближайший ход"><button type="button" class="withhold-zero-marker" data-withhold-zero="${escapeHtml(employee.id)}" aria-label="Сбросить якорный и ближайший проценты в ноль">0</button></div><small class="withhold-mood-preview">После выплаты: ${projectedMood}</small></div>` : "";
      const individualWithheld = (employee.withheldAmount || 0) > 0 ? `<small class="withheld-employee-total">Удержано: ${money(employee.withheldAmount)} ₽</small><button type="button" class="pay-employee-withheld" data-pay-withheld-employee="${escapeHtml(employee.id)}" ${state.capital < employee.withheldAmount ? "disabled" : ""}>Выплатить этому сотруднику</button>` : "";
      const fireButtons = employee.deceased ? `<button class="fire-button ${pending === "paid" ? "selected" : ""}" data-fire="${escapeHtml(employee.id)}" data-pay="true" ${state.phase !== "staffing" ? "disabled" : ""}>${pending === "paid" ? "✓ " : ""}Выплатить последнюю зарплату</button><button class="fire-unpaid-button ${pending === "unpaid" ? "selected" : ""}" data-fire="${escapeHtml(employee.id)}" data-pay="false" ${state.phase !== "staffing" ? "disabled" : ""}>${pending === "unpaid" ? "✓ " : ""}Без выплаты</button>` : departure?.needsResponse && departure.reason === "health" ? `<button class="fire-button" data-treat-employee="${escapeHtml(employee.id)}">Лечение · ${money(currentSalary * 3)} ₽</button><button class="fire-unpaid-button" data-depart-offer="${escapeHtml(employee.id)}">Не лечить · уйдёт</button>` : departure?.needsResponse && departure.reason === "dissatisfaction" ? `<button class="fire-button" data-retain-loyal-employee="${escapeHtml(employee.id)}" data-premium="0">Выплатить удержания · шанс 50%</button><button class="fire-button" data-retain-loyal-employee="${escapeHtml(employee.id)}" data-premium="50">Удержания + премия 50% · шанс 100%</button><button class="fire-unpaid-button" data-depart-offer="${escapeHtml(employee.id)}">Отпустить</button>` : departure?.needsResponse && departure.reason === "lowReputation" ? `<button class="fire-button" data-stay-outside="${escapeHtml(employee.id)}">Оставить с повышением ЗП</button><button class="fire-unpaid-button" data-depart-offer="${escapeHtml(employee.id)}">Отпустить</button>` : departure?.needsResponse ? `<button class="fire-button" data-stay-offer="${escapeHtml(employee.id)}" ${retentionRaiseUsed ? "disabled title=\"Повышение зарплаты этому сотруднику уже предлагали в этом году\"" : ""}>${retentionRaiseUsed ? "Повышение уже было в этом году" : `Оставить · +${hasHR() ? 10 : CONFIG.rules.employeeRetentionSalaryIncreasePercent}% ЗП`}</button><button class="fire-unpaid-button" data-depart-offer="${escapeHtml(employee.id)}">Отпустить</button>` : pending ? `<button class="fire-button" data-fire-cancel="${escapeHtml(employee.id)}">Вернуть в штат</button>` : `<button class="fire-button" data-fire="${escapeHtml(employee.id)}" data-pay="true" ${state.phase !== "staffing" ? "disabled" : ""}>В пул · с выплатой</button><button class="fire-unpaid-button" data-fire="${escapeHtml(employee.id)}" data-pay="false" ${state.phase !== "staffing" ? "disabled" : ""}>В пул · без выплаты</button>`;
      const departureActions = departure?.needsResponse && departure.reason === "health" ? `<button class="fire-button" data-treat-employee="${escapeHtml(employee.id)}">Оплатить лечение · ${money(currentSalary * 3)} ₽</button><button class="fire-unpaid-button" data-depart-offer="${escapeHtml(employee.id)}">Не оплачивать · уйдёт</button>` : departure?.needsResponse && departure.reason === "dissatisfaction" ? `<button class="fire-button" data-retain-loyal-employee="${escapeHtml(employee.id)}" data-premium="0">Выплатить удержания</button><button class="fire-button" data-retain-loyal-employee="${escapeHtml(employee.id)}" data-premium="50">Премировать и удержать · +50%</button><button class="fire-unpaid-button" data-depart-offer="${escapeHtml(employee.id)}">Отпустить</button>` : fireButtons;
      const card = `<article class="team-member role-${role.kind} team-mood-${mood} ${employee.deceased ? "team-deceased" : ""} ${departure ? "team-departing" : ""} ${employee.probationTurns > 0 ? "team-probation" : ""} ${pending ? "team-pending-fire" : ""}"><div class="worker-icon">${employee.deceased ? "🕯️" : role.icon}</div><div class="worker-info"><strong>${heading}</strong><span>Роль: ${role.kind === "specialist" ? "Специалист" : "Исполнитель"}</span><span>${escapeHtml(employee.name || "Сотрудник")}</span><span>Возраст: ${quantity(employee.age || 0)} лет</span><span>ЗП: ${money(currentSalary)} ₽ / ход${employee.probationTurns > 0 ? " · половина ставки" : ""}</span><span>${detail}</span>${employee.bonusDescription ? `<span>${escapeHtml(employee.bonusDescription)}</span>` : ""}${probation}<span>${years} ${years === 1 ? "год" : years > 1 && years < 5 ? "года" : "лет"} в компании</span>${withheldControl}${individualWithheld}</div><span class="worker-status ${mood} ${employee.deceased ? "deceased" : departure ? "departing" : ""}">${pending && !employee.deceased ? `В пуле на увольнение · ${pending === "paid" ? "с выплатой" : "без выплаты"}` : status}</span><div class="fire-actions">${departureActions}</div></article>`;
      return [employee.id, card];
    }));
    const roleOrders = { specialist: ["lawyer", "accountant", "hr", "engineer", "marketer"], executor: ["plumber", "electrician", "handyman", "janitor"] };
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
    const withheld = state.withheldWages > 0 ? `<div class="withheld-wages-panel"><span>Удержанные зарплаты: <b>${money(state.withheldWages)} ₽</b></span><button type="button" id="pay-withheld-wages" ${state.capital < state.withheldWages ? "disabled" : ""}>Выплатить всё удержанное</button></div>` : "";
    elements.team.innerHTML = `${roleGroup("specialist", "СПЕЦИАЛИСТЫ")}${roleGroup("executor", "ИСПОЛНИТЕЛИ")}${withheld}`;
    elements.team.querySelectorAll("[data-fire]").forEach(button => button.addEventListener("click", () => fireEmployee(button.dataset.fire, button.dataset.pay === "true")));
    elements.team.querySelectorAll("[data-fire-cancel]").forEach(button => button.addEventListener("click", () => toggleFire(button.dataset.fireCancel, null)));
    elements.team.querySelectorAll("[data-withhold]").forEach(slider => slider.addEventListener("input", () => {
      const employee = state.employees.find(item => item.id === slider.dataset.withhold);
      const workerInfo = slider.closest(".worker-info");
      const adjustment = -Number(slider.value);
      workerInfo.querySelector(".withhold-value").textContent = Math.abs(adjustment);
      workerInfo.querySelector(".withhold-adjustment-kind").textContent = adjustment > 0 ? "Удержание" : adjustment < 0 ? "Премия" : "Без изменений";
      if (employee) workerInfo.querySelector(".withhold-mood-preview").textContent = `После выплаты: ${projectedWithholdingMood(employee, adjustment)}`;
      const retentionButton = slider.closest(".team-member")?.querySelector('[data-departure-reason="outsideOffer"]');
      if (employee && retentionButton) retentionButton.textContent = `Премировать и удержать · ${money(outsideOfferRetentionPayment(employee, adjustment))} ₽ · шанс 50%`;
    }));
    elements.team.querySelectorAll("[data-withhold]").forEach(slider => slider.addEventListener("change", () => {
      const employee = state.employees.find(item => item.id === slider.dataset.withhold);
      if (!employee) return;
      employee.withholdPercent = -Number(slider.value); saveState(); render();
    }));
    elements.team.querySelectorAll("[data-withhold-anchor]").forEach(slider => slider.addEventListener("input", () => {
      const employee = state.employees.find(item => item.id === slider.dataset.withholdAnchor);
      if (!employee) return;
      const value = -Number(slider.value);
      const caption = slider.closest(".withhold-control").querySelector(".withhold-anchor-caption b");
      caption.textContent = `${value > 0 ? "Удержание" : value < 0 ? "Премия" : "Без изменений"} · ${Math.abs(value)}%`;
    }));
    elements.team.querySelectorAll("[data-withhold-anchor]").forEach(slider => slider.addEventListener("change", () => {
      const employee = state.employees.find(item => item.id === slider.dataset.withholdAnchor);
      if (!employee) return;
      employee.anchoredWithholdPercent = -Number(slider.value); saveState(); render();
    }));
    elements.team.querySelectorAll("[data-withhold-zero]").forEach(button => button.addEventListener("click", () => {
      const employee = state.employees.find(item => item.id === button.dataset.withholdZero);
      if (!employee) return;
      employee.anchoredWithholdPercent = 0; employee.withholdPercent = 0;
      saveState(); render();
    }));
    elements.team.querySelectorAll("[data-stay-offer]").forEach(button => {
      button.addEventListener("click", () => respondToOutsideOffer(button.dataset.stayOffer, true));
      const employee = state.employees.find(item => item.id === button.dataset.stayOffer);
      const payout = employee ? outsideOfferRetentionPayment(employee) : 0;
      button.insertAdjacentHTML("afterend", `<button class="fire-button" data-retain-loyal-employee="${escapeHtml(button.dataset.stayOffer)}" data-departure-reason="outsideOffer" data-premium="50">Премировать и удержать · ${money(payout)} ₽ · шанс 50%</button>`);
    });
    elements.team.querySelectorAll("[data-stay-outside]").forEach(button => button.addEventListener("click", () => respondToOutsideOffer(button.dataset.stayOutside, true)));
    elements.team.querySelectorAll("[data-treat-employee]").forEach(button => button.addEventListener("click", () => resolveHealthDeparture(button.dataset.treatEmployee, true)));
    elements.team.querySelectorAll("[data-retain-loyal-employee]").forEach(button => button.addEventListener("click", () => resolveDissatisfactionDeparture(button.dataset.retainLoyalEmployee, Number(button.dataset.premium), button.dataset.departureReason || "dissatisfaction")));
    elements.team.querySelectorAll("[data-depart-offer]").forEach(button => button.addEventListener("click", () => respondToOutsideOffer(button.dataset.departOffer, false)));
    document.getElementById("pay-withheld-wages")?.addEventListener("click", payWithheldWages);
    elements.team.querySelectorAll("[data-pay-withheld-employee]").forEach(button => button.addEventListener("click", () => payEmployeeWithheldWages(button.dataset.payWithheldEmployee)));
  }

  function renderRosterReference() {
    if (!elements.rosterReference) return;
    elements.rosterReference.innerHTML = EMPLOYEE_ROSTER.map(person => {
      const role = ROLES[person.role];
      return `<tr><td>${role.name}</td><td>${escapeHtml(person.name)}${person.bonusDescription ? `<br><small>${escapeHtml(person.bonusDescription)}</small>` : ""}</td><td>${person.role === "lawyer" ? `ЮС ${person.legalStrength}` : person.productivity ? `${person.productivity} трудозатрат` : "—"}</td><td>${money(person.salary)} ₽ / ход</td></tr>`;
    }).join("");
  }

  function compensationStatusText(claim) {
    if (claim.paid) return claim.paidBy === "developer" ? "Оплачена застройщиком" : claim.paidBy === "settlement" ? "Мирное соглашение · оплачено" : claim.paidBy === "court" ? "Решение суда · оплачено" : "Выплачена";
    if (claim.writtenOff) return claim.status === "expired" ? "Срок претензии истёк · списана" : "Списана при банкротстве";
    if (claim.amount <= 0) return "Снята юристом";
    if (claim.status === "court" && claim.courtStage === "payment") return `Решение суда · оплатить за ${Math.max(0, claim.paymentDeadlineTurn - state.turn)} ходов`;
    if (claim.status === "court") return `В суде · решение ожидается за ${Math.max(0, claim.trialDeadlineTurn - state.turn)} ходов`;
    return `Досудебная претензия · ${Math.max(0, claim.pretrialDeadlineTurn - state.turn)} ходов на соглашение`;
  }

  function renderPenalties() {
    const fines = [...state.penalties].reverse().map(penalty => {
    const status = penalty.paid ? "Выплачен" : penalty.writtenOff ? "Списан" : penalty.lawyerCleared ? "Снят юристом" : penalty.reducedByLawyer ? "Снижен юристом · к оплате" : penalty.devStatus === "court" ? "В суде" : penalty.devStatus === "pretrial" ? "Досудебная претензия" : penalty.devStatus === "payment" ? "Решение суда · срок выплаты" : "К выплате";
      const address = penalty.houseAddress || managedHomeByName(penalty.houseName)?.address;
      const sourceTitle = penalty.source === "fraud" ? "Штраф · проигранный суд по дому" : "Штраф · трудовая инспекция";
      const description = penalty.source === "fraud" ? `Изъятие дома «${escapeHtml(penalty.houseName)}» · год ${penalty.year}` : `${address ? `Адрес: ${escapeHtml(address)} · ` : ""}Последняя зарплата ${money(penalty.salary)} ₽ × 3 · год ${penalty.year}`;
      const html = `<article class="penalty-row ${penalty.paid ? "penalty-paid" : penalty.writtenOff ? "penalty-written-off" : "penalty-due"}"><div class="penalty-icon">${penalty.paid ? "✓" : penalty.writtenOff ? "↺" : "!"}</div><div class="penalty-info"><strong>${sourceTitle} · ${escapeHtml(penalty.employeeName)}</strong><span>${description}${penalty.reducedByLawyer ? ` · исходно ${money(penalty.originalAmount)} ₽` : ""}</span></div><b class="penalty-amount">${money(penalty.amount)} ₽</b><span class="penalty-status">${status}</span>${!penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared ? `<button class="pay-penalty-button" type="button" data-penalty="${escapeHtml(penalty.id)}" ${state.phase === "bankruptcy" || state.capital < penalty.amount ? "disabled" : ""}>Выплатить</button>` : ""}</article>`;
      return { paid: Boolean(penalty.paid), writtenOff: Boolean(penalty.writtenOff), html };
    });
    const compensations = [...state.compensations].reverse().map(claim => {
      const status = compensationStatusText(claim);
      const address = claim.houseAddress || managedHomeByName(claim.houseName)?.address;
      const canNegotiate = claim.status === "pretrial" && !claim.paid && !claim.writtenOff && claim.amount > 0;
      const minOffer = Math.max(10, Math.min(100, claim.lastOfferPercent || 10));
      const canTryNow = claim.lastOfferTurn !== state.turn;
      const html = (includeActions, includePay = true) => {
        const offerAmount = Math.round(claim.amount * minOffer) / 100;
      const negotiation = includeActions && canNegotiate ? `<div class="settlement-control"><label>Предложение: <b class="settlement-offer-percent">${minOffer}%</b> · <b class="settlement-offer-amount">${money(offerAmount)} ₽</b> · шанс: <b class="settlement-offer-chance">${minOffer}%</b></label><input class="settlement-slider" type="range" min="${minOffer}" max="100" step="1" value="${minOffer}" data-compensation-id="${escapeHtml(claim.id)}" data-claim-amount="${claim.amount}" aria-label="Процент предложения по компенсации"><button class="settlement-button" type="button" data-settle="${escapeHtml(claim.id)}" data-percent="${minOffer}" ${state.phase === "bankruptcy" || !canTryNow ? "disabled" : ""}>${canTryNow ? "Договориться" : "Повторить можно со следующего хода"}</button><small>При отказе повторная попытка будет доступна в следующем ходу; опустить предложение ниже ${minOffer}% уже нельзя.</small></div>` : "";
        const courtNotice = includeActions && claim.status === "pretrial" ? `<small class="compensation-court-notice">При подаче заявителем в суд к сумме прибавится 50%.</small>` : "";
        return `<article class="penalty-row penalty-compensation ${claim.paid ? "penalty-paid" : claim.writtenOff ? "penalty-written-off" : ""}"><div class="penalty-icon">◇</div><div class="penalty-info"><strong>Компенсация · ${escapeHtml(claim.title)}</strong><span>${address ? `Адрес: ${escapeHtml(address)} · ` : ""}ущерб по аварийной заявке${claim.reducedByLawyer ? ` · исходно ${money(claim.originalAmount)} ₽` : ""}</span>${courtNotice}</div><b class="penalty-amount">${money(claim.amount)} ₽</b><span class="penalty-status">${status}</span>${includePay && !claim.paid && !claim.writtenOff && claim.amount > 0 ? `<button class="pay-penalty-button" type="button" data-compensation="${escapeHtml(claim.id)}" ${state.phase === "bankruptcy" || state.capital < claim.amount ? "disabled" : ""}>Выплатить</button>` : ""}${negotiation}</article>`;
      };
      return { paid: Boolean(claim.paid), writtenOff: Boolean(claim.writtenOff), html };
    });
    const courtRows = state.legalCases.map(caseFile => {
      const status = caseFile.status === "won" ? "Иск выигран · дом остаётся" : caseFile.status === "lost" ? "Иск проигран" : `В суде · осталось ${Math.max(0, caseFile.deadlineTurn - state.turn)} ходов`;
      const resolved = caseFile.status !== "trial";
      const filedDate = caseFile.filedTurn === undefined ? "Дата не указана" : courtDateLabel(caseFile.filedTurn, caseFile.filedYear, caseFile.filedSeasonIndex, caseFile.filedSeasonTurnIndex);
      const resolvedDate = resolved ? (caseFile.resolvedTurn === undefined ? "Дата не указана" : courtDateLabel(caseFile.resolvedTurn, caseFile.resolvedYear, caseFile.resolvedSeasonIndex, caseFile.resolvedSeasonTurnIndex)) : "";
      const dateInfo = resolved ? `Начало: ${filedDate} · Окончание: ${resolvedDate}` : `Начало: ${filedDate}`;
      const html = `<article class="penalty-row penalty-court-case ${resolved ? "penalty-court-completed" : ""}"><div class="penalty-icon">§</div><div class="penalty-info"><strong>Суд по спору о доме · ${escapeHtml(caseFile.houseName)}</strong><span>Адрес: ${escapeHtml(caseFile.houseAddress)} · спор из-за подделки подписей</span><span>${dateInfo}</span></div><b class="penalty-amount">—</b><span class="penalty-status">${status}</span></article>`;
      return { active: !resolved, completed: resolved, resolvedTurn: Number.isInteger(caseFile.resolvedTurn) ? caseFile.resolvedTurn : -1, paid: false, writtenOff: false, html };
    });
    const allRows = [...fines, ...compensations, ...courtRows.filter(row => row.active)];
    const completedCourtRows = courtRows.filter(row => row.completed).sort((a, b) => b.resolvedTurn - a.resolvedTurn);
    const activeRows = allRows.filter(row => !row.paid && !row.writtenOff && row.active !== false);
    const hiddenPaid = allRows.filter(row => row.paid).length;
    const hiddenWrittenOff = allRows.filter(row => row.writtenOff && !row.paid).length;
    const fullRows = allRows.filter(row => row.paid ? showPaidPenalties : !row.writtenOff || showWrittenOffPenalties);
    if (showCompletedCourts) fullRows.push(...completedCourtRows);
    const dueTotal = unpaidFineTotal() + unpaidCompensationTotal();
    const contestableFineTotal = state.penalties.filter(item => !item.paid && !item.writtenOff && !item.lawyerCleared && !(item.contestedBy || []).length).reduce((sum, item) => sum + item.amount, 0);
    const contestableCompensationTotal = state.compensations.filter(item => !item.paid && !item.writtenOff && item.amount > 0 && item.status === "court" && item.courtStage === "trial" && !(item.contestedBy || []).length).reduce((sum, item) => sum + item.amount, 0);
    const contestableTotal = activeLawyers().length ? contestableFineTotal + contestableCompensationTotal : 0;
    if (elements.compactPenaltyTotal) elements.compactPenaltyTotal.textContent = `К выплате: ${money(dueTotal)} ₽`;
    if (elements.compactPenaltyContestable) elements.compactPenaltyContestable.textContent = `Можно оспорить: ${money(contestableTotal)} ₽`;
    if (elements.compactPenaltyMarker) elements.compactPenaltyMarker.hidden = contestableTotal <= 0;
    const fullEmpty = allRows.length === 0 && completedCourtRows.length === 0 ? "Судебных дел и обязательств пока нет." : `Оплаченные скрыты (${hiddenPaid}); списанные скрыты (${hiddenWrittenOff}).`;
    const compactEmpty = activeRows.length === 0 ? "Нет действующих судов и обязательств." : "";
    const paintList = (container, rows, empty, includeActions, includePay) => {
      if (!container) return;
      container.innerHTML = rows.length ? rows.map(row => typeof row.html === "function" ? row.html(includeActions, includePay) : row.html).join("") : `<div class="penalties-empty">${empty}</div>`;
      container.querySelectorAll("[data-penalty]").forEach(button => button.addEventListener("click", () => payPenalty(button.dataset.penalty)));
      container.querySelectorAll("[data-compensation]").forEach(button => button.addEventListener("click", () => payCompensation(button.dataset.compensation)));
      container.querySelectorAll("[data-settle]").forEach(button => button.addEventListener("click", () => settleCompensation(button.dataset.settle, Number(button.dataset.percent))));
      container.querySelectorAll(".settlement-slider").forEach(slider => slider.addEventListener("input", () => {
        const row = slider.closest(".penalty-row");
        const percent = Number(slider.value);
        row.querySelector(".settlement-offer-percent").textContent = `${percent}%`;
        row.querySelector(".settlement-offer-chance").textContent = `${percent}%`;
        row.querySelector(".settlement-offer-amount").textContent = `${money(Math.round(Number(slider.dataset.claimAmount) * percent) / 100)} ₽`;
        row.querySelector("[data-settle]").dataset.percent = String(percent);
      }));
    };
    paintList(elements.penalties, fullRows, fullEmpty, true, true);
    paintList(elements.penaltiesCompact, activeRows, compactEmpty, true, true);
    const toggle = document.getElementById("toggle-paid-penalties");
    if (toggle) {
      toggle.textContent = showPaidPenalties ? "Скрыть оплаченные" : "Показать оплаченные";
      toggle.hidden = hiddenPaid === 0;
      toggle.onclick = () => { showPaidPenalties = !showPaidPenalties; renderPenalties(); };
    }
    const writtenOffToggle = document.getElementById("toggle-writtenoff-penalties");
    if (writtenOffToggle) {
      writtenOffToggle.textContent = showWrittenOffPenalties ? "Скрыть списанные" : "Показать списанные";
      writtenOffToggle.hidden = hiddenWrittenOff === 0;
      writtenOffToggle.onclick = () => { showWrittenOffPenalties = !showWrittenOffPenalties; renderPenalties(); };
    }
    const completedCourtsToggle = document.getElementById("toggle-completed-courts");
    if (completedCourtsToggle) {
      completedCourtsToggle.textContent = showCompletedCourts ? "Скрыть завершенные суды" : "Показать завершенные суды";
      completedCourtsToggle.hidden = completedCourtRows.length === 0;
      completedCourtsToggle.onclick = () => { showCompletedCourts = !showCompletedCourts; renderPenalties(); };
    }
  }

  function renderLegalPanel() {
    const reductionTargets = [
      ...state.penalties.filter(penalty => !penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared).map(penalty => ({ type: "fine", id: penalty.id, title: `Штраф инспекции · ${penalty.employeeName}`, amount: penalty.amount, contestedBy: penalty.contestedBy || [] })),
      ...state.compensations.filter(claim => !claim.paid && !claim.writtenOff && claim.amount > 0 && claim.status === "court" && claim.courtStage === "trial").map(claim => ({ type: "compensation", id: claim.id, title: `Компенсация · ${claim.title}`, amount: claim.amount, contestedBy: claim.contestedBy || [] }))
    ];
    const lawyers = activeLawyers();
    const engineers = activeEmployees().filter(employee => employee.role === "engineer" && !state.engineerMaterialsUsed.includes(employee.id));
    const lawyerBlocks = lawyers.map((lawyer, number) => {
      const done = state.lawyerActionsUsed.includes(lawyer.id);
      if (done || !lawyerHasAvailableTask(lawyer)) return "";
      const debtLimit = lawyerDebtLimit(lawyer);
      const reductionRange = lawyerReductionRange(lawyer);
      const debt = state.houseDebtRecoverable > 0 ? `<article class="legal-option"><div><strong>Взыскать долг с дома · ЮС ${lawyer.legalStrength}</strong><span>До ${money(Math.min(debtLimit, state.houseDebtRecoverable))} ₽ · взыскиваемый долг ${money(state.houseDebtRecoverable)} ₽</span></div><button type="button" class="legal-action-button" data-lawyer="debt" data-lawyer-id="${escapeHtml(lawyer.id)}" ${done ? "disabled" : ""}>Взыскать</button></article>` : "";
      const claims = reductionTargets.filter(target => target.type === "fine" && target.contestedBy.length === 0).map(target => `<article class="legal-option"><div><strong>${escapeHtml(target.title)}</strong><span>ЮС ${lawyer.legalStrength} · снижение ${reductionRange[0]}–${reductionRange[1]}% с вероятностью ${Math.round(CONFIG.rules.lawyerReductionSuccessChance * 100)}% · сумма ${money(target.amount)} ₽</span></div><button type="button" class="legal-action-button" data-lawyer="reduce" data-lawyer-id="${escapeHtml(lawyer.id)}" data-target-type="${target.type}" data-target-id="${escapeHtml(target.id)}">Оспорить</button></article>`).join("");
      const courtClaims = state.compensations.filter(claim => !claim.paid && !claim.writtenOff && claim.status === "court" && claim.courtStage === "trial" && (!(claim.contestedBy || []).length || claim.lastDelayTurn !== state.turn)).map(claim => {
        const reduction = CONFIG.rules.compensationDelayChanceDropByLegalStrength?.[Math.max(1, Math.min(3, lawyer.legalStrength || 1)) - 1] ?? [0.3, 0.2, 0.1][Math.max(1, Math.min(3, lawyer.legalStrength || 1)) - 1];
        const chance = Math.max(0, (CONFIG.rules.compensationDelayBaseChance ?? 0.9) - claim.delayCount * reduction);
        const contested = (claim.contestedBy || []).length > 0;
        const contestButton = contested ? "" : `<button type="button" class="legal-action-button" data-lawyer="reduce" data-lawyer-id="${escapeHtml(lawyer.id)}" data-target-type="compensation" data-target-id="${escapeHtml(claim.id)}">Оспорить</button>`;
        const delayButton = claim.lastDelayTurn === state.turn ? "" : `<button type="button" class="legal-action-button" data-lawyer-delay="${escapeHtml(claim.id)}" data-lawyer-id="${escapeHtml(lawyer.id)}">Отложить</button>`;
        return `<article class="legal-option"><div><strong>Компенсация · ${escapeHtml(claim.title)}</strong><span>ЮС ${lawyer.legalStrength} · сумма ${money(claim.amount)} ₽ · снижение ${reductionRange[0]}–${reductionRange[1]}% с вероятностью ${Math.round(CONFIG.rules.lawyerReductionSuccessChance * 100)}% · перенос ${Math.round(chance * 100)}% · переносы: ${claim.delayCount}</span></div><div class="legal-actions-inline">${contestButton}${delayButton}</div></article>`;
      }).join("");
      const forgedCases = state.legalCases.filter(caseFile => caseFile.status === "trial" && (caseFile.lastWinAttemptTurn !== state.turn || caseFile.lastDelayTurn !== state.turn)).map(caseFile => {
        const strengthIndex = Math.max(1, Math.min(3, lawyer.legalStrength || 1)) - 1;
        const chanceDrop = CONFIG.rules.compensationDelayChanceDropByLegalStrength?.[strengthIndex] ?? [0.3, 0.2, 0.1][strengthIndex];
        const delayChance = Math.max(0, (CONFIG.rules.badGameDelayBaseChance ?? 0.9) - caseFile.delayCount * chanceDrop);
        const winChance = CONFIG.rules.badGameCourtWinChance ?? 0.05;
        const win = caseFile.lastWinAttemptTurn === state.turn ? "" : `<button type="button" class="legal-action-button" data-fraud-win="${escapeHtml(caseFile.id)}" data-lawyer-id="${escapeHtml(lawyer.id)}">Попробовать выиграть · ${Math.round(winChance * 100)}%</button>`;
        const delay = caseFile.lastDelayTurn === state.turn ? "" : `<button type="button" class="legal-action-button" data-fraud-delay="${escapeHtml(caseFile.id)}" data-lawyer-id="${escapeHtml(lawyer.id)}">Отложить · ${Math.round(delayChance * 100)}%</button>`;
        return `<article class="legal-option"><div><strong>Спор о доме «${escapeHtml(caseFile.houseName)}»</strong><span>${escapeHtml(caseFile.houseAddress)} · ЮС ${lawyer.legalStrength} · срок до 1 года · переносы: ${caseFile.delayCount}</span></div><div class="legal-case-actions">${win}${delay}</div></article>`;
      }).join("");
      return `<section class="lawyer-task"><h3>${escapeHtml(ROLES[lawyer.role].name)} ${number + 1} · выбери одну задачу</h3>${debt}${claims}${courtClaims}${forgedCases}</section>`;
    }).join("");
    const engineerBlocks = engineers.map(engineer => {
      const used = state.engineerMaterialsUsed.includes(engineer.id);
      const maxUnits = Math.max(1, Math.floor(CONFIG.economy.engineerMaterialPurchaseUnits || 20));
      const amount = maxUnits;
      const price = amount * materialUnitCost(true);
      return `<article class="legal-option engineer-material-option"><div><strong>Инженер ${escapeHtml(engineer.name)} · закупить материалы</strong><span>До ${maxUnits} ед. по себестоимости · ${money(materialUnitCost(true))} ₽/ед. · запас сейчас ${quantity(state.materialStock)} ед.</span></div><label class="engineer-quantity-label">Количество: <output data-engineer-units>${amount}</output> ед.<input type="range" min="1" max="${maxUnits}" step="1" value="${amount}" data-engineer-quantity aria-label="Количество закупаемого материала"></label><button type="button" class="legal-action-button" data-engineer-buy="${escapeHtml(engineer.id)}" ${used || state.capital < price ? "disabled" : ""}>Купить</button><strong class="engineer-total-cost" data-engineer-total>Итого: ${money(price)} ₽</strong></article>`;
    }).join("");
    elements.legalPanel.innerHTML = `${lawyers.some(lawyer => !state.lawyerActionsUsed.includes(lawyer.id) && lawyerHasAvailableTask(lawyer)) ? `<div class="legal-heading"><div><p class="section-label">ЗАДАЧИ ЮРИСТАМ</p><h2>Одно поручение на каждого юриста</h2></div><span class="legal-mark">§</span></div><p class="legal-copy">Штрафы можно только оспорить. По компенсации в суде юрист может оспорить сумму или один раз за ход попытаться отложить заседание. Одно обязательство можно оспорить только один раз.</p><div class="legal-options">${lawyerBlocks}</div>` : ""}${engineers.length ? `<div class="legal-heading engineer-material-heading"><div><p class="section-label">ДЕЙСТВИЕ ИНЖЕНЕРА</p><h2>Закупить материалы по себестоимости</h2></div><span class="legal-mark">⚙</span></div><div class="legal-options">${engineerBlocks}</div>` : ""}${lawyers.length && lawyersDone() ? '<div class="legal-complete">Все доступные поручения выполнены. Переходи к выплате зарплат.</div>' : ""}`;
    elements.legalPanel.querySelectorAll('[data-lawyer="debt"]').forEach(button => button.addEventListener("click", () => collectHouseDebt(button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll('[data-lawyer="reduce"]').forEach(button => button.addEventListener("click", () => reduceLiability(button.dataset.targetType, button.dataset.targetId, button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll("[data-lawyer-delay]").forEach(button => button.addEventListener("click", () => postponeCompensationCase(button.dataset.lawyerDelay, button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll("[data-fraud-win]").forEach(button => button.addEventListener("click", () => tryWinForgedHouseCase(button.dataset.fraudWin, button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll("[data-fraud-delay]").forEach(button => button.addEventListener("click", () => postponeForgedHouseCase(button.dataset.fraudDelay, button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll("[data-engineer-quantity]").forEach(input => input.addEventListener("input", () => {
      const row = input.closest(".legal-option");
      const units = Number(input.value);
      const cost = units * materialUnitCost(true);
      row.querySelector("[data-engineer-units]").textContent = quantity(units);
      row.querySelector("[data-engineer-total]").textContent = `Итого: ${money(cost)} ₽`;
      const button = row.querySelector("[data-engineer-buy]");
      button.disabled = state.engineerMaterialsUsed.includes(button.dataset.engineerBuy) || state.capital < cost;
    }));
    elements.legalPanel.querySelectorAll("[data-engineer-buy]").forEach(button => button.addEventListener("click", () => buyEngineerMaterials(button.dataset.engineerBuy, Number(button.closest(".legal-option").querySelector("[data-engineer-quantity]")?.value))));
  }

  function buyEngineerMaterials(engineerId, units) {
    const engineer = activeEmployees().find(employee => employee.id === engineerId && employee.role === "engineer");
    const maxUnits = Math.max(1, Math.floor(CONFIG.economy.engineerMaterialPurchaseUnits || 20));
    if (state.phase !== "legal" || !engineer || state.engineerMaterialsUsed.includes(engineerId) || !Number.isInteger(units) || units < 1 || units > maxUnits) return;
    const unitCost = materialUnitCost(true);
    const cost = units * unitCost;
    if (state.capital < cost) { showToast(`На закупку ${units} ед. нужно ${money(cost)} ₽.`); return; }
    if (!changeCapital(-cost, "закупка материалов инженером")) return;
    state.materialStock += units;
    state.engineerMaterialsUsed.push(engineerId);
    state.seasonFinancials.materials += cost;
    addLog(`Инженер ${engineer.name} закупил ${quantity(units)} ед. материалов по себестоимости ${money(unitCost)} ₽/ед. Запас: ${quantity(state.materialStock)} ед.; расход: ${money(cost)} ₽.`);
    saveState(); render(); showToast(`Инженер закупил ${quantity(units)} ед. материалов.`);
  }

  function lawyerSalary(legalStrength) { return CONFIG.rules.lawyerSalaryByStrength[Math.max(1, Math.min(3, legalStrength || 1)) - 1]; }
  function lawyerDebtLimit(lawyer) { return CONFIG.rules.lawyerDebtLimitByStrength[Math.max(1, Math.min(3, lawyer.legalStrength || 1)) - 1]; }
  function lawyerReductionRange(lawyer) { return CONFIG.rules.lawyerReductionRangeByStrength[Math.max(1, Math.min(3, lawyer.legalStrength || 1)) - 1]; }

  function collectHouseDebt(lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId) || !activeLawyers().some(employee => employee.id === lawyerId) || state.houseDebtRecoverable <= 0) return;
    const lawyer = activeLawyers().find(employee => employee.id === lawyerId);
    const recovered = Math.min(lawyerDebtLimit(lawyer), state.houseDebtRecoverable);
    if (!changeCapital(recovered, "взыскание долга юристом")) return;
    let remaining = recovered;
    const recoveredHomes = [];
    managedHomes().forEach(home => {
      const amount = Math.min(remaining, home.debtRecoverable || 0);
      if (amount <= 0) return;
      setHomeField(home, "debtRecoverable", home.debtRecoverable - amount);
      remaining -= amount;
      recoveredHomes.push(`${home.address}: ${money(amount)} ₽`);
    });
    refreshPortfolioTotals();
    markLawyerDone(lawyerId);
    addLog(`Юрист ${lawyer.name} (ЮС ${lawyer.legalStrength}) взыскал ${money(recovered)} ₽ долгов: ${recoveredHomes.join("; ")}; предел взыскания ${money(lawyerDebtLimit(lawyer))} ₽.`);
    saveState(); render(); showToast(`Юрист взыскал ${money(recovered)} ₽`);
  }

  function reduceLiability(targetType, targetId, lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId) || !activeLawyers().some(employee => employee.id === lawyerId)) return;
    const fine = targetType === "fine" ? state.penalties.find(item => item.id === targetId && !item.paid && !item.writtenOff && !item.lawyerCleared) : null;
    const claim = targetType === "compensation" ? state.compensations.find(item => item.id === targetId && !item.paid && !item.writtenOff && item.amount > 0 && item.status === "court" && item.courtStage === "trial") : null;
    const currentAmount = fine ? fine.amount : claim ? claim.amount : 0;
    const liability = fine || claim;
    if (!currentAmount || (liability.contestedBy || []).length > 0) return;
    liability.contestedBy = [lawyerId];
    markLawyerDone(lawyerId);
    const lawyer = activeLawyers().find(employee => employee.id === lawyerId);
    const [minReduction, maxReduction] = lawyerReductionRange(lawyer);
    const legalLog = [`Юрист ${lawyer.name} (ЮС ${lawyer.legalStrength}) оспаривает ${fine ? "штраф" : "компенсацию"} ${money(currentAmount)} ₽: шанс успеха ${Math.round(CONFIG.rules.lawyerReductionSuccessChance * 100)}%, возможное снижение ${minReduction}–${maxReduction}%.`];
    if (Math.random() < CONFIG.rules.lawyerReductionSuccessChance) {
      const reductionPercent = minReduction + Math.floor(Math.random() * (maxReduction - minReduction + 1));
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
      legalLog.push(`Результат: снижение ${reductionPercent}% (−${money(reduction)} ₽); остаток ${money(currentAmount - reduction)} ₽.`);
      addLogSequence(legalLog);
      saveState(); render(); showToast(`Успех: сумма снижена на ${money(reduction)} ₽`);
    } else {
      legalLog.push("Результат: попытка не удалась, сумма не изменилась.");
      addLogSequence(legalLog);
      saveState(); render(); showToast("Оспаривание не удалось.");
    }
  }

  function skipLawyerAction(lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId)) return;
    markLawyerDone(lawyerId);
    addLog(`Игрок пропустил поручение юриста ${roleName("lawyer")}.`);
    saveState(); render();
  }

  function postponeCompensationCase(claimId, lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId)) return;
    const lawyer = activeLawyers().find(employee => employee.id === lawyerId);
    const claim = state.compensations.find(item => item.id === claimId && !item.paid && !item.writtenOff && item.status === "court" && item.courtStage === "trial" && item.lastDelayTurn !== state.turn);
    if (!lawyer || !claim) return;
    const strengthIndex = Math.max(1, Math.min(3, lawyer.legalStrength || 1)) - 1;
    const chanceDrop = CONFIG.rules.compensationDelayChanceDropByLegalStrength?.[strengthIndex] ?? [0.3, 0.2, 0.1][strengthIndex];
    const chance = Math.max(0, (CONFIG.rules.compensationDelayBaseChance ?? 0.9) - claim.delayCount * chanceDrop);
    claim.lastDelayTurn = state.turn;
    markLawyerDone(lawyerId);
    if (Math.random() < chance) {
      claim.delayCount += 1;
      claim.trialDeadlineTurn += 1;
      addLog(`Юрист ${lawyer.name} (ЮС ${lawyer.legalStrength}) отложил рассмотрение компенсации «${claim.title}» с вероятностью ${Math.round(chance * 100)}%. Следующее заседание перенесено на следующий ход; шанс следующего переноса уменьшен на ${Math.round(chanceDrop * 100)} п.п.`);
      saveState(); render(); showToast("Судебное дело отложено на следующий ход.");
    } else {
      addLog(`Юрист ${lawyer.name} (ЮС ${lawyer.legalStrength}) не смог отложить дело по компенсации «${claim.title}» (${Math.round(chance * 100)}% шанс).`);
      saveState(); render(); showToast("Судебное заседание не удалось перенести.");
    }
  }

  function tryWinForgedHouseCase(caseId, lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId)) return;
    const lawyer = activeLawyers().find(item => item.id === lawyerId);
    const caseFile = state.legalCases.find(item => item.id === caseId && item.status === "trial" && item.lastWinAttemptTurn !== state.turn);
    if (!lawyer || !caseFile) return;
    caseFile.lastWinAttemptTurn = state.turn; markLawyerDone(lawyerId);
    const chance = CONFIG.rules.badGameCourtWinChance ?? 0.05;
    const won = Math.random() < chance;
    if (won) resolveForgedHouseCase(caseFile, true);
    else {
      addLog(`Юрист ${lawyer.name} (ЮС ${lawyer.legalStrength}) не смог выиграть спор о доме «${caseFile.houseName}»; шанс был ${Math.round(chance * 100)}%. Дело считается проигранным.`);
      resolveForgedHouseCase(caseFile, false);
    }
    saveState(); render(); showToast(won ? `Суд выигран: дом «${caseFile.houseName}» остаётся в управлении.` : "Иск проигран: дом изъят, назначен штраф 200 ₽.");
  }

  function postponeForgedHouseCase(caseId, lawyerId) {
    if (state.phase !== "legal" || state.lawyerActionsUsed.includes(lawyerId)) return;
    const lawyer = activeLawyers().find(item => item.id === lawyerId);
    const caseFile = state.legalCases.find(item => item.id === caseId && item.status === "trial" && item.lastDelayTurn !== state.turn);
    if (!lawyer || !caseFile) return;
    const strengthIndex = Math.max(1, Math.min(3, lawyer.legalStrength || 1)) - 1;
    const reduction = CONFIG.rules.compensationDelayChanceDropByLegalStrength?.[strengthIndex] ?? [0.3, 0.2, 0.1][strengthIndex];
    const chance = Math.max(0, (CONFIG.rules.badGameDelayBaseChance ?? 0.9) - caseFile.delayCount * reduction);
    caseFile.lastDelayTurn = state.turn; markLawyerDone(lawyerId);
    const delayed = Math.random() < chance;
    if (delayed) { caseFile.delayCount += 1; caseFile.deadlineTurn += 1; addLog(`Юрист ${lawyer.name} (ЮС ${lawyer.legalStrength}) отложил суд по дому «${caseFile.houseName}» (${Math.round(chance * 100)}%); дело перенесено на следующий ход, шанс следующего переноса снижен на ${Math.round(reduction * 100)} п.п.`); }
    else addLog(`Юрист ${lawyer.name} не смог отложить суд по дому «${caseFile.houseName}»; шанс был ${Math.round(chance * 100)}%.`);
    saveState(); render(); showToast(delayed ? "Судебное дело отложено на следующий ход." : "Не удалось отложить судебное дело.");
  }

  function renderRequests() {
    const priority = card => card.resolved || card.cancelled ? 3 : card.type === "paid" ? 0 : isEmergency(card) ? 1 : 2;
    const sortedRequests = state.requests.map((card, index) => ({ card, index })).sort((left, right) => priority(left.card) - priority(right.card) || left.index - right.index);
    const requestMarkup = sortedRequests.map(({ card, index }) => {
      const cashPrice = requestMoneyCost(card);
      const materialUnits = requestMaterialUnits(card);
      const materialCost = requestMaterialPurchaseCost(card);
      const materialShortageUnits = materialShortage(materialUnits);
      const houseAddress = card.houseAddress || managedHomeByName(card.houseName)?.address || "Адрес не указан";
      if (card.cancelled) return `<article class="request-card request-cancelled"><div class="request-icon">×</div><div class="request-info"><div class="request-meta"><span>${escapeHtml(houseAddress)}</span><span>${escapeHtml(card.category)}</span><span class="request-type-badge type-${card.type}">${requestAttributeLabel(card.type)}</span><span class="labor-badge">${card.labor ? `${card.labor} трудозатрат` : "Только материалы"}</span><span class="cancelled-label">ОТМЕНЕНА</span></div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p></div><div class="request-cost request-cancelled-status"><span>Отменена</span><span class="cancelled-x">×</span></div></article>`;
    const workers = card.labor > 0 ? activeEmployees().filter(employee => employee.role && ROLES[employee.role].category === card.category) : [];
      const isCarried = card.receivedTurn !== state.turn;
      const contractorMaterialCost = materialUnits * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier;
      const combinedCashPrice = requestContractorWorkCost(card) + contractorMaterialCost;
      const contractorNet = card.payout - cashPrice;
      const combinedContractorNet = card.payout - combinedCashPrice;
      const unpaid = !card.resolved && (isCarried || requestIsOverdue(card));
      const regularWorkerActions = [];
      const paidOvertimeActions = [];
      const unpaidOvertimeActions = [];
      workers.forEach(worker => {
        const plan = overtimeFor(worker, card.labor);
        const disabled = state.phase !== "resolving";
        const label = `${roleName(worker.role)}: ${escapeHtml(worker.name || roleName(worker.role))}`;
        const productivityLabel = `<span class="worker-productivity-count">(${quantity(Math.max(0, effectiveProductivity(worker) - worker.assignedLabor))}/${quantity(effectiveProductivity(worker))})</span>`;
        const overtimeLabel = plan.premium ? ` · премия ${money(plan.premium)} ₽` : "";
        const workerCost = plan.premium + materialCost;
        const income = card.type === "paid" ? `<span class="action-income">+${money(card.payout)} ₽</span>` : "";
        if (!plan.premium) {
          regularWorkerActions.push(`<div class="request-action-row ${card.type === "paid" ? "paid-action-row" : ""}">${income}<button type="button" class="staff-solve-button" data-worker="${escapeHtml(worker.id)}" data-index="${index}" ${disabled || !canCoverRequiredCost(workerCost) ? "disabled" : ""}>${label} · ${productivityLabel}${materialCost ? ` · материалы ${money(materialCost)} ₽` : ""}${card.damageCompensation ? " · компенсация отдельно" : ""}</button></div>`);
          return;
        }
        paidOvertimeActions.push(`<div class="request-action-row ${card.type === "paid" ? "paid-action-row" : ""}">${income}<button type="button" class="staff-solve-button" data-worker="${escapeHtml(worker.id)}" data-index="${index}" ${disabled || !canCoverRequiredCost(workerCost) ? "disabled" : ""}>${label} · ${productivityLabel}${overtimeLabel}${materialCost ? ` · материалы ${money(materialCost)} ₽` : ""}${card.damageCompensation ? " · компенсация отдельно" : ""}</button></div>`);
        unpaidOvertimeActions.push(`<div class="request-action-row ${card.type === "paid" ? "paid-action-row" : ""}">${income}<button type="button" class="overtime-unpaid-button" data-worker="${escapeHtml(worker.id)}" data-index="${index}" ${disabled || !canCoverRequiredCost(materialCost) ? "disabled" : ""}>${label} · ${productivityLabel} · без премии, недовольство${materialCost ? ` · материалы ${money(materialCost)} ₽` : ""}${card.damageCompensation ? " · компенсация отдельно" : ""}</button></div>`);
      });
      return `<article class="request-card ${card.type === "paid" ? "paid-request-card" : ""} ${card.resolved ? "resolved" : ""} ${unpaid ? "request-overdue" : ""}" data-request-card-id="${escapeHtml(card.id)}">
        <div class="request-icon">${escapeHtml(card.icon)}</div><div class="request-info"><div class="request-meta"><div class="request-meta-line"><span class="request-house-address">${escapeHtml(houseAddress)}</span><span class="request-type-badge type-${card.type}">${requestAttributeLabel(card.type)}</span>${card.repeat ? '<span class="repeat-request-badge">Повторная</span>' : ""}${unpaid ? '<span class="overdue-label">ПРОСРОЧЕНА</span>' : ""}${card.resolved ? `<span class="resolved-label">${card.resolvedBy === "contractor" ? "ВЫПОЛНЕНА ПОДРЯДЧИКОМ" : card.resolvedBy === "oss" ? "ВЫПОЛНЕНА ПО ОСС" : "РЕШЕНО"}</span>` : ""}</div><div class="request-meta-line"><span class="request-category">${escapeHtml(card.category)}</span><span class="labor-badge">Трудозатрат: ${quantity(card.labor || 0)}</span></div></div><div class="request-material-line">${card.type === "paid" ? "Материалы оплачивает заявитель" : `Материалы: ${quantity(materialUnits)} ед.${materialUnits === 0 ? " · не требуются" : materialShortageUnits > 0 ? ` · докупить ${quantity(materialShortageUnits)} ед. за ${money(materialCost)} ₽` : " · со склада"}`}${card.damageCompensation ? ` · ущерб выплачивается отдельно: ${money(card.damageCompensation)} ₽` : ""}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p></div>
        <div class="request-cost">${card.resolved ? '<div class="request-complete-status"><span>Выполнена</span><span class="done-check">✓</span></div>' : `<div class="request-actions">${regularWorkerActions.join("")}${paidOvertimeActions.join("")}${unpaidOvertimeActions.join("")}<div class="request-action-row contractor-action-row ${materialUnits > 0 ? "has-bundled-materials" : "single-contractor"} ${card.type === "paid" ? "paid-contractor-action-row" : ""}"><div class="contractor-method ${card.type === "paid" ? "paid-contractor-method" : ""}">${card.type === "paid" ? `<span class="action-income">${contractorNet >= 0 ? "+" : "−"}${money(Math.abs(contractorNet))} ₽</span>` : ""}<button type="button" class="solve-button" data-index="${index}" ${state.phase !== "resolving" ? "disabled" : ""}>Привлечь подрядчика · ${money(cashPrice)} ₽</button></div>${materialUnits > 0 ? `<div class="contractor-method ${card.type === "paid" ? "paid-contractor-method" : ""}">${card.type === "paid" ? `<span class="action-income">${combinedContractorNet >= 0 ? "+" : "−"}${money(Math.abs(combinedContractorNet))} ₽</span>` : ""}<button type="button" class="solve-button solve-material-button" data-index="${index}" data-combined="true" ${state.phase !== "resolving" ? "disabled" : ""}>Подрядчик + Материал: ${money(combinedCashPrice)} ₽</button></div>` : ""}</div>${isEmergency(card) ? '<span class="emergency-lock-note">Аварийную нельзя отменить</span>' : `<button type="button" class="request-cancel-button" data-index="${index}" ${state.phase !== "resolving" ? "disabled" : ""}>Отменить заявку</button>`}</div>`}</div>
      </article>`;
    }).join("");
    const representedCancelledIds = new Set(state.requests.filter(card => card.cancelled).map(card => card.id));
    const cancelledPool = state.cancelledRequests.filter(card => !card.returnedTurn && !representedCancelledIds.has(card.id));
    const poolMarkup = cancelledPool.length ? `<details class="cancelled-request-pool"><summary>Пул отменённых заявок <span>${cancelledPool.length}</span></summary><div class="cancelled-pool-list">${cancelledPool.map(card => `<article class="cancelled-pool-item"><div><strong>${escapeHtml(card.houseAddress || managedHomeByName(card.houseName)?.address || "Адрес не указан")} · ${escapeHtml(card.title)}</strong><span>${escapeHtml(card.category)} · ${requestAttributeLabel(card.type)}${card.repeat ? " · уже повторная" : ""} · вернётся автоматически через ${Math.max(0, (card.returnAfterTurn || (state.turn + 4 * state.seasonDuration)) - state.turn)} ходов</span></div></article>`).join("")}</div></details>` : "";
    elements.list.innerHTML = `${requestMarkup || '<div class="empty-state"><div class="empty-icon">↘</div><div><strong>Новый день начинается</strong><p>После найма прими заявки, чтобы узнать, что случилось в доме.</p></div></div>'}${poolMarkup}`;
    elements.list.querySelectorAll(".solve-button").forEach(button => button.addEventListener("click", () => resolveWithMoney(Number(button.dataset.index), button.dataset.combined === "true")));
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
    const reputation = report.reputation || { start: state.reputation, end: state.reputation, cancellationPenalty: 0, marketerBonus: 0, unsafeHousePenalty: 0, solvencyBonus: 0, cleanHouseBonus: 0 };
    const maintenanceGrowth = Array.isArray(report.maintenanceGrowth) ? report.maintenanceGrowth : [];
    const maintenanceGrowthBlock = `<section class="report-maintenance-growth"><h3>Изменение базового обслуживания</h3>${maintenanceGrowth.length ? maintenanceGrowth.map(change => `<div><span>${escapeHtml(change.address)} · ${escapeHtml(change.name)}</span><b>${money(change.previous)} → ${money(change.updated)} ₽/ход <i>(+${change.growthPercent}%)</i></b></div>`).join("") : '<p>Данные о росте БО за этот год отсутствуют.</p>'}</section>`;
    const repText = value => `${value > 0 ? "+" : ""}${value}`;
    const tariffOss = managedHomes().map(home => home.tariffOssResolvedYear === state.year
      ? `<div class="oss-result-note"><b>${escapeHtml(home.address)} · ${escapeHtml(home.name)}</b>: решение по ОСС на тариф зафиксировано в этом году. Тариф дома: <b>${money(currentTariff(home))} ₽/м²</b>.</div>`
      : `<div class="oss-tariff-controls house-tariff-oss" data-tariff-house="${escapeHtml(home.name)}"><b>${escapeHtml(home.address)} · ${escapeHtml(home.name)}</b><label>Изменение тарифа, ₽/м²</label><input class="oss-tariff-increase" type="number" step="0.01" value="1"><button class="oss-action-button" data-run-tariff-oss="${escapeHtml(home.name)}" type="button">Провести ОСС для изменения тарифа</button><button class="oss-skip-button" data-skip-tariff-oss="${escapeHtml(home.name)}" type="button">Не проводить ОСС · получить +1 репутацию</button><p>Тариф дома: ${money(currentTariff(home))} ₽/м². Максимальное повышение при текущей репутации: ${maxTariffIncreasePercent(state.reputation)}% (${money(currentTariff(home) * maxTariffIncreasePercent(state.reputation) / 100)} ₽/м²). Превышение будет ограничено этим пределом. Отрицательное X снижает тариф; тариф не может стать ниже 0 ₽/м².</p></div>`).join("");
    const weightedCancellations = reputationCancellationCount(report.year);
    const repeatCancelledCount = state.cancelledRequests.filter(card => card.year === report.year && card.repeat && card.type !== "paid").length;
    const cancellationSummary = `${report.yearStats.cancelled} фактических отмен${repeatCancelledCount ? ` (включая ${repeatCancelledCount} повторных, каждая считается за две)` : ""}`;
    const reportReputationStart = Number.isFinite(reputation.comparisonStart) ? reputation.comparisonStart : reputation.start;
    const reportReputationDelta = reputation.end - reportReputationStart;
    const reputationBlock = `<div class="report-reputation"><div><span>Репутация · с прошлого годового отчёта</span><b>${repText(reportReputationStart)} → ${repText(reputation.end)} · Δ ${repText(reportReputationDelta)}</b></div><ul><li>${reputation.cancellationPenalty ? `−${reputation.cancellationPenalty} за ${cancellationSummary}: ${weightedCancellations} штрафных единиц` : "Нет штрафа за отменённые заявки"}</li><li>${reputation.marketerBonus ? `+${reputation.marketerBonus}: бонусы маркетологов` : "Бонус маркетологов не начислен"}</li><li>${reputation.solvencyBonus ? "+1: год закрыт без долгов" : "Бонус за отсутствие долгов не получен"}</li><li>${reputation.cleanHouseBonus ? "+1: на доме нет отменённых заявок" : "Бонус за отсутствие отмен не получен"}</li><li>${reputation.unsafeHousePenalty ? "−2: аварийный дом изъят из игры" : "Нет штрафа за аварийный дом"}</li><li>${reputation.tariffNoAttemptBonus ? `+${reputation.tariffNoAttemptBonus}: ОСС для повышения тарифа не проводилось` : ""}</li></ul></div>`;
    const noHomesAndNoMarket = state.houses === 0 && availableRealEstateHomes().length === 0;
    const maximumDirectorSalary = maximumPortfolioCollection() * 0.5;
    const directorSalary = maximumPortfolioCollection() * state.directorSalaryPercent / 100;
    const directorSalaryBlock = `<section class="director-salary-panel"><div><p class="section-label">ВОЗНАГРАЖДЕНИЕ ДИРЕКТОРА</p><h3>Зарплата директора</h3><p>Процент от максимально возможного сбора со всех домов. Сумма будет переводиться на счёт учредителя каждый ход.</p></div><label for="director-salary-slider"><span>Доля максимального сбора: <b id="director-salary-percent">${state.directorSalaryPercent}%</b></span><input id="director-salary-slider" type="range" min="0" max="50" step="1" value="${state.directorSalaryPercent}"><span class="director-salary-values"><span>0% · 0 ₽/ход</span><b>Зарплата: <span id="director-salary-amount">${money(directorSalary)}</span> ₽/ход</b><span>50% · ${money(maximumDirectorSalary)} ₽/ход</span></span></label></section>`;
    elements.annualReport.innerHTML = `<div class="report-heading"><div><p class="section-label">ИТОГИ ГОДА ${report.year}</p><h2>Годовой отчёт</h2></div><span class="report-stamp">ЗАКРЫТ</span></div>${reputationBlock}<div class="report-columns"><section class="report-column"><h3>За прошедший год</h3><div class="report-money"><div><span>Деньги на начало года</span><b>${money(report.capitalStart)} ₽</b></div><div><span>Деньги на конец года</span><b>${money(report.capitalEnd)} ₽</b></div></div>${counts(report.yearStats)}</section><section class="report-column"><h3>За всё время игры</h3>${counts(report.totals)}</section></div>${maintenanceGrowthBlock}${directorSalaryBlock}<p class="report-footnote">Отменённые заявки за игру: <b>${state.cancelledRequests.length}</b>. ${state.houses === 0 ? "В управлении пока нет домов; доступные объекты можно посмотреть на рынке недвижимости." : "Все невыполненные заявки автоматически отменены перед отчётом."}</p>${(noHomesAndNoMarket && CONFIG.rules.unsafeHouseEndsGame) ? `<div class="house-removed-notice">В управлении нет домов, и на рынке недвижимости не осталось доступных объектов. Игра завершена.</div>` : `<div class="annual-actions"><section class="house-tariff-oss-list"><h3>ОСС на изменение тарифа по домам</h3>${tariffOss || '<p>Нет домов в управлении.</p>'}</section><button class="primary-button next-year-button" id="next-year-button" type="button"><span>Начать новый год · лето</span><span class="button-arrow">↗</span></button></div>`}`;
    const directorSalarySlider = document.getElementById("director-salary-slider");
    directorSalarySlider?.addEventListener("input", () => {
      state.directorSalaryPercent = Math.max(0, Math.min(50, Number(directorSalarySlider.value) || 0));
      const percentOutput = document.getElementById("director-salary-percent");
      const amountOutput = document.getElementById("director-salary-amount");
      if (percentOutput) percentOutput.textContent = `${state.directorSalaryPercent}%`;
      if (amountOutput) amountOutput.textContent = money(maximumPortfolioCollection() * state.directorSalaryPercent / 100);
      saveState();
    });
    document.getElementById("next-year-button")?.addEventListener("click", startNewYear);
    elements.annualReport.querySelectorAll("[data-run-tariff-oss]").forEach(button => button.addEventListener("click", () => runTariffOss(button.dataset.runTariffOss)));
    elements.annualReport.querySelectorAll("[data-skip-tariff-oss]").forEach(button => button.addEventListener("click", () => skipTariffOss(button.dataset.skipTariffOss)));
  }

  function renderBankruptcy() {
    elements.bankruptcyPanel.innerHTML = `<div class="bankruptcy-heading"><span class="bankruptcy-mark">!</span><div><p class="section-label">БАЛАНС КОМПАНИИ: ${money(state.capital)} ₽</p><h2>Порог банкротства достигнут</h2></div></div><p>Для продолжения необходимо объявить банкротство. Сотрудники будут распущены, текущий дом и заявки выйдут из управления, долги спишутся. Затем появится новая УК с капиталом ${money(CONFIG.economy.startingCapital)} ₽, репутацией ${CONFIG.rules.bankruptcyStartingReputation > 0 ? "+" : ""}${CONFIG.rules.bankruptcyStartingReputation} и новым домом из колоды.</p><button class="bankruptcy-button" id="declare-bankruptcy-button" type="button"><span>Объявить банкротство</span><span>↗</span></button>`;
    document.getElementById("declare-bankruptcy-button").addEventListener("click", declareBankruptcy);
  }

  function recordCancellation(card, reason) {
    if (card.cancelled || card.resolved) return;
    card.cancelled = true;
    card.cancelReason = reason;
    card.cancelledTurn = state.turn;
    card.returnAfterTurn = state.turn + 4 * state.seasonDuration;
    const record = { ...card, year: state.year, houseName: card.houseName || state.houseName, cancellationWeight: card.repeat ? 2 : 1, cancelledTurn: state.turn, returnAfterTurn: card.returnAfterTurn, returnedTurn: null };
    record.houseName = card.houseName || state.houseName;
    state.cancelledRequests.push(record);
    countEvent("cancelled");
  }
  function reputationCancellationCount(year = state.year) { return state.cancelledRequests.filter(card => card.type !== "paid" && card.year === year).reduce((sum, card) => sum + (card.cancellationWeight || (card.repeat ? 2 : 1)), 0); }
  function cancelUnresolvedForAnnualReport() {
    const unresolved = state.requests.filter(card => !card.resolved && !card.cancelled);
    unresolved.forEach(card => recordCancellation(card, "annual-expiry"));
    state.requests = state.cancelledRequests.filter(card => card.year === state.year).map(card => ({ ...card }));
    if (unresolved.length) addLog(`Перед годовым отчётом автоматически отменены все невыполненные заявки: ${unresolved.length}.`);
    return unresolved;
  }
  function applyAnnualReputation() {
    const cancellationPenalty = Math.floor(reputationCancellationCount(state.year) / CONFIG.rules.cancellationReputationPenaltyEvery);
    const marketerBonus = activeEmployees().filter(employee => employee.role === "marketer").length + employeeBonusCount("marketer", "annualReputationThree") * 3;
    const unsafeHousePenalty = state.unsafeHousePenaltyYear === state.year ? CONFIG.rules.unsafeHouseReputationPenalty : 0;
    const unsafePenaltyAlreadyApplied = state.unsafeHousePenaltyYear === state.year;
    const solvencyBonus = hasNoDebts() ? CONFIG.rules.noDebtYearReputationBonus : 0;
    const cleanHouseBonus = reputationCancellationCount(state.year) === 0 ? CONFIG.rules.noCancellationYearReputationBonus : 0;
    const changes = { cancellationPenalty, marketerBonus, unsafeHousePenalty, solvencyBonus, cleanHouseBonus };
    const delta = -cancellationPenalty - (unsafePenaltyAlreadyApplied ? 0 : unsafeHousePenalty) + marketerBonus + solvencyBonus + cleanHouseBonus;
    const start = state.reputation;
    state.reputation += delta;
    if (state.financialHistory.length) state.financialHistory[state.financialHistory.length - 1].reputation = state.reputation;
    return { start, delta, changes };
  }
  function previousAnnualReportReputation() {
    return Number.isFinite(state.lastAnnualReport?.reputation?.end) ? state.lastAnnualReport.reputation.end : CONFIG.economy.startingReputation;
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
    state.houses = INITIAL_STATE.houses;
    state.primaryArea = newHouse.area;
    state.additionalHomes = [];
    state.area = newHouse.area;
    state.houseName = newHouse.name;
    state.houseAddress = newHouse.address;
    state.houseAge = Number(newHouse.age) || 0;
    state.managedSinceYear = state.year;
    state.houseRepairWarranties = {};
    state.houseWarrantyUntilTurn = null;
    state.warrantyCourtCases = [];
    state.tariffPerSquareMeter = CONFIG.economy.tariffPerSquareMeter;
    state.tariffOssResolvedYear = state.year;
    state.newHouseOssUsedTurn = null;
    state.tariffOssAttempts = 0;
    state.baseMaintenance = CONFIG.economy.baseMaintenancePerHouse;
    state.houseDebt = 0;
    state.houseDebtRecoverable = 0;
    state.houseDebtIrrecoverable = 0;
    state.primaryDebtRecoverable = 0; state.primaryDebtIrrecoverable = 0;
    state.houseProblems = [];
    state.problemDeck = makeProblemDeck();
    state.collectionStats = { ...INITIAL_STATE.collectionStats };
    state.lastCollectionRate = null;
    state.primaryCollectionStats = { ...INITIAL_STATE.collectionStats }; state.primaryLastCollectionRate = null;
    state.capital = CONFIG.economy.startingCapital;
    state.materialStock = 0;
    state.engineerMaterialsUsed = [];
    state.reputation = CONFIG.rules.bankruptcyStartingReputation;
    state.houseUnsafeSinceYear = null; state.houseUnsafeSinceTurn = null; state.houseUnsafeCategory = null; state.houseUnsafeReasons = []; state.unsafeHousePenaltyYear = null; state.houseRemoved = false;
    state.requests = [];
    state.ossVoteTurn = state.turn; state.ossVoteUsedCategories = [];
    state.bankruptcyCount += 1;
    state.marketRerollUsedTurn = null;
    state.market = makeMarket(state.employees);
    state.phase = "staffing";
    state.hiresThisTurn = 0;
    state.lawyerActionTaken = false;
    addLog(`Объявлено банкротство УК. Распущено сотрудников: ${released}; дом «${oldHouseName}» передан; долги, штрафы и компенсации на ${money(writtenOffLiabilities)} ₽ списаны. Новая УК получила дом «${state.houseName}» (${quantity(state.area)} м²), капитал ${money(CONFIG.economy.startingCapital)} ₽ и репутацию ${CONFIG.rules.bankruptcyStartingReputation > 0 ? "+" : ""}${CONFIG.rules.bankruptcyStartingReputation}.`);
    saveState(); render(); showToast(`Новая УК: ${state.houseName} · ${state.area} м² · репутация −1`);
  }

  function makeMarket(employees = []) {
    const employed = new Set(employees.map(person => `${person.role}:${person.name}`));
    const executors = EMPLOYEE_ROSTER.filter(person => ROLES[person.role].kind === "executor" && !employed.has(`${person.role}:${person.name}`)).filter((person, index, pool) => pool.findIndex(item => item.role === person.role && item.name === person.name) === index);
    const specialists = EMPLOYEE_ROSTER.filter(person => ROLES[person.role].kind === "specialist" && !employed.has(`${person.role}:${person.name}`)).filter((person, index, pool) => pool.findIndex(item => item.role === person.role && item.name === person.name) === index);
    const expandedMarketCount = employees.filter(employee => employee.role === "hr" && employee.bonus === "expandedMarket").length;
    const executorCount = CONFIG.rules.marketExecutors + expandedMarketCount * CONFIG.rules.hrExpandedMarketExecutors;
    const specialistCount = CONFIG.rules.marketSpecialists + expandedMarketCount * CONFIG.rules.hrExpandedMarketSpecialists;
    const selected = [...shuffle(executors).slice(0, executorCount), ...shuffle(specialists).slice(0, specialistCount)];
    return selected.map((person, index) => ({ ...person, age: 20 + Math.floor(Math.random() * 41), id: `staff-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}` }));
  }

  function rerollMarketByHR() {
    if (!hasAvailableMarketReroll()) return;
    const hr = activeEmployees().find(employee => employee.role === "hr" && employee.bonus === "marketReroll");
    state.pendingHireIds = [];
    state.market = makeMarket(state.employees); state.marketRerollUsedTurn = state.turn;
    addLog(`HR-менеджер ${hr?.name || ""} использовал единственный переброс рынка труда за ход; пул найма очищен.`);
    saveState(); render(); showToast("Рынок труда переброшен HR-менеджером.");
  }

  function makeProblemDeck() {
    const cards = HOUSE_PROBLEMS.flatMap((problem, index) => Array.from({ length: PROBLEM_CARD_COUNTS[problem.category] }, () => index));
    return shuffle(cards);
  }

  function addSeasonalRequests() {
    let created = 0;
    for (const problem of state.houseProblems) {
      const definition = HOUSE_PROBLEMS.find(item => item.category === problem.category);
      if (!definition?.tasks?.length) continue;
      const task = definition.tasks[Math.floor(Math.random() * definition.tasks.length)];
      const rawMaterialCost = task.materialCost ?? (definition.materialOnly ? definition.materialCost : 0);
      const materialCost = Math.min(MAX_REQUEST_MATERIAL_UNITS, Math.max(0, Math.floor(Number(rawMaterialCost) || 0)));
      const damageChance = complaintProbability(CONFIG.rules.problemEmergencyDamageChance);
      const withDamage = Math.random() < damageChance;
      const damageCompensation = withDamage ? Math.max(CONFIG.rules.problemEmergencyCompensationMinimum, problem.wear * CONFIG.rules.problemDamageMultiplier) : 0;
      const home = managedHomeByName(problem.houseName || state.houseName) || { name: state.houseName, address: state.houseAddress };
      const request = {id: `problem-task-${state.turn}-${problem.id}-${created}`, title: `Авария: ${task.title}`, description: `Аварийные последствия проблемы «${problem.category}». Износ категории: ${problem.wear}%.`,
        category: task.category, labor: task.labor, materialCost, type: withDamage ? "emergencyDamage" : "emergency", damageCompensation, payout: 0, icon: "⚠", problemId: problem.id,
        problemCategory: problem.category, problemWear: problem.wear, problemCycleId: `${state.turn}-${problem.id}`, resolved: false, cancelled: false, receivedTurn: state.turn, houseName: home.name, houseAddress: home.address};
      state.requests.push(request);
      recordHouseRequest(request.houseName, "accepted");
      registerDamageClaim(request);
      created++;
    }
    if (created) {
      countEvent("accepted", created);
      addLog(`Проблемы дома создали аварийных заявок: ${created} · по одной на каждую карту проблемы.`);
    }
  }

  function conductSeasonalInspection() {
    if (state.phase !== "inspection") return;
    if (!state.problemDeck?.length) state.problemDeck = makeProblemDeck();
    const engineer = activeEmployees().find(employee => employee.role === "engineer");
    const inspectionLog = [];
    let totalDrawn = 0;
    for (const home of managedHomes()) {
      const drawn = CONFIG.rules.problemCardsPerInspectionMin + Math.floor(Math.random() * (CONFIG.rules.problemCardsPerInspectionMax - CONFIG.rules.problemCardsPerInspectionMin + 1));
      const ageBonus = Math.floor(Math.max(0, home.age - 1) / 3) * (CONFIG.rules.inspectionCardsPerThreeHouseYears ?? 1);
      const count = Math.max(0, drawn + ageBonus - (engineer ? CONFIG.rules.engineerInspectionReduction : 0));
      inspectionLog.push(`${home.address}: выпало ${drawn}; возраст ${home.age} лет добавил ${ageBonus}; инженер ${engineer ? `уменьшил на ${CONFIG.rules.engineerInspectionReduction}` : "не применялся"}; итог ${count} карт.`);
      totalDrawn += count;
      for (let index = 0; index < count; index++) {
        if (!state.problemDeck.length) state.problemDeck = makeProblemDeck();
        const problemCard = HOUSE_PROBLEMS[state.problemDeck.pop()];
        const warranties = home.primary ? state.houseRepairWarranties : home.repairWarranties;
        const coveredByRepair = Number.isInteger(warranties?.[problemCard.category]?.expiresTurn) && warranties[problemCard.category].expiresTurn >= state.turn;
        const problem = { id: `problem-${state.turn}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, category: problemCard.category, wear: problemCard.wear, materialPurchased: false, repairProgress: {}, warrantyEligible: home.age < (CONFIG.rules.warrantyAgeYears ?? 3) || (home.warrantyUntilTurn || -1) >= state.turn || coveredByRepair, houseName: home.name, houseAddress: home.address };
        state.houseProblems.push(problem);
        inspectionLog.push(`${home.address}: выявлена проблема «${problem.category}», износ ${problem.wear}%.`);
      }
    }
    state.lastInspectionTurn = state.turn;
    updateHouseSafetyStatus();
    inspectionLog.unshift(`Проведён сезонный осмотр (${SEASONS[state.seasonIndex]}).`);
    addLogSequence(inspectionLog);
    state.phase = state.houseProblems.length ? "problems" : "drawing";
    saveState(); render(); showToast(totalDrawn ? `Осмотр завершён: выявлено проблем ${totalDrawn}.` : "Проблемы не выявлены, этап решения пропущен.");
  }

  function hireEmployee(candidateId) {
    if (!["staffing", "preparation"].includes(state.phase)) return;
    const candidate = state.market.find(person => person.id === candidateId);
    if (!candidate || state.employees.some(person => person.id === candidateId || person.role === candidate.role && person.name === candidate.name)) return;
    if (state.pendingHireIds.includes(candidateId)) state.pendingHireIds = state.pendingHireIds.filter(id => id !== candidateId);
    else {
      const count = state.pendingHireIds.filter(id => state.market.some(person => person.id === id && person.role !== "hr")).length;
      if (!hasHR() && !pendingHireHasHR() && count >= CONFIG.rules.hiresWithoutHR && candidate.role !== "hr") return;
      state.pendingHireIds.push(candidateId);
    }
    saveState(); render();
  }

  function fireEmployee(employeeId, payLastSalary) {
    if (state.phase !== "staffing") return;
    const employee = state.employees.find(person => person.id === employeeId);
    const index = state.employees.findIndex(person => person.id === employeeId);
    if (index < 0) return;
    const action = payLastSalary ? "paid" : "unpaid";
    if (employee?.deceased) {
      if (state.pendingFireActions[employeeId] === action) delete state.pendingFireActions[employeeId];
      else state.pendingFireActions[employeeId] = action;
    } else if (state.pendingFireActions[employeeId]) delete state.pendingFireActions[employeeId];
    else state.pendingFireActions[employeeId] = action;
    saveState(); render();
  }

  function toggleFire(employeeId, action) {
    if (state.phase !== "staffing") return;
    if (action) state.pendingFireActions[employeeId] = action;
    else delete state.pendingFireActions[employeeId];
    saveState(); render();
  }

  function toggleHire(candidateId) { hireEmployee(candidateId); }

  function finishPreparation() {
    if (state.phase !== "preparation") return;
    state.seasonIndex = state.startingSeasonIndex;
    state.seasonTurnIndex = 0;
    const input = document.getElementById("company-name-input");
    const companyName = input.value.trim() || DEFAULT_COMPANY_NAMES[Math.floor(Math.random() * DEFAULT_COMPANY_NAMES.length)];
    state.companyName = companyName;
    state.employees.forEach(employee => { employee.withholdPercent = Number(employee.anchoredWithholdPercent) || 0; });
    state.houseDeck = state.houseDeck.filter(house => house.name !== state.houseName);
    if (!state.houseDeck.length) state.houseDeck = shuffle(HOUSE_CARDS.filter(house => house.name !== state.houseName));
    applyStaffingChanges();
    if (state.phase === "bankruptcy") { saveState(); render(); return; }
    state.phase = CONFIG.rules.inspectionSeasonIndices.includes(state.seasonIndex) && state.seasonTurnIndex === 0 ? "inspection" : state.houseProblems.length ? "problems" : "drawing";
    state.market = makeMarket(state.employees);
    addLog(`Началась игра: УК «${companyName}» открыла ${SEASONS[state.seasonIndex]} (длительность ${state.seasonDuration} хода) с командой из ${state.employees.length} сотрудников${state.badGameMode ? " в режиме «Плохая игра»" : ""}.`);
    saveState(); render(); showToast(`УК «${companyName}» готова к первому сезону.`);
  }

  function withdrawFunds() {
    if (!state.badGameMode || state.capital < 0 || ["gameOver", "annualReport", "bankruptcy"].includes(state.phase)) { showToast("Выводить деньги нельзя: включите режим «Плохая игра», закончите отчёт и убедитесь, что бюджет не отрицательный."); return; }
    const input = document.getElementById("withdraw-amount");
    const amount = Number(input?.value);
    const feeRate = (CONFIG.rules.badGameWithdrawalFeePercent ?? 40) / 100;
    const totalCost = amount * (1 + feeRate);
    if (!Number.isFinite(amount) || amount <= 0 || state.capital < totalCost) { showToast(`Нужно указать сумму больше нуля; с комиссией 40% требуется ${money(totalCost)} ₽.`); return; }
    changeCapital(-totalCost, "незаконный вывод средств");
    state.founderAccount += amount;
    addLog(`Учредитель вывел ${money(amount)} ₽; комиссия ${Math.round(feeRate * 100)}% составила ${money(amount * feeRate)} ₽.`);
    if (Math.random() < (CONFIG.rules.badGameTaxAuditChance ?? 0.01)) { state.phase = "gameOver"; state.badGameResult = "Вас поймали за жопу"; addLog("Налоговая провела проверку. Игра окончена: Вас поймали за жопу."); }
    if (input) input.value = "";
    saveState(); render(); showToast(state.phase === "gameOver" ? state.badGameResult : `На счёт учредителя поступило ${money(amount)} ₽.`);
  }

  function buyReputation() {
    const cost = CONFIG.rules.badGameReputationPrice ?? 20;
    if (!state.badGameMode || state.founderAccount < cost || ["gameOver", "annualReport", "bankruptcy"].includes(state.phase)) { showToast(`Для покупки репутации нужно ${money(cost)} ₽ на личном счёте учредителя.`); return; }
    state.founderAccount -= cost; state.reputation += 1;
    addLog(`В режиме «Плохая игра» куплена 1 репутация за ${money(cost)} ₽.`);
    saveState(); render(); showToast(`Репутация увеличена на 1 за ${money(cost)} ₽ со счёта учредителя.`);
  }

  function transferFounderFunds() {
    if (["gameOver", "annualReport", "bankruptcy"].includes(state.phase)) return;
    const input = document.getElementById("founder-transfer-amount");
    const amount = Number(input?.value);
    if (!Number.isFinite(amount) || amount <= 0 || state.founderAccount < amount) { showToast(`На счёте учредителя недостаточно средств. Доступно ${money(state.founderAccount)} ₽.`); return; }
    if (!changeCapital(amount, "перевод со счёта учредителя в бюджет компании")) return;
    state.founderAccount -= amount;
    addLog(`Учредитель перевёл ${money(amount)} ₽ в бюджет УК без комиссии.`);
    if (input) input.value = "";
    checkBankruptcy(); saveState(); render(); showToast(`В бюджет переведено ${money(amount)} ₽ без комиссии.`);
  }

  function applyStaffingChanges() {
    const hrPresent = hasHR() || pendingHireHasHR();
    const hired = state.market.filter(candidate => state.pendingHireIds.includes(candidate.id) && !state.employees.some(person => person.role === candidate.role && person.name === candidate.name));
    for (const candidate of hired) {
      const role = ROLES[candidate.role];
      const probationTurns = hrPresent ? CONFIG.rules.probationTurns : 0;
      const salary = candidate.salary * (state.phase === "preparation" ? CONFIG.rules.preparationSalaryMultiplier : 1);
      state.employees.push({ ...candidate, age: Number.isInteger(candidate.age) ? candidate.age : 20 + Math.floor(Math.random() * 41), salary, productivity: candidate.productivity, legalStrength: candidate.role === "lawyer" ? candidate.legalStrength || 1 : candidate.legalStrength, probationTurns, assignedLabor: 0, loyalty: 0, loyaltyQuietStreak: 0, mood: "normal", fullSalaryStreak: 0, noWithholdPayStreak: 0, noPremiumPayStreak: 0, withholdPercent: 0, anchoredWithholdPercent: 0, withheldAmount: 0, unpaidOvertime: false, hiredTurn: state.turn });
      state.hiresThisTurn += 1; countEvent("hired");
      const hireLog = [`Нанят сотрудник: ${role.name} ${candidate.name}, постоянная зарплата ${money(salary)} ₽ / ход${probationTurns ? " до учёта испытательного срока" : ""}.`];
      if (state.phase === "preparation") hireLog.push(`Стартовый найм сохранил для ${candidate.name} зарплату на 30% ниже установленной: ${money(salary)} ₽ / ход.`);
      if (probationTurns) {
        const hiringHR = activeEmployees().find(person => person.role === "hr");
        hireLog.push(`HR-менеджер ${hiringHR?.name || ""} назначил ${candidate.name} испытательный срок на ${probationTurns} хода; текущая зарплата в этот срок вдвое меньше.`);
      }
      addLogSequence(hireLog);
    }
    for (const [employeeId, action] of Object.entries(state.pendingFireActions)) {
      const index = state.employees.findIndex(person => person.id === employeeId);
      if (index < 0) continue;
      const [employee] = state.employees.splice(index, 1);
      const finalSalary = effectiveSalary(employee);
      countEvent("fired");
      const complaintChance = complaintProbability(moodComplaintChance(employee));
      if (employee.deceased) {
        if (action === "paid") { changeCapital(-finalSalary, "последняя зарплата умершего сотрудника"); addLog(`Закрыт расчёт с умершим сотрудником ${employee.name}: выплачена последняя зарплата ${money(finalSalary)} ₽.`); }
        else { state.reputation -= 1; addLog(`Закрыт расчёт с умершим сотрудником ${employee.name}: последняя зарплата семье не выплачена, репутация −1.`); }
        continue;
      }
      if (action === "paid") { changeCapital(-finalSalary, "последняя зарплата при увольнении"); addLog(`Сотрудник уволен: ${roleName(employee.role)}. Выплачена последняя зарплата ${money(finalSalary)} ₽.`); }
      else {
        employee.loyalty = -10; employee.mood = "veryDissatisfied";
        if (employee.probationTurns <= 0) state.reputation -= CONFIG.rules.unpaidFiringReputationPenalty;
        addLog(`Сотрудник уволен без выплаты: ${roleName(employee.role)}; настроение «Очень недоволен»${employee.probationTurns <= 0 ? "; репутация −1" : " (испытательный срок)"}.`);
      }
      if (complaintChance > 0 && Math.random() < complaintChance) {
        const penalty = { id: `fine-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, employeeName: roleName(employee.role), salary: finalSalary, amount: finalSalary * CONFIG.rules.laborInspectionFineSalaryMultiplier, year: state.year, turn: state.turn, houseName: state.houseName, houseAddress: state.houseAddress, paid: false, writtenOff: false };
        state.penalties.push(penalty); addLog(`${employee.name} пожаловался в трудовую инспекцию; назначен штраф ${money(penalty.amount)} ₽ (шанс ${Math.round(complaintChance * 100)}%).`);
      }
    }
    state.pendingHireIds = []; state.pendingFireActions = {};
    if (state.capital <= BANKRUPTCY_THRESHOLD) checkBankruptcy();
  }

  function legacyFireCodeUnused(employee, payLastSalary) {
    const finalSalary = effectiveSalary(employee);
    if (payLastSalary) changeCapital(-finalSalary, "последняя зарплата при увольнении");
    else state.reputation -= 1;
    countEvent("fired");
    let complaintFine = null;
    if (payLastSalary) {
      addLog(`Сотрудник уволен: ${roleName(employee.role)}. Выплачена последняя зарплата ${money(finalSalary)} ₽.`);
    } else {
      const complaintChance = complaintProbability(CONFIG.rules.unpaidFiringComplaintChanceMax);
      const complained = Math.random() < complaintChance;
      addLog(`Сотрудник уволен без последней зарплаты: −1 к репутации. Шанс жалобы в трудовую инспекцию: ${Math.round(complaintChance * 100)}%.`);
      if (complained) {
        complaintFine = { id: `fine-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, employeeName: roleName(employee.role), salary: finalSalary, amount: finalSalary * CONFIG.rules.laborInspectionFineSalaryMultiplier, year: state.year, turn: state.turn, paid: false, writtenOff: false };
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
    if (!changeCapital(-penalty.amount, "выплата штрафа")) return;
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
    if (!changeCapital(-claim.amount, "выплата компенсации")) return;
    claim.paid = true;
    claim.paidTurn = state.turn;
    const request = state.requests.find(item => item.id === claim.requestId);
    if (request) request.damageCompensation = 0;
    addLog(`Выплачена компенсация за ущерб по заявке «${claim.title}»: −${money(claim.amount)} ₽.`);
    checkBankruptcy();
    saveState(); render();
    showToast(`Компенсация выплачена отдельно: −${money(claim.amount)} ₽`);
  }

  function settleCompensation(compensationId, offerPercent) {
    const claim = state.compensations.find(item => item.id === compensationId && !item.paid && !item.writtenOff && item.status === "pretrial");
    if (!claim || claim.lastOfferTurn === state.turn) return;
    const percent = Math.max(claim.lastOfferPercent || 10, Math.min(100, Number(offerPercent) || 10));
    claim.lastOfferPercent = percent;
    claim.lastOfferTurn = state.turn;
    const success = Math.random() < percent / 100;
    const previousAmount = claim.amount;
    if (success) {
      const settlementAmount = Math.round(previousAmount * percent) / 100;
      if (!changeCapital(-settlementAmount, "мировое соглашение по компенсации")) return;
      claim.originalAmount = claim.originalAmount || previousAmount;
      claim.amount = settlementAmount;
      claim.paid = true;
      claim.paidBy = "settlement";
      claim.paidTurn = state.turn;
      claim.status = "settled";
      const request = state.requests.find(item => item.id === claim.requestId);
      if (request) request.damageCompensation = 0;
      addLog(`Мирное соглашение по компенсации «${claim.title}»: предложение ${percent}% принято с вероятностью ${percent}%. Выплачено автоматически ${money(settlementAmount)} ₽ вместо ${money(previousAmount)} ₽.`);
      checkBankruptcy(); saveState(); render(); showToast(`Соглашение принято: выплачено ${money(settlementAmount)} ₽.`);
      return;
    }
    addLog(`Мирное соглашение по компенсации «${claim.title}» не принято: предложение ${percent}% (шанс ${percent}%).`);
    const increase = CONFIG.rules.compensationCourtEscalationIncrease ?? 0.05;
    const startingChance = CONFIG.rules.compensationCourtEscalationChance ?? 0.1;
    claim.courtEscalationChance = Math.min(1, (Number.isFinite(claim.courtEscalationChance) ? claim.courtEscalationChance : startingChance) + increase);
    const effectiveCourtChance = complaintProbability(claim.courtEscalationChance);
    addLog(`Мирное соглашение по компенсации «${claim.title}» не принято: предложение ${percent}% (шанс ${percent}%). Вероятность передачи в суд повышена до ${Math.round(effectiveCourtChance * 100)}% с учетом модификатора; проверка будет в начале следующего хода.`);
    saveState(); render(); showToast(`Не договорились. Следующая попытка — в следующем ходу; шанс суда теперь ${Math.round(effectiveCourtChance * 100)}% с учетом модификатора.`);
  }

  function advanceLiabilityTimers(seasonLog = []) {
    const paymentTurns = CONFIG.rules.compensationPaymentTurns ?? 4;
    state.legalCases.filter(caseFile => caseFile.caseType === "forgedHouse" && caseFile.status === "trial").forEach(caseFile => {
      const ongoingReputationPenalty = CONFIG.rules.badGameForgeryOngoingReputationPenalty ?? 1;
      state.reputation -= ongoingReputationPenalty;
      seasonLog.push(`Дело о подделке подписей по дому «${caseFile.houseName}» остаётся в суде: репутация −${ongoingReputationPenalty} за этот ход.`);
    });
    state.compensations.forEach(claim => {
      if (claim.paid || claim.writtenOff || claim.amount <= 0) return;
      if (claim.status === "pretrial") {
        const baseCourtChance = Number.isFinite(claim.courtEscalationChance) ? claim.courtEscalationChance : (CONFIG.rules.compensationCourtEscalationChance ?? 0.1);
        const courtChance = complaintProbability(baseCourtChance);
        if (Math.random() < courtChance) {
          const previousAmount = claim.amount;
          const multiplier = CONFIG.rules.compensationCourtAmountMultiplier ?? 1.5;
          claim.originalAmount = claim.originalAmount || previousAmount;
          claim.amount = Math.round(previousAmount * multiplier * 100) / 100;
          claim.status = "court"; claim.courtStage = "trial"; claim.courtStartedTurn = state.turn;
          claim.trialDeadlineTurn = state.turn + (CONFIG.rules.compensationTrialTurns ?? 4);
          claim.delayCount = 0;
          const request = state.requests.find(item => item.id === claim.requestId);
          if (request) request.damageCompensation = claim.amount;
          seasonLog.push(`Досудебная претензия «${claim.title}» перешла в суд в начале хода с вероятностью ${Math.round(courtChance * 100)}%. Сумма увеличена на 50%: ${money(previousAmount)} → ${money(claim.amount)} ₽.`);
        } else if (state.turn >= claim.pretrialDeadlineTurn) {
          claim.status = "expired"; claim.writtenOff = true;
          seasonLog.push(`Срок досудебной претензии по «${claim.title}» истёк. В суд дело не передано; компенсация списана.`);
        }
      } else if (claim.status === "court" && claim.courtStage === "trial" && state.turn >= claim.trialDeadlineTurn) {
        claim.courtStage = "payment"; claim.judgmentTurn = state.turn; claim.paymentDeadlineTurn = state.turn + paymentTurns;
        seasonLog.push(`Суд по компенсации «${claim.title}» вынес решение на сумму ${money(claim.amount)} ₽. Начался срок выплаты: ${paymentTurns} ходов.`);
      } else if (claim.status === "court" && claim.courtStage === "payment" && state.turn >= claim.paymentDeadlineTurn) {
        if (!changeCapital(-claim.amount, "автоматическое взыскание компенсации по решению суда")) return;
        claim.paid = true; claim.paidBy = "court"; claim.paidTurn = state.turn; claim.status = "paid";
        const request = state.requests.find(item => item.id === claim.requestId);
        if (request) request.damageCompensation = 0;
        seasonLog.push(`Истёк срок выплаты по решению суда. Компенсация «${claim.title}» ${money(claim.amount)} ₽ автоматически списана с бюджета.`);
        checkBankruptcy();
      }
    });
    state.legalCases.filter(caseFile => caseFile.status === "trial" && state.turn >= caseFile.deadlineTurn).forEach(caseFile => resolveForgedHouseCase(caseFile, false, seasonLog));
  }

  function acceptRequests() {
    if (state.phase !== "drawing") return;
    const needed = state.houses * CONFIG.economy.requestsPerHousePerSeason;
    const homes = managedHomes();
    addSeasonalRequests();
    const managedHomeNames = new Set(homes.map(home => home.name));
    const repeatRequests = state.cancelledRequests.filter(card => !card.returnedTurn && managedHomeNames.has(card.houseName) && (card.returnAfterTurn || state.turn + 1) <= state.turn);
    let pool = [...state.deck];
    if (pool.length < needed) pool = [...pool, ...shuffle([...CARDS])];
    const carriedCount = state.requests.filter(card => !card.resolved && !card.cancelled && card.receivedTurn !== state.turn).length;
    for (let index = 0; index < needed; index++) {
      if (!pool.length) pool = shuffle([...CARDS]);
      const card = pool.pop();
      const home = homes[Math.floor(index / CONFIG.economy.requestsPerHousePerSeason) % Math.max(1, homes.length)] || homes[0];
      const type = card.type || "ordinary";
      const accepted = { ...card, type, materialCost: type === "paid" ? 0 : Math.min(MAX_REQUEST_MATERIAL_UNITS, Math.max(0, Math.floor(Number.isFinite(card.materialCost) ? card.materialCost : 0))), damageCompensation: card.damageCompensation || 0, payout: card.payout || 0, resolved: false, id: `${state.turn}-${index}`, receivedTurn: state.turn, houseName: home?.name || state.houseName, houseAddress: home?.address || state.houseAddress };
      state.requests.push(accepted);
      recordHouseRequest(accepted.houseName, "accepted");
      registerDamageClaim(accepted);
    }
    repeatRequests.forEach((archived, index) => {
      archived.returnedTurn = state.turn;
      const repeated = { ...archived, id: `repeat-${state.turn}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, originalRequestId: archived.originalRequestId || archived.id, repeat: true, cancelled: false, resolved: false, receivedTurn: state.turn, year: state.year, cancelReason: null, cancellationWeight: undefined, assignedWorker: null, cancelledTurn: undefined, returnAfterTurn: undefined, returnedTurn: undefined };
      state.requests.push(repeated);
      recordHouseRequest(repeated.houseName, "accepted");
      registerDamageClaim(repeated);
    });
    countEvent("accepted", needed + repeatRequests.length);
    state.deck = pool; state.phase = "resolving";
    addLog(`Принято заявок: ${needed} новых${repeatRequests.length ? ` и ${repeatRequests.length} повторных, вернувшихся после срока ожидания` : ""} для ${state.houses} домов.${carriedCount ? ` Перенесено нерешённых: ${carriedCount}.` : ""}`);
    state.ossVoteTurn = state.turn;
    state.ossVoteUsedCategories = [];
    saveState(); render(); showToast(`Принято заявок: ${needed}${repeatRequests.length ? ` + ${repeatRequests.length} повторных` : ""}`);
  }

  function advanceTurnPhase() {
    if (state.phase === "staffing") {
      if (state.employees.some(employee => employee.deceased && !state.pendingFireActions[employee.id])) { showToast("Выберите, выплатить ли умершему сотруднику последнюю зарплату, прежде чем продолжить."); return; }
      if (state.employees.some(employee => employee.pendingDeparture?.needsResponse)) { showToast("Ответьте на предложение сотруднику остаться с повышением зарплаты."); return; }
      applyStaffingChanges();
      if (state.phase === "bankruptcy") { saveState(); render(); return; }
      state.phase = CONFIG.rules.inspectionSeasonIndices.includes(state.seasonIndex) && state.seasonTurnIndex === 0 ? "inspection" : state.houseProblems.length ? "problems" : "drawing";
      saveState(); render();
      showToast(state.phase === "inspection" ? `Кадровые изменения применены. Проведи ${state.seasonIndex === 1 ? "осенний" : "весенний"} осмотр.` : state.phase === "problems" ? "Кадровые изменения применены. Можно решить проблемы дома." : "Проблем для решения нет; переход к приёму заявок.");
      return;
    }
    if (state.phase === "inspection") { conductSeasonalInspection(); return; }
    if (state.phase === "problems") {
      state.phase = "drawing";
      addLog("Этап решения проблем завершён. Можно принимать заявки жильцов.");
      saveState(); render();
      return;
    }
    if (state.phase === "drawing") { acceptRequests(); return; }
  }

  function ossVote(question, questionModifier, options = {}) {
    const voteArea = Number.isFinite(options.area) ? options.area : state.area;
    const totalCancelled = Number.isFinite(options.cancelledCountOverride) ? options.cancelledCountOverride : state.cancelledRequests.filter(card => card.houseName === state.houseName).length;
    const specialistModifier = activeEmployees().reduce((sum, employee) => sum + (Number.isFinite(employee.ossModifier) ? employee.ossModifier : CONFIG.oss?.specialistModifiers?.[employee.role] || 0), 0);
    const reputationModifier = options.includeReputation ? state.reputation * (CONFIG.oss?.reputationModifierPerPoint ?? 1) : 0;
    const resultBonus = Number.isFinite(options.resultBonus) ? options.resultBonus : 0;
    const thresholdModifier = Number.isFinite(options.thresholdModifier) ? options.thresholdModifier : 0;
    const cancelledMultiplier = Number.isFinite(options.cancelledMultiplier) ? options.cancelledMultiplier : 0;
    const cancelledContribution = totalCancelled * cancelledMultiplier;
    const die = 1 + Math.floor(Math.random() * 6);
    const dieArea = voteArea / 5 * die;
    const result = dieArea + specialistModifier + reputationModifier + resultBonus;
    const threshold = voteArea / 2 + thresholdModifier + cancelledContribution + questionModifier;
    const success = result >= threshold;
    const yesArea = Math.min(voteArea, Math.max(0, result));
    const againstArea = Math.max(0, voteArea - yesArea);
    const animationId = `oss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = { id: animationId, turn: state.turn, year: state.year, question, houseAddress: options.logHouseAddress || state.houseAddress, die, area: voteArea, reputation: state.reputation, specialistModifier, reputationModifier, resultBonus, thresholdModifier, questionModifier, cancelledRequests: totalCancelled, cancelledMultiplier, cancelledContribution, result, threshold, success, yesArea, againstArea };
    state.ossHistory.unshift(record);
    state.ossHistory = state.ossHistory.slice(0, CONFIG.oss?.historyEntriesKept || 12);
    state.lastOssAnimationId = animationId;
    const resultTerms = [`${voteArea}/5 × ${die}`, `специалисты ${specialistModifier}`];
    if (options.includeReputation) resultTerms.push(`репутация ${state.reputation}`);
    if (resultBonus) resultTerms.push(`проблемы категории ${resultBonus}`);
    const thresholdTerms = [`${voteArea}/2`];
    if (thresholdModifier) thresholdTerms.push(`+ ${thresholdModifier}`);
    if (cancelledMultiplier) thresholdTerms.push(`+ ${totalCancelled} × ${cancelledMultiplier}`);
    if (questionModifier) thresholdTerms.push(`+ X ${questionModifier}`);
    const formula = `${resultTerms.join(" + ")} = ${result.toFixed(2)} ${success ? "≥" : "<"} ${thresholdTerms.join(" ")} = ${threshold.toFixed(2)}`;
    addLog(`ОСС «${question}»${record.houseAddress ? ` · ${record.houseAddress}` : ""}: S=${voteArea}; ${formula}. ${success ? "Кворум и решение набраны." : "Кворум не набран."}`);
    return { success, record, ...options };
  }

  function showOssHistory() {
    const disclosure = document.getElementById("oss-history-disclosure");
    const list = document.getElementById("oss-history-list");
    if (!disclosure || !list) return;
    disclosure.hidden = state.ossHistory.length === 0;
    const latest = state.ossHistory[0];
    const yesArea = latest ? Number.isFinite(latest.yesArea) ? latest.yesArea : Math.min(latest.area || 0, Math.max(0, (latest.area || 0) / 5 * (latest.die || 0) + (latest.specialistModifier || 0) + (latest.reputationModifier || 0) + (latest.resultBonus || 0))) : 0;
    const againstArea = latest ? Number.isFinite(latest.againstArea) ? latest.againstArea : Math.max(0, (latest.area || 0) - yesArea) : 0;
    const fillPercent = value => latest?.area > 0 ? `${Math.max(0, Math.min(100, value / latest.area * 100))}%` : "0%";
    const calcRows = latest ? `<div class="oss-calc-inputs"><b>Исходные данные</b><span>Площадь дома: ${money(latest.area)} м²</span><span>Репутация игрока: ${latest.reputation ?? "—"}</span><span>Отменённые заявки: ${latest.cancelledRequests}</span><span>Проблемы категории: ${latest.resultBonus || 0}</span><span>Модификаторы специалистов: ${money(latest.specialistModifier)}</span><span>Модификатор вопроса X: ${money(latest.questionModifier || 0)}</span><span>Бросок d6: ${latest.die}</span></div><div class="oss-calc-formula"><b>Расчёт</b><span>Результат: ${latest.area}/5 × ${latest.die} + ${money(latest.specialistModifier)}${latest.reputationModifier ? ` + ${money(latest.reputationModifier)}` : ""}${latest.resultBonus ? ` + ${latest.resultBonus}` : ""} = <strong>${money(latest.result)}</strong></span><span>Порог: ${latest.area}/2${latest.thresholdModifier ? ` + ${latest.thresholdModifier}` : ""}${latest.cancelledMultiplier ? ` + ${latest.cancelledRequests} × ${latest.cancelledMultiplier}` : ""}${latest.questionModifier ? ` + ${money(latest.questionModifier)}` : ""} = <strong>${money(latest.threshold)}</strong></span><strong class="oss-verdict ${latest.success ? "accepted" : "rejected"}" aria-label="${latest.success ? "ОСС принято" : "ОСС не принято"}">${latest.success ? "✓" : "×"}</strong></div>` : "";
    const animation = latest ? `<div class="oss-vote-animation"><div class="oss-vote-house" role="img" aria-label="Площадь за ${money(yesArea)} м², против ${money(againstArea)} м²"><span class="oss-house-fill oss-fill-yes" style="height:${fillPercent(yesArea)}"></span><span class="oss-house-fill oss-fill-against" style="height:${fillPercent(againstArea)};bottom:${fillPercent(yesArea)}"></span><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M5 42 50 5l45 37h-9v53H14V42Z"/></svg></div><div class="oss-vote-legend"><strong>${escapeHtml(latest.question)}</strong><span><i class="legend-yes"></i>За: ${money(yesArea)} м² · ${fillPercent(yesArea)}</span><span><i class="legend-against"></i>Против: ${money(againstArea)} м² · ${fillPercent(againstArea)}</span></div>${calcRows}</div>` : "";
    if (state.lastOssAnimationId && latest?.id === state.lastOssAnimationId) {
      disclosure.open = true;
      state.lastOssAnimationId = null;
    }
    list.innerHTML = `${animation}<ol>${state.ossHistory.map(record => {
      const result = `${record.area}/5 × ${record.die} + ${money(record.specialistModifier)}${record.reputationModifier ? ` + ${money(record.reputationModifier)}` : ""}${record.resultBonus ? ` + ${record.resultBonus}` : ""} = ${money(record.result)}`;
      const threshold = `${record.area}/2${record.thresholdModifier ? ` + ${record.thresholdModifier}` : ""}${record.cancelledMultiplier ? ` + ${record.cancelledRequests} × ${record.cancelledMultiplier}` : ""}${record.questionModifier ? ` + ${money(record.questionModifier)}` : ""} = ${money(record.threshold)}`;
      return `<li><strong>${escapeHtml(record.question)}${record.houseAddress ? ` · ${escapeHtml(record.houseAddress)}` : ""}</strong><span>Входные данные: площадь ${record.area} м² · репутация ${record.reputation ?? "—"} · отмены ${record.cancelledRequests} · проблемы категории ${record.resultBonus || 0} · специалисты ${money(record.specialistModifier)} · X ${money(record.questionModifier || 0)} · d6=${record.die}</span><span>Результат: ${result} ${record.success ? "≥" : "<"} порог: ${threshold} · <b class="oss-verdict-inline ${record.success ? "accepted" : "rejected"}">${record.success ? "✓ принято" : "× не принято"}</b></span></li>`;
    }).join("")}</ol>`;
  }

  function skipTariffOss(houseName) {
    const home = managedHomeByName(houseName);
    if (state.phase !== "annualReport" || !home || home.tariffOssResolvedYear === state.year) return;
    state.tariffOssAttempts += 1;
    setHomeField(home, "tariffOssResolvedYear", state.year);
    addLog(`Игрок пропустил ОСС на изменение тарифа в доме «${home.name}» (${home.address}).`);
    saveState(); render(); showToast(`ОСС по дому «${home.name}» пропущено.`);
  }

  function maxTariffIncreasePercent(reputation) {
    if (reputation < -10) return 2.5;
    if (reputation < 0) return 5;
    if (reputation < 10) return 7.5;
    if (reputation < 20) return 10;
    if (reputation < 30) return 20;
    if (reputation < 40) return 30;
    return 50;
  }

  function runTariffOss(houseName) {
    const home = managedHomeByName(houseName);
    if (state.phase !== "annualReport" || !home || home.tariffOssResolvedYear === state.year) return;
    const controls = [...elements.annualReport.querySelectorAll(".house-tariff-oss")].find(item => item.dataset.tariffHouse === houseName);
    const input = controls?.querySelector(".oss-tariff-increase");
    const requestedChange = Number(input?.value);
    if (!Number.isFinite(requestedChange) || requestedChange === 0) { showToast("Укажи ненулевое изменение тарифа."); input?.focus(); return; }
    const tariffBeforeVote = currentTariff(home);
    const maximumIncrease = Math.round(tariffBeforeVote * maxTariffIncreasePercent(state.reputation)) / 100;
    const change = requestedChange > 0 ? Math.min(requestedChange, maximumIncrease) : requestedChange;
    if (change === 0) { showToast("При текущем тарифе повышение невозможно."); input?.focus(); return; }
    if (tariffBeforeVote + change < 0) { showToast("Тариф не может стать ниже 0 ₽/м²."); input?.focus(); return; }
    state.tariffOssAttempts += 1;
    const direction = change > 0 ? "Повысить" : "Снизить";
    const homeCancelled = state.cancelledRequests.filter(card => card.houseName === home.name).length;
    const cappedRequest = requestedChange > change;
    const voteQuestion = `${direction} тариф на ${money(Math.abs(change))} ₽${cappedRequest ? ` (запрошено ${money(requestedChange)} ₽)` : ""}`;
    const vote = ossVote(voteQuestion, change, { includeReputation: true, area: home.area, cancelledCountOverride: homeCancelled, cancelledMultiplier: 2, logHouseAddress: home.address });
    setHomeField(home, "tariffOssResolvedYear", state.year);
    if (vote.success) {
      setHomeField(home, "tariffPerSquareMeter", Math.round((currentTariff(home) + change) * 100) / 100);
      addLog(`ОСС принято в доме «${home.name}» (${home.address}). Тариф ${change > 0 ? "повышен" : "снижен"} на ${money(Math.abs(change))} ₽: теперь ${money(currentTariff(home))} ₽/м².${requestedChange > change ? ` Запрошено повышение ${money(requestedChange)} ₽, применён предел ${maxTariffIncreasePercent(state.reputation)}% репутации.` : ""}`);
      showToast(`ОСС принято: тариф дома «${home.name}» теперь ${money(currentTariff(home))} ₽/м².${requestedChange > change ? ` Повышение ограничено ${maxTariffIncreasePercent(state.reputation)}%.` : ""}`);
    } else {
      addLog(`ОСС на изменение тарифа дома «${home.name}» не набрало кворум.${cappedRequest ? ` Запрошено повышение ${money(requestedChange)} ₽, в расчёте использован предел ${money(change)} ₽ (${maxTariffIncreasePercent(state.reputation)}% репутации).` : ""} Повторная попытка в этом отчёте недоступна.`);
      showToast(`ОСС дома «${home.name}» не набрало кворум. Попробовать снова в этом отчёте нельзя.${cappedRequest ? ` В расчёте применён предел ${maxTariffIncreasePercent(state.reputation)}%.` : ""}`);
    }
    saveState(); render();
  }

  function resolveOssCapitalRepair(category, houseName = state.houseName) {
    const voteKey = `${houseName}:${category}`;
    if (state.phase !== "drawing" || state.ossVoteUsedCategories.includes(voteKey)) return;
    const home = managedHomeByName(houseName);
    if (!home) return;
    const categoryProblems = state.houseProblems.filter(problem => problem.category === category && problem.houseName === houseName);
    const wear = categoryProblems.reduce((sum, problem) => sum + problem.wear, 0);
    if (!categoryProblems.length || wear < (CONFIG.oss?.capitalRepairWearThresholdPercent ?? 60)) return;
    const homeCancelled = state.cancelledRequests.filter(card => card.houseName === houseName).length;
    const vote = ossVote(`Капитальный ремонт: ${category}`, 0, { area: home.area, cancelledCountOverride: homeCancelled, resultBonus: categoryProblems.length, thresholdModifier: 1, logHouseAddress: home.address });
    state.ossVoteUsedCategories.push(voteKey);
    if (vote.success) {
      const repairedProblemIds = new Set(categoryProblems.map(problem => problem.id));
      const resolvedRequests = state.requests.filter(card => !card.resolved && !card.cancelled && card.problemCategory === category && repairedProblemIds.has(card.problemId));
      resolvedRequests.forEach(card => completeRequest(card, "oss"));
      state.houseProblems = state.houseProblems.filter(problem => !(problem.houseName === houseName && problem.category === category));
      const repairWarranty = { repairedTurn: state.turn, expiresTurn: state.turn + SEASONS.length * (CONFIG.rules.warrantyAgeYears ?? 3) * state.seasonDuration - 1 };
      if (home.primary) state.houseRepairWarranties[category] = repairWarranty;
      else home.repairWarranties[category] = repairWarranty;
      state.reputation += CONFIG.rules.clearedProblemCategoryReputationBonus;
      const outstandingCompensations = state.compensations.filter(claim => resolvedRequests.some(card => card.id === claim.requestId) && !claim.paid && !claim.writtenOff).reduce((sum, claim) => sum + claim.amount, 0);
      addLog(`ОСС приняло капитальный ремонт категории «${category}». Устранено проблем: ${categoryProblems.length}; автоматически выполнено связанных заявок: ${resolvedRequests.length}. Штрафы и компенсации сохранены${outstandingCompensations ? ` (компенсации к выплате: ${money(outstandingCompensations)} ₽)` : ""}. Репутация +${CONFIG.rules.clearedProblemCategoryReputationBonus}.`);
      updateHouseSafetyStatus();
    } else {
      home.capitalRepairOssRetryTurn = home.capitalRepairOssRetryTurn || {};
      home.capitalRepairOssRetryTurn[category] = state.turn + 1;
      addLog(`ОСС по капитальному ремонту категории «${category}» не набрало кворум. Проблемы остаются. Повторное голосование доступно со следующего хода.`);
    }
    saveState(); render(); showToast(vote.success ? `Капитальный ремонт «${category}» принят без затрат.` : "ОСС не набрало кворум.");
  }

  function renderOssCapitalRepairButtons() {
    const container = document.getElementById("oss-phase-actions");
    if (!container) return;
    const panel = document.getElementById("oss-agenda-panel");
    container.innerHTML = "";
    if (state.phase !== "drawing" && state.phase !== "problems") { if (panel) panel.hidden = true; return; }
    const seen = new Set();
    if (state.phase === "drawing") state.houseProblems.forEach(problem => {
      const houseName = problem.houseName || state.houseName;
      const voteKey = `${houseName}:${problem.category}`;
      if (seen.has(voteKey)) return;
      const retryTurn = managedHomeByName(houseName)?.capitalRepairOssRetryTurn?.[problem.category] || 0;
      if (retryTurn > state.turn || state.ossVoteUsedCategories.includes(voteKey)) return;
      seen.add(voteKey);
      const categoryProblems = state.houseProblems.filter(item => item.category === problem.category && item.houseName === houseName);
      const wear = categoryProblems.reduce((sum, item) => sum + item.wear, 0);
      if (wear < (CONFIG.oss?.capitalRepairWearThresholdPercent ?? 60)) return;
      const home = managedHomeByName(houseName);
      const button = document.createElement("button");
      button.type = "button"; button.className = "oss-repair-button"; button.dataset.ossCapitalRepair = problem.category;
      button.textContent = `Провести ОСС капремонта: ${problem.category} · ${home?.address || houseName} · износ ${wear}%`;
      button.addEventListener("click", () => resolveOssCapitalRepair(problem.category, houseName));
      container.append(button);
    });
    if (state.phase === "problems" && (hasLawyer() || hasEngineer())) {
      const warrantyGroups = [];
      for (const home of managedHomes()) {
        const problems = state.houseProblems.filter(problem => problem.houseName === home.name);
        if (!problems.length) continue;
        const warranties = home.primary ? state.houseRepairWarranties : home.repairWarranties;
        const newHomeWarranty = home.age < (CONFIG.rules.warrantyAgeYears ?? 3) || (home.warrantyUntilTurn || -1) >= state.turn || problems.some(problem => problem.warrantyEligible);
        if (newHomeWarranty) warrantyGroups.push({ home, key: "new-house", label: `${home.address} · гарантия застройщика · все проблемы`, problems });
        else {
          const categories = [...new Set(problems.map(problem => problem.category))];
          categories.forEach(category => {
            const expiry = warranties?.[category]?.expiresTurn;
            if (Number.isInteger(expiry) && expiry >= state.turn) warrantyGroups.push({ home, key: category, label: `${home.address} · ${category} · гарантия подрядчика по капитальному ремонту`, problems: problems.filter(problem => problem.category === category) });
          });
        }
      }
      for (const group of warrantyGroups) {
        const { home, key } = group;
        const caseKey = `${home.name}:${key}:${group.problems.map(problem => problem.id).sort().join(",")}`;
        const button = document.createElement("button");
        button.type = "button"; button.className = "oss-repair-button warranty-court-button";
        button.textContent = state.warrantyCourtCases.includes(caseKey) ? `${group.label} · дело уже рассмотрено` : `Подать иск по гарантии: ${group.label} · госпошлина ${money(CONFIG.rules.warrantyCourtFee)} ₽`;
        button.disabled = state.warrantyCourtCases.includes(caseKey) || state.capital < CONFIG.rules.warrantyCourtFee;
        button.addEventListener("click", () => fileWarrantyClaim(home.name, key, group.problems.map(problem => problem.id), caseKey));
        container.append(button);
      }
    }
    if (panel) panel.hidden = container.childElementCount === 0;
  }

  function fileWarrantyClaim(houseName, warrantyKey, problemIds, caseKey) {
    if (state.phase !== "problems" || !hasLawyer() || state.warrantyCourtCases.includes(caseKey)) return;
    const lawyer = activeEmployees().find(employee => employee.role === "lawyer");
    const legalStrength = Math.max(1, Math.min(3, lawyer?.legalStrength || 1));
    const successChance = CONFIG.rules.warrantySuccessChanceByLegalStrength?.[legalStrength - 1] ?? [0.3, 0.5, 0.9][legalStrength - 1];
    const fee = CONFIG.rules.warrantyCourtFee ?? 50;
    if (state.capital < fee) { showToast(`Для подачи иска нужна госпошлина ${money(fee)} ₽.`); return; }
    if (!changeCapital(-fee, "госпошлина по гарантии")) return;
    state.seasonFinancials.problemRepairs += fee;
    state.warrantyCourtCases.push(caseKey);
    const success = Math.random() < successChance;
    const coveredIds = new Set(problemIds);
    const affected = state.houseProblems.filter(problem => coveredIds.has(problem.id));
    addLog(`Суд по гарантии: юрист ${lawyer.name}, ЮС ${legalStrength}; госпошлина −${money(fee)} ₽; вероятность успеха ${Math.round(successChance * 100)}%; решение ${success ? "в пользу УК" : "отказ"}.`);
    if (success) {
      changeCapital(fee, "возврат госпошлины по выигранному гарантийному делу");
      state.seasonFinancials.problemRepairs = Math.max(0, state.seasonFinancials.problemRepairs - fee);
      addLog(`Суд выигран: госпошлина ${money(fee)} ₽ возвращена компании.`);
      const categories = new Set(affected.map(problem => problem.category));
      const resolvedRequests = state.requests.filter(card => !card.resolved && !card.cancelled && coveredIds.has(card.problemId));
      resolvedRequests.forEach(card => completeRequest(card, "warranty"));
      const relatedRequests = state.requests.filter(card => coveredIds.has(card.problemId));
      const claims = new Set(relatedRequests.map(card => card.id));
      state.compensations.filter(claim => (claims.has(claim.requestId) || coveredIds.has(claim.problemId)) && !claim.paid && !claim.writtenOff).forEach(claim => { claim.paid = true; claim.paidBy = "developer"; claim.status = "paid"; });
      state.penalties.filter(penalty => (claims.has(penalty.requestId) || coveredIds.has(penalty.problemId)) && !penalty.paid && !penalty.writtenOff).forEach(penalty => { penalty.writtenOff = true; penalty.writtenOffBy = "developer"; });
      state.houseProblems = state.houseProblems.filter(problem => !coveredIds.has(problem.id));
      const home = managedHomeByName(houseName);
      const warranties = home?.primary ? state.houseRepairWarranties : home?.repairWarranties;
      categories.forEach(category => { warranties[category] = { repairedTurn: state.turn, expiresTurn: state.turn + SEASONS.length * (CONFIG.rules.warrantyAgeYears ?? 3) * state.seasonDuration - 1 }; });
      if (warrantyKey === "new-house" && home) {
        if (home.primary) state.houseWarrantyUntilTurn = state.turn + SEASONS.length * (CONFIG.rules.warrantyAgeYears ?? 3) * state.seasonDuration - 1;
        else home.warrantyUntilTurn = state.turn + SEASONS.length * (CONFIG.rules.warrantyAgeYears ?? 3) * state.seasonDuration - 1;
      }
      addLog(`По гарантии устранено проблем: ${affected.length}; связанных заявок закрыто: ${resolvedRequests.length}; компенсации по ${state.compensations.filter(claim => (claims.has(claim.requestId) || coveredIds.has(claim.problemId)) && claim.paidBy === "developer").length} случаям ущерба сняты застройщиком; штрафов по заявкам этой проблемы списано: ${state.penalties.filter(penalty => (claims.has(penalty.requestId) || coveredIds.has(penalty.problemId)) && penalty.writtenOffBy === "developer").length}. Работы запускают новый гарантийный срок.`);
      updateHouseSafetyStatus();
      if (!state.houseProblems.length) state.phase = "drawing";
    }
    if (checkBankruptcy()) { saveState(); render(); return; }
    saveState(); render(); showToast(success ? "Иск удовлетворён: застройщик устраняет проблемы без затрат на работы и материалы." : "Суд отказал в иске; госпошлина списана.");
  }

  function resolveWithMoney(index, contractorSuppliesMaterials = false) {
    const card = state.requests[index];
    if (!card || card.resolved || state.phase !== "resolving") return;
    const baseMaterialCost = requestMaterialPurchaseCost(card);
    const contractorMaterialCost = contractorSuppliesMaterials
      ? requestMaterialUnits(card) * materialUnitCost(true) * CONFIG.economy.materialMarketPriceMultiplier
      : baseMaterialCost;
    const cashCost = requestContractorWorkCost(card) + contractorMaterialCost;
    if (!changeCapital(-cashCost, "оплата подрядчика")) return;
    const materialUnits = requestMaterialUnits(card);
    const materialStockUsed = contractorSuppliesMaterials ? 0 : consumeMaterials(materialUnits);
    const materialPurchase = contractorMaterialCost;
    if (materialPurchase) state.seasonFinancials.materials += materialPurchase;
    state.seasonFinancials.contractors += requestContractorWorkCost(card);
    if (!changeCapital(card.payout, "доход по платной заявке")) return;
    state.seasonFinancials.paidIncome += card.payout || 0;
    completeRequest(card, "contractor");
    addLog(card.payout ? `Платная заявка «${card.title}» выполнена через подрядчика. Расход: ${money(cashCost)} ₽, доход: ${money(card.payout)} ₽.` : contractorSuppliesMaterials
      ? `Заявка «${card.title}» выполнена подрядчиком с его материалами: работы ${money(requestContractorWorkCost(card))} ₽, материалы ${quantity(materialUnits)} ед. по рыночной цене ${money(materialPurchase)} ₽. Со склада ничего не списано.`
      : `Решена заявка «${card.title}» оплатой. Расход: ${money(cashCost)} ₽; материалов ${quantity(materialUnits)} ед. (склад ${quantity(materialStockUsed)}, покупка ${quantity(materialUnits - materialStockUsed)}).`);
    checkBankruptcy();
    saveState(); render(); showToast(card.payout ? `Подрядчик выполнит работу: +${money(card.payout - cashCost)} ₽ прибыли` : `Заявка оплачена: −${money(cashCost)} ₽`);
  }

  function resolveWithEmployee(index, employeeId) {
    const card = state.requests[index];
    const employee = activeEmployees().find(person => person.id === employeeId);
      if (!card || card.resolved || card.cancelled || !employee || ROLES[employee.role].category !== card.category || state.phase !== "resolving") return;
    const plan = overtimeFor(employee, card.labor);
    const materialUnits = requestMaterialUnits(card);
    const materialCost = requestMaterialPurchaseCost(card);
    const materialAndBonus = plan.premium + materialCost;
    if (!canCoverRequiredCost(materialAndBonus)) { showToast("Не хватает денег на материалы и премию."); return; }
    employee.assignedLabor = plan.laborAfter;
    if (!changeCapital(-materialCost, "материалы по заявке")) return;
    const materialStockUsed = consumeMaterials(materialUnits);
    if (materialCost) state.seasonFinancials.materials += materialCost;
    if (plan.premium) {
      if (!changeCapital(-plan.premium, "премия за переработку")) return;
      state.seasonFinancials.salaries += plan.premium;
      const overtimeLog = [`${roleName(employee.role)} ${employee.name} выполнил заявку «${card.title}» с переработкой.`];
      if (plan.hrMultiplier < 1) {
        const hr = activeEmployees().find(person => person.role === "hr");
        overtimeLog.push(`HR-менеджер ${hr?.name || ""} уменьшил доплату за переработку в ${money(plan.basePremium)} ₽ вдвое: −${money(plan.basePremium - plan.premium)} ₽.`);
      } else overtimeLog.push(`Премия за переработку рассчитана: ${money(plan.premium)} ₽.`);
      overtimeLog.push(`${card.type === "paid" ? "Материалы оплачивает заявитель" : `Материалов ${quantity(materialUnits)} ед. (склад ${quantity(materialStockUsed)}, покупка ${money(materialCost)} ₽)`}; выплаченная премия: ${money(plan.premium)} ₽.`);
      addLogSequence(overtimeLog);
    } else {
      addLog(`${roleName(employee.role)} ${employee.name} выполнил заявку «${card.title}» в пределах продуктивности. ${card.type === "paid" ? "Материалы оплатил заявитель." : `Материалов использовано ${quantity(materialUnits)} ед. (склад ${quantity(materialStockUsed)}, покупка ${money(materialCost)} ₽).`}`);
    }
    if (!changeCapital(card.payout, "доход по платной заявке")) return;
    state.seasonFinancials.paidIncome += card.payout || 0;
    completeRequest(card, "employee");
    checkBankruptcy();
    saveState(); render(); showToast(card.payout ? `${roleName(employee.role)} выполнил платную заявку: доход +${money(card.payout)} ₽` : plan.premium ? `Работа выполнена, премия −${money(plan.premium)} ₽` : `${roleName(employee.role)} выполнил заявку.`);
  }

  function resolveWithoutPremium(index, employeeId) {
    const card = state.requests[index];
    const employee = activeEmployees().find(person => person.id === employeeId);
    if (!card || card.resolved || card.cancelled || !employee || state.phase !== "resolving" || ROLES[employee.role].category !== card.category) return;
    const plan = overtimeFor(employee, card.labor);
    if (!plan.premium) return;
    const materialUnits = requestMaterialUnits(card);
    const materialCost = requestMaterialPurchaseCost(card);
    if (!canCoverRequiredCost(materialCost)) { showToast("Не хватает денег на материалы."); return; }
    employee.assignedLabor = plan.laborAfter;
    if (!changeCapital(-materialCost, "материалы по заявке")) return;
    const materialStockUsed = consumeMaterials(materialUnits);
    if (materialCost) state.seasonFinancials.materials += materialCost;
    if (!changeCapital(card.payout, "доход по платной заявке")) return;
    state.seasonFinancials.paidIncome += card.payout || 0;
    employee.unpaidOvertime = true;
    setDissatisfied(employee);
    completeRequest(card, "employee");
    checkBankruptcy();
    addLog(`${roleName(employee.role)} выполнил заявку «${card.title}» без премии за переработку (${money(plan.premium)} ₽). ${card.type === "paid" ? "Материалы оплатил заявитель." : `Материалов использовано ${quantity(materialUnits)} ед. (со склада ${quantity(materialStockUsed)}, покупка ${money(materialCost)} ₽).`} Доход: ${money(card.payout)} ₽. Лояльность снизится на 1 после расчёта ЗП и БО.`);
    saveState(); render(); showToast(`${roleName(employee.role)} выполнил заявку без премии; лояльность снизится после расчёта ЗП и БО.`);
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
    const liabilityLog = [];
    advanceLiabilityTimers(liabilityLog);
    if (liabilityLog.length) addLogSequence(liabilityLog);
    if (state.phase === "bankruptcy") return;
    state.hiresThisTurn = 0;
    state.engineerMaterialsUsed = [];
    state.ossVoteTurn = state.turn;
    state.ossVoteUsedCategories = [];
    state.lawyerActionTaken = false;
    state.lawyerActionsUsed = [];
    state.pendingHireIds = [];
    state.pendingFireActions = {};
    state.marketRerollUsedTurn = null;
    state.employees.forEach(employee => { employee.assignedLabor = 0; employee.unpaidOvertime = false; employee.withholdPercent = Number(employee.anchoredWithholdPercent) || 0; });
    processEmployeeEvents();
    state.market = makeMarket(state.employees);
    const marketHR = activeEmployees().find(employee => employee.role === "hr" && employee.bonus === "expandedMarket");
    if (marketHR) addLog(`HR-менеджер ${marketHR.name} расширил рынок труда. На выборке ${currentMarketExecutors()} исполнителя и ${currentMarketSpecialists()} специалиста.`);
  }

  function endTurn() {
    if (["staffing", "inspection", "problems", "drawing"].includes(state.phase)) { advanceTurnPhase(); return; }
    if (state.phase === "resolving" && (hasLawyer() || hasEngineer())) {
      state.phase = "legal";
      state.lawyerActionTaken = false;
      state.lawyerActionsUsed = [];
      state.engineerMaterialsUsed = [];
      saveState(); render(); showToast("Распределение завершено. Специалисты могут выполнить задачи.");
      return;
    }
    if (state.phase === "legal") {
      state.phase = "payroll";
      saveState(); render(); showToast("Задачи специалистам завершены. Теперь выплати зарплаты.");
      return;
    }
    if (state.phase === "resolving") {
      state.phase = "payroll";
      saveState(); render(); showToast("Распределение завершено. Теперь выплати зарплаты.");
      return;
    }
    if (state.phase === "payroll") { paySalaries(); return; }
    if (state.phase === "collection") collectSeason();
  }

  function paySalaries() {
    if (state.phase !== "payroll") return;
    let payroll = 0;
    const payrollPlan = [];
    state.employees.forEach(employee => {
      if (employee.deceased) return;
      const gross = effectiveSalary(employee);
      const adjustmentPercent = employee.withholdPercent || 0;
      const adjustment = gross * adjustmentPercent / 100;
      payroll += gross - adjustment;
      payrollPlan.push({ employee, gross, adjustment, adjustmentPercent });
    });
    if (payroll) {
      if (!changeCapital(-payroll, "выплата зарплат")) return;
      state.seasonFinancials.salaries += payroll;
      addLog(`Выплачены зарплаты и премии: −${money(payroll)} ₽.`);
    }
    payrollPlan.forEach(({ employee, adjustment, adjustmentPercent }) => {
      if (adjustment > 0) {
        employee.withheldAmount = (employee.withheldAmount || 0) + adjustment;
        state.withheldWages += adjustment;
        employee.noWithholdPayStreak = 0;
        employee.noPremiumPayStreak = 0;
        employee.fullSalaryStreak = 0;
        addLog(`Удержано ${money(adjustment)} ₽ из зарплаты ${employee.name}; проверка изменения лояльности на −1 с вероятностью ${Math.round(adjustmentPercent)}% пройдёт после сбора БО.`);
      } else if (adjustment < 0) {
        employee.noWithholdPayStreak = 0;
        employee.noPremiumPayStreak = 0;
        employee.fullSalaryStreak = 0;
        addLog(`Премия ${employee.name} составила ${money(-adjustment)} ₽; проверка изменения лояльности на +1 с вероятностью ${Math.round(Math.abs(adjustmentPercent))}% пройдёт после сбора БО.`);
      } else {
        employee.noPremiumPayStreak = (employee.noPremiumPayStreak || 0) + 1;
        const allWithheldPaid = (employee.withheldAmount || 0) <= 0 && adjustmentPercent <= 0;
        employee.noWithholdPayStreak = allWithheldPaid ? (employee.noWithholdPayStreak || 0) + 1 : 0;
        if (adjustmentPercent === 0 && employee.unpaidOvertime) employee.loyaltyQuietStreak = 0;
      }
      if (employee.probationTurns > 0) employee.probationTurns -= 1;
    });
    if (checkBankruptcy()) {
      saveState(); render(); showToast(`После выплаты зарплат баланс достиг ${money(BANKRUPTCY_THRESHOLD)} ₽. Необходимо объявить банкротство.`);
      return;
    }
    state.phase = "collection";
    saveState(); render(); showToast(`Зарплаты выплачены: −${money(payroll)} ₽. Теперь собери содержание.`);
  }

  function payWithheldWages() {
    if (state.withheldWages <= 0) return;
    const amount = state.withheldWages;
    if (state.capital < amount) { showToast(`Для выплаты удержанных зарплат нужно ${money(amount)} ₽.`); return; }
    if (!changeCapital(-amount, "выплата удержанных зарплат")) return;
    state.seasonFinancials.salaries += amount;
    state.employees.forEach(employee => { employee.withheldAmount = 0; });
    state.withheldWages = 0;
    addLog(`Выплачены все удержанные зарплаты: −${money(amount)} ₽.`);
    checkBankruptcy(); saveState(); render(); showToast(`Удержанные зарплаты выплачены: −${money(amount)} ₽.`);
  }

  function payEmployeeWithheldWages(employeeId) {
    const employee = state.employees.find(item => item.id === employeeId);
    const amount = Number(employee?.withheldAmount) || 0;
    if (!employee || amount <= 0) return;
    if (state.capital < amount) { showToast(`Для выплаты удержанной зарплаты ${employee.name} нужно ${money(amount)} ₽.`); return; }
    if (!changeCapital(-amount, `выплата удержанной зарплаты ${employee.name}`)) return;
    employee.withheldAmount = 0;
    state.withheldWages = Math.max(0, Math.round((state.withheldWages - amount) * 100) / 100);
    state.seasonFinancials.salaries += amount;
    addLog(`Выплачена удержанная зарплата ${employee.name}: −${money(amount)} ₽.`);
    checkBankruptcy(); saveState(); render(); showToast(`Удержанная зарплата ${employee.name} выплачена: −${money(amount)} ₽.`);
  }

  function applyEmployeeLoyaltyAfterPayroll(logs) {
    state.employees.forEach(employee => {
      if (employee.deceased) return;
      const before = loyaltyOf(employee), adjustment = Number(employee.withholdPercent) || 0;
      if (adjustment > 0) {
        employee.loyaltyQuietStreak = 0;
        if (Math.random() < adjustment / 100) changeLoyalty(employee, -1);
        logs.push(`${employee.name}: удержание ${adjustment}% — лояльность ${before} → ${loyaltyOf(employee)}.`);
      } else if (adjustment < 0) {
        employee.loyaltyQuietStreak = 0;
        if (Math.random() < Math.abs(adjustment) / 100) changeLoyalty(employee, 1);
        logs.push(`${employee.name}: премия ${Math.abs(adjustment)}% — лояльность ${before} → ${loyaltyOf(employee)}.`);
      } else if (!employee.unpaidOvertime && (employee.withheldAmount || 0) <= 0) {
        const recovered = neutralLoyaltyRecovery(employee);
        logs.push(recovered ? `${employee.name}: после периода без удержаний лояльность ${before} → ${loyaltyOf(employee)}.` : `${employee.name}: без доплат и удержаний (${employee.loyaltyQuietStreak} ход подряд), лояльность ${loyaltyOf(employee)}.`);
      } else employee.loyaltyQuietStreak = 0;
      if (employee.unpaidOvertime) {
        employee.loyaltyQuietStreak = 0;
        changeLoyalty(employee, -1);
        logs.push(`${employee.name}: переработка без доплаты — дополнительное снижение лояльности на 1.`);
      }
      employee.mood = moodOf(employee);
    });
  }

  function collectSeason() {
    if (state.phase !== "collection") return;
    const seasonLog = [];
    const homes = managedHomes();
    const grossCharge = homes.reduce((sum, home) => sum + home.area * currentTariff(home), 0);
    const unresolvedCount = state.requests.filter(card => !card.resolved && !card.cancelled).length;
    const seasonWillEnd = state.seasonTurnIndex >= state.seasonDuration - 1;
    const maintenanceBase = homes.reduce((sum, home) => sum + (Number.isFinite(home.baseMaintenance) ? home.baseMaintenance : state.baseMaintenance), 0);
    const maintenance = effectiveBaseMaintenanceTotal();
    if (maintenanceBase > 0) {
      seasonLog.push(`Базовое обслуживание до скидок специалистов: ${money(maintenanceBase)} ₽.`);
      let discountPercent = 0;
      activeEmployees().filter(employee => employee.role === "accountant" && employee.bonus === "discountMaintenance").forEach(employee => {
        const appliedPercent = Math.min(CONFIG.rules.accountantMaintenanceDiscountPercent, 100 - discountPercent);
        if (appliedPercent > 0) {
          const reduction = maintenanceBase * appliedPercent / 100;
          seasonLog.push(`Бухгалтер ${employee.name} снизил стоимость БО на ${appliedPercent}%: −${money(reduction)} ₽.`);
          discountPercent += appliedPercent;
        }
      });
      seasonLog.push(`Итоговое базовое обслуживание: ${money(maintenance)} ₽.`);
    }
    if (!changeCapital(-maintenance, "базовое обслуживание")) return;
    state.seasonFinancials.upkeep += maintenance;
    if (maintenance) seasonLog.push(`Оплачено базовое обслуживание: −${money(maintenance)} ₽.`);
    if (checkBankruptcy()) {
      addLogSequence(seasonLog);
      saveState(); render(); showToast(`После обязательных расходов баланс достиг ${money(BANKRUPTCY_THRESHOLD)} ₽. Необходимо объявить банкротство.`);
      return;
    }
    const maximumCollectionRate = Math.min(100, CONFIG.economy.collectionMaxPercent);
    const accountantCollectionBonuses = activeEmployees().filter(employee => employee.role === "accountant" && employee.bonus === "raiseCollection");
    const houseResults = homes.map(home => {
      const baseRate = CONFIG.economy.collectionMinPercent + Math.floor(Math.random() * (CONFIG.economy.collectionMaxPercent - CONFIG.economy.collectionMinPercent + 1));
      let rate = Math.min(maximumCollectionRate, baseRate);
      seasonLog.push(`Дом «${home.name}» (${home.address}): собираемость выпала ${baseRate}%.`);
      accountantCollectionBonuses.forEach(employee => {
        const increase = Math.max(0, Math.min(CONFIG.rules.accountantCollectionBonusPercent, maximumCollectionRate - rate));
        if (increase > 0) {
          const previousRate = rate;
          rate += increase;
          seasonLog.push(`Бухгалтер ${employee.name} повысил собираемость дома «${home.name}» на ${increase} п.п.: ${previousRate}% + ${increase} п.п. = ${rate}%.`);
        } else seasonLog.push(`Бухгалтер ${employee.name} не изменил собираемость дома «${home.name}»: достигнут предел ${maximumCollectionRate}%.`);
      });
      const billed = home.area * currentTariff(home);
      const collected = Math.round(billed * rate / 100);
      return { home, rate, billed, collected, unpaid: billed - collected };
    });
    const income = houseResults.reduce((sum, result) => sum + result.collected, 0);
    const collectionRate = grossCharge > 0 ? Math.round(income / grossCharge * 100) : 0;
    houseResults.forEach(({ home, rate }) => seasonLog.push(`Итоговая собираемость дома «${home.name}»: ${rate}%.`));
    if (!changeCapital(income, "сбор платежей")) return;
    const directorSalary = Math.round(maximumPortfolioCollection() * state.directorSalaryPercent) / 100;
    if (directorSalary > 0) {
      changeCapital(-directorSalary, "зарплата директора");
      state.founderAccount = Math.round((state.founderAccount + directorSalary) * 100) / 100;
      seasonLog.push(`Зарплата директора (${state.directorSalaryPercent}% от максимально возможного сбора): −${money(directorSalary)} ₽ из бюджета, +${money(directorSalary)} ₽ на счёт учредителя.`);
    }
    houseResults.forEach(({ home, rate, billed, collected, unpaid }) => {
      const stats = { billed: home.collectionStats?.billed || 0, collected: home.collectionStats?.collected || 0, periods: home.collectionStats?.periods || 0 };
      stats.billed += billed; stats.collected += collected; stats.periods += 1;
      setHomeField(home, "collectionStats", stats);
      setHomeField(home, "lastCollectionRate", rate);
      if (hasAccountant()) setHomeField(home, "debtRecoverable", (home.debtRecoverable || 0) + unpaid);
      else {
        setHomeField(home, "debtIrrecoverable", (home.debtIrrecoverable || 0) + (home.debtRecoverable || 0));
        setHomeField(home, "debtRecoverable", unpaid);
      }
      if (unpaid) seasonLog.push(hasAccountant() ? `Бухгалтерия сохранила долг дома «${home.name}»: ${money(unpaid)} ₽.` : `Без бухгалтера долг дома «${home.name}» учитывается только за этот период: ${money(unpaid)} ₽.`);
      seasonLog.push(`Собрано с дома «${home.name}»: +${money(collected)} ₽ из ${money(billed)} ₽.`);
    });
    applyEmployeeLoyaltyAfterPayroll(seasonLog);
    const overdueRequests = state.requests.filter(card => !card.resolved && !card.cancelled && requestIsOverdue(card));
    const noOverdueMarketers = activeEmployees().filter(employee => employee.role === "marketer" && employee.bonus === "noOverdueReputation");
    if (!overdueRequests.length && noOverdueMarketers.length) {
      state.reputation += noOverdueMarketers.length;
      noOverdueMarketers.forEach(employee => seasonLog.push(`Маркетолог ${employee.name}: просроченных заявок нет, репутация +1 за ход.`));
    }
    refreshPortfolioTotals();
    state.lastSeasonFinancials = { collection: income, paidIncome: state.seasonFinancials.paidIncome, upkeep: state.seasonFinancials.upkeep, salaries: state.seasonFinancials.salaries, fines: seasonFinePayments(), compensation: seasonCompensationPayments(), problemRepairs: state.seasonFinancials.problemRepairs, contractors: state.seasonFinancials.contractors, materials: state.seasonFinancials.materials, averageTariff: averageManagedTariff() };
    state.financialHistory.push({ year: state.year, seasonIndex: state.seasonIndex, seasonTurnIndex: state.seasonTurnIndex, ...state.lastSeasonFinancials, capital: state.capital, collectionRate, reputation: state.reputation });
    state.seasonFinancials = { upkeep: 0, salaries: 0, paidIncome: 0, problemRepairs: 0, contractors: 0, materials: 0 };
    seasonLog.push(`Собрано платежей: +${money(income)} ₽.`);
    checkBankruptcy();
    if (state.phase === "bankruptcy") {
      addLogSequence(seasonLog);
      saveState(); render(); showToast(`После расчёта финансов за ход баланс достиг ${money(BANKRUPTCY_THRESHOLD)} ₽. Необходимо объявить банкротство.`);
      return;
    }
    const expiredUnsafeHomes = seasonWillEnd ? state.additionalHomes.filter(home => home.unsafeSinceTurn != null && state.turn - home.unsafeSinceTurn >= CONFIG.rules.unsafeHouseGraceSeasons * state.seasonDuration).map(home => home.name) : [];
    expiredUnsafeHomes.forEach(homeName => recognizeHouseAsUnsafe(false, homeName));
    const unsafeDeadlineReached = seasonWillEnd && state.houseUnsafeSinceTurn != null && state.turn - state.houseUnsafeSinceTurn >= CONFIG.rules.unsafeHouseGraceSeasons * state.seasonDuration;
    if (unsafeDeadlineReached && !state.houseRemoved) recognizeHouseAsUnsafe(false, state.houseName);
    if (seasonWillEnd) runReputationHouseVotes(seasonLog);
    addLogSequence(seasonLog);
    if (state.phase === "gameOver") { saveState(); render(); return; }
    if (seasonWillEnd && state.houses === 0 && availableRealEstateHomes().length === 0 && CONFIG.rules.unsafeHouseEndsGame && state.seasonIndex !== CONFIG.rules.annualReportSeasonIndex) {
      cancelUnresolvedForAnnualReport();
      const maintenanceGrowth = applyAnnualMaintenanceGrowth();
      const comparisonStart = previousAnnualReportReputation();
      const annualReputation = applyAnnualReputation();
      const { cancellationPenalty, marketerBonus, unsafeHousePenalty, solvencyBonus, cleanHouseBonus } = annualReputation.changes;
      if (annualReputation.delta) addLog(`Годовой расчёт репутации: ${annualReputation.delta > 0 ? "+" : ""}${annualReputation.delta} (${cancellationPenalty} штраф за отмены, +${marketerBonus} от маркетологов, ${unsafeHousePenalty ? `−${unsafeHousePenalty} за аварийный дом${state.unsafeHousePenaltyYear === state.year ? " (уже учтено при признании)" : ""}` : "без штрафа за аварийный дом"}, +${solvencyBonus} за отсутствие долгов, +${cleanHouseBonus} за отсутствие отмен).`);
      state.lastAnnualReport = {
        year: state.year,
        capitalStart: state.yearStats.capitalStart,
        capitalEnd: state.capital,
        yearStats: { ...state.yearStats },
        totals: { ...state.totals },
        maintenanceGrowth,
        reputation: { start: annualReputation.start, comparisonStart, end: state.reputation, ...annualReputation.changes }
      };
      state.phase = "annualReport";
    } else if (seasonWillEnd && state.seasonIndex === CONFIG.rules.annualReportSeasonIndex) {
      cancelUnresolvedForAnnualReport();
      const maintenanceGrowth = applyAnnualMaintenanceGrowth();
      const comparisonStart = previousAnnualReportReputation();
      const annualReputation = applyAnnualReputation();
      const { cancellationPenalty, marketerBonus, unsafeHousePenalty, solvencyBonus, cleanHouseBonus } = annualReputation.changes;
      addLog(`Годовой расчёт репутации: ${annualReputation.delta >= 0 ? "+" : ""}${annualReputation.delta} (${cancellationPenalty} штраф за отмены, +${marketerBonus} от маркетологов, ${unsafeHousePenalty ? `−${unsafeHousePenalty} за аварийный дом${state.unsafeHousePenaltyYear === state.year ? " (уже учтено при признании)" : ""}` : "без штрафа за аварийный дом"}, +${solvencyBonus} за отсутствие долгов, +${cleanHouseBonus} за отсутствие отмен).`);
      state.lastAnnualReport = { year: state.year, capitalStart: state.yearStats.capitalStart, capitalEnd: state.capital, yearStats: { ...state.yearStats }, totals: { ...state.totals }, maintenanceGrowth, reputation: { start: annualReputation.start, comparisonStart, end: state.reputation, ...annualReputation.changes } };
      state.phase = "annualReport";
    } else {
      if (unresolvedCount) addLog(`На следующий сезон перенесено нерешённых заявок: ${unresolvedCount}.`);
      state.turn += 1;
      if (seasonWillEnd) { state.seasonTurnIndex = 0; state.seasonIndex = (state.seasonIndex + 1) % SEASONS.length; }
      else state.seasonTurnIndex += 1;
      state.requests = state.requests.filter(card => !card.resolved && !card.cancelled);
      if (!chargeFounderLoanPayments()) { saveState(); render(); return; }
      startStaffingPhase();
    }
    saveState(); render();
    showToast(`БО −${money(maintenance)} ₽ · собираемость ${collectionRate}% · +${money(income)} ₽`);
  }

  function startNewYear() {
    if (state.phase !== "annualReport" || (state.houses === 0 && availableRealEstateHomes().length === 0 && CONFIG.rules.unsafeHouseEndsGame)) return;
    const tariffOssSkippedHomes = managedHomes().filter(home => home.tariffOssResolvedYear !== state.year);
    if (managedHomes().length && tariffOssSkippedHomes.length === 0) {
      const bonus = CONFIG.oss?.tariffOssSkippedReputationBonus ?? 1;
      state.reputation += bonus;
      if (state.lastAnnualReport?.year === state.year) {
        state.lastAnnualReport.reputation.end = state.reputation;
        state.lastAnnualReport.reputation.tariffNoAttemptBonus = (state.lastAnnualReport.reputation.tariffNoAttemptBonus || 0) + bonus;
      }
      if (state.financialHistory.length) state.financialHistory[state.financialHistory.length - 1].reputation = state.reputation;
      addLog(`По каждому дому проведено ОСС на изменение тарифа или игрок явно отказался от голосования. Репутация +${bonus}.`);
    }
    state.year += 1;
    state.employees.forEach(employee => { employee.age = Math.min(60, (Number(employee.age) || 20) + 1); });
    state.houseAge += 1;
    state.additionalHomes.forEach(home => {
      home.age = (Number(home.age) || 0) + 1;
      home.repairWarranties = Object.fromEntries(Object.entries(home.repairWarranties || {}).filter(([, warranty]) => warranty.expiresTurn >= state.turn));
      if (home.warrantyUntilTurn < state.turn) home.warrantyUntilTurn = null;
    });
    state.seasonIndex = (state.startingSeasonIndex + 1) % SEASONS.length;
    state.seasonTurnIndex = 0;
    state.turn += 1;
    if (!chargeFounderLoanPayments()) { saveState(); render(); return; }
    const liabilityLog = [];
    advanceLiabilityTimers(liabilityLog);
    if (liabilityLog.length) addLogSequence(liabilityLog);
    if (state.phase === "bankruptcy") { saveState(); render(); return; }
    state.phase = "staffing";
    state.requests = state.requests.filter(card => !card.resolved && !card.cancelled && isEmergency(card));
    state.yearStats = { capitalStart: state.capital, ...EMPTY_COUNTS };
    state.houseRepairWarranties = Object.fromEntries(Object.entries(state.houseRepairWarranties || {}).filter(([, warranty]) => warranty.expiresTurn >= state.turn));
    if (state.houseWarrantyUntilTurn < state.turn) state.houseWarrantyUntilTurn = null;
    state.warrantyCourtCases = [];
    state.tariffOssResolvedYear = null;
    state.tariffOssAttempts = 0;
    state.ossVoteTurn = state.turn;
    state.ossVoteUsedCategories = [];
    state.hiresThisTurn = 0;
    state.lawyerActionTaken = false;
    state.lawyerActionsUsed = [];
    state.pendingHireIds = [];
    state.pendingFireActions = {};
    state.marketRerollUsedTurn = null;
    state.employees.forEach(employee => { employee.assignedLabor = 0; employee.unpaidOvertime = false; employee.withholdPercent = Number(employee.anchoredWithholdPercent) || 0; });
    processEmployeeEvents();
    state.market = makeMarket(state.employees);
    addLog(`Начался ${state.year} год. Сезон: ${SEASONS[state.seasonIndex]}. Стартовый капитал: ${money(state.capital)} ₽. Нерешённых аварийных заявок перенесено: ${state.requests.length}.`);
    saveState(); render(); showToast(`Год ${state.year}: ${SEASONS[state.seasonIndex].toLowerCase()}. Начинай новый цикл.`);
  }

  function processEmployeeEvents() {
    const departed = [];
    state.employees = state.employees.filter(employee => {
      const pending = employee.pendingDeparture;
      if (!employee.deceased && pending && !pending.needsResponse && pending.turn < state.turn) {
        departed.push({ employee, pending });
        return false;
      }
      return true;
    });
    departed.forEach(({ employee, pending }) => {
      countEvent("fired");
      addLog(`${employee.name} покинул штат после последнего рабочего хода. Причина: «${pending.label}».`);
    });

    for (const employee of activeEmployees()) {
      if (employee.pendingDeparture || employee.deceased) continue;
      const hrPresent = activeEmployees().some(person => person.role === "hr");
      const causes = [
        { reason: "death", label: "Смерть сотрудника", chance: loyaltyOf(employee) >= -4 ? boundedProbability(employee.age / 20) : 0, immediate: true },
        { reason: "health", label: "Проблемы со здоровьем", chance: boundedProbability(1 + employee.age / 10), needsResponse: true },
        { reason: "outsideOffer", label: "Получил предложение от конкурента", chance: outsideOfferChance(employee), needsResponse: true },
        { reason: "lowReputation", label: "Увольнение из-за плохой репутации УО", chance: lowReputationDepartureChance(employee), needsResponse: true },
        { reason: "dissatisfaction", label: "Увольнение по собственному желанию", chance: moodTurnoverChance(employee), needsResponse: true }
      ].filter(cause => cause.chance > 0);
      // Каждый сотрудник проходит отдельную проверку; выбирается не более одной причины.
      let departure = null;
      for (const cause of causes) if (Math.random() < cause.chance) { departure = cause; break; }
      if (!departure) continue;
      departure.turn = state.turn + (!departure.immediate && departure.reason !== "health" && hrPresent ? state.seasonDuration - 1 : 0);
      departure.season = state.seasonIndex;
      employee.pendingDeparture = departure;
      if (departure.immediate) {
        employee.deceased = true;
        employee.pendingDeparture.settlementDueTurn = state.turn + 1;
        addLog(`${employee.name}, ${employee.age} лет, умер. Он немедленно выведен из трудоспособности. При отказе выплатить семье последнюю зарплату репутация снизится на 1.`);
      } else if (departure.needsResponse) {
        if (departure.reason === "outsideOffer") addLog(`${employee.name}: предложение от конкурента (шанс ${Math.round(departure.chance * 100)}%). Можно предложить повышение ЗП на ${hrPresent ? 10 : CONFIG.rules.employeeRetentionSalaryIncreasePercent ?? 20}%.`);
        else if (departure.reason === "health") addLog(`${employee.name}: проблемы со здоровьем (шанс ${Math.round(departure.chance * 100)}%). Лечение стоит ${money(effectiveSalary(employee) * 3)} ₽ и устанавливает лояльность +5.`);
        else if (departure.reason === "dissatisfaction") addLog(`${employee.name} хочет уволиться из-за лояльности ${loyaltyOf(employee)}. Можно погасить удержания и предложить премию; вероятность остаться зависит от размера премии.`);
        else addLog(`${employee.name} хочет покинуть компанию из-за репутации ${state.reputation} (шанс ${Math.round(departure.chance * 100)}%).`);
      } else {
        addLog(`${employee.name} решил уйти: «${departure.label}» (шанс ${Math.round(departure.chance * 100)}%).`);
      }
    }
  }

  function showToast(message) {
    elements.toast.textContent = message; elements.toast.classList.add("visible");
    window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), CONFIG.rules.toastDurationMs);
  }

  elements.draw.addEventListener("click", advanceTurnPhase);
  elements.end.addEventListener("click", endTurn);
  document.getElementById("confirm-preparation-button").addEventListener("click", finishPreparation);
  document.getElementById("company-name-input").addEventListener("input", event => { state.companyName = event.target.value; saveState(); });
  if (state.capital <= BANKRUPTCY_THRESHOLD && state.phase !== "bankruptcy") checkBankruptcy();
  document.getElementById("clear-log-button").addEventListener("click", () => { state.log = []; saveState(); renderLog(); });
  document.getElementById("reset-button").addEventListener("click", () => {
    if (!window.confirm("Начать новую игру? Текущий прогресс будет удалён.")) return;
    localStorage.removeItem(SAVE_KEY); state = createFreshState(); saveState(); render(); showToast("Новая игра началась.");
  });

    if (!state.market.length && ["staffing", "preparation"].includes(state.phase)) state.market = makeMarket(state.employees);
  saveState(); render();
}());

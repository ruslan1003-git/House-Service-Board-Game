(function () {
  "use strict";

  const CONFIG = window.DOMOUPRAV_CONFIG;
  if (!CONFIG) throw new Error("Не найден файл game-config.js");
  const SEASONS = CONFIG.seasons;
  const SEASON_ICONS = CONFIG.seasonIcons || ["☀️", "🍂", "❄️", "🌱"];
  const HOUSE_PROBLEMS = CONFIG.houseProblems;
  const EMPTY_COUNTS = { accepted: 0, completed: 0, cancelled: 0, hired: 0, fired: 0 };
  const HOUSE_CARDS = CONFIG.houses;
  const INITIAL_STATE = { turn: 1, year: 1, seasonIndex: 0, capital: CONFIG.economy.startingCapital, reputation: CONFIG.economy.startingReputation, houses: 1, area: CONFIG.economy.startingArea, primaryArea: CONFIG.economy.startingArea, additionalHomes: [], newHouseOssUsedTurn: null, houseName: CONFIG.economy.startingHouseName, houseAddress: CONFIG.houses.find(house => house.name === CONFIG.economy.startingHouseName)?.address || "", houseAge: CONFIG.houses.find(house => house.name === CONFIG.economy.startingHouseName)?.age || 0, houseRepairWarranties: {}, tariffPerSquareMeter: CONFIG.economy.tariffPerSquareMeter, companyName: CONFIG.economy.startingCompanyName, baseMaintenance: CONFIG.economy.baseMaintenancePerHouse, houseDebt: 0, collectionStats: { billed: 0, collected: 0, periods: 0 }, houseDeck: [], phase: "preparation", gameSetupVersion: 2, employeeSalaryRulesVersion: 2, ossRulesVersion: 1, houseUnsafeSinceYear: null, houseUnsafeSinceTurn: null, houseUnsafeCategory: null, houseUnsafeReasons: [], unsafeHousePenaltyYear: null, houseRemoved: false, tariffOssResolvedYear: null, tariffOssAttempts: 0, ossHistory: [], ossVoteTurn: null, ossVoteUsedCategories: [], lastOssAnimationId: null, hiresThisTurn: 0, pendingHireIds: [], pendingFireActions: {}, marketRerollUsedTurn: null, lawyerActionTaken: false, lawyerActionsUsed: [], requests: [], cancelledRequests: [], penalties: [], compensations: [], employees: [], market: [], log: [], deck: [], yearStats: { capitalStart: CONFIG.economy.startingCapital, ...EMPTY_COUNTS }, totals: { ...EMPTY_COUNTS } };
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

  const elements = {
    turn: document.getElementById("turn-label"), round: document.getElementById("round-number"), capital: document.getElementById("capital-value"), stickyCapital: document.getElementById("sticky-capital-value"), stickyHouses: document.getElementById("sticky-house-count"), stickyCriticalHouses: document.getElementById("sticky-critical-houses"), stickyCriticalCount: document.getElementById("sticky-critical-count"), stickyExpenseTotal: document.getElementById("sticky-expense-total"), stickyPayroll: document.getElementById("sticky-payroll-value"), stickyUpkeep: document.getElementById("sticky-upkeep-value"), stickyFines: document.getElementById("sticky-fines-value"), stickyCompensation: document.getElementById("sticky-compensation-value"), stickyProblemRepairs: document.getElementById("sticky-problem-repairs"), stickyIncomeTotal: document.getElementById("sticky-income-total"), stickyCollectionIncome: document.getElementById("sticky-collection-income"), stickyPaidIncome: document.getElementById("sticky-paid-income"), stickyPriorUpkeep: document.getElementById("sticky-prior-upkeep"), stickyPriorSalaries: document.getElementById("sticky-prior-salaries"), stickyPriorFines: document.getElementById("sticky-prior-fines"), stickyPriorCompensation: document.getElementById("sticky-prior-compensation"), stickyPriorRepairs: document.getElementById("sticky-prior-repairs"), financialInfographic: document.getElementById("financial-infographic"),
    capitalFill: document.getElementById("capital-bar-fill"), houses: document.getElementById("houses-value"), area: document.getElementById("area-value"),
    income: document.getElementById("income-value"), collection: document.getElementById("collection-value"), payrollValue: document.getElementById("payroll-value"), count: document.getElementById("request-count"), requestBreakdown: document.getElementById("request-count-breakdown"), requestDamageMarker: document.getElementById("request-damage-marker"), list: document.getElementById("requests-list"),
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
  let toastTimer;

  function normalizeState(saved) {
    const normalized = { ...INITIAL_STATE, ...saved };
    normalized.tariffPerSquareMeter = Number.isFinite(saved.tariffPerSquareMeter) && saved.tariffPerSquareMeter >= 0 ? saved.tariffPerSquareMeter : CONFIG.economy.tariffPerSquareMeter;
    normalized.tariffOssResolvedYear = Number.isInteger(saved.tariffOssResolvedYear) ? saved.tariffOssResolvedYear : null;
    normalized.ossRulesVersion = 2;
    normalized.tariffOssAttempts = Number.isInteger(saved.tariffOssAttempts) ? saved.tariffOssAttempts : 0;
    normalized.ossHistory = Array.isArray(saved.ossHistory) ? saved.ossHistory : [];
    normalized.ossVoteTurn = Number.isInteger(saved.ossVoteTurn) ? saved.ossVoteTurn : null;
    normalized.ossVoteUsedCategories = Array.isArray(saved.ossVoteUsedCategories) ? saved.ossVoteUsedCategories : [];
    normalized.lastOssAnimationId = typeof saved.lastOssAnimationId === "string" ? saved.lastOssAnimationId : null;
    normalized.capital = Number.isFinite(saved.capital) ? saved.capital : INITIAL_STATE.capital;
    normalized.additionalHomes = Array.isArray(saved.additionalHomes) ? saved.additionalHomes.filter(house => house && typeof house.name === "string" && Number.isFinite(house.area)).map(house => ({ ...house, age: Number.isFinite(house.age) ? house.age : 0, address: house.address || "Адрес не указан", baseMaintenance: Number.isFinite(house.baseMaintenance) ? house.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse, tariffPerSquareMeter: Number.isFinite(house.tariffPerSquareMeter) ? house.tariffPerSquareMeter : (Number.isFinite(saved.tariffPerSquareMeter) ? saved.tariffPerSquareMeter : CONFIG.economy.tariffPerSquareMeter), debtRecoverable: Number.isFinite(house.debtRecoverable) ? house.debtRecoverable : 0, debtIrrecoverable: Number.isFinite(house.debtIrrecoverable) ? house.debtIrrecoverable : 0, collectionStats: { billed: 0, collected: 0, periods: 0, ...(house.collectionStats || {}) }, lastCollectionRate: Number.isFinite(house.lastCollectionRate) ? house.lastCollectionRate : null, tariffOssResolvedYear: Number.isInteger(house.tariffOssResolvedYear) ? house.tariffOssResolvedYear : null, repairWarranties: house.repairWarranties || {}, warrantyUntilTurn: Number.isInteger(house.warrantyUntilTurn) ? house.warrantyUntilTurn : null })) : [];
    normalized.primaryArea = Number.isFinite(saved.primaryArea) && saved.primaryArea > 0 ? saved.primaryArea : Number.isFinite(saved.area) && saved.area > 0 ? saved.area : INITIAL_STATE.primaryArea;
    normalized.houses = (saved.houseRemoved ? 0 : 1) + normalized.additionalHomes.length;
    normalized.area = (saved.houseRemoved ? 0 : normalized.primaryArea) + normalized.additionalHomes.reduce((sum, house) => sum + house.area, 0);
    normalized.newHouseOssUsedTurn = Number.isInteger(saved.newHouseOssUsedTurn) ? saved.newHouseOssUsedTurn : (saved.newHouseOssUsed ? normalized.turn : null);
    normalized.reputation = Number.isFinite(saved.reputation) ? saved.reputation : INITIAL_STATE.reputation;
    normalized.year = Number.isInteger(saved.year) ? saved.year : Math.floor((normalized.turn - 1) / SEASONS.length) + 1;
    normalized.tariffOssResolvedYear = Number.isInteger(saved.tariffOssResolvedYear) ? saved.tariffOssResolvedYear : (normalized.phase === "annualReport" ? null : normalized.year);
    normalized.seasonIndex = Math.max(0, Math.min(SEASONS.length - 1, Number.isInteger(saved.seasonIndex) ? saved.seasonIndex : (normalized.turn - 1) % SEASONS.length));
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
    normalized.seasonFinancials = { upkeep: 0, salaries: 0, paidIncome: 0, problemRepairs: 0, ...(saved.seasonFinancials || {}) };
    Object.keys(normalized.seasonFinancials).forEach(key => { if (!Number.isFinite(normalized.seasonFinancials[key])) normalized.seasonFinancials[key] = 0; });
    const savedSeasonFinancials = saved.lastSeasonFinancials || {};
    normalized.lastSeasonFinancials = { collection: 0, paidIncome: Number.isFinite(savedSeasonFinancials.paidIncome) ? savedSeasonFinancials.paidIncome : (Number.isFinite(savedSeasonFinancials.paidRequests) ? savedSeasonFinancials.paidRequests : 0), upkeep: 0, salaries: 0, fines: 0, compensation: 0, problemRepairs: 0, ...savedSeasonFinancials };
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
    normalized.cancelledRequests = Array.isArray(normalized.cancelledRequests) ? normalized.cancelledRequests : [];
    normalized.penalties = Array.isArray(normalized.penalties) ? normalized.penalties.filter(Boolean).map(item => ({ ...item, contestedBy: Array.isArray(item.contestedBy) ? item.contestedBy : [], salary: Number.isFinite(item.salary) ? item.salary : 0, amount: Number.isFinite(item.amount) ? item.amount : 0, originalAmount: Number.isFinite(item.originalAmount) ? item.originalAmount : undefined })) : [];
    normalized.compensations = Array.isArray(normalized.compensations) ? normalized.compensations.filter(Boolean).map(item => ({ ...item, contestedBy: Array.isArray(item.contestedBy) ? item.contestedBy : [], amount: Number.isFinite(item.amount) ? item.amount : 0, originalAmount: Number.isFinite(item.originalAmount) ? item.originalAmount : undefined })) : [];
    const migrateEmployeeSalaries = saved.employeeSalaryRulesVersion !== 2;
    const migrateGameSetup = saved.gameSetupVersion !== 2;
    normalized.employeeSalaryRulesVersion = 2;
    normalized.gameSetupVersion = 2;
    normalized.employees = Array.isArray(normalized.employees) ? normalized.employees.map(employee => {
      const role = ROLES[employee.role] || ROLES.handyman;
      const rosterProfile = EMPLOYEE_ROSTER.find(person => person.role === employee.role && person.name === employee.name);
      const legalStrength = employee.role === "lawyer" ? Math.max(1, Math.min(3, Number.isInteger(employee.legalStrength) ? employee.legalStrength : 1)) : employee.legalStrength;
      return { ...rosterProfile, ...employee, legalStrength, salary: migrateEmployeeSalaries && rosterProfile && Number.isFinite(employee.salary) && role.salary ? employee.salary / role.salary * (employee.role === "lawyer" ? lawyerSalary(legalStrength) : rosterProfile.salary) : Number.isFinite(employee.salary) ? employee.salary : employee.role === "lawyer" ? lawyerSalary(legalStrength) : role.salary, bonus: employee.bonus || rosterProfile?.bonus, bonusDescription: employee.bonusDescription || rosterProfile?.bonusDescription, productivity: Number.isFinite(employee.productivity) ? employee.productivity : role.productivity, probationTurns: Number.isInteger(employee.probationTurns) ? employee.probationTurns : 0, assignedLabor: Number.isFinite(employee.assignedLabor) ? employee.assignedLabor : (employee.usedThisTurn ? 1 : 0), unhappy: Boolean(employee.unhappy), unhappyNextTurn: Boolean(employee.unhappyNextTurn), unpaidOvertime: Boolean(employee.unpaidOvertime) };
    }) : [];
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
      labor: Math.max(0, Math.min(CONFIG.rules.maxRequestLabor, Number.isFinite(card.labor) ? card.labor : 1)), materialCost: Number.isFinite(card.materialCost) ? card.materialCost : 0,
      contractorCost: card.problemId ? ((Object.values(ROLES).find(role => role.category === (({ "Освещение": "Электрика", "Водоснабжение": "Сантехника", "Благоустройство": "Общестрой", "Подъезд": "Общестрой", "Безопасность": "Электрика" })[card.category] || card.category))?.salary || ROLES.handyman.salary) + (Number.isFinite(card.materialCost) ? card.materialCost : 0) + CONFIG.economy.contractorMarkup) : card.contractorCost,
      type: card.problemId && !card.resolved && !card.cancelled ? (card.damageCompensation > 0 ? "emergencyDamage" : "emergency") : ["ordinary", "emergency", "emergencyDamage", "paid"].includes(card.type) ? card.type : "ordinary",
      damageCompensation: Number.isFinite(card.damageCompensation) ? (card.resolved && !Array.isArray(saved.compensations) ? 0 : card.damageCompensation) : 0,
      payout: Number.isFinite(card.payout) ? card.payout : 0,
      receivedTurn: card.receivedTurn ?? normalized.turn,
      houseName: card.houseName || normalized.houseName,
      houseAddress: card.houseAddress || (normalized.additionalHomes.find(home => home.name === card.houseName)?.address) || normalized.houseAddress
    })) : [];
    normalized.cancelledRequests = normalized.cancelledRequests.map(card => ({ ...card, houseName: card.houseName || normalized.houseName, houseAddress: card.houseAddress || normalized.additionalHomes.find(home => home.name === card.houseName)?.address || normalized.houseAddress }));
    const compensationRequestIds = new Set(normalized.compensations.map(item => item.requestId));
    normalized.requests.filter(card => !card.resolved && !card.cancelled && card.damageCompensation > 0 && !compensationRequestIds.has(card.id)).forEach(card => {
      const claim = { id: `comp-${card.id}`, requestId: card.id, title: card.title, amount: card.damageCompensation, year: normalized.year, houseName: card.houseName, houseAddress: card.houseAddress, paid: false, writtenOff: false, contestedBy: [] };
      normalized.compensations.push(claim);
      card.compensationId = claim.id;
    });
    normalized.seasonFinancials.paidIncome = Number.isFinite(normalized.seasonFinancials.paidIncome) ? normalized.seasonFinancials.paidIncome : 0;
    normalized.seasonFinancials.problemRepairs = Number.isFinite(normalized.seasonFinancials.problemRepairs) ? normalized.seasonFinancials.problemRepairs : 0;
    normalized.lastSeasonFinancials.paidIncome = Number.isFinite(normalized.lastSeasonFinancials.paidIncome) ? normalized.lastSeasonFinancials.paidIncome : 0;
    normalized.lastSeasonFinancials.fines = Number.isFinite(normalized.lastSeasonFinancials.fines) ? normalized.lastSeasonFinancials.fines : 0;
    normalized.lastSeasonFinancials.compensation = Number.isFinite(normalized.lastSeasonFinancials.compensation) ? normalized.lastSeasonFinancials.compensation : 0;
    normalized.lastSeasonFinancials.problemRepairs = Number.isFinite(normalized.lastSeasonFinancials.problemRepairs) ? normalized.lastSeasonFinancials.problemRepairs : 0;
    normalized.log = Array.isArray(normalized.log) ? normalized.log : [];
    if (!["preparation", "staffing", "inspection", "problems", "drawing", "resolving", "legal", "payroll", "collection", "annualReport", "bankruptcy"].includes(normalized.phase)) normalized.phase = "staffing";
    // A previously saved base-game turn already has its requests; proceed to resolving it.
    if (normalized.phase === "drawing" && normalized.requests.length) normalized.phase = "resolving";
    if (normalized.phase === "problems" && normalized.houseProblems.length === 0) normalized.phase = "drawing";
    return normalized;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && Number.isInteger(saved.turn) && Number.isFinite(saved.capital) && Array.isArray(saved.requests) && Array.isArray(saved.log)) return normalizeState(saved);
    } catch (_) { /* Start a fresh game if saved data is unavailable. */ }
    const fresh = normalizeState({ ...INITIAL_STATE, log: [{ text: "Компания открыла первый дом под управлением.", turn: 1 }] });
    fresh.market = makeMarket(fresh.employees);
    return fresh;
  }

  function saveState() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function money(value) { return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
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
    const materialCost = requestMaterialCost(card);
    const specialist = Object.values(ROLES).find(role => role.category === card.category);
    if (card.type !== "paid" && Number.isFinite(card.contractorCost)) return card.contractorCost;
    return (specialist?.salary || ROLES.handyman.salary) + materialCost + CONFIG.economy.contractorMarkup;
  }
  function requestMaterialCost(card) { return card.type === "paid" ? 0 : Math.max(0, Number.isFinite(card.materialCost) ? card.materialCost : 0); }
  function requestIsOverdue(card) { return state.turn - (card.receivedTurn ?? state.turn) >= 4; }
  function registerDamageClaim(card) {
    if (!card.damageCompensation || state.compensations.some(claim => claim.requestId === card.id)) return;
    const claim = { id: `comp-${card.id}`, requestId: card.id, title: card.title, amount: card.damageCompensation, year: state.year, houseName: card.houseName || state.houseName, houseAddress: card.houseAddress || state.houseAddress, paid: false, writtenOff: false, contestedBy: [] };
    card.compensationId = claim.id;
    state.compensations.push(claim);
  }
  function unpaidFineTotal() { return state.penalties.filter(penalty => !penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared).reduce((sum, penalty) => sum + penalty.amount, 0); }
  function unpaidCompensationTotal() { return state.compensations.filter(claim => !claim.paid && !claim.writtenOff).reduce((sum, claim) => sum + claim.amount, 0); }
  function hasNoDebts() { return state.capital >= 0 && unpaidFineTotal() === 0 && unpaidCompensationTotal() === 0; }
  function hasLawyer() { return state.employees.some(employee => employee.role === "lawyer"); }
  function hasHR() { return state.employees.some(employee => employee.role === "hr"); }
  function employeeBonusCount(role, bonus) { return state.employees.filter(employee => employee.role === role && employee.bonus === bonus).length; }
  function hasEmployeeBonus(role, bonus) { return employeeBonusCount(role, bonus) > 0; }
  function maintenanceDiscountPercent() { return Math.min(100, employeeBonusCount("accountant", "discountMaintenance") * CONFIG.rules.accountantMaintenanceDiscountPercent); }
  function effectiveBaseMaintenanceTotal() { const gross = managedHomes().reduce((sum, home) => sum + (Number.isFinite(home.baseMaintenance) ? home.baseMaintenance : state.baseMaintenance), 0); return gross * (1 - maintenanceDiscountPercent() / 100); }
  function managedHomes() {
    const primary = { name: state.houseName, address: state.houseAddress, area: state.primaryArea || state.area, age: state.houseAge, baseMaintenance: state.baseMaintenance, primary: true, tariffPerSquareMeter: state.tariffPerSquareMeter, tariffOssResolvedYear: state.tariffOssResolvedYear, debtRecoverable: state.primaryDebtRecoverable || 0, debtIrrecoverable: state.primaryDebtIrrecoverable || 0, collectionStats: state.primaryCollectionStats || { billed: 0, collected: 0, periods: 0 }, lastCollectionRate: state.primaryLastCollectionRate, repairWarranties: state.houseRepairWarranties || {}, warrantyUntilTurn: state.houseWarrantyUntilTurn };
    return (state.houseRemoved ? [] : [primary]).concat(state.additionalHomes || []);
  }
  function managedHomeByName(name) { return managedHomes().find(home => home.name === name) || null; }
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
  function hasAccountant() { return state.employees.some(employee => employee.role === "accountant"); }
  function hasEngineer() { return state.employees.some(employee => employee.role === "engineer"); }
  function pendingHireHasHR() { return state.pendingHireIds.some(id => state.market.some(candidate => candidate.id === id && candidate.role === "hr")); }
  function activeLawyers() { return state.employees.filter(employee => employee.role === "lawyer"); }
  function lawyersDone() { const lawyers = activeLawyers(); return !lawyers.length || lawyers.every(employee => state.lawyerActionsUsed.includes(employee.id)); }
  function markLawyerDone(employeeId) { if (!state.lawyerActionsUsed.includes(employeeId)) state.lawyerActionsUsed.push(employeeId); state.lawyerActionTaken = lawyersDone(); }
  function renderCompanyDebt() {
    const total = state.houseDebtRecoverable + state.houseDebtIrrecoverable;
    const lawyerCapacity = activeLawyers().reduce((sum, lawyer) => sum + lawyerDebtLimit(lawyer), 0);
    const yellow = Math.min(state.houseDebtRecoverable, lawyerCapacity);
    const red = Math.max(0, state.houseDebtRecoverable - yellow);
    const black = state.houseDebtIrrecoverable;
    elements.houseDebt.innerHTML = `<div class="debt-total">${money(total)} ₽ <small>общий долг</small></div><div class="debt-bar" role="img" aria-label="Можно отсудить ${money(red)} рублей, доступно юристам сейчас ${money(yellow)} рублей, невозвратный долг ${money(black)} рублей"><i class="debt-segment debt-red" style="width:${total ? red / total * 100 : 0}%"></i><i class="debt-segment debt-yellow" style="width:${total ? yellow / total * 100 : 0}%"></i><i class="debt-segment debt-black" style="width:${total ? black / total * 100 : 0}%"></i></div><div class="debt-legend"><span>Можно отсудить ${money(red)} ₽</span><span>Юристы могут взыскать сейчас ${money(yellow)} ₽</span><span>Не возместить ${money(black)} ₽</span></div>`;
  }
  function effectiveSalary(employee) { return employee.salary * (employee.probationTurns > 0 ? CONFIG.rules.probationSalaryMultiplier : 1); }
  function upcomingPayroll() {
    const firingIds = new Set(Object.keys(state.pendingFireActions || {}));
    const currentPayroll = state.employees.filter(employee => !firingIds.has(employee.id)).reduce((sum, employee) => sum + effectiveSalary(employee), 0);
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
    const numeric = (record, key) => Number.isFinite(record?.[key]) ? record[key] : 0;
    const latestRecord = history[history.length - 1] || { year: state.year, seasonIndex: (state.seasonIndex + SEASONS.length - 1) % SEASONS.length, ...state.lastSeasonFinancials };
    let financials;
    let periodLabel;
    if (financialPeriodSelection === "all") {
      financials = history.reduce((total, record) => {
        ["collection", "paidIncome", "upkeep", "salaries", "fines", "compensation", "problemRepairs"].forEach(key => { total[key] += numeric(record, key); });
        return total;
      }, { collection: 0, paidIncome: 0, upkeep: 0, salaries: 0, fines: 0, compensation: 0, problemRepairs: 0 });
      periodLabel = "Все завершённые периоды";
    } else if (financialPeriodSelection === "latest") {
      financials = history.length ? latestRecord : state.lastSeasonFinancials;
      periodLabel = history.length ? `${SEASONS[latestRecord.seasonIndex]} · год ${latestRecord.year}` : "Сезон ещё не завершён";
    } else {
      const selectedIndex = history.findIndex((record, index) => periodKey(record, index) === financialPeriodSelection);
      const record = selectedIndex >= 0 ? history[selectedIndex] : latestRecord;
      financials = record;
      periodLabel = `${SEASONS[record.seasonIndex]} · год ${record.year}`;
    }
    const totalIncome = numeric(financials, "collection") + numeric(financials, "paidIncome");
    const totalExpenses = ["upkeep", "salaries", "fines", "compensation", "problemRepairs"].reduce((sum, key) => sum + numeric(financials, key), 0);
    const net = totalIncome - totalExpenses;
    const max = Math.max(totalIncome, totalExpenses, 1);
    const rows = [
      { label: "Содержание", value: numeric(financials, "collection"), type: "income" },
      { label: "Платные заявки", value: numeric(financials, "paidIncome"), type: "income" },
      { label: "Базовое обслуживание", value: numeric(financials, "upkeep"), type: "expense" },
      { label: "Зарплаты", value: numeric(financials, "salaries"), type: "expense" },
      { label: "Штрафы", value: numeric(financials, "fines"), type: "expense" },
      { label: "Возмещение ущерба", value: numeric(financials, "compensation"), type: "expense" },
      { label: "Решение проблем", value: numeric(financials, "problemRepairs"), type: "expense" }
    ];
    const options = `<option value="all">Все завершённые периоды</option><option value="latest">Последний сезон</option>${history.map((record, index) => `<option value="${periodKey(record, index)}">${SEASONS[record.seasonIndex]} · год ${record.year}</option>`).join("")}`;
    const graphMetrics = { capital: { label: "Бюджет", key: "capital", format: value => `${money(value)} ₽` }, collection: { label: "Собираемость", key: "collectionRate", format: value => `${Math.round(value)}%` }, reputation: { label: "Репутация", key: "reputation", format: value => `${value > 0 ? "+" : ""}${value}` } };
    const graphMetric = graphMetrics[graphMetricSelection] || graphMetrics.capital;
    const graphData = history.map(record => ({ label: `${SEASONS[record.seasonIndex]} · ${record.year}`, value: numeric(record, graphMetric.key) }));
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
    elements.financialInfographic.innerHTML = `<div class="financial-chart-heading"><div><p class="section-label">ФИНАНСОВЫЕ ИТОГИ</p><h2>Движение денег за выбранный период</h2></div><div class="financial-period-controls"><label for="financial-period-select">Период</label><select id="financial-period-select">${options}</select><span class="financial-season-badge">${periodLabel}</span></div></div><div class="financial-summary"><article><span>Приходы</span><b class="financial-positive">+${money(totalIncome)} ₽</b></article><article><span>Расходы</span><b class="financial-negative">−${money(totalExpenses)} ₽</b></article><article><span>Разница</span><b class="${net >= 0 ? "financial-positive" : "financial-negative"}">${net >= 0 ? "+" : "−"}${money(Math.abs(net))} ₽</b></article></div><div class="financial-bars">${rows.map(row => `<div class="financial-bar-row"><span>${row.label}</span><div class="financial-bar-track"><i class="financial-bar-fill ${row.type}" style="width:${Math.max(row.value > 0 ? 2 : 0, row.value / max * 100)}%"></i></div><b>${row.type === "income" ? "+" : "−"}${money(row.value)} ₽</b></div>`).join("")}</div><section class="history-graph-panel"><div class="history-graph-heading"><div><p class="section-label">ГРАФИКИ</p><h3>${graphMetric.label} по сезонам и годам</h3></div><label for="graph-metric-select">Показатель<select id="graph-metric-select"><option value="capital">Бюджет</option><option value="collection">Собираемость</option><option value="reputation">Репутация</option></select></label></div>${graphMarkup}</section>`;
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

  function effectiveProductivity(employee) { return Math.max(1, employee.productivity - (employee.unhappy ? 1 : 0)); }
  function overtimeFor(employee, additionalLabor) {
    const productivity = employee.productivity;
    const oldOvertime = Math.max(0, employee.assignedLabor - productivity);
    const newOvertime = Math.max(0, employee.assignedLabor + additionalLabor - productivity);
    const additionalOvertime = newOvertime - oldOvertime;
    const hrMultiplier = hasHR() ? CONFIG.rules.overtimeSalaryMultiplierWithHR : 1;
    const basePremium = Math.round(additionalOvertime * employee.salary / productivity * 100) / 100;
    const premium = Math.round(basePremium * hrMultiplier * 100) / 100;
    return { laborAfter: employee.assignedLabor + additionalLabor, overtime: newOvertime, basePremium, premium, hrMultiplier };
  }

  function currentTariff(home = null) { const tariff = home?.tariffPerSquareMeter; return Number.isFinite(tariff) ? tariff : Number.isFinite(state.tariffPerSquareMeter) ? state.tariffPerSquareMeter : TARIFF; }

  function render() {
    refreshPortfolioTotals();
    const homes = managedHomes();
    const baseIncome = homes.reduce((sum, home) => sum + home.area * currentTariff(home), 0);
    const payroll = state.employees.reduce((sum, employee) => sum + effectiveSalary(employee), 0);
    const unresolved = state.requests.filter(card => !card.resolved && !card.cancelled);
    const newRequests = state.requests.filter(card => card.receivedTurn === state.turn).length;
    const carried = unresolved.filter(card => card.receivedTurn !== state.turn).length;
    elements.turn.textContent = state.phase === "annualReport" ? `ОТЧЁТ · ${state.year} ГОД` : `${SEASONS[state.seasonIndex]} · ГОД ${state.year}`;
    elements.round.textContent = `${state.seasonIndex + 1}/4`;
    elements.timelineYear.textContent = `Год ${state.year}`;
    elements.seasonTrack.innerHTML = SEASONS.map((season, index) => `<div class="season-node ${index < state.seasonIndex || state.phase === "annualReport" ? "season-done" : ""} ${index === state.seasonIndex && state.phase !== "annualReport" ? "season-current" : ""}"><span class="season-icon">${SEASON_ICONS[index]}</span><span>${season}</span><i></i></div>`).join("");
    document.body.classList.toggle("game-preparation", state.phase === "preparation");
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
        state.houseName = house.name; state.houseAddress = house.address; state.primaryArea = house.area; state.area = house.area + state.additionalHomes.reduce((sum, owned) => sum + owned.area, 0);
        state.houseAge = Number(house.age) || 0; state.houseRepairWarranties = {};
        state.houseDeck = state.houseDeck.filter(item => item.name !== house.name);
        saveState(); render();
      };
    }
    if (elements.marketPanel) elements.marketPanel.classList.toggle("preparing", state.phase === "preparation");
    if (elements.prepPanel) elements.prepPanel.hidden = state.phase !== "preparation";
    const phaseNames = { preparation: "Подготовка к игре", staffing: "Менеджмент сотрудников", inspection: `Сезонный осмотр · ${SEASONS[state.seasonIndex]}`, problems: "Решение проблем", drawing: "Приём заявок", resolving: "Распределение заявок", legal: "Задачи специалистам", payroll: "Выплата зарплат", collection: "Сбор содержания", annualReport: "Годовой отчёт", bankruptcy: "Объявление банкротства" };
    elements.phaseLabel.textContent = phaseNames[state.phase];
    if (elements.stickySeason) elements.stickySeason.textContent = state.phase === "annualReport" ? `Год ${state.year} · годовой отчёт` : `${SEASONS[state.seasonIndex]} · год ${state.year}`;
    if (elements.stickyPhase) elements.stickyPhase.textContent = phaseNames[state.phase];
    const activeStep = { preparation: 0, staffing: 1, inspection: 2, problems: 3, drawing: 4, resolving: 5, legal: 6, payroll: 7, collection: 8, annualReport: 9, bankruptcy: 10 }[state.phase];
    document.querySelectorAll(".phase-step").forEach((step, index) => {
      const skippedInspection = index === 2 && !CONFIG.rules.inspectionSeasonIndices.includes(state.seasonIndex) && !["preparation", "staffing"].includes(state.phase);
      step.classList.toggle("active", index === activeStep);
      step.classList.toggle("phase-done", index < activeStep && !skippedInspection);
      step.classList.toggle("phase-skipped", skippedInspection);
    });
    elements.annualReport.hidden = state.phase !== "annualReport";
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
    if (elements.stickyHouses) elements.stickyHouses.textContent = quantity(state.houses);
    const criticalHouseCount = managedHomes().filter(home => home.primary ? state.houseUnsafeSinceTurn != null : home.unsafeSinceTurn != null).length;
    if (elements.stickyCriticalHouses) elements.stickyCriticalHouses.hidden = criticalHouseCount === 0;
    if (elements.stickyCriticalCount) elements.stickyCriticalCount.textContent = quantity(criticalHouseCount);
    const upcomingUpkeep = effectiveBaseMaintenanceTotal();
    const upcomingSalaries = upcomingPayroll();
    const priorIncome = lastSeasonIncome();
    const deferredUpkeep = state.phase === "staffing" ? upcomingUpkeep : 0;
    const deferredSalaries = state.phase === "staffing" ? upcomingSalaries : 0;
    const upcomingExpenses = deferredUpkeep + deferredSalaries;
    if (elements.stickyExpenseTotal) elements.stickyExpenseTotal.textContent = `−${money(upcomingExpenses)} ₽`;
    if (elements.stickyPayroll) elements.stickyPayroll.textContent = `−${money(deferredSalaries)} ₽`;
    if (elements.stickyUpkeep) elements.stickyUpkeep.textContent = `−${money(deferredUpkeep)} ₽`;
    const priorSeasonTotal = priorIncome.collection + priorIncome.paidIncome;
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
    elements.hint.textContent = state.phase === "staffing" ? "Сначала найми или уволь сотрудников" : state.phase === "inspection" ? "Проведи сезонный осмотр дома" : state.phase === "problems" ? "При желании вызови подрядчика для ремонта проблем" : state.phase === "drawing" ? "Прими новые заявки, чтобы продолжить ход" : state.phase === "legal" ? "Выбери работу для юриста" : state.phase === "payroll" ? "Выплати зарплаты перед сбором содержания" : state.phase === "collection" ? "Собери содержание и заверши сезон" : unresolved.length ? "Решай заявки специалистами или деньгами" : "Все заявки этого хода решены";
    elements.draw.hidden = true;
    elements.end.hidden = state.phase === "preparation" || state.phase === "bankruptcy" || state.phase === "annualReport";
    elements.end.disabled = state.phase === "legal" ? !lawyersDone() : !["staffing", "inspection", "problems", "drawing", "resolving", "payroll", "collection"].includes(state.phase);
    elements.end.querySelector("span:first-child").textContent = phaseActionLabel();
    elements.title.textContent = state.phase === "preparation" ? "Создай свою управляющую компанию" : state.phase === "bankruptcy" ? "Нужна новая управляющая компания" : state.phase === "annualReport" ? "Год завершён" : state.phase === "legal" ? "Реши, что делают специалисты" : state.phase === "staffing" ? "Собери команду" : state.phase === "inspection" ? "Проведи сезонный осмотр" : state.phase === "problems" ? "Реши, что делать с проблемами дома" : state.phase === "drawing" ? "Прими заявки" : state.phase === "payroll" ? "Выплати зарплаты" : state.phase === "collection" ? "Собери содержание" : unresolved.length ? "Разбираем заявки" : "Заявки решены";
    elements.copy.textContent = state.phase === "bankruptcy" ? `Баланс достиг ${money(BANKRUPTCY_THRESHOLD)} ₽. Текущая компания не может продолжать работу.` : state.phase === "annualReport" ? "Просмотри результаты года. Обычные незакрытые заявки отменяются, аварийные остаются на доме; за каждую из них репутация снижается на 1." : state.phase === "legal" ? "Каждый юрист выполняет одно поручение за ход." : state.phase === "staffing" ? "Добавляй сотрудников в кадровый пул или отмечай увольнение. Изменения применятся при переходе дальше; до этого их можно отменить." : state.phase === "inspection" ? "Осмотр проводится осенью и весной; инженер уменьшает число выявленных проблем на одну." : state.phase === "problems" ? "Подрядчик может устранить проблему целиком. Если оставить её, она создаст сезонные заявки." : state.phase === "drawing" ? "Кадровые изменения применены. Теперь открой заявки жильцов." : state.phase === "payroll" ? "Зарплаты рассчитаны по составу команды и испытательным срокам." : state.phase === "collection" ? "Оплатится базовое обслуживание и случайно определится собираемость." : unresolved.length ? "Распределяй заявки в пределах продуктивности или назначай переработку за премию. Любую заявку можно оплатить." : "Переходи к выплате зарплат.";
    elements.staffCount.textContent = `${state.employees.length} В ШТАТЕ`;
    elements.payroll.textContent = `Зарплатный фонд: ${money(payroll)} ₽ / ход`;
    document.getElementById("market-kicker").textContent = state.phase === "preparation" ? "ПОДГОТОВКА · НАЧАЛЬНЫЙ НАЙМ" : "НАЧАЛО ХОДА · НАЙМ И УВОЛЬНЕНИЕ";
    document.getElementById("market-heading").textContent = state.phase === "preparation" ? "Стартовая команда" : "Рынок труда";
    elements.marketCopy.textContent = state.phase === "preparation" ? `На рынке ${currentMarketExecutors()} исполнителя и ${currentMarketSpecialists()} специалиста. Отметь сотрудников для стартовой команды. На старте нанятые сотрудники сохраняют зарплату на 30% ниже установленной, пока работают в компании. ${pendingHireHasHR() ? "Стартовый HR снимает лимит найма и даёт команде испытательный срок." : `Без HR можно выбрать до ${CONFIG.rules.hiresWithoutHR} сотрудников; можно начать и без команды.`}` : state.phase === "staffing" ? `На рынке ${currentMarketExecutors()} исполнителя и ${currentMarketSpecialists()} специалиста. Выбранные сотрудники попадут в кадровый пул до перехода к заявкам. ${hasHR() || pendingHireHasHR() ? `HR снимает лимит; новые сотрудники ${CONFIG.rules.probationTurns} хода получают ${Math.round(CONFIG.rules.probationSalaryMultiplier * 100)}% зарплаты.` : `Без HR можно выбрать до ${CONFIG.rules.hiresWithoutHR} новых сотрудников.`}` : "Рынок закрыт до начала следующего хода.";
    const guideStep = { staffing: 0, inspection: 1, problems: 2, drawing: 3, resolving: 4, legal: 5, payroll: 6, collection: 7 }[state.phase] ?? -1;
    document.querySelectorAll("[data-guide-step]").forEach((step, index) => {
      step.classList.toggle("guide-current", index === guideStep);
      step.classList.toggle("guide-done", guideStep > index);
      step.classList.toggle("guide-skipped", (index === 1 && !CONFIG.rules.inspectionSeasonIndices.includes(state.seasonIndex) && guideStep > 1) || (index === 5 && guideStep > 5 && !hasLawyer()));
    });
    renderRealEstateMarket(); renderHouseCard(); renderPenalties(); renderMarket(); renderTeam(); renderRosterReference(); renderRequests(); renderOssCapitalRepairButtons(); showOssHistory(); renderLog();
    if (DEV_MODE) renderDevTools();
  }

  function renderRealEstateMarket() {
    const list = document.getElementById("real-estate-list");
    const market = document.getElementById("real-estate-market");
    if (!list || !market) return;
    market.hidden = state.phase === "preparation" || state.phase === "bankruptcy" || state.houseRemoved || !state.houseDeck.length;
    const properties = state.houseDeck.filter(house => !managedHomes().some(owned => owned.name === house.name));
    const usedThisTurn = state.newHouseOssUsedTurn === state.turn;
    if (usedThisTurn) {
      list.innerHTML = properties.length ? `<p class="real-estate-note">В этом ходу ОСС «Новый дом» уже проводилось. Новая попытка будет доступна в следующем ходу.</p>${properties.map(house => realEstateCard(house, true)).join("")}` : '<p class="real-estate-note">В колоде недвижимости не осталось доступных объектов.</p>';
      return;
    }
    list.innerHTML = properties.length ? properties.map(house => realEstateCard(house, false)).join("") : '<p class="real-estate-note">В колоде недвижимости не осталось доступных объектов.</p>';
    list.querySelectorAll("[data-new-house-oss]").forEach(button => button.addEventListener("click", () => runNewHouseOss(button.dataset.newHouseOss)));
  }

  function realEstateCard(house, alreadyUsed) {
    const maintenance = Number.isFinite(house.baseMaintenance) ? house.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse;
    return `<article class="real-estate-card"><strong>${escapeHtml(house.name)}</strong><span>Адрес: ${escapeHtml(house.address)}</span><span>Площадь: ${quantity(house.area)} м²</span><span>БО: ${money(maintenance)} ₽ / ход</span><span>Возраст: ${quantity(house.age || 0)} лет</span><button type="button" data-new-house-oss="${escapeHtml(house.name)}" ${alreadyUsed ? "disabled" : ""}>${alreadyUsed ? "ОСС проведено в этом ходу" : "Провести ОСС «Новый дом»"}</button></article>`;
  }

  function runNewHouseOss(houseName) {
    const house = state.houseDeck.find(item => item.name === houseName);
    if (!house || state.newHouseOssUsedTurn === state.turn || state.phase === "preparation" || state.phase === "bankruptcy") return;
    state.newHouseOssUsedTurn = state.turn;
    const cancelledAllTime = state.cancelledRequests.length;
    const vote = ossVote(`Новый дом: ${house.name}`, 0, { includeReputation: true, area: house.area, cancelledCountOverride: cancelledAllTime, cancelledMultiplier: 1, logHouseAddress: house.address });
    if (vote.success) {
      state.additionalHomes.push({ ...house, baseMaintenance: Number.isFinite(house.baseMaintenance) ? house.baseMaintenance : CONFIG.economy.baseMaintenancePerHouse, tariffPerSquareMeter: CONFIG.economy.tariffPerSquareMeter, tariffOssResolvedYear: null, debtRecoverable: 0, debtIrrecoverable: 0, collectionStats: { billed: 0, collected: 0, periods: 0 }, lastCollectionRate: null, repairWarranties: {}, warrantyUntilTurn: null, unsafeSinceTurn: null, unsafeSinceYear: null, unsafeReasons: [], removed: false });
      state.houses += 1;
      state.area += house.area;
      state.houseDeck = state.houseDeck.filter(item => item.name !== house.name);
      addLog(`По ОСС «Новый дом» в управление принят дом «${house.name}», ${house.address}, площадь ${house.area} м². Портфель: ${state.houses} домов, ${state.area} м².`);
      showToast(`ОСС принято: дом «${house.name}» добавлен в управление.`);
    } else {
      addLog(`ОСС «Новый дом» по объекту «${house.name}» не принято; объект остаётся на рынке. Новая попытка будет доступна в следующем ходу.`);
      showToast("ОСС не набрало порог. Попытка использована.");
    }
    saveState(); render();
  }

  function renderHouseCard() {
    if (!elements.houseCard) return;
    const renderHome = home => {
      const homeProblems = state.houseProblems.filter(problem => (problem.houseName || state.houseName) === home.name);
      const wearByCategory = Object.fromEntries(HOUSE_PROBLEMS.map(item => [item.category, homeProblems.filter(problem => problem.category === item.category).reduce((sum, problem) => sum + problem.wear, 0)]));
      const overallWear = Math.round(Object.values(wearByCategory).reduce((sum, wear) => sum + wear, 0) / HOUSE_PROBLEMS.length);
      const problems = HOUSE_PROBLEMS.filter(definition => wearByCategory[definition.category] > 0).map(definition => {
        const categoryProblems = homeProblems.filter(problem => problem.category === definition.category);
        const cost = categoryProblems.reduce((sum, problem) => sum + problemRepairCost(problem), 0);
        const severity = Math.max(0, Math.min(100, wearByCategory[definition.category]));
        const hue = Math.max(0, 120 - severity * 4);
        return `<li style="background:hsl(${hue} 72% 94%);border-color:hsl(${hue} 45% 80%);color:hsl(${hue} 48% 30%)"><span><b>${escapeHtml(definition.category)}</b><small>Износ ${wearByCategory[definition.category]}% · ремонт ${money(cost)} ₽<br>Если проблему не устранить: ${escapeHtml(PROBLEM_CONSEQUENCES[definition.category])}</small></span></li>`;
      }).join("");
      const cancelledCount = state.cancelledRequests.filter(card => card.houseName === home.name).length;
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
      return `<article class="house-property-card">${unsafeNotice}<div class="house-card-heading"><div><p class="section-label">ДОМ В УПРАВЛЕНИИ</p><h2>${escapeHtml(home.name)}</h2></div><span class="house-card-mark">⌂</span></div><table class="house-info-table"><tbody><tr><th>Адрес</th><td colspan="3">${escapeHtml(home.address)}</td></tr><tr><th>Возраст</th><td>${quantity(home.age || 0)} лет</td><th>Площадь</th><td>${quantity(home.area)} м²</td></tr><tr><th>Тариф</th><td>${money(currentTariff(home))} ₽ / м²</td><th>БО</th><td>${money(maintenance)} ₽ / ход</td></tr><tr><th>Собираемость (тек./общ.)</th><td>${home.lastCollectionRate == null ? "—" : `${home.lastCollectionRate}%`} / ${collectionRate == null ? "—" : `${collectionRate}%`}</td><th>Общий износ</th><td>${overallWear}%</td></tr><tr><th>Долг жителей</th><td>${money(homeDebt)} ₽</td><th>Отменено</th><td>${cancelledCount}</td></tr></tbody></table>${activeHouseWarranty || warrantyStatus ? `<div class="house-warranty-status"><b>Гарантия</b>${activeHouseWarranty ? `<span>Общий срок после гарантийных работ: осталось сезонов ${Math.max(0, homeWarrantyUntil - state.turn + 1)}</span>` : ""}${warrantyStatus}</div>` : ""}<div class="house-problems"><h3>Проблемы дома <span>оценка по категориям</span></h3><ul>${problems || '<li class="no-home-problems">Проблем не выявлено</li>'}</ul></div></article>`;
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
    materials = Math.max(0.01, Math.round(materials * (1 - materialDiscount / 100) * 100) / 100);
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
    return requirements.materials + requirements.contractorWork;
  }

  function problemProgress(problem) {
    return problem.repairProgress && typeof problem.repairProgress === "object" ? problem.repairProgress : {};
  }

  function unsafeHouseSeasonsRemaining(houseName = state.houseName) {
    const home = managedHomeByName(houseName);
    const sinceTurn = home?.primary ? state.houseUnsafeSinceTurn : home?.unsafeSinceTurn;
    if (sinceTurn == null) return 0;
    const completedSeasonsAfterTrigger = Math.max(0, state.turn - sinceTurn - 1);
    return Math.max(0, CONFIG.rules.unsafeHouseGraceSeasons - completedSeasonsAfterTrigger);
  }

  function problemLaborAdjustmentMessages(problem) {
    if (problem.laborReductionLogged) return [];
    const requirements = problemRequirements(problem);
    const baseLabor = Object.values(requirements.baseWork).reduce((sum, value) => sum + value, 0);
    const remainingLabor = Object.values(requirements.work).reduce((sum, value) => sum + value, 0);
    const reduction = baseLabor - remainingLabor;
    if (reduction <= 0) return [];
    const engineers = state.employees.filter(employee => employee.role === "engineer" && employee.bonus === "reduceProblemLabor");
    problem.laborReductionLogged = true;
    return engineers.map(engineer => `Инженер ${engineer.name} сократил требуемые работы по проблеме «${problem.category}» на ${reduction} трудозатраты.`);
  }

  function phaseActionLabel() {
    return ({
      staffing: `Применить кадровые изменения${state.pendingHireIds.length || Object.keys(state.pendingFireActions).length ? " и продолжить" : ""}`,
      inspection: `Провести ${SEASONS[state.seasonIndex] === "Осень" ? "осенний" : "весенний"} осмотр`,
      problems: "Перейти к приёму заявок",
      drawing: "Принять заявки",
      resolving: state.phase === "resolving" && hasLawyer() ? "Завершить распределение · к специалистам" : "Завершить распределение",
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
        const workers = state.employees.filter(employee => ROLES[employee.role]?.category === category);
        const workerButtons = workers.map(employee => {
          const name = escapeHtml(employee.name || roleName(employee.role));
          const available = Math.max(0, effectiveProductivity(employee) - employee.assignedLabor);
          const regularWork = Math.min(remaining, available);
          const regularButton = regularWork ? `<button class="problem-work-button" type="button" data-problem-work="${escapeHtml(problem.id)}" data-problem-worker="${escapeHtml(employee.id)}" data-problem-category="${escapeHtml(category)}" data-problem-overtime="none" ${!materialPurchased ? "disabled" : ""}>${name} · ${regularWork} трудозатрат · без премии</button>` : "";
          if (employee.unhappy || remaining <= regularWork) return regularButton;
          const overtimePlan = overtimeFor(employee, remaining);
          const paidButton = `<button class="problem-work-button problem-overtime-paid" type="button" data-problem-work="${escapeHtml(problem.id)}" data-problem-worker="${escapeHtml(employee.id)}" data-problem-category="${escapeHtml(category)}" data-problem-overtime="paid" ${!materialPurchased || state.capital < overtimePlan.premium ? "disabled" : ""}>${name} · ещё ${remaining} трудозатрат · премия ${money(overtimePlan.premium)} ₽</button>`;
          const unpaidButton = `<button class="problem-work-button problem-overtime-unpaid" type="button" data-problem-work="${escapeHtml(problem.id)}" data-problem-worker="${escapeHtml(employee.id)}" data-problem-category="${escapeHtml(category)}" data-problem-overtime="unpaid" ${!materialPurchased ? "disabled" : ""}>${name} · ещё ${remaining} трудозатрат · без премии, недовольство</button>`;
          return `${regularButton}${paidButton}${unpaidButton}`;
        }).join("");
        return `<div class="problem-work-row"><div><strong>${escapeHtml(category)}</strong><span>Выполнено ${done} / ${required} · осталось ${remaining}</span></div><div class="problem-work-actions">${workerButtons || `<span class="problem-work-empty">${remaining ? "Нет доступного исполнителя этой категории" : "Категория завершена"}</span>`}</div></div>`;
      }).join("");
      const materialButton = !materialPurchased ? `<button class="problem-material-button" type="button" data-problem-material="${escapeHtml(problem.id)}" ${state.capital < requirements.materials ? "disabled" : ""}>Приобрести материалы · ${money(requirements.materials)} ₽</button>` : `<span class="problem-material-paid">Материалы приобретены · ${money(requirements.materials)} ₽</span>`;
      const contractorCost = remainingProblemContractorWork(problem);
      const laborComplete = Object.entries(requirements.work).every(([category, required]) => (progress[category] || 0) >= required);
      const staffFinishButton = `<button class="problem-work-button" type="button" data-problem-staff-finish="${escapeHtml(problem.id)}" ${!materialPurchased || !laborComplete ? "disabled" : ""}>Завершить силами штата</button>`;
      const contractorButton = `<button class="problem-contract-button" type="button" data-problem-contract="${escapeHtml(problem.id)}" ${!materialPurchased || state.capital < contractorCost ? "disabled" : ""}>Подрядчик · работы ${money(contractorCost)} ₽</button>`;
      const problemHome = managedHomeByName(problem.houseName || state.houseName);
      const unsafeSince = problemHome?.primary ? state.houseUnsafeSinceTurn : problemHome?.unsafeSinceTurn;
      const status = unsafeSince != null ? `<span class="unsafe-countdown">До автоматического признания дома аварийным: ${unsafeHouseSeasonsRemaining(problemHome.name)} полных сезонов</span>` : "";
      return `<article class="problem-repair-card"><div class="problem-repair-main"><strong>${escapeHtml(problem.houseAddress || managedHomeByName(problem.houseName)?.address || state.houseAddress)} · ${escapeHtml(problem.category)} · износ ${problem.wear}%</strong><span>Сначала приобрети материалы. Затем полностью устрани работы подрядчиком или штатными сотрудниками. Трудозатраты можно накапливать между ходами. Общая оценка: ${money(problemRepairCost(problem))} ₽</span></div>${status}<div class="problem-material-actions">${materialButton}</div><div class="problem-work-list">${workRows || `<div class="problem-work-row"><div><strong>Работы без затрат продуктивности</strong><span>Для завершения ремонта всё равно нужна покупка материалов и подтверждение способа выполнения.</span></div></div>`}</div><div class="problem-repair-actions">${contractorButton}${staffFinishButton}</div></article>`;
    }).join("");
    elements.problemPanel.innerHTML = `<div class="problem-panel-heading"><div><p class="section-label">ЭТАП · РЕШЕНИЕ ПРОБЛЕМ</p><h2>Материалы и ремонт дома</h2></div><span class="inspection-icon">⚒</span></div><p>Сначала приобрети материалы. Затем оплати подрядчику только работы или распределяй трудозатраты между штатными исполнителями. Работы можно завершать поэтапно в разные сезоны.</p><div class="problem-repair-list">${rows || '<div class="problem-none">На доме нет известных проблем. Переходи к приёму заявок.</div>'}</div>`;
    elements.problemPanel.querySelectorAll("[data-problem-material]").forEach(button => button.addEventListener("click", () => purchaseProblemMaterials(button.dataset.problemMaterial)));
    elements.problemPanel.querySelectorAll("[data-problem-contract]").forEach(button => button.addEventListener("click", () => hireProblemContractor(button.dataset.problemContract)));
    elements.problemPanel.querySelectorAll("[data-problem-work]").forEach(button => button.addEventListener("click", () => assignProblemWork(button.dataset.problemWork, button.dataset.problemWorker, button.dataset.problemCategory, button.dataset.problemOvertime)));
    elements.problemPanel.querySelectorAll("[data-problem-staff-finish]").forEach(button => button.addEventListener("click", () => finishProblemWithStaff(button.dataset.problemStaffFinish)));
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
      state.houseName = promoted.name; state.houseAddress = promoted.address; state.primaryArea = promoted.area; state.houseAge = promoted.age;
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
    if (CONFIG.rules.unsafeHouseEndsGame && state.houses === 0) {
      if (state.phase !== "annualReport") {
        state.lastAnnualReport = {
          year: state.year,
          capitalStart: state.yearStats.capitalStart,
          capitalEnd: state.capital,
          yearStats: { ...state.yearStats },
          totals: { ...state.totals },
          reputation: { start: state.reputation + reputationPenalty, end: state.reputation, cancellationPenalty: 0, emergencyPenalty: 0, unsafeHousePenalty: reputationPenalty, solvencyBonus: 0, cleanHouseBonus: 0 }
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
    const { materials } = requirements;
    if (state.capital < materials) { showToast(`На материалы нужно ${money(materials)} ₽.`); return; }
    if (!changeCapital(-materials, "материалы для проблемы дома")) return;
    state.seasonFinancials.problemRepairs += materials;
    problem.materialPurchased = true;
    const materialLog = [`Материалы для проблемы «${problem.category}»: базовая стоимость ${money(requirements.undiscountedMaterials)} ₽.`];
    const materialDiscountEmployees = state.employees.filter(employee => employee.role === "engineer" && employee.bonus === "discountProblemMaterials");
    if (requirements.materialDiscount > 0) materialDiscountEmployees.forEach(employee => materialLog.push(`Инженер ${employee.name} применил скидку ${requirements.materialDiscount}%: ${money(requirements.undiscountedMaterials)} − ${money(requirements.undiscountedMaterials - materials)} = ${money(materials)} ₽.`));
    else materialLog.push("Скидки специалистов на материалы не применялись.");
    materialLog.push(`Итоговая стоимость материалов: −${money(materials)} ₽.`);
    materialLog.push(...problemLaborAdjustmentMessages(problem));
    addLogSequence(materialLog);
    saveState(); render(); showToast(`Материалы приобретены: −${money(materials)} ₽`);
  }

  function finishProblemWithStaff(problemId) {
    if (state.phase !== "problems") return;
    const problem = state.houseProblems.find(item => item.id === problemId);
    if (!problem || !problem.materialPurchased) return;
    const requirements = problemRequirements(problem).work;
    const progress = problemProgress(problem);
    if (!Object.entries(requirements).every(([category, amount]) => (progress[category] || 0) >= amount)) return;
    addLogSequence([...problemLaborAdjustmentMessages(problem), `Проблема «${problem.category}» завершена силами штата после покупки материалов.`]);
    finishProblemRepair(problem);
    saveState(); render(); showToast(`Проблема «${problem.category}» устранена силами штата.`);
  }

  function assignProblemWork(problemId, employeeId, category, overtimeMode = "none") {
    if (state.phase !== "problems") return;
    const problem = state.houseProblems.find(item => item.id === problemId);
    const employee = state.employees.find(item => item.id === employeeId);
    if (!problem || !employee || !problem.materialPurchased || ROLES[employee.role]?.category !== category) return;
    const required = problemRequirements(problem).work[category] || 0;
    const progress = problemProgress(problem);
    const remaining = Math.max(0, required - (progress[category] || 0));
    const available = Math.max(0, effectiveProductivity(employee) - employee.assignedLabor);
    const regularWork = Math.min(remaining, available);
    let contribution = regularWork;
    let premium = 0;
    if (overtimeMode !== "none") {
      if (employee.unhappy || remaining <= regularWork) return;
      contribution = remaining;
      const plan = overtimeFor(employee, contribution);
      if (overtimeMode === "paid") {
        premium = plan.premium;
        if (state.capital < premium) { showToast(`На премию за переработку нужно ${money(premium)} ₽.`); return; }
        if (premium && !changeCapital(-premium, "премия за переработку при решении проблемы")) return;
        state.seasonFinancials.problemRepairs += premium;
        if (premium) addLog(`Премия за переработку ${roleName(employee.role)} ${employee.name}: ${money(plan.basePremium)} ₽${plan.hrMultiplier < 1 ? ` · HR снизил до ${money(premium)} ₽` : ""}.`);
      } else {
        employee.unpaidOvertime = true;
        employee.unhappyNextTurn = true;
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

  function hireProblemContractor(problemId) {
    if (state.phase !== "problems") return;
    const problem = state.houseProblems.find(item => item.id === problemId);
    if (!problem || !problem.materialPurchased) return;
    const contractorWork = remainingProblemContractorWork(problem);
    if (state.capital < contractorWork) { showToast(`На работы подрядчика нужно ${money(contractorWork)} ₽.`); return; }
    if (!changeCapital(-contractorWork, "подрядные работы по проблеме дома")) return;
    state.seasonFinancials.problemRepairs += contractorWork;
    addLog(`Подрядчик полностью устранил проблему «${problem.category}». Стоимость работ: ${money(contractorWork)} ₽; материалы оплачены отдельно.`);
    finishProblemRepair(problem);
    saveState(); render(); showToast(`Проблема устранена подрядчиком: работы −${money(contractorWork)} ₽`);
  }

  function renderDevTools() {
    const panel = document.getElementById("dev-tools-panel");
    if (!panel) return;
    panel.hidden = false;
    if (!panel.dataset.controlsBound) {
      panel.dataset.controlsBound = "true";
      panel.querySelectorAll("[data-dev-action]").forEach(button => button.addEventListener("click", () => runDevAction(button.dataset.devAction)));
    }
    const problemSelect = document.getElementById("dev-solve-problem-select");
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
        state.penalties.push({ id: `dev-fine-${state.turn}-${Date.now()}`, employeeName: String(fineForm.elements.title.value).trim() || "Тестовый штраф", salary: 0, amount, year: state.year, turn: state.turn, houseName: state.houseName, houseAddress: state.houseAddress, paid: false, writtenOff: false, contestedBy: [] });
        addLog(`DEV: добавлен штраф «${fineForm.elements.title.value.trim() || "Тестовый штраф"}» на ${money(amount)} ₽.`);
        saveState(); render(); showToast(`Тестовый штраф добавлен: ${money(amount)} ₽`);
      });
    }
    const employeeForm = panel.querySelector("#dev-add-employee-form");
    if (employeeForm && !employeeForm.dataset.bound) {
      employeeForm.dataset.bound = "true";
      employeeForm.elements.role.addEventListener("change", () => updateDevEmployeeProfiles(employeeForm));
      employeeForm.elements.profile.addEventListener("change", () => updateDevEmployeeParameters(employeeForm));
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
        if ((role.kind === "executor" && (!Number.isInteger(productivity) || productivity < 1)) || (roleId === "lawyer" && ![1, 2, 3].includes(legalStrength))) return;
        const employee = { ...profile, id: `dev-employee-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, salary: roleId === "lawyer" ? lawyerSalary(legalStrength) : profile.salary, productivity, legalStrength, probationTurns: 0, assignedLabor: 0, unhappy: false, unhappyNextTurn: false, unpaidOvertime: false, hiredTurn: state.turn };
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
    const home = { name, address, area, age, baseMaintenance, tariffPerSquareMeter: currentTariff(), tariffOssResolvedYear: null, debtRecoverable: 0, debtIrrecoverable: 0, collectionStats: { billed: 0, collected: 0, periods: 0 }, lastCollectionRate: null, repairWarranties: {}, warrantyUntilTurn: null, unsafeSinceTurn: null, unsafeSinceYear: null, unsafeReasons: [], removed: false };
    if (!managedHomes().length) {
      state.houseName = home.name; state.houseAddress = home.address; state.primaryArea = home.area; state.houseAge = home.age;
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
      return `<article class="worker-card ${hired ? "worker-selected" : ""} ${roleStaffCount ? "worker-has-incumbents" : ""}">${roleStaffCount ? `<span class="worker-incumbent-count">Уже есть в штате: ${quantity(roleStaffCount)}</span>` : ""}<div class="worker-icon">${role.icon}</div><div class="worker-info"><strong>${heading}</strong><span>${escapeHtml(candidate.name)}</span>${candidate.bonusDescription ? `<span>${escapeHtml(candidate.bonusDescription)}</span>` : ""}<span>ЗП: ${money(offeredSalary)} ₽ / ход${hasHR() || pendingHireHasHR() ? " · испытательный срок" : ""}</span></div><button class="hire-button" data-hire="${escapeHtml(candidate.id)}" ${alreadyEmployed || !( ["staffing", "preparation"].includes(state.phase)) || (!hired && hireLimit) ? "disabled" : ""}>${alreadyEmployed ? "Уже в штате" : hired ? "Убрать из пула" : state.phase === "preparation" ? "В стартовый штат" : "В пул найма"}</button></article>`;
    }).join("");
    const reroll = hasAvailableMarketReroll() || (hasEmployeeBonus("hr", "marketReroll") && state.phase === "staffing") ? `<button type="button" class="dev-wide-button market-reroll-button" data-hr-reroll ${hasAvailableMarketReroll() ? "" : "disabled"}>↻ Перебросить рынок труда (1 раз за ход)</button>` : "";
    elements.market.innerHTML = `${reroll}${cards}`;
    elements.market.querySelector("[data-hr-reroll]")?.addEventListener("click", rerollMarketByHR);
    elements.market.querySelectorAll("[data-hire]").forEach(button => button.addEventListener("click", () => toggleHire(button.dataset.hire)));
  }

  function renderTeam() {
    const employeeCards = new Map(state.employees.map(employee => {
      const role = ROLES[employee.role];
      const unhappy = employee.unhappy;
      const probation = employee.probationTurns > 0 ? `<span class="probation-note">Испытательный срок · осталось ${employee.probationTurns} хода</span>` : "";
      const status = role.kind === "specialist" ? "Специалист" : unhappy ? "Недоволен · −1 продуктивность" : employee.unpaidOvertime ? "Ждёт решения по премии" : "Исполнитель";
      const currentSalary = effectiveSalary(employee);
      const years = Math.max(0, Math.floor((state.turn - (employee.hiredTurn || 1)) / SEASONS.length));
      const pending = state.pendingFireActions[employee.id];
      const heading = role.kind === "executor" ? `${role.name} · продуктивность ${effectiveProductivity(employee)}/${employee.productivity}` : `${role.name} · специалист${employee.role === "lawyer" ? ` · ЮС ${employee.legalStrength || 1}` : ""}`;
      const detail = role.kind === "executor" ? `Назначено ${employee.assignedLabor} трудозатрат` : role.detail;
      const card = `<article class="team-member role-${role.kind} ${unhappy ? "team-unhappy" : ""} ${employee.probationTurns > 0 ? "team-probation" : ""} ${pending ? "team-pending-fire" : ""}"><div class="worker-icon">${role.icon}</div><div class="worker-info"><strong>${heading}</strong><span>${escapeHtml(employee.name || "Сотрудник")}</span><span>ЗП: ${money(currentSalary)} ₽ / ход${employee.probationTurns > 0 ? " · половина ставки" : ""}</span><span>${detail}</span>${employee.bonusDescription ? `<span>${escapeHtml(employee.bonusDescription)}</span>` : ""}${probation}<span>${years} ${years === 1 ? "год" : years > 1 && years < 5 ? "года" : "лет"} в компании</span></div><span class="worker-status ${unhappy ? "unhappy" : employee.unpaidOvertime ? "used" : "available"}">${pending ? `В пуле на увольнение · ${pending === "paid" ? "с выплатой" : "без выплаты"}` : status}</span><div class="fire-actions">${pending ? `<button class="fire-button" data-fire-cancel="${escapeHtml(employee.id)}">Вернуть в штат</button>` : `<button class="fire-button" data-fire="${escapeHtml(employee.id)}" data-pay="true" ${state.phase !== "staffing" ? "disabled" : ""}>В пул · с выплатой</button><button class="fire-unpaid-button" data-fire="${escapeHtml(employee.id)}" data-pay="false" ${state.phase !== "staffing" ? "disabled" : ""}>В пул · без выплаты</button>`}</div></article>`;
      return [employee.id, card];
    }));
    const roleOrders = { specialist: ["lawyer", "accountant", "hr", "engineer"], executor: ["plumber", "electrician", "handyman", "janitor"] };
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

  function renderRosterReference() {
    if (!elements.rosterReference) return;
    elements.rosterReference.innerHTML = EMPLOYEE_ROSTER.map(person => {
      const role = ROLES[person.role];
      return `<tr><td>${role.name}</td><td>${escapeHtml(person.name)}${person.bonusDescription ? `<br><small>${escapeHtml(person.bonusDescription)}</small>` : ""}</td><td>${person.role === "lawyer" ? `ЮС ${person.legalStrength}` : person.productivity ? `${person.productivity} трудозатрат` : "—"}</td><td>${money(person.salary)} ₽ / ход</td></tr>`;
    }).join("");
  }

  function renderPenalties() {
    const damageClaims = [...state.compensations].reverse();
    const fines = [...state.penalties].reverse().map(penalty => {
      const status = penalty.paid ? "Выплачен" : penalty.writtenOff ? "Списан при банкротстве" : penalty.lawyerCleared ? "Снят юристом" : penalty.reducedByLawyer ? "Снижен юристом · к оплате" : "К оплате";
      const address = penalty.houseAddress || managedHomeByName(penalty.houseName)?.address;
      const html = `<article class="penalty-row ${penalty.paid ? "penalty-paid" : penalty.writtenOff ? "penalty-written-off" : "penalty-due"}"><div class="penalty-icon">${penalty.paid ? "✓" : penalty.writtenOff ? "↺" : "!"}</div><div class="penalty-info"><strong>Штраф трудовой инспекции · ${escapeHtml(penalty.employeeName)}</strong><span>${address ? `Адрес: ${escapeHtml(address)} · ` : ""}Последняя зарплата ${money(penalty.salary)} ₽ × 3 · год ${penalty.year}${penalty.reducedByLawyer ? ` · исходно ${money(penalty.originalAmount)} ₽` : ""}</span></div><b class="penalty-amount">${money(penalty.amount)} ₽</b><span class="penalty-status">${status}</span>${!penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared ? `<button class="pay-penalty-button" type="button" data-penalty="${escapeHtml(penalty.id)}" ${state.phase === "bankruptcy" || state.capital < penalty.amount ? "disabled" : ""}>Выплатить</button>` : ""}</article>`;
      return { paid: Boolean(penalty.paid), html };
    });
    const compensations = damageClaims.map(claim => {
      const status = claim.paid ? claim.paidBy === "developer" ? "Оплачена застройщиком" : "Выплачена" : claim.writtenOff ? "Списана при банкротстве" : claim.amount === 0 ? "Снята юристом" : claim.reducedByLawyer ? "Снижена юристом · к оплате" : "К оплате отдельно";
      const address = claim.houseAddress || managedHomeByName(claim.houseName)?.address;
      const html = `<article class="penalty-row penalty-compensation ${claim.paid ? "penalty-paid" : claim.writtenOff ? "penalty-written-off" : ""}"><div class="penalty-icon">◇</div><div class="penalty-info"><strong>Компенсация ущерба · ${escapeHtml(claim.title)}</strong><span>${address ? `Адрес: ${escapeHtml(address)} · ` : ""}Обязательство по аварийной заявке${claim.reducedByLawyer ? ` · исходно ${money(claim.originalAmount)} ₽` : ""}</span></div><b class="penalty-amount">${money(claim.amount)} ₽</b><span class="penalty-status">${status}</span>${!claim.paid && !claim.writtenOff && claim.amount > 0 ? `<button class="pay-penalty-button" type="button" data-compensation="${escapeHtml(claim.id)}" ${state.phase === "bankruptcy" || state.capital < claim.amount ? "disabled" : ""}>Выплатить</button>` : ""}</article>`;
      return { paid: Boolean(claim.paid), html };
    });
    const allRows = [...fines, ...compensations];
    const unpaidRows = allRows.filter(row => !row.paid);
    const hiddenPaid = allRows.length - unpaidRows.length;
    const fullRows = showPaidPenalties ? allRows : unpaidRows;
    const dueTotal = unpaidFineTotal() + unpaidCompensationTotal();
    const contestableFineTotal = state.penalties.filter(item => !item.paid && !item.writtenOff && !item.lawyerCleared && !(item.contestedBy || []).length).reduce((sum, item) => sum + item.amount, 0);
    const contestableCompensationTotal = state.compensations.filter(item => !item.paid && !item.writtenOff && item.amount > 0 && !(item.contestedBy || []).length).reduce((sum, item) => sum + item.amount, 0);
    const contestableTotal = activeLawyers().length ? contestableFineTotal + contestableCompensationTotal : 0;
    if (elements.compactPenaltyTotal) elements.compactPenaltyTotal.textContent = `К выплате: ${money(dueTotal)} ₽`;
    if (elements.compactPenaltyContestable) elements.compactPenaltyContestable.textContent = `Можно оспорить: ${money(contestableTotal)} ₽`;
    if (elements.compactPenaltyMarker) elements.compactPenaltyMarker.hidden = contestableTotal <= 0;
    const fullEmpty = allRows.length === 0 ? "Штрафов и компенсаций пока нет." : `Оплаченные скрыты (${hiddenPaid}). Нажмите «Показать оплаченные».`;
    const compactEmpty = unpaidRows.length === 0 ? "Нет неоплаченных штрафов и компенсаций." : "";
    const paintList = (container, rows, empty) => {
      if (!container) return;
      container.innerHTML = rows.length ? rows.map(row => row.html).join("") : `<div class="penalties-empty">${empty}</div>`;
      container.querySelectorAll("[data-penalty]").forEach(button => button.addEventListener("click", () => payPenalty(button.dataset.penalty)));
      container.querySelectorAll("[data-compensation]").forEach(button => button.addEventListener("click", () => payCompensation(button.dataset.compensation)));
    };
    paintList(elements.penalties, fullRows, fullEmpty);
    paintList(elements.penaltiesCompact, unpaidRows, compactEmpty);
    const toggle = document.getElementById("toggle-paid-penalties");
    if (toggle) {
      toggle.textContent = showPaidPenalties ? "Скрыть оплаченные" : "Показать оплаченные";
      toggle.hidden = hiddenPaid === 0;
      toggle.onclick = () => { showPaidPenalties = !showPaidPenalties; renderPenalties(); };
    }
  }

  function renderLegalPanel() {
    const reductionTargets = [
      ...state.penalties.filter(penalty => !penalty.paid && !penalty.writtenOff && !penalty.lawyerCleared).map(penalty => ({ type: "fine", id: penalty.id, title: `Штраф инспекции · ${penalty.employeeName}`, amount: penalty.amount, contestedBy: penalty.contestedBy || [] })),
      ...state.compensations.filter(claim => !claim.paid && !claim.writtenOff && claim.amount > 0).map(claim => ({ type: "compensation", id: claim.id, title: `Компенсация · ${claim.title}`, amount: claim.amount, contestedBy: claim.contestedBy || [] }))
    ];
    const lawyers = activeLawyers();
    const lawyerBlocks = lawyers.map((lawyer, number) => {
      const done = state.lawyerActionsUsed.includes(lawyer.id);
      const debtLimit = lawyerDebtLimit(lawyer);
      const reductionRange = lawyerReductionRange(lawyer);
      const debt = state.houseDebtRecoverable > 0 ? `<article class="legal-option"><div><strong>Взыскать долг с дома · ЮС ${lawyer.legalStrength}</strong><span>До ${money(Math.min(debtLimit, state.houseDebtRecoverable))} ₽ · взыскиваемый долг ${money(state.houseDebtRecoverable)} ₽</span></div><button type="button" class="legal-action-button" data-lawyer="debt" data-lawyer-id="${escapeHtml(lawyer.id)}" ${done ? "disabled" : ""}>Взыскать</button></article>` : "";
      const claims = reductionTargets.map(target => `<article class="legal-option"><div><strong>${escapeHtml(target.title)}</strong><span>ЮС ${lawyer.legalStrength} · снижение ${reductionRange[0]}–${reductionRange[1]}% с вероятностью ${Math.round(CONFIG.rules.lawyerReductionSuccessChance * 100)}% · сумма ${money(target.amount)} ₽</span></div><button type="button" class="legal-action-button" data-lawyer="reduce" data-lawyer-id="${escapeHtml(lawyer.id)}" data-target-type="${target.type}" data-target-id="${escapeHtml(target.id)}" ${done || target.contestedBy.length > 0 ? "disabled" : ""}>Оспорить</button></article>`).join("");
      return `<section class="lawyer-task"><h3>${escapeHtml(ROLES[lawyer.role].name)} ${number + 1}${done ? " · задача закрыта" : " · выбери одну задачу"}</h3>${debt}${claims || (!debt ? '<div class="legal-empty">Нет доступных поручений</div>' : "")}${!done ? `<button class="legal-skip-button" data-lawyer-skip="${escapeHtml(lawyer.id)}" type="button">Пропустить задачу</button>` : ""}</section>`;
    }).join("");
    elements.legalPanel.innerHTML = `<div class="legal-heading"><div><p class="section-label">ЗАДАЧИ ЮРИСТАМ</p><h2>Одно поручение на каждого юриста</h2></div><span class="legal-mark">§</span></div><p class="legal-copy">Каждому юристу можно назначить отдельную задачу. Один и тот же штраф или компенсацию можно оспорить один раз всего, независимо от количества юристов.</p><div class="legal-options">${lawyerBlocks}</div>${lawyersDone() ? '<div class="legal-complete">Все поручения выполнены или пропущены. Переходи к выплате зарплат.</div>' : ""}`;
    elements.legalPanel.querySelectorAll('[data-lawyer="debt"]').forEach(button => button.addEventListener("click", () => collectHouseDebt(button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll('[data-lawyer="reduce"]').forEach(button => button.addEventListener("click", () => reduceLiability(button.dataset.targetType, button.dataset.targetId, button.dataset.lawyerId)));
    elements.legalPanel.querySelectorAll("[data-lawyer-skip]").forEach(button => button.addEventListener("click", () => skipLawyerAction(button.dataset.lawyerSkip)));
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
    const claim = targetType === "compensation" ? state.compensations.find(item => item.id === targetId && !item.paid && !item.writtenOff && item.amount > 0) : null;
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

  function renderRequests() {
    if (!state.requests.length) {
      elements.list.innerHTML = '<div class="empty-state"><div class="empty-icon">↘</div><div><strong>Новый день начинается</strong><p>После найма прими заявки, чтобы узнать, что случилось в доме.</p></div></div>';
      return;
    }
    const priority = card => card.resolved || card.cancelled ? 3 : card.type === "paid" ? 0 : isEmergency(card) ? 1 : 2;
    const sortedRequests = state.requests.map((card, index) => ({ card, index })).sort((left, right) => priority(left.card) - priority(right.card) || left.index - right.index);
    elements.list.innerHTML = sortedRequests.map(({ card, index }) => {
      const cashPrice = requestMoneyCost(card);
      const materialCost = requestMaterialCost(card);
      const houseAddress = card.houseAddress || managedHomeByName(card.houseName)?.address || "Адрес не указан";
      if (card.cancelled) return `<article class="request-card request-cancelled"><div class="request-icon">×</div><div class="request-info"><div class="request-meta"><span>${escapeHtml(houseAddress)}</span><span>${escapeHtml(card.category)}</span><span class="request-type-badge type-${card.type}">${requestAttributeLabel(card.type)}</span><span class="labor-badge">${card.labor ? `${card.labor} трудозатрат` : "Только материалы"}</span><span class="cancelled-label">ОТМЕНЕНА</span></div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p></div><div class="request-cost request-cancelled-status"><span>Отменена</span><span class="cancelled-x">×</span></div></article>`;
      const workers = card.labor > 0 ? state.employees.filter(employee => employee.role && ROLES[employee.role].category === card.category && (!employee.unhappy || employee.assignedLabor + card.labor <= effectiveProductivity(employee))) : [];
      const isCarried = card.receivedTurn !== state.turn;
      const contractorNet = card.type === "paid" ? card.payout - cashPrice : 0;
      const unpaid = !card.resolved && (isCarried || requestIsOverdue(card));
      return `<article class="request-card ${card.resolved ? "resolved" : ""} ${unpaid ? "request-overdue" : ""}" data-request-card-id="${escapeHtml(card.id)}">
        <div class="request-icon">${escapeHtml(card.icon)}</div><div class="request-info"><div class="request-meta"><span class="request-house-address">${escapeHtml(houseAddress)}</span><span class="request-category">${escapeHtml(card.category)}</span><span class="request-type-badge type-${card.type}">${requestAttributeLabel(card.type)}</span><span class="labor-badge">${card.labor ? `${card.labor} трудозатрат` : "Без трудозатрат"}</span>${unpaid ? '<span class="overdue-label">ПРОСРОЧЕНА</span>' : ""}${card.resolved ? `<span class="resolved-label">${card.resolvedBy === "contractor" ? "ВЫПОЛНЕНА ПОДРЯДЧИКОМ" : card.resolvedBy === "oss" ? "ВЫПОЛНЕНА ПО ОСС" : "РЕШЕНО"}</span>` : ""}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.description)}</p><div class="request-material-line">${card.type === "paid" ? "Материалы оплачивает заявитель" : `Материалы: ${money(materialCost)} ₽`}${card.damageCompensation ? ` · ущерб выплачивается отдельно: ${money(card.damageCompensation)} ₽` : ""}</div></div>
        <div class="request-cost">${card.resolved ? '<div class="request-complete-status"><span>Выполнена</span><span class="done-check">✓</span></div>' : `<div class="request-actions">${workers.map(worker => {
          const plan = overtimeFor(worker, card.labor);
          const disabled = state.phase !== "resolving";
          const label = plan.premium ? `${roleName(worker.role)} · премия ${money(plan.premium)} ₽` : `${roleName(worker.role)} (${worker.assignedLabor + card.labor}/${effectiveProductivity(worker)})`;
          const workerCost = plan.premium + materialCost;
          return `<div class="request-action-row">${card.type === "paid" ? `<span class="action-income">+${money(card.payout)} ₽</span>` : ""}<button type="button" class="staff-solve-button" data-worker="${escapeHtml(worker.id)}" data-index="${index}" ${disabled || state.capital < workerCost ? "disabled" : ""}>Сотрудник: ${label}${materialCost ? ` · материалы ${money(materialCost)} ₽` : ""}${card.damageCompensation ? " · компенсация отдельно" : ""}</button></div>${plan.premium ? `<div class="request-action-row">${card.type === "paid" ? `<span class="action-income">+${money(card.payout)} ₽</span>` : ""}<button type="button" class="overtime-unpaid-button" data-worker="${escapeHtml(worker.id)}" data-index="${index}" ${disabled || state.capital < materialCost ? "disabled" : ""}>Без премии · недовольство${materialCost ? ` · материалы ${money(materialCost)} ₽` : ""}${card.damageCompensation ? " · компенсация отдельно" : ""}</button></div>` : ""}`;
        }).join("")}<div class="request-action-row">${card.type === "paid" ? `<span class="action-income">${contractorNet >= 0 ? "+" : "−"}${money(Math.abs(contractorNet))} ₽</span>` : ""}<button type="button" class="solve-button" data-index="${index}" ${state.phase !== "resolving" || state.capital < cashPrice ? "disabled" : ""}>Привлечь подрядчика · ${money(cashPrice)} ₽ <span>↗</span></button></div>${isEmergency(card) ? '<span class="emergency-lock-note">Аварийную нельзя отменить</span>' : `<button type="button" class="request-cancel-button" data-index="${index}" ${state.phase !== "resolving" ? "disabled" : ""}>Отменить заявку</button>`}</div>`}</div>
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
    const reputation = report.reputation || { start: state.reputation, end: state.reputation, cancellationPenalty: 0, emergencyPenalty: 0, unsafeHousePenalty: 0, solvencyBonus: 0, cleanHouseBonus: 0 };
    const repText = value => `${value > 0 ? "+" : ""}${value}`;
    const tariffOss = managedHomes().map(home => home.tariffOssResolvedYear === state.year
      ? `<div class="oss-result-note"><b>${escapeHtml(home.address)} · ${escapeHtml(home.name)}</b>: ОСС по тарифу проведено в этом году. Тариф дома: <b>${money(currentTariff(home))} ₽/м²</b>.</div>`
      : `<div class="oss-tariff-controls house-tariff-oss" data-tariff-house="${escapeHtml(home.name)}"><b>${escapeHtml(home.address)} · ${escapeHtml(home.name)}</b><label>Изменение тарифа, ₽/м²</label><input class="oss-tariff-increase" type="number" step="0.01" value="1"><button class="oss-action-button" data-run-tariff-oss="${escapeHtml(home.name)}" type="button">Провести ОСС для изменения тарифа</button><button class="oss-skip-button" data-skip-tariff-oss="${escapeHtml(home.name)}" type="button">Не проводить ОСС · получить +1 репутацию</button><p>Тариф дома: ${money(currentTariff(home))} ₽/м². X — положительное значение повышает тариф, отрицательное снижает. Тариф не может стать ниже 0 ₽/м².</p></div>`).join("");
    const reputationBlock = `<div class="report-reputation"><div><span>Репутация игрока</span><b>${repText(reputation.start)} → ${repText(reputation.end)}</b></div><ul><li>${reputation.cancellationPenalty ? `−${reputation.cancellationPenalty} за ${report.yearStats.cancelled} отменённые заявки` : "Нет штрафа за отменённые заявки"}</li><li>${reputation.emergencyPenalty ? `−${reputation.emergencyPenalty} за нерешённые аварийные заявки` : "Все аварийные заявки решены"}</li><li>${reputation.solvencyBonus ? "+1: год закрыт без долгов" : "Бонус за отсутствие долгов не получен"}</li><li>${reputation.cleanHouseBonus ? "+1: на доме нет отменённых заявок" : "Бонус за отсутствие отмен не получен"}</li><li>${reputation.unsafeHousePenalty ? "−2: аварийный дом изъят из игры" : "Нет штрафа за аварийный дом"}</li><li>${reputation.tariffNoAttemptBonus ? `+${reputation.tariffNoAttemptBonus}: ОСС для повышения тарифа не проводилось` : ""}</li></ul></div>`;
    elements.annualReport.innerHTML = `<div class="report-heading"><div><p class="section-label">ИТОГИ ГОДА ${report.year}</p><h2>Годовой отчёт</h2></div><span class="report-stamp">ЗАКРЫТ</span></div>${reputationBlock}<div class="report-columns"><section class="report-column"><h3>За прошедший год</h3><div class="report-money"><div><span>Деньги на начало года</span><b>${money(report.capitalStart)} ₽</b></div><div><span>Деньги на конец года</span><b>${money(report.capitalEnd)} ₽</b></div></div>${counts(report.yearStats)}</section><section class="report-column"><h3>За всё время игры</h3>${counts(report.totals)}</section></div><p class="report-footnote">Отменённые обычные заявки за игру: <b>${state.cancelledRequests.length}</b>. ${state.houseRemoved ? "Дом изъят из игры; аварийные заявки учтены в репутации." : "Нерешённые аварийные заявки остаются на доме."}</p>${(state.houseRemoved && CONFIG.rules.unsafeHouseEndsGame) ? `<div class="house-removed-notice">Дом признан аварийным и изъят из игры. Репутация снижена на ${CONFIG.rules.unsafeHouseReputationPenalty}. Игра завершена.</div>` : `<div class="annual-actions"><section class="house-tariff-oss-list"><h3>ОСС на изменение тарифа по домам</h3>${tariffOss || '<p>Нет домов в управлении.</p>'}</section><button class="primary-button next-year-button" id="next-year-button" type="button"><span>Начать новый год · лето</span><span class="button-arrow">↗</span></button></div>`}`;
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
    const record = { ...card, year: state.year, houseName: card.houseName || state.houseName };
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
    state.houses = INITIAL_STATE.houses;
    state.primaryArea = newHouse.area;
    state.additionalHomes = [];
    state.area = newHouse.area;
    state.houseName = newHouse.name;
    state.houseAddress = newHouse.address;
    state.houseAge = Number(newHouse.age) || 0;
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
    return selected.map((person, index) => ({ ...person, id: `staff-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}` }));
  }

  function rerollMarketByHR() {
    if (!hasAvailableMarketReroll()) return;
    const hr = state.employees.find(employee => employee.role === "hr" && employee.bonus === "marketReroll");
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
      const materialCost = Math.round(rawMaterialCost * (1 - Math.min(100, employeeBonusCount("engineer", "discountProblemMaterials") * CONFIG.rules.engineerMaterialDiscountPercent) / 100) * 100) / 100;
      const withDamage = Math.random() < CONFIG.rules.problemEmergencyDamageChance;
      const damageCompensation = withDamage ? Math.max(CONFIG.rules.problemEmergencyCompensationMinimum, problem.wear * CONFIG.rules.problemDamageMultiplier) : 0;
      const home = managedHomeByName(problem.houseName || state.houseName) || { name: state.houseName, address: state.houseAddress };
      const request = {id: `problem-task-${state.turn}-${problem.id}-${created}`, title: `Авария: ${task.title}`, description: `Аварийные последствия проблемы «${problem.category}». Износ категории: ${problem.wear}%.`,
        category: task.category, labor: task.labor, materialCost, contractorCost: requestMoneyCost({ category: task.category, materialCost }), type: withDamage ? "emergencyDamage" : "emergency", damageCompensation, payout: 0, icon: "⚠", problemId: problem.id,
        problemCategory: problem.category, problemWear: problem.wear, problemCycleId: `${state.turn}-${problem.id}`, resolved: false, cancelled: false, receivedTurn: state.turn, houseName: home.name, houseAddress: home.address};
      state.requests.push(request);
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
    const engineer = state.employees.find(employee => employee.role === "engineer");
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

  function finishPreparation() {
    if (state.phase !== "preparation") return;
    const input = document.getElementById("company-name-input");
    const companyName = input.value.trim() || DEFAULT_COMPANY_NAMES[Math.floor(Math.random() * DEFAULT_COMPANY_NAMES.length)];
    state.companyName = companyName;
    state.houseDeck = state.houseDeck.filter(house => house.name !== state.houseName);
    if (!state.houseDeck.length) state.houseDeck = shuffle(HOUSE_CARDS.filter(house => house.name !== state.houseName));
    applyStaffingChanges();
    if (state.phase === "bankruptcy") { saveState(); render(); return; }
    state.phase = "drawing";
    state.market = makeMarket(state.employees);
    addLog(`Началась игра: УК «${companyName}» открыла первый сезон с командой из ${state.employees.length} сотрудников.`);
    saveState(); render(); showToast(`УК «${companyName}» готова к первому сезону.`);
  }

  function applyStaffingChanges() {
    const hrPresent = hasHR() || pendingHireHasHR();
    const hired = state.market.filter(candidate => state.pendingHireIds.includes(candidate.id) && !state.employees.some(person => person.role === candidate.role && person.name === candidate.name));
    for (const candidate of hired) {
      const role = ROLES[candidate.role];
      const probationTurns = hrPresent ? CONFIG.rules.probationTurns : 0;
      const salary = candidate.salary * (state.phase === "preparation" ? CONFIG.rules.preparationSalaryMultiplier : 1);
      state.employees.push({ ...candidate, salary, productivity: candidate.productivity, legalStrength: candidate.role === "lawyer" ? candidate.legalStrength || 1 : candidate.legalStrength, probationTurns, assignedLabor: 0, unhappy: false, unhappyNextTurn: false, unpaidOvertime: false, hiredTurn: state.turn });
      state.hiresThisTurn += 1; countEvent("hired");
      const hireLog = [`Нанят сотрудник: ${role.name} ${candidate.name}, постоянная зарплата ${money(salary)} ₽ / ход${probationTurns ? " до учёта испытательного срока" : ""}.`];
      if (state.phase === "preparation") hireLog.push(`Стартовый найм сохранил для ${candidate.name} зарплату на 30% ниже установленной: ${money(salary)} ₽ / ход.`);
      if (probationTurns) {
        const hiringHR = state.employees.find(person => person.role === "hr");
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
      if (action === "paid") { changeCapital(-finalSalary, "последняя зарплата при увольнении"); addLog(`Сотрудник уволен: ${roleName(employee.role)}. Выплачена последняя зарплата ${money(finalSalary)} ₽.`); }
      else if (employee.probationTurns <= 0) {
        state.reputation -= CONFIG.rules.unpaidFiringReputationPenalty;
        const complained = Math.random() < CONFIG.rules.unpaidFiringComplaintChanceMax;
        addLog(`Сотрудник уволен без выплаты: ${roleName(employee.role)}; репутация −1.`);
        if (complained) {
          const penalty = { id: `fine-${state.turn}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, employeeName: roleName(employee.role), salary: finalSalary, amount: finalSalary * CONFIG.rules.laborInspectionFineSalaryMultiplier, year: state.year, turn: state.turn, houseName: state.houseName, houseAddress: state.houseAddress, paid: false, writtenOff: false };
          state.penalties.push(penalty); addLog(`Трудовая инспекция назначила штраф ${money(penalty.amount)} ₽.`);
        }
      } else addLog(`Сотрудник уволен без выплаты в период испытательного срока: ${roleName(employee.role)}.`);
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
      const complaintChance = CONFIG.rules.unpaidFiringComplaintChanceMax;
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

  function acceptRequests() {
    if (state.phase !== "drawing") return;
    const needed = state.houses * CONFIG.economy.requestsPerHousePerSeason;
    const homes = managedHomes();
    addSeasonalRequests();
    let pool = [...state.deck];
    if (pool.length < needed) pool = [...pool, ...shuffle([...CARDS])];
    const carriedCount = state.requests.filter(card => !card.resolved && !card.cancelled && card.receivedTurn !== state.turn).length;
    for (let index = 0; index < needed; index++) {
      if (!pool.length) pool = shuffle([...CARDS]);
      const card = pool.pop();
      const home = homes[Math.floor(index / CONFIG.economy.requestsPerHousePerSeason) % Math.max(1, homes.length)] || homes[0];
      const accepted = { ...card, type: card.type || "ordinary", materialCost: Number.isFinite(card.materialCost) ? card.materialCost : 0, damageCompensation: card.damageCompensation || 0, payout: card.payout || 0, resolved: false, id: `${state.turn}-${index}`, receivedTurn: state.turn, houseName: home?.name || state.houseName, houseAddress: home?.address || state.houseAddress };
      state.requests.push(accepted);
      registerDamageClaim(accepted);
    }
    countEvent("accepted", needed);
    state.deck = pool; state.phase = "resolving";
    addLog(carriedCount ? `В дома поступило ${needed} новых заявок; перенесено нерешённых: ${carriedCount}.` : `Получено заявок: ${needed} для ${state.houses} домов.`);
    state.ossVoteTurn = state.turn;
    state.ossVoteUsedCategories = [];
    saveState(); render(); showToast(`Принято заявок: ${needed}`);
  }

  function advanceTurnPhase() {
    if (state.phase === "staffing") {
      applyStaffingChanges();
      if (state.phase === "bankruptcy") { saveState(); render(); return; }
      state.phase = CONFIG.rules.inspectionSeasonIndices.includes(state.seasonIndex) ? "inspection" : state.houseProblems.length ? "problems" : "drawing";
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
    const specialistModifier = state.employees.reduce((sum, employee) => sum + (Number.isFinite(employee.ossModifier) ? employee.ossModifier : CONFIG.oss?.specialistModifiers?.[employee.role] || 0), 0);
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
    setHomeField(home, "tariffOssResolvedYear", state.year);
    addLog(`Игрок пропустил ОСС на изменение тарифа в доме «${home.name}» (${home.address}).`);
    saveState(); render(); showToast(`ОСС по дому «${home.name}» пропущено.`);
  }

  function runTariffOss(houseName) {
    const home = managedHomeByName(houseName);
    if (state.phase !== "annualReport" || !home || home.tariffOssResolvedYear === state.year) return;
    const controls = [...elements.annualReport.querySelectorAll(".house-tariff-oss")].find(item => item.dataset.tariffHouse === houseName);
    const input = controls?.querySelector(".oss-tariff-increase");
    const change = Number(input?.value);
    if (!Number.isFinite(change) || change === 0) { showToast("Укажи ненулевое изменение тарифа."); input?.focus(); return; }
    if (currentTariff(home) + change < 0) { showToast("Тариф не может стать ниже 0 ₽/м²."); input?.focus(); return; }
    state.tariffOssAttempts += 1;
    const direction = change > 0 ? "Повысить" : "Снизить";
    const homeCancelled = state.cancelledRequests.filter(card => card.houseName === home.name).length;
    const vote = ossVote(`${direction} тариф на ${money(Math.abs(change))} ₽`, change, { includeReputation: true, area: home.area, cancelledCountOverride: homeCancelled, cancelledMultiplier: 2, logHouseAddress: home.address });
    setHomeField(home, "tariffOssResolvedYear", state.year);
    if (vote.success) {
      setHomeField(home, "tariffPerSquareMeter", Math.round((currentTariff(home) + change) * 100) / 100);
      addLog(`ОСС принято в доме «${home.name}» (${home.address}). Тариф ${change > 0 ? "повышен" : "снижен"} на ${money(Math.abs(change))} ₽: теперь ${money(currentTariff(home))} ₽/м².`);
      showToast(`ОСС принято: тариф дома «${home.name}» теперь ${money(currentTariff(home))} ₽/м².`);
    } else {
      addLog(`ОСС на изменение тарифа дома «${home.name}» не набрало кворум. Повторная попытка в этом отчёте недоступна.`);
      showToast(`ОСС дома «${home.name}» не набрало кворум. Попробовать снова в этом отчёте нельзя.`);
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
      resolvedRequests.forEach(card => {
        card.resolved = true;
        card.resolvedBy = "oss";
        card.resolvedTurn = state.turn;
        countEvent("completed");
      });
      state.houseProblems = state.houseProblems.filter(problem => !(problem.houseName === houseName && problem.category === category));
      const repairWarranty = { repairedTurn: state.turn, expiresTurn: state.turn + SEASONS.length * (CONFIG.rules.warrantyAgeYears ?? 3) - 1 };
      if (home.primary) state.houseRepairWarranties[category] = repairWarranty;
      else home.repairWarranties[category] = repairWarranty;
      state.reputation += CONFIG.rules.clearedProblemCategoryReputationBonus;
      const outstandingCompensations = state.compensations.filter(claim => resolvedRequests.some(card => card.id === claim.requestId) && !claim.paid && !claim.writtenOff).reduce((sum, claim) => sum + claim.amount, 0);
      addLog(`ОСС приняло капитальный ремонт категории «${category}». Устранено проблем: ${categoryProblems.length}; автоматически выполнено связанных заявок: ${resolvedRequests.length}. Штрафы и компенсации сохранены${outstandingCompensations ? ` (компенсации к выплате: ${money(outstandingCompensations)} ₽)` : ""}. Репутация +${CONFIG.rules.clearedProblemCategoryReputationBonus}.`);
      updateHouseSafetyStatus();
    } else addLog(`ОСС по капитальному ремонту категории «${category}» не набрало кворум. Проблемы остаются.`);
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
      if (seen.has(voteKey) || state.ossVoteUsedCategories.includes(voteKey)) return;
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
    if (state.phase === "problems" && hasLawyer()) {
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
    const lawyer = state.employees.find(employee => employee.role === "lawyer");
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
      resolvedRequests.forEach(card => { card.resolved = true; card.resolvedBy = "warranty"; card.resolvedTurn = state.turn; countEvent("completed"); });
      const relatedRequests = state.requests.filter(card => coveredIds.has(card.problemId));
      const claims = new Set(relatedRequests.map(card => card.id));
      state.compensations.filter(claim => claims.has(claim.requestId) && !claim.paid && !claim.writtenOff).forEach(claim => { claim.paid = true; claim.paidBy = "developer"; });
      state.houseProblems = state.houseProblems.filter(problem => !coveredIds.has(problem.id));
      const home = managedHomeByName(houseName);
      const warranties = home?.primary ? state.houseRepairWarranties : home?.repairWarranties;
      categories.forEach(category => { warranties[category] = { repairedTurn: state.turn, expiresTurn: state.turn + SEASONS.length * (CONFIG.rules.warrantyAgeYears ?? 3) - 1 }; });
      if (warrantyKey === "new-house" && home) {
        if (home.primary) state.houseWarrantyUntilTurn = state.turn + SEASONS.length * (CONFIG.rules.warrantyAgeYears ?? 3) - 1;
        else home.warrantyUntilTurn = state.turn + SEASONS.length * (CONFIG.rules.warrantyAgeYears ?? 3) - 1;
      }
      addLog(`По гарантии устранено проблем: ${affected.length}; связанных заявок закрыто: ${resolvedRequests.length}; компенсации по ${state.compensations.filter(claim => claims.has(claim.requestId) && claim.paidBy === "developer").length} случаям ущерба оплачены застройщиком. Работы запускают новый гарантийный срок.`);
      updateHouseSafetyStatus();
      if (!state.houseProblems.length) state.phase = "drawing";
    }
    if (checkBankruptcy()) { saveState(); render(); return; }
    saveState(); render(); showToast(success ? "Иск удовлетворён: застройщик устраняет проблемы без затрат на работы и материалы." : "Суд отказал в иске; госпошлина списана.");
  }

  function resolveWithMoney(index) {
    const card = state.requests[index];
    if (!card || card.resolved || state.phase !== "resolving") return;
    const cashCost = requestMoneyCost(card);
    if (state.capital < cashCost) { showToast("Недостаточно капитала для оплаты подрядчику."); return; }
    if (!changeCapital(-cashCost, "оплата подрядчика")) return;
    if (!changeCapital(card.payout, "доход по платной заявке")) return;
    state.seasonFinancials.paidIncome += card.payout || 0;
    card.resolved = true;
    card.resolvedBy = "contractor";
    card.resolvedTurn = state.turn;
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
    const materialCost = requestMaterialCost(card);
    const materialAndBonus = plan.premium + materialCost;
    if (state.capital < materialAndBonus) { showToast("Не хватает денег на материалы и премию."); return; }
    employee.assignedLabor = plan.laborAfter;
    if (!changeCapital(-materialCost, "материалы по заявке")) return;
    if (plan.premium) {
      if (!changeCapital(-plan.premium, "премия за переработку")) return;
      const overtimeLog = [`${roleName(employee.role)} ${employee.name} выполнил заявку «${card.title}» с переработкой.`];
      if (plan.hrMultiplier < 1) {
        const hr = state.employees.find(person => person.role === "hr");
        overtimeLog.push(`HR-менеджер ${hr?.name || ""} уменьшил доплату за переработку в ${money(plan.basePremium)} ₽ вдвое: −${money(plan.basePremium - plan.premium)} ₽.`);
      } else overtimeLog.push(`Премия за переработку рассчитана: ${money(plan.premium)} ₽.`);
      overtimeLog.push(`${card.type === "paid" ? "Материалы оплачивает заявитель" : `Материалы: ${money(materialCost)} ₽`}; выплаченная премия: ${money(plan.premium)} ₽.`);
      addLogSequence(overtimeLog);
    } else {
      addLog(`${roleName(employee.role)} ${employee.name} выполнил заявку «${card.title}» в пределах продуктивности. ${card.type === "paid" ? "Материалы оплатил заявитель." : `Материалы: ${money(materialCost)} ₽.`}`);
    }
    if (!changeCapital(card.payout, "доход по платной заявке")) return;
    state.seasonFinancials.paidIncome += card.payout || 0;
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
    const materialCost = requestMaterialCost(card);
    if (state.capital < materialCost) { showToast("Не хватает денег на материалы."); return; }
    employee.assignedLabor = plan.laborAfter;
    if (!changeCapital(-materialCost, "материалы по заявке")) return;
    if (!changeCapital(card.payout, "доход по платной заявке")) return;
    state.seasonFinancials.paidIncome += card.payout || 0;
    employee.unpaidOvertime = true;
    employee.unhappyNextTurn = true;
    card.resolved = true;
    countEvent("completed");
    checkBankruptcy();
    addLog(`${roleName(employee.role)} выполнил заявку «${card.title}» без премии за переработку (${money(plan.premium)} ₽). ${card.type === "paid" ? "Материалы оплатил заявитель." : `Материалы: ${money(materialCost)} ₽.`} Доход: ${money(card.payout)} ₽. На следующем ходу сотрудник будет недоволен.`);
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
    state.ossVoteTurn = state.turn;
    state.ossVoteUsedCategories = [];
    state.lawyerActionTaken = false;
    state.lawyerActionsUsed = [];
    state.pendingHireIds = [];
    state.pendingFireActions = {};
    state.marketRerollUsedTurn = null;
    state.market = makeMarket(state.employees);
    const marketHR = state.employees.find(employee => employee.role === "hr" && employee.bonus === "expandedMarket");
    if (marketHR) addLog(`HR-менеджер ${marketHR.name} расширил рынок труда. На выборке ${currentMarketExecutors()} исполнителя и ${currentMarketSpecialists()} специалиста.`);
    state.employees.forEach(employee => { employee.assignedLabor = 0; employee.unpaidOvertime = false; });
  }

  function endTurn() {
    if (["staffing", "inspection", "problems", "drawing"].includes(state.phase)) { advanceTurnPhase(); return; }
    if (state.phase === "resolving" && hasLawyer()) {
      state.phase = "legal";
      state.lawyerActionTaken = false;
      state.lawyerActionsUsed = [];
      saveState(); render(); showToast("Распределение завершено. Выбери действие для юриста.");
      return;
    }
    if (state.phase === "legal") {
      if (!lawyersDone()) return;
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
    const payroll = state.employees.reduce((sum, employee) => sum + effectiveSalary(employee), 0);
    if (payroll) {
      if (!changeCapital(-payroll, "выплата зарплат")) return;
      state.seasonFinancials.salaries += payroll;
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
    if (checkBankruptcy()) {
      saveState(); render(); showToast(`После выплаты зарплат баланс достиг ${money(BANKRUPTCY_THRESHOLD)} ₽. Необходимо объявить банкротство.`);
      return;
    }
    state.phase = "collection";
    saveState(); render(); showToast(`Зарплаты выплачены: −${money(payroll)} ₽. Теперь собери содержание.`);
  }

  function collectSeason() {
    if (state.phase !== "collection") return;
    const seasonLog = [];
    const homes = managedHomes();
    const grossCharge = homes.reduce((sum, home) => sum + home.area * currentTariff(home), 0);
    const unresolvedCount = state.requests.filter(card => !card.resolved && !card.cancelled).length;
    const maintenanceBase = homes.reduce((sum, home) => sum + (Number.isFinite(home.baseMaintenance) ? home.baseMaintenance : state.baseMaintenance), 0);
    const maintenance = effectiveBaseMaintenanceTotal();
    if (maintenanceBase > 0) {
      seasonLog.push(`Базовое обслуживание до скидок специалистов: ${money(maintenanceBase)} ₽.`);
      let discountPercent = 0;
      state.employees.filter(employee => employee.role === "accountant" && employee.bonus === "discountMaintenance").forEach(employee => {
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
    const accountantCollectionBonuses = state.employees.filter(employee => employee.role === "accountant" && employee.bonus === "raiseCollection");
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
    refreshPortfolioTotals();
    state.lastSeasonFinancials = { collection: income, paidIncome: state.seasonFinancials.paidIncome, upkeep: state.seasonFinancials.upkeep, salaries: state.seasonFinancials.salaries, fines: seasonFinePayments(), compensation: seasonCompensationPayments(), problemRepairs: state.seasonFinancials.problemRepairs };
    state.financialHistory.push({ year: state.year, seasonIndex: state.seasonIndex, ...state.lastSeasonFinancials, capital: state.capital, collectionRate, reputation: state.reputation });
    state.seasonFinancials = { upkeep: 0, salaries: 0, paidIncome: 0, problemRepairs: 0 };
    seasonLog.push(`Собрано платежей: +${money(income)} ₽.`);
    addLogSequence(seasonLog);
    const expiredUnsafeHomes = state.additionalHomes.filter(home => home.unsafeSinceTurn != null && state.turn - home.unsafeSinceTurn >= CONFIG.rules.unsafeHouseGraceSeasons).map(home => home.name);
    expiredUnsafeHomes.forEach(homeName => recognizeHouseAsUnsafe(false, homeName));
    const unsafeDeadlineReached = state.houseUnsafeSinceTurn != null && state.turn - state.houseUnsafeSinceTurn >= CONFIG.rules.unsafeHouseGraceSeasons;
    if (unsafeDeadlineReached && !state.houseRemoved) recognizeHouseAsUnsafe(false, state.houseName);
    if (state.houseRemoved && CONFIG.rules.unsafeHouseEndsGame && state.seasonIndex !== CONFIG.rules.annualReportSeasonIndex) {
      const expired = state.requests.filter(card => !card.resolved && !card.cancelled);
      const emergencyRequests = expired.filter(isEmergency);
      expired.filter(card => !isEmergency(card)).forEach(card => recordCancellation(card, "annual-expiry"));
      state.requests = emergencyRequests;
      state.lastAnnualReport = {
        year: state.year,
        capitalStart: state.yearStats.capitalStart,
        capitalEnd: state.capital,
        yearStats: { ...state.yearStats },
        totals: { ...state.totals },
        reputation: { start: state.reputation + CONFIG.rules.unsafeHouseReputationPenalty, end: state.reputation, cancellationPenalty: 0, emergencyPenalty: 0, unsafeHousePenalty: CONFIG.rules.unsafeHouseReputationPenalty, solvencyBonus: 0, cleanHouseBonus: 0 }
      };
      state.phase = "annualReport";
    } else if (state.seasonIndex === CONFIG.rules.annualReportSeasonIndex) {
      const expired = state.requests.filter(card => !card.resolved && !card.cancelled);
      const emergencyRequests = expired.filter(isEmergency);
      expired.filter(card => !isEmergency(card)).forEach(card => recordCancellation(card, "annual-expiry"));
      const cancelledThisYear = state.cancelledRequests.filter(card => card.year === state.year);
      state.requests = [...cancelledThisYear.map(card => ({ ...card })), ...emergencyRequests];
      if (expired.length) addLog(`Год закрыт. Отменено обычных заявок: ${expired.length - emergencyRequests.length}; аварийных оставлено: ${emergencyRequests.length}.`);
      const reputationStart = state.reputation;
      const reputationChanges = {
        cancellationPenalty: Math.floor(state.yearStats.cancelled / CONFIG.rules.cancellationReputationPenaltyEvery),
        emergencyPenalty: emergencyRequests.length * CONFIG.rules.unresolvedEmergencyReputationPenalty,
        unsafeHousePenalty: state.unsafeHousePenaltyYear === state.year ? CONFIG.rules.unsafeHouseReputationPenalty : 0,
        solvencyBonus: hasNoDebts() ? CONFIG.rules.noDebtYearReputationBonus : 0,
        cleanHouseBonus: state.yearStats.cancelled === 0 ? CONFIG.rules.noCancellationYearReputationBonus : 0
      };
      const unsafePenaltyAlreadyApplied = state.unsafeHousePenaltyYear === state.year;
      const reputationDelta = -reputationChanges.cancellationPenalty - reputationChanges.emergencyPenalty - (unsafePenaltyAlreadyApplied ? 0 : reputationChanges.unsafeHousePenalty) + reputationChanges.solvencyBonus + reputationChanges.cleanHouseBonus;
      state.reputation += reputationDelta;
      if (state.financialHistory.length) state.financialHistory[state.financialHistory.length - 1].reputation = state.reputation;
      addLog(`Годовой расчёт репутации: ${reputationDelta >= 0 ? "+" : ""}${reputationDelta} (${reputationChanges.cancellationPenalty} штраф за отмены, −${reputationChanges.emergencyPenalty} за нерешённые аварии, ${reputationChanges.unsafeHousePenalty ? `−${reputationChanges.unsafeHousePenalty} за аварийный дом${unsafePenaltyAlreadyApplied ? " (уже учтено при признании)" : ""}` : "без штрафа за аварийный дом"}, +${reputationChanges.solvencyBonus} за отсутствие долгов, +${reputationChanges.cleanHouseBonus} за отсутствие отмен).`);
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
    showToast(`БО −${money(maintenance)} ₽ · собираемость ${collectionRate}% · +${money(income)} ₽`);
  }

  function startNewYear() {
    if (state.phase !== "annualReport" || (state.houseRemoved && CONFIG.rules.unsafeHouseEndsGame)) return;
    const unresolvedTariffOssHomes = managedHomes().filter(home => home.tariffOssResolvedYear !== state.year);
    unresolvedTariffOssHomes.forEach(home => setHomeField(home, "tariffOssResolvedYear", state.year));
    if (managedHomes().length && state.tariffOssAttempts === 0) {
      const bonus = CONFIG.oss?.tariffOssSkippedReputationBonus ?? 1;
      state.reputation += bonus;
      if (state.lastAnnualReport?.year === state.year) {
        state.lastAnnualReport.reputation.end = state.reputation;
        state.lastAnnualReport.reputation.tariffNoAttemptBonus = (state.lastAnnualReport.reputation.tariffNoAttemptBonus || 0) + bonus;
      }
      if (state.financialHistory.length) state.financialHistory[state.financialHistory.length - 1].reputation = state.reputation;
      addLog(`За год не проводилось ни одного ОСС на изменение тарифа. Репутация +${bonus}.`);
    }
    state.year += 1;
    state.houseAge += 1;
    state.additionalHomes.forEach(home => {
      home.age = (Number(home.age) || 0) + 1;
      home.repairWarranties = Object.fromEntries(Object.entries(home.repairWarranties || {}).filter(([, warranty]) => warranty.expiresTurn >= state.turn));
      if (home.warrantyUntilTurn < state.turn) home.warrantyUntilTurn = null;
    });
    state.seasonIndex = 0;
    state.turn += 1;
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
    state.employees.forEach(employee => { employee.assignedLabor = 0; employee.unpaidOvertime = false; });
    state.marketRerollUsedTurn = null;
    state.market = makeMarket(state.employees);
    addLog(`Начался ${state.year} год. Стартовый капитал: ${money(state.capital)} ₽. Нерешённых аварийных заявок перенесено: ${state.requests.length}.`);
    saveState(); render(); showToast(`Год ${state.year}: лето. Начинай новый цикл.`);
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
    localStorage.removeItem(SAVE_KEY); state = normalizeState({ ...INITIAL_STATE, log: [{ text: "Компания открыла первый дом под управлением.", turn: 1 }] });
    state.market = makeMarket(state.employees); saveState(); render(); showToast("Новая игра началась.");
  });

    if (!state.market.length && ["staffing", "preparation"].includes(state.phase)) state.market = makeMarket(state.employees);
  saveState(); render();
}());

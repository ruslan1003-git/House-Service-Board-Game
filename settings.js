(() => {
  const activeConfig = window.DOMOUPRAV_CONFIG;
  const defaultConfig = window.DOMOUPRAV_DEFAULTS;
  const form = document.getElementById("config-form");
  const stateLabel = document.getElementById("save-state");
  const helpLabel = document.getElementById("save-help");
  const saveButton = document.getElementById("save-config");
  const chooseButton = document.getElementById("choose-folder");
  const sectionNames = {
    version: "Версия формата",
    companyNameDefaults: "Названия управляющей компании",
    seasons: "Сезоны",
    seasonIcons: "Значки сезонов",
    houseProblems: "Проблемы домов",
    houses: "Дома",
    roles: "Должности и базовые параметры",
    employees: "Соискатели рынка труда",
    problemCardCounts: "Количество карт проблем",
    problemConsequences: "Последствия проблем",
    requests: "Карты заявок",
    economy: "Экономика",
    oss: "ОСС",
    rules: "Правила и коэффициенты"
  };
  const labels = {
    name: "Название", address: "Адрес", area: "Площадь", age: "Возраст дома, лет", category: "Категория",
    wear: "Износ, %", tasks: "Работы по последствиям", seasonal: "Сезоны появления (лето 0, осень 1, зима 2, весна 3)",
    materialOnly: "Требуются только материалы", materialCost: "Стоимость материалов, ₽", title: "Название работы",
    labor: "Трудозатраты", role: "Должность", productivity: "Продуктивность", salary: "Зарплата / ожидания, ₽",
    icon: "Значок", kind: "Тип сотрудника", detail: "Описание должности", legalStrength: "Юридическая сила",
    bonus: "Бонус", bonusDescription: "Описание бонуса", type: "Тип заявки", description: "Краткое описание", cost: "Стоимость из карточки, ₽ (игра рассчитывает цену подрядчика сама)",
    payout: "Доход за платную заявку, ₽", damageCompensation: "Компенсация ущерба, ₽", symbol: "Символ",
    startingCompanyName: "Название УК при старте", startingHouseName: "Стартовый дом", startingCapital: "Стартовый бюджет, ₽",
    startingReputation: "Стартовая репутация", startingArea: "Стартовая площадь", tariffPerSquareMeter: "Тариф за м², ₽",
    baseMaintenancePerHouse: "Базовое обслуживание одного дома, ₽", bankruptcyThreshold: "Порог банкротства, ₽",
    collectionMinPercent: "Минимальная собираемость, %", collectionMaxPercent: "Максимальная собираемость, %",
    requestsPerHousePerSeason: "Заявок на дом за сезон", contractorMarkup: "Надбавка подрядчика, ₽", materialCostPerUnit: "Себестоимость единицы материала, ₽", materialMarketPriceMultiplier: "Множитель рыночной цены материалов", engineerMaterialPurchaseUnits: "Объём закупки материалов инженером, ед.",
    capitalBarScale: "Масштаб шкалы капитала", capitalBarFillMaxPercent: "Максимум заполнения шкалы, %",
    inspectionSeasonIndices: "Сезоны осмотра (индексы)", annualReportSeasonIndex: "Сезон годового отчёта (индекс)",
    maxRequestLabor: "Максимум трудозатрат в заявке", problemRepairLaborCostMultiplier: "Множитель стоимости работ по проблемам",
    problemMinimumMaterialCost: "Минимум на материалы для проблемы, ₽", problemEmergencyCompensationMinimum: "Минимальная компенсация аварии, ₽",
    marketExecutors: "Исполнителей на рынке", marketSpecialists: "Специалистов на рынке", hiresWithoutHR: "Найм за ход без HR",
    preparationSalaryMultiplier: "Доля зарплаты стартовых сотрудников", probationTurns: "Длительность испытательного срока, ходов",
    probationSalaryMultiplier: "Доля зарплаты на испытательном сроке", overtimeSalaryMultiplierWithHR: "Множитель доплаты за переработку с HR",
    problemCardsPerInspectionMin: "Минимум проблем при осмотре", problemCardsPerInspectionMax: "Максимум проблем при осмотре",
    engineerInspectionReduction: "Сколько карт убирает инженер", inspectionCardsPerThreeHouseYears: "Добавка карт за возраст дома",
    warrantyAgeYears: "Срок гарантии нового дома, лет", warrantyCourtFee: "Госпошлина за иск, ₽", warrantySuccessChanceByLegalStrength: "Шанс выиграть гарантийный суд по ЮС",
    problemEmergencyDamageChance: "Шанс аварии с ущербом", problemDamageMultiplier: "Множитель ущерба", unsafeWearThresholdPercent: "Порог износа аварийного дома, %",
    unsafeProblemCardThreshold: "Порог числа проблем для аварийного дома", unsafeHouseGraceSeasons: "Сезонов на устранение угрозы", unsafeHouseReputationPenalty: "Штраф репутации за аварийный дом",
    unsafeHouseEndsGame: "Изъятие дома после срока", lawyerDebtLimitByStrength: "Лимит взыскания по ЮС, ₽", lawyerReductionRangeByStrength: "Диапазон снижения штрафа по ЮС, %",
    lawyerReductionSuccessChance: "Шанс оспорить штраф", unpaidFiringReputationPenalty: "Штраф репутации за увольнение без зарплаты",
    unpaidFiringComplaintChanceMax: "Шанс жалобы в трудовую инспекцию", laborInspectionFineSalaryMultiplier: "Размер штрафа инспекции в зарплатах",
    employeeDepartureLowReputationThreshold: "Порог репутации для ухода сотрудника", employeeDepartureLowReputationChance: "Шанс ухода из-за низкой репутации",
    employeeOutsideOfferChance: "Шанс предложения работы с большей зарплатой", employeeHealthDepartureChance: "Шанс ухода из-за здоровья",
    employeeDeathChance: "Шанс смерти сотрудника за ход", employeeRetentionSalaryIncreasePercent: "Повышение зарплаты для удержания сотрудника, %",
    cancellationReputationPenaltyEvery: "Штрафных единиц отмен на −1 репутацию",
    noCancellationYearReputationBonus: "Бонус за год без отмен", noDebtYearReputationBonus: "Бонус за год без долгов",
    clearedProblemCategoryReputationBonus: "Бонус за устранение категории", bankruptcyStartingReputation: "Репутация после банкротства",
    logEntriesKept: "Записей истории компании", toastDurationMs: "Время уведомления, мс", lawyerSalaryByStrength: "Зарплата юриста по ЮС, ₽",
    hrExpandedMarketExecutors: "Доп. исполнителей от HR", hrExpandedMarketSpecialists: "Доп. специалистов от HR",
    problemLaborReductionWithEngineer: "Снижение трудозатрат инженером", engineerMaterialDiscountPercent: "Скидка инженера на материалы, %",
    accountantCollectionBonusPercent: "Бонус бухгалтера к собираемости, %", accountantMaintenanceDiscountPercent: "Скидка бухгалтера на БО, %",
    specialistModifiers: "Модификаторы специалистов", reputationModifierPerPoint: "Модификатор репутации за пункт",
    capitalRepairWearThresholdPercent: "Износ для ОСС капремонта, %", capitalRepairQuestionModifier: "Модификатор вопроса капремонта",
    tariffOssSkippedReputationBonus: "Бонус за отказ от ОСС тарифа", historyEntriesKept: "Записей истории ОСС",
    tariffOssQuestionModifierMultiplier: "Множитель модификатора тарифа", ordinary: "Обычная заявка", emergency: "Аварийная заявка",
    compensationPretrialTurns: "Срок досудебной претензии, ходов", compensationCourtEscalationChance: "Начальный шанс передачи претензии в суд", compensationCourtEscalationIncrease: "Рост шанса суда после неудачных переговоров",
    compensationCourtAmountMultiplier: "Увеличение компенсации при переходе в суд", compensationTrialTurns: "Срок судебного процесса, ходов",
    compensationPaymentTurns: "Срок выплаты после решения суда, ходов", compensationDelayBaseChance: "Начальный шанс отложить дело",
    compensationDelayChanceDropByLegalStrength: "Снижение шанса переноса по ЮС, п.п.",
    badGameWithdrawalFeePercent: "Комиссия при выводе средств, %", badGameTaxAuditChance: "Шанс проверки налоговой", badGameForgeryLawsuitChance: "Шанс иска после подделки подписей", badGameCourtWinChance: "Шанс юриста выиграть спор о доме", badGameDelayBaseChance: "Начальный шанс отложить спор о доме", badGameReputationPrice: "Цена +1 репутации, ₽", reputationHouseExitThreshold: "Порог репутации для голосования домов", reputationHouseExitChance: "Шанс дома сменить УК", seasonDuration: "Длительность сезона, ходов",
    emergencyDamage: "Аварийная с ущербом", paid: "Платная заявка"
  };
  const help = {
    preparationSalaryMultiplier: "0,7 означает 70% обычной зарплаты. Новые значения не меняют уже сохранённых сотрудников.",
    probationSalaryMultiplier: "0,5 означает половину зарплаты.",
    unsafeHouseGraceSeasons: "8 сезонов — два игровых года.",
    inspectionSeasonIndices: "Лето = 0, Осень = 1, Зима = 2, Весна = 3.",
    annualReportSeasonIndex: "Весна обычно имеет индекс 3.",
    lawyerReductionRangeByStrength: "Три диапазона: ЮС 1, ЮС 2, ЮС 3. Например, [10, 30] означает от 10% до 30%.",
    warrantySuccessChanceByLegalStrength: "Три значения от 0 до 1: 0,3 = 30%.",
    compensationCourtEscalationChance: "Базовый шанс суда — 10%; проверяется в начале каждого хода, пока претензия не истекла.", compensationCourtEscalationIncrease: "При каждой неудачной попытке договориться шанс суда по этой претензии растёт на 5 п.п.",
    compensationDelayChanceDropByLegalStrength: "Три доли по ЮС 1/2/3: 0,3 / 0,2 / 0,1 означают снижение на 30 / 20 / 10 п.п. за каждый успешный перенос.",
    compensationPretrialTurns: "8 ходов.",
    seasonDuration: "Обычная настройка партии в фазе подготовки; можно выбрать 1, 2 или 3 хода на каждый сезон.",
    badGameTaxAuditChance: "Доля от 0 до 1: 0,01 = 1% при каждом выводе средств.",
    reputationHouseExitChance: "Доля от 0 до 1; проверяется отдельно для каждого дома на границе сезона, если репутация ниже порога.",
    compensationTrialTurns: "4 хода; успешный перенос добавляет ещё один ход.",
    compensationPaymentTurns: "4 хода после утверждения судом окончательной суммы; затем она списывается автоматически.",
    compensationDelayBaseChance: "0,9 означает начальную вероятность переноса 90%.",
    type: "Используйте значения ordinary, emergency, emergencyDamage или paid.",
    bonus: "Ключ бонуса профиля сотрудника. Оставьте пустым, если бонуса нет."
  };
  function prepareConfig(source) {
    const prepared = structuredClone(source);
    (prepared.requests || []).forEach(request => {
      if (!request.type) request.type = "ordinary";
      if (!Number.isFinite(request.payout)) request.payout = 0;
      if (!Number.isFinite(request.damageCompensation)) request.damageCompensation = 0;
    });
    (prepared.employees || []).forEach(employee => {
      if (employee.bonus === undefined) employee.bonus = "";
      if (employee.bonusDescription === undefined) employee.bonusDescription = "";
    });
    return prepared;
  }
  let config = prepareConfig(activeConfig);
  let directoryHandle = null;

  function readableKey(key) { return labels[key] || sectionNames[key] || String(key).replace(/([A-Z])/g, " $1").replace(/^./, char => char.toUpperCase()); }
  function clone(value) { return structuredClone(value); }
  function valueAt(root, path) { return path.reduce((value, part) => value?.[part], root); }
  function setAt(root, path, value) { const parent = valueAt(root, path.slice(0, -1)); if (parent != null) parent[path.at(-1)] = value; }
  function pathUsesPercent(path, value) {
    const joined = path.join(".").toLowerCase();
    return joined.includes("chance") || (joined.includes("multiplier") && Math.abs(Number(value)) <= 1);
  }
  function objectTitle(item, index) {
    if (item && typeof item === "object" && !Array.isArray(item)) return item.name || item.title || item.category || item.role || `Запись ${index + 1}`;
    return `Значение ${index + 1}`;
  }
  function optionsFor(key) {
    if (key === "type") return [["ordinary", "Обычная"], ["emergency", "Аварийная"], ["emergencyDamage", "Аварийная с ущербом"], ["paid", "Платная"]];
    if (key === "category") return ["Сантехника", "Электрика", "Уборка", "Общестрой", "Кровля", "Фасад", "Водоснабжение", "Водоотведение", "Электроснабжение", "Дорожное покрытие", "Подвал", "Отопление", "ИТП", "Пожаротушение", "Лифты"].map(item => [item, item]);
    if (key === "role") return Object.entries(config.roles || {}).map(([id, role]) => [id, role.name || id]);
    if (key === "kind") return [["executor", "Исполнитель"], ["specialist", "Специалист"]];
    if (key === "startingHouseName") return (config.houses || []).map(house => [house.name, house.name]);
    if (key === "bonus") return [["", "Без бонуса"], ["marketReroll", "Переброс рынка"], ["expandedMarket", "Расширенный рынок"], ["reduceProblemLabor", "Снижение трудозатрат проблем"], ["discountProblemMaterials", "Скидка на материалы проблем"], ["raiseCollection", "Рост собираемости"], ["discountMaintenance", "Скидка на базовое обслуживание"], ["noOverdueReputation", "+1 репутация за ход без просрочек"], ["annualReputationThree", "+3 репутации за годовой отчёт"]];
    return null;
  }

  function render() {
    form.replaceChildren();
    const orderedKeys = ["economy", "rules", "oss", "roles", "employees", "houses", "requests", "houseProblems", "problemCardCounts", "problemConsequences", "companyNameDefaults", "seasons", "seasonIcons", "version"];
    orderedKeys.forEach(key => { if (Object.hasOwn(config, key)) form.append(renderObject(config[key], [key], readableKey(key), true)); });
  }

  function renderObject(value, path, title, topLevel = false) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = `config-section${topLevel ? " top-section" : ""}`;
    const legend = document.createElement("legend"); legend.textContent = title; fieldset.append(legend);
    const grid = document.createElement("div"); grid.className = "fields-grid";
    Object.entries(value || {}).forEach(([key, child]) => grid.append(renderValue(child, [...path, key], key)));
    fieldset.append(grid);
    return fieldset;
  }

  function renderValue(value, path, key) {
    if (Array.isArray(value)) return renderArray(value, path, key);
    if (value && typeof value === "object") return renderObject(value, path, readableKey(key));
    const label = document.createElement("label"); label.className = "field";
    const title = document.createElement("span"); title.textContent = readableKey(key); label.append(title);
    if (typeof value === "boolean") {
      const row = document.createElement("span"); row.className = "boolean-field";
      const input = document.createElement("input"); input.type = "checkbox"; input.checked = value;
      input.addEventListener("change", () => setAt(config, path, input.checked));
      const state = document.createElement("span"); state.textContent = "Включено"; row.append(input, state); label.append(row);
    } else if (typeof value === "string" && optionsFor(key)) {
      const select = document.createElement("select");
      select.className = "form-select";
      const choices = optionsFor(key);
      if (value !== null && !choices.some(([option]) => option === value)) choices.unshift([value, `${value} (текущее значение)`]);
      choices.forEach(([optionValue, optionLabel]) => { const option = document.createElement("option"); option.value = optionValue; option.textContent = optionLabel; select.append(option); });
      select.value = value;
      select.addEventListener("change", () => setAt(config, path, select.value));
      label.append(select);
    } else {
      const input = document.createElement(value === null || typeof value === "string" ? "input" : "input");
      const percent = pathUsesPercent(path, value);
      input.type = value !== null && typeof value === "number" ? "number" : "text";
      input.value = value === null ? "" : (percent && typeof value === "number" ? value * 100 : value);
      if (input.type === "number") { input.step = Number.isInteger(Number(input.value)) ? "1" : "0.1"; }
      input.addEventListener("input", () => {
        let next;
        if (value === null && input.value === "") next = null;
        else if (input.type === "number") { next = input.value === "" ? 0 : Number(input.value); if (percent) next /= 100; }
        else next = input.value;
        setAt(config, path, next);
      });
      label.append(input);
    }
    if (help[key]) { const note = document.createElement("small"); note.textContent = help[key]; label.append(note); }
    return label;
  }

  function renderArray(items, path, key) {
    const section = document.createElement("details"); section.className = "config-section array-section";
    if (["companyNameDefaults", "seasons", "seasonIcons", "inspectionSeasonIndices"].includes(key)) section.open = true;
    const legend = document.createElement("summary"); legend.textContent = `${readableKey(key)} · ${items.length}`; section.append(legend);
    const list = document.createElement("div"); list.className = "array-list";
    if (!items.length) { const empty = document.createElement("p"); empty.className = "empty-array"; empty.textContent = "Список пуст."; list.append(empty); }
    items.forEach((item, index) => {
      const card = document.createElement("div"); card.className = "array-item";
      const heading = document.createElement("div"); heading.className = "item-heading";
      const headingText = document.createElement("span"); headingText.textContent = objectTitle(item, index);
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-item"; remove.textContent = "Удалить";
      remove.addEventListener("click", () => { items.splice(index, 1); render(); });
      heading.append(headingText, remove); card.append(heading);
      card.append(renderValue(item, [...path, index], String(index + 1)));
      list.append(card);
    });
    const add = document.createElement("button"); add.type = "button"; add.className = "add-item"; add.textContent = "+ Добавить";
    add.addEventListener("click", () => {
      const defaults = valueAt(defaultConfig, path);
      if (defaults?.length) {
        const added = clone(defaults[Math.min(items.length, defaults.length - 1)]);
        if (path[0] === "employees") added.name = `Новый соискатель ${items.length + 1}`;
        items.push(added);
      }
      else if (items.length && typeof items[0] === "number") items.push(0);
      else if (items.length && typeof items[0] === "string") items.push("");
      else items.push({});
      render();
    });
    list.append(add); section.append(list);
    if (help[key]) { const note = document.createElement("small"); note.className = "array-help"; note.textContent = help[key]; section.append(note); }
    return section;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("domouprav-settings", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("handles");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function storeDirectory(handle) {
    const db = await openDatabase();
    await new Promise((resolve, reject) => { const tx = db.transaction("handles", "readwrite"); tx.objectStore("handles").put(handle, "game-folder"); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close(); directoryHandle = handle;
  }
  async function loadDirectory() {
    try {
      const db = await openDatabase();
      directoryHandle = await new Promise((resolve, reject) => { const request = db.transaction("handles").objectStore("handles").get("game-folder"); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
      db.close();
      if (directoryHandle) { stateLabel.textContent = `Папка подключена: ${directoryHandle.name}`; helpLabel.textContent = "При сохранении будет создана копия game-config.js в подпапке backups."; }
    } catch { /* IndexedDB может быть недоступен в отдельных браузерах. */ }
  }
  async function chooseDirectory() {
    if (!window.showDirectoryPicker) throw new Error("Этот браузер не поддерживает прямое сохранение в папку. Скачайте файл настроек и замените им game-config.js вручную.");
    directoryHandle = await window.showDirectoryPicker({ mode: "readwrite", id: "domouprav-game-folder" });
    try { await storeDirectory(directoryHandle); }
    catch { /* В file:// IndexedDB иногда недоступен; выбранная папка всё равно работает до закрытия вкладки. */ }
    stateLabel.textContent = `Папка подключена: ${directoryHandle.name}`;
    helpLabel.textContent = "Теперь кнопка сохранения обновит файл игры и сначала создаст резервную копию.";
  }
  function configSource(value) { return `/* Создано страницей настроек Домоуправа. */\nwindow.DOMOUPRAV_CONFIG = ${JSON.stringify(value, null, 2)};\n`; }
  async function requestWritePermission(handle) {
    const options = { mode: "readwrite" };
    if (await handle.queryPermission(options) === "granted") return true;
    return await handle.requestPermission(options) === "granted";
  }
  async function saveConfig() {
    if (!directoryHandle) await chooseDirectory();
    if (!(await requestWritePermission(directoryHandle))) throw new Error("Браузер не выдал разрешение на запись. Нажмите «Выбрать папку игры» и разрешите доступ.");
    const source = configSource(config);
    let backupName = "";
    try {
      const currentHandle = await directoryHandle.getFileHandle("game-config.js");
      const currentText = await (await currentHandle.getFile()).text();
      const backupFolder = await directoryHandle.getDirectoryHandle("backups", { create: true });
      const date = new Date();
      const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}${String(date.getMilliseconds()).padStart(3, "0")}`;
      backupName = `game-config.${stamp}.bak.js`;
      const backupHandle = await backupFolder.getFileHandle(backupName, { create: true });
      const backupWriter = await backupHandle.createWritable(); await backupWriter.write(currentText); await backupWriter.close();
    } catch (error) {
      if (error.name !== "NotFoundError") throw error;
    }
    const fileHandle = await directoryHandle.getFileHandle("game-config.js", { create: true });
    const writer = await fileHandle.createWritable(); await writer.write(source); await writer.close();
    stateLabel.textContent = "Настройки сохранены";
    helpLabel.textContent = backupName ? `Старая версия сохранена в backups/${backupName}. Перезагрузите игру, чтобы применить новые значения.` : "Файл настроек обновлён. Перезагрузите игру, чтобы применить значения.";
  }
  function validateConfig() {
    const issues = [];
    if (!Array.isArray(config.houses) || !config.houses.length) issues.push("Добавьте хотя бы один дом в колоду.");
    if (!Array.isArray(config.requests) || !config.requests.length) issues.push("В колоде должна остаться хотя бы одна заявка.");
    const validTypes = new Set(["ordinary", "emergency", "emergencyDamage", "paid"]);
    (config.requests || []).forEach((request, index) => {
      if (!validTypes.has(request.type)) issues.push(`Заявка ${index + 1}: тип должен быть ordinary, emergency, emergencyDamage или paid.`);
    });
    const names = new Set();
    (config.employees || []).forEach((employee, index) => {
      if (!employee.name || !employee.role || !config.roles?.[employee.role]) issues.push(`Соискатель ${index + 1}: укажите ФИО и существующую должность.`);
      const identity = String(employee.name || "").trim().toLocaleLowerCase("ru");
      if (names.has(identity)) issues.push(`Соискатель «${employee.name}» повторяется. Каждый профиль должен быть уникальным.`);
      names.add(identity);
    });
    if (config.economy.collectionMinPercent > config.economy.collectionMaxPercent) issues.push("Минимальная собираемость не может быть выше максимальной.");
    return issues;
  }
  function downloadConfig() {
    const blob = new Blob([configSource(config)], { type: "text/javascript;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "game-config.js"; link.click();
    URL.revokeObjectURL(link.href);
    stateLabel.textContent = "Файл скачан";
    helpLabel.textContent = "Переместите скачанный game-config.js в папку игры и согласитесь заменить файл. Сначала сохраните старую копию.";
  }

  document.getElementById("reset-defaults").addEventListener("click", () => {
    if (!confirm("Вернуть значения, сохранённые в game-config.default.js? Несохранённые правки в форме пропадут.")) return;
    config = prepareConfig(defaultConfig); render(); stateLabel.textContent = "Загружены значения по умолчанию"; helpLabel.textContent = "Нажмите «Сохранить изменения», чтобы записать их в game-config.js.";
  });
  chooseButton.addEventListener("click", async () => { try { await chooseDirectory(); } catch (error) { stateLabel.textContent = "Папка не выбрана"; helpLabel.textContent = error.message; } });
  saveButton.addEventListener("click", async () => {
    const issues = validateConfig();
    if (issues.length) { stateLabel.textContent = "Проверьте настройки"; helpLabel.textContent = issues.join(" "); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    saveButton.disabled = true; stateLabel.textContent = "Сохраняю…";
    try { await saveConfig(); }
    catch (error) { stateLabel.textContent = "Не удалось сохранить"; helpLabel.textContent = error.message; if (!window.showDirectoryPicker) downloadConfig(); }
    finally { saveButton.disabled = false; }
  });
  render(); loadDirectory();
})();

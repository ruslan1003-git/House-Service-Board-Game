/* Настройки игры: редактируйте значения, сохраняя JSON-синтаксис. */
window.DOMOUPRAV_CONFIG = {
  "version": 1,
  "companyNameDefaults": [
    "Домоуправ1",
    "Лучшая УК",
    "Пример названия",
    "ООО Говно из Жопы",
    "Как-то управляюсь"
  ],
  "seasons": [
    "Лето",
    "Осень",
    "Зима",
    "Весна"
  ],
  "houseProblems": [
    {
      "category": "Кровля",
      "wear": 20,
      "tasks": [
        {
          "category": "Сантехника",
          "labor": 2,
          "title": "Осмотр кровли: водостоки"
        },
        {
          "category": "Общестрой",
          "labor": 2,
          "title": "Ремонт кровли"
        }
      ]
    },
    {
      "category": "Фасад",
      "wear": 20,
      "tasks": [
        {
          "category": "Общестрой",
          "labor": 2,
          "title": "Ремонт фасада"
        }
      ]
    },
    {
      "category": "Водоснабжение",
      "wear": 15,
      "tasks": [
        {
          "category": "Сантехника",
          "labor": 2,
          "materialCost": 5,
          "title": "Ремонт водоснабжения"
        }
      ]
    },
    {
      "category": "Водоотведение",
      "wear": 15,
      "tasks": [
        {
          "category": "Сантехника",
          "labor": 2,
          "title": "Ремонт водоотведения"
        },
        {
          "category": "Уборка",
          "labor": 2,
          "title": "Очистка канализационного стока"
        }
      ]
    },
    {
      "category": "Электроснабжение",
      "wear": 15,
      "tasks": [
        {
          "category": "Электрика",
          "labor": 2,
          "materialCost": 5,
          "title": "Ремонт электроснабжения"
        }
      ]
    },
    {
      "category": "Дорожное покрытие",
      "wear": 10,
      "tasks": [
        {
          "category": "Общестрой",
          "labor": 1,
          "title": "Ремонт дорожного покрытия"
        },
        {
          "category": "Уборка",
          "labor": 1,
          "title": "Очистка дорожного покрытия"
        }
      ]
    },
    {
      "category": "Подвал",
      "wear": 20,
      "tasks": [
        {
          "category": "Общестрой",
          "labor": 2,
          "title": "Ремонт подвала"
        }
      ]
    },
    {
      "category": "Отопление",
      "wear": 15,
      "seasonal": [
        2
      ],
      "tasks": [
        {
          "category": "Сантехника",
          "labor": 2,
          "title": "Ремонт отопления"
        }
      ]
    },
    {
      "category": "ИТП",
      "wear": 25,
      "tasks": [
        {
          "category": "Сантехника",
          "labor": 2,
          "title": "Ремонт ИТП"
        }
      ]
    },
    {
      "category": "Пожаротушение",
      "wear": 10,
      "materialOnly": true,
      "materialCost": 10,
      "tasks": [
        {
          "category": "Электрика",
          "labor": 0,
          "title": "Материалы для системы пожаротушения"
        }
      ]
    },
    {
      "category": "Лифты",
      "wear": 10,
      "materialOnly": true,
      "materialCost": 5,
      "tasks": [
        {
          "category": "Общестрой",
          "labor": 0,
          "title": "Материалы для лифтов"
        }
      ]
    }
  ],
  "houses": [
    {
      "name": "Дом на Садовой",
      "address": "ул. Садовая, 12",
      "area": 8,
      "age": 2
    },
    {
      "name": "Дом у парка",
      "address": "ул. Парковая, 5",
      "area": 10,
      "age": 4
    },
    {
      "name": "Дом на Речной",
      "address": "наб. Речная, 8",
      "area": 12,
      "age": 7
    },
    {
      "name": "Дом на площади",
      "address": "пл. Центральная, 3",
      "area": 15,
      "age": 10
    },
    {
      "name": "Дом у вокзала",
      "address": "ул. Вокзальная, 21",
      "area": 20,
      "age": 13
    }
  ],
  "roles": {
    "plumber": {
      "name": "Сантехник",
      "category": "Сантехника",
      "salary": 20,
      "productivity": 3,
      "icon": "🔧",
      "kind": "executor"
    },
    "electrician": {
      "name": "Электрик",
      "category": "Электрика",
      "salary": 15,
      "productivity": 3,
      "icon": "⚡",
      "kind": "executor"
    },
    "janitor": {
      "name": "Дворник",
      "category": "Уборка",
      "salary": 15,
      "productivity": 4,
      "icon": "🧹",
      "kind": "executor"
    },
    "handyman": {
      "name": "Разнорабочий",
      "category": "Общестрой",
      "salary": 20,
      "productivity": 5,
      "icon": "🛠️",
      "kind": "executor"
    },
    "lawyer": {
      "name": "Юрист",
      "category": null,
      "salary": 20,
      "productivity": 0,
      "icon": "⚖️",
      "kind": "specialist",
      "detail": "Взыскание долгов и снижение требований"
    },
    "hr": {
      "name": "HR-менеджер",
      "category": null,
      "salary": 20,
      "productivity": 0,
      "icon": "👤",
      "kind": "specialist",
      "detail": "Снимает лимит найма, вводит испытательный срок"
    },
    "accountant": {
      "name": "Бухгалтер",
      "category": null,
      "salary": 20,
      "productivity": 0,
      "icon": "💰",
      "kind": "specialist",
      "detail": "Суммирует задолженность дома за периоды"
    },
    "engineer": {
      "name": "Инженер",
      "category": null,
      "salary": 20,
      "productivity": 0,
      "icon": "⚙️",
      "kind": "specialist",
      "detail": "Снижает число проблем при сезонном осмотре на одну"
    }
  },
  "employees": [
    {
      "role": "plumber",
      "name": "Иванов А. П.",
      "productivity": 2,
      "salary": 13.33
    },
    {
      "role": "plumber",
      "name": "Смирнов Б. В.",
      "productivity": 3,
      "salary": 20
    },
    {
      "role": "plumber",
      "name": "Кузнецов В. И.",
      "productivity": 4,
      "salary": 26.67
    },
    {
      "role": "electrician",
      "name": "Попов Г. А.",
      "productivity": 2,
      "salary": 10
    },
    {
      "role": "electrician",
      "name": "Соколов Д. Н.",
      "productivity": 3,
      "salary": 15
    },
    {
      "role": "electrician",
      "name": "Лебедев Е. С.",
      "productivity": 4,
      "salary": 20
    },
    {
      "role": "janitor",
      "name": "Козлов Ж. М.",
      "productivity": 3,
      "salary": 11.25
    },
    {
      "role": "janitor",
      "name": "Новиков З. П.",
      "productivity": 4,
      "salary": 15
    },
    {
      "role": "janitor",
      "name": "Морозов И. В.",
      "productivity": 5,
      "salary": 18.75
    },
    {
      "role": "handyman",
      "name": "Петров К. А.",
      "productivity": 4,
      "salary": 16
    },
    {
      "role": "handyman",
      "name": "Волков Л. Н.",
      "productivity": 5,
      "salary": 20
    },
    {
      "role": "handyman",
      "name": "Зайцев М. О.",
      "productivity": 6,
      "salary": 24
    },
    {
      "role": "lawyer",
      "name": "Белов Н. И.",
      "productivity": 0,
      "salary": 15,
      "legalStrength": 1
    },
    {
      "role": "lawyer",
      "name": "Фёдоров О. П.",
      "productivity": 0,
      "salary": 20,
      "legalStrength": 2
    },
    {
      "role": "lawyer",
      "name": "Михайлов П. С.",
      "productivity": 0,
      "salary": 25,
      "legalStrength": 3
    },
    {
      "role": "hr",
      "name": "Андреев Р. В.",
      "productivity": 0,
      "salary": 20,
      "bonus": "marketReroll",
      "bonusDescription": "Переброс рынка труда один раз за ход"
    },
    {
      "role": "hr",
      "name": "Семёнов С. А.",
      "productivity": 0,
      "salary": 20,
      "bonus": "expandedMarket",
      "bonusDescription": "На рынке на 2 специалиста и 2 исполнителя больше"
    },
    {
      "role": "hr",
      "name": "Егоров Т. Н.",
      "productivity": 0,
      "salary": 15
    },
    {
      "role": "accountant",
      "name": "Павлов У. И.",
      "productivity": 0,
      "salary": 20,
      "bonus": "raiseCollection",
      "bonusDescription": "Повышает собираемость на 10 п.п., максимум до 100%"
    },
    {
      "role": "accountant",
      "name": "Козлова Ф. М.",
      "productivity": 0,
      "salary": 20,
      "bonus": "discountMaintenance",
      "bonusDescription": "Снижает базовое обслуживание домов на 20%"
    },
    {
      "role": "accountant",
      "name": "Степанов Х. П.",
      "productivity": 0,
      "salary": 15
    },
    {
      "role": "engineer",
      "name": "Николаев Ц. А.",
      "productivity": 0,
      "salary": 20,
      "bonus": "reduceProblemLabor",
      "bonusDescription": "На 2 меньше трудозатрат при решении проблем своими силами"
    },
    {
      "role": "engineer",
      "name": "Орлов Ч. В.",
      "productivity": 0,
      "salary": 20,
      "bonus": "discountProblemMaterials",
      "bonusDescription": "Материалы для решения проблем дешевле на 30%"
    },
    {
      "role": "engineer",
      "name": "Макаров Ш. И.",
      "productivity": 0,
      "salary": 15
    }
  ],
  "problemCardCounts": {
    "Кровля": 8,
    "Фасад": 8,
    "Водоснабжение": 11,
    "Водоотведение": 11,
    "Электроснабжение": 11,
    "Подвал": 8,
    "Дорожное покрытие": 16,
    "Отопление": 11,
    "ИТП": 6,
    "Пожаротушение": 16,
    "Лифты": 16
  },
  "problemConsequences": {
    "Кровля": "Сезонные заявки на кровлю и водостоки",
    "Фасад": "Сезонные заявки на ремонт фасада",
    "Водоснабжение": "Повторные сантехнические заявки и расходы на материалы",
    "Водоотведение": "Повторные заявки на сантехнику и уборку",
    "Электроснабжение": "Повторные электротехнические заявки и материалы",
    "Подвал": "Повторные заявки на ремонт подвала",
    "Дорожное покрытие": "Повторные заявки на ремонт и уборку",
    "Отопление": "Заявка на ремонт каждую зиму",
    "ИТП": "Повторные заявки на ремонт ИТП",
    "Пожаротушение": "Сезонные расходы на материалы",
    "Лифты": "Сезонные расходы на материалы"
  },
  "requests": [
    {
      "title": "Перегорела лампа",
      "category": "Электрика",
      "description": "Жильцы сообщают, что не горит лампа на лестничной площадке.",
      "labor": 1,
      "cost": 15,
      "materialCost": 3,
      "icon": "✳"
    },
    {
      "title": "Протекает кран",
      "category": "Сантехника",
      "description": "В квартире капает кран. Вода расходуется, жильцы ждут ремонта.",
      "labor": 1,
      "cost": 25,
      "materialCost": 5,
      "icon": "⌁"
    },
    {
      "title": "Сломан доводчик",
      "category": "Общестрой",
      "description": "Входная дверь не закрывается самостоятельно и хлопает от сквозняка.",
      "labor": 2,
      "cost": 30,
      "materialCost": 8,
      "icon": "⌑"
    },
    {
      "title": "Мусор во дворе",
      "category": "Уборка",
      "description": "После выходных во дворе остались пакеты и бытовой мусор.",
      "labor": 1,
      "cost": 20,
      "materialCost": 0,
      "icon": "⌖"
    },
    {
      "title": "Засорилась труба",
      "category": "Сантехника",
      "description": "Вода медленно уходит в кухонной раковине на первом этаже.",
      "labor": 3,
      "cost": 40,
      "materialCost": 10,
      "icon": "⌁"
    },
    {
      "title": "Не работает домофон",
      "category": "Электрика",
      "description": "Жильцы не могут открыть входную дверь с домофона.",
      "labor": 2,
      "cost": 35,
      "materialCost": 6,
      "icon": "⌗"
    },
    {
      "title": "Яма у подъезда",
      "category": "Общестрой",
      "description": "На дорожке у входа появилась небольшая выбоина.",
      "labor": 3,
      "cost": 45,
      "materialCost": 12,
      "icon": "⌖"
    },
    {
      "title": "Разбито окно",
      "category": "Общестрой",
      "description": "На лестничной площадке разбито стекло, в подъезде холодно.",
      "labor": 3,
      "cost": 50,
      "materialCost": 15,
      "icon": "▦"
    },
    {
      "title": "Грязная лестничная клетка",
      "category": "Уборка",
      "description": "Жильцы просят убрать лестничную площадку и пролет.",
      "labor": 2,
      "cost": 30,
      "materialCost": 3,
      "icon": "⌖"
    },
    {
      "title": "Искрит выключатель",
      "category": "Электрика",
      "description": "В коридоре искрит выключатель, жильцы опасаются короткого замыкания.",
      "labor": 2,
      "cost": 35,
      "materialCost": 5,
      "icon": "ϟ"
    },
    {
      "title": "Обрыв провода в подъезде",
      "category": "Электрика",
      "description": "Повреждённый провод искрит на лестничной площадке — нужна срочная изоляция.",
      "labor": 2,
      "cost": 45,
      "materialCost": 8,
      "type": "emergency",
      "icon": "ϟ"
    },
    {
      "title": "Прорыв трубы в подвале",
      "category": "Сантехника",
      "description": "Вода быстро заливает техническое помещение. Аварийная бригада нужна немедленно.",
      "labor": 3,
      "cost": 55,
      "materialCost": 15,
      "type": "emergency",
      "icon": "⌁"
    },
    {
      "title": "Протечка затопила квартиру",
      "category": "Сантехника",
      "description": "Авария повредила отделку квартиры. Требуется устранить протечку и компенсировать ущерб жильцам.",
      "labor": 3,
      "cost": 60,
      "materialCost": 15,
      "damageCompensation": 80,
      "type": "emergencyDamage",
      "icon": "⌁"
    },
    {
      "title": "Установить розетку в квартире",
      "category": "Электрика",
      "description": "Жилец заказал монтаж дополнительной розетки.",
      "labor": 2,
      "cost": 30,
      "materialCost": 8,
      "payout": 65,
      "type": "paid",
      "icon": "✳"
    },
    {
      "title": "Заменить смеситель в квартире",
      "category": "Сантехника",
      "description": "Платная замена смесителя по заявке собственника.",
      "labor": 2,
      "cost": 35,
      "materialCost": 12,
      "payout": 75,
      "type": "paid",
      "icon": "⌁"
    },
    {
      "title": "Закрепить карниз в квартире",
      "category": "Общестрой",
      "description": "Жилец заказал мелкий монтаж и крепление карниза.",
      "labor": 1,
      "cost": 20,
      "materialCost": 5,
      "payout": 45,
      "type": "paid",
      "icon": "⚒"
    }
  ],
  "economy": {
    "startingCompanyName": "",
    "startingHouseName": "Дом у парка",
    "startingCapital": 100,
    "startingReputation": 1,
    "startingArea": 10,
    "tariffPerSquareMeter": 10,
    "baseMaintenancePerHouse": 30,
    "bankruptcyThreshold": -500,
    "collectionMinPercent": 20,
    "collectionMaxPercent": 100,
    "requestsPerHousePerSeason": 2,
    "contractorMarkup": 10,
    "capitalBarScale": 500,
    "capitalBarFillMaxPercent": 100
  },
  "oss": {
    "specialistModifiers": { "lawyer": 0, "accountant": 0, "hr": 0, "engineer": 0 },
    "reputationModifierPerPoint": 1,
    "capitalRepairWearThresholdPercent": 60,
    "capitalRepairQuestionModifier": 0,
    "tariffOssSkippedReputationBonus": 1,
    "historyEntriesKept": 12,
    "tariffOssQuestionModifierMultiplier": 1
  },
  "rules": {
    "inspectionSeasonIndices": [
      1,
      3
    ],
    "annualReportSeasonIndex": 3,
    "maxRequestLabor": 3,
    "problemRepairLaborCostMultiplier": 2,
    "problemMinimumMaterialCost": 5,
    "problemEmergencyCompensationMinimum": 10,
    "marketExecutors": 3,
    "marketSpecialists": 3,
    "hiresWithoutHR": 2,
    "preparationSalaryMultiplier": 0.7,
    "probationTurns": 2,
    "probationSalaryMultiplier": 0.5,
    "overtimeSalaryMultiplierWithHR": 0.5,
    "problemCardsPerInspectionMin": 0,
    "problemCardsPerInspectionMax": 2,
    "engineerInspectionReduction": 1,
    "inspectionCardsPerThreeHouseYears": 1,
    "warrantyAgeYears": 3,
    "warrantyCourtFee": 50,
    "warrantySuccessChanceByLegalStrength": [
      0.3,
      0.5,
      0.9
    ],
    "problemEmergencyDamageChance": 0.3,
    "problemDamageMultiplier": 2,
    "unsafeWearThresholdPercent": 100,
    "unsafeProblemCardThreshold": 20,
    "unsafeHouseGraceSeasons": 8,
    "unsafeHouseReputationPenalty": 2,
    "unsafeHouseEndsGame": true,
    "lawyerDebtLimitByStrength": [
      20,
      30,
      40
    ],
    "lawyerReductionRangeByStrength": [
      [
        10,
        30
      ],
      [
        20,
        45
      ],
      [
        30,
        60
      ]
    ],
    "lawyerReductionSuccessChance": 0.5,
    "unpaidFiringReputationPenalty": 1,
    "unpaidFiringComplaintChanceMax": 0.5,
    "laborInspectionFineSalaryMultiplier": 3,
    "cancellationReputationPenaltyEvery": 3,
    "unresolvedEmergencyReputationPenalty": 1,
    "noCancellationYearReputationBonus": 1,
    "noDebtYearReputationBonus": 1,
    "clearedProblemCategoryReputationBonus": 1,
    "bankruptcyStartingReputation": -1,
    "logEntriesKept": 30,
    "toastDurationMs": 3200,
    "lawyerSalaryByStrength": [
      15,
      20,
      25
    ],
    "hrExpandedMarketExecutors": 2,
    "hrExpandedMarketSpecialists": 2,
    "problemLaborReductionWithEngineer": 2,
    "engineerMaterialDiscountPercent": 30,
    "accountantCollectionBonusPercent": 10,
    "accountantMaintenanceDiscountPercent": 20
  },
  "seasonIcons": [
    "☀️",
    "🍂",
    "❄️",
    "🌱"
  ]
};

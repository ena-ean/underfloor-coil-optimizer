/**
 * Russian UI dictionary — the reference implementation of the translation
 * contract. `en.ts` must satisfy `typeof ru`.
 */
export const ru = {
  meta: {
    locale: "ru",
    title: "Калькулятор бухт тёплого пола",
    description:
      "Оптимизатор закупки трубки для тёплого пола: раскладывает контуры по бухтам так, чтобы остатки были минимальными.",
  },

  common: {
    meters: "м",
    feet: "фт",
    of: "из",
    total: "Итого",
    apply: "Применить",
    cancel: "Отмена",
    close: "Закрыть",
    undo: "Вернуть",
  },

  header: {
    tagline: "Оптимизация закупки трубки",
    theme: "Тема",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    themeSystem: "Системная",
    language: "Язык",
    units: "Единицы измерения",
    unitsMetric: "Метры",
    unitsImperial: "Футы",
  },

  steps: {
    loops: "Контуры",
    params: "Закупка",
    result: "Результат",
    history: "История",
    loopsHint: "Длины петель по этажам",
    paramsHint: "Бухты, запас, цены",
    resultHint: "Раскладка и спецификация",
    historyHint: "Сохранённые расчёты",
    navLabel: "Этапы расчёта",
  },

  loops: {
    title: "Контуры тёплого пола",
    description:
      "Введите длину каждой петли. Данные сохраняются в браузере — можно вернуться позже.",
    add: "Добавить контур",
    clear: "Очистить всё",
    floor: "Этаж",
    length: "Длина",
    circuit: "Контур",
    remove: "Удалить контур",
    duplicate: "Дублировать",
    pasteHint: "Вставьте колонку чисел из Excel — каждая строка станет контуром",
    count: "Контуров",
    designTotal: "Проектная длина",
    withReserveTotal: "С запасом",
    emptyTitle: "Пока нет контуров",
    emptyText: "Добавьте контуры вручную, вставьте данные из таблицы или загрузите пример.",
    loadSample: "Показать пример",
    invalidLength: "Укажите длину больше нуля",
    pasted: "Добавлено контуров: {count}",
    cleared: "Все контуры удалены",
    sampleLoaded: "Загружен пример на 19 контуров",
  },

  params: {
    title: "Параметры закупки",
    description: "Отметьте бухты, которые можно купить, и укажите запас на подключение.",
    sizes: "Размеры бухт",
    sizesHint: "Отметьте нужные размеры или добавьте свой",
    addSize: "Добавить размер",
    sizePlaceholder: "Например, 150",
    removeSize: "Убрать размер",
    resetSizes: "Стандартные",
    sizeInvalid: "Введите размер больше нуля",
    reserve: "Запас на контур",
    reserveHint: "Добавляется к каждой петле",
    objective: "Что оптимизируем",
    objectiveWaste: "Длина трубки",
    objectiveCost: "Деньги",
    price: "Цена за {unit}",
    priceHint: "Нужна для расчёта стоимости закупки",
    currency: "Валюта",
    perSizePrices: "Цены по размерам бухт",
    perSizeHint: "Если крупные бухты дешевле в расчёте на длину — укажите цену для каждого размера",
    calculate: "Рассчитать раскладку",
    recalculate: "Пересчитать",
  },

  summary: {
    title: "Сводка",
    loops: "Контуров",
    design: "Проектная длина",
    withReserve: "С запасом",
    sizes: "Размеров бухт",
    hint: "Расчёт выполняется локально в браузере, данные никуда не отправляются.",
  },

  result: {
    title: "Раскладка по бухтам",
    empty: "Результата пока нет — заполните контуры и нажмите «Рассчитать».",
    kpiCoils: "Бухты",
    kpiPurchased: "Купить трубки",
    kpiWaste: "Остатки",
    kpiCost: "Стоимость",
    optimal: "Оптимальное решение",
    optimalHint: "Лучше не существует: проверены все варианты раскладки.",
    nearOptimal: "Близко к оптимуму",
    nearOptimalHint: "Поиск остановлен по лимиту времени — возможно улучшение.",
    heuristic: "Быстрый поиск",
    heuristicHint:
      "Контуров много — включён быстрый поиск. Разрыв с минимумом показывает, насколько ещё можно улучшить закупку.",
    lowerBound: "Теоретический минимум",
    gap: "Разрыв с минимумом",
    gapZero: "разрыв отсутствует",
    savings: "Экономия против «бухта на контур»",
    savingsHint: "Столько вы сэкономите, если раскладывать петли оптимально",
    noPrices: "Укажите цену за метр, чтобы увидеть стоимость",
    solveTime: "Расчёт занял",
    nodes: "узлов поиска",
  },

  coils: {
    title: "Бухты",
    coil: "Бухта",
    fill: "Заполнение",
    used: "Использовано",
    waste: "Остаток",
    loops: "Контуры",
    cost: "Цена",
  },

  spec: {
    title: "Спецификация закупки",
    size: "Размер бухты",
    qty: "Кол-во",
    length: "Длина",
    used: "В дело",
    waste: "Остаток",
    cost: "Стоимость",
    total: "Итого",
  },

  loopsTable: {
    title: "Распределение контуров",
    circuit: "Контур",
    circuitShort: "К{n}",
    floor: "Этаж",
    design: "Проектная",
    withReserve: "С запасом",
    coil: "Бухта",
    unassigned: "—",
  },

  history: {
    title: "История расчётов",
    description:
      "Каждый расчёт сохраняется в этом браузере. Откройте запись, чтобы вернуть её контуры и параметры закупки.",
    open: "Открыть",
    rename: "Переименовать",
    remove: "Удалить запись",
    clear: "Очистить историю",
    emptyTitle: "История пуста",
    emptyText:
      "Нажмите «Рассчитать» — расчёт появится здесь. Хранятся последние {limit} записей, данные не покидают браузер.",
    count: "Записей",
    saved: "Расчёт сохранён в историю",
    restored: "Расчёт восстановлен",
    removed: "Запись удалена",
    cleared: "История очищена",
    exported: "История выгружена в JSON",
    imported: "Импортировано записей: {count}",
    importFailed: "Не удалось прочитать файл: нужен JSON из экспорта истории",
    exportAction: "Экспорт",
    importAction: "Импорт",
    namePlaceholder: "Название расчёта",
    unnamed: "Расчёт",
    optimal: "Оптимум",
    fast: "Быстрый поиск",
    openedAt: "Сохранено",
  },

  export: {
    print: "Печать / PDF",
    csv: "Скачать CSV",
    html: "Скачать HTML-отчёт",
    copied: "Спецификация скопирована",
  },

  errors: {
    noLoops: "Добавьте хотя бы один контур",
    noSizes: "Выберите хотя бы один размер бухты",
    invalidLoop: "Контур {loop}: укажите длину больше нуля",
    loopTooLong: "Контур {loop}: {length} {unit} с запасом не помещается в бухту {maxSize} {unit}",
  },

  footer: {
    note: "Все расчёты выполняются в браузере. Открытый исходный код, MIT.",
    docs: "Документация",
    source: "Исходный код",
  },
} as const;

export type Dictionary = {
  [Group in keyof typeof ru]: { [Key in keyof (typeof ru)[Group]]: string };
};

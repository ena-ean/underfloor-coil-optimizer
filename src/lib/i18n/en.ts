import type { Dictionary } from "./ru";

/** English UI dictionary. Must mirror every key of the Russian one. */
export const en: Dictionary = {
  meta: {
    locale: "en",
    title: "Underfloor heating coil calculator",
    description:
      "Purchase optimizer for underfloor heating pipe: packs circuit loops into coils so that leftovers stay minimal.",
  },

  common: {
    meters: "m",
    of: "of",
    total: "Total",
    apply: "Apply",
    cancel: "Cancel",
    close: "Close",
    undo: "Undo",
  },

  header: {
    tagline: "Pipe purchase optimizer",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
  },

  steps: {
    loops: "Loops",
    params: "Purchase",
    result: "Result",
    loopsHint: "Loop lengths per floor",
    paramsHint: "Coils, reserve, prices",
    resultHint: "Packing and specification",
  },

  loops: {
    title: "Heating circuit loops",
    description:
      "Enter the length of every loop. Data is stored in your browser, so you can come back later.",
    add: "Add loop",
    clear: "Clear all",
    floor: "Floor",
    length: "Length, m",
    circuit: "Loop",
    remove: "Remove loop",
    duplicate: "Duplicate",
    pasteHint: "Paste a column of numbers from Excel — every row becomes a loop",
    count: "Loops",
    designTotal: "Design length",
    withReserveTotal: "With reserve",
    emptyTitle: "No loops yet",
    emptyText: "Add loops manually, paste rows from a spreadsheet, or load the sample.",
    loadSample: "Load sample",
    invalidLength: "Enter a length greater than zero",
    pasted: "Loops added: {count}",
    cleared: "All loops removed",
    sampleLoaded: "Sample with 19 loops loaded",
  },

  params: {
    title: "Purchase settings",
    description: "Tick the coils you can buy and set the connection reserve.",
    sizes: "Coil sizes",
    sizesHint: "Only ticked sizes take part in the calculation",
    reserve: "Reserve per loop",
    reserveHint: "Added to every loop",
    objective: "Optimize for",
    objectiveWaste: "Pipe metres",
    objectiveCost: "Money",
    price: "Price per metre",
    priceHint: "Required to show the purchase cost",
    currency: "Currency",
    perSizePrices: "Prices per coil size",
    perSizeHint: "If larger coils are cheaper per metre, set a price for each size",
    calculate: "Calculate packing",
    recalculate: "Recalculate",
  },

  summary: {
    title: "Summary",
    loops: "Loops",
    design: "Design length",
    withReserve: "With reserve",
    sizes: "Coil sizes",
    hint: "Everything is computed locally in your browser — nothing is uploaded.",
  },

  result: {
    title: "Packing plan",
    empty: "No result yet — fill in the loops and press “Calculate”.",
    kpiCoils: "Coils",
    kpiPurchased: "Pipe to buy",
    kpiWaste: "Leftovers",
    kpiCost: "Cost",
    optimal: "Optimal solution",
    optimalHint: "Nothing better exists: every packing was checked.",
    nearOptimal: "Close to optimal",
    nearOptimalHint: "Search stopped at the time limit — an improvement may exist.",
    heuristic: "Fast search",
    heuristicHint:
      "Many loops, so the fast search is used. The gap to the minimum shows how much the purchase could still improve.",
    lowerBound: "Theoretical minimum",
    gap: "Gap to minimum",
    gapZero: "no gap",
    savings: "Saved against “one coil per loop”",
    savingsHint: "This is what optimal packing saves you",
    noPrices: "Set a price per metre to see the cost",
    solveTime: "Solved in",
    nodes: "search nodes",
  },

  coils: {
    title: "Coils",
    coil: "Coil",
    fill: "Fill",
    used: "Used",
    waste: "Waste",
    loops: "Loops",
    cost: "Price",
  },

  spec: {
    title: "Purchase specification",
    size: "Coil size",
    qty: "Qty",
    length: "Length",
    used: "Used",
    waste: "Waste",
    cost: "Cost",
    total: "Total",
  },

  loopsTable: {
    title: "Loop distribution",
    circuit: "Loop",
    circuitShort: "L{n}",
    floor: "Floor",
    design: "Design",
    withReserve: "With reserve",
    coil: "Coil",
    unassigned: "—",
  },

  export: {
    print: "Print / PDF",
    csv: "Download CSV",
    html: "Download HTML report",
    copied: "Specification copied",
  },

  errors: {
    noLoops: "Add at least one loop",
    noSizes: "Select at least one coil size",
    invalidLoop: "Loop {loop}: enter a length greater than zero",
    loopTooLong: "Loop {loop}: {length} m with reserve does not fit into a {maxSize} m coil",
  },

  footer: {
    note: "All calculations run in your browser. Open source, MIT.",
    docs: "Documentation",
    source: "Source code",
  },
};

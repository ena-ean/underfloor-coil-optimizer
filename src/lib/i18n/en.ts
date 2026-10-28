import type { Dictionary } from "./ru";

/** English UI dictionary. Must mirror every key of the Russian one. */
export const en: Dictionary = {
  meta: {
    locale: "en",
    title: "Underfloor heating coil calculator",
    report: "Underfloor heating plan: packing and purchase",
    description:
      "Purchase optimizer for underfloor heating pipe: packs circuit loops into coils so that leftovers stay minimal.",
  },

  common: {
    meters: "m",
    feet: "ft",
    of: "of",
    total: "Total",
    apply: "Apply",
    cancel: "Cancel",
    close: "Close",
    undo: "Undo",
    optional: "optional",
  },

  header: {
    tagline: "Pipe purchase optimizer",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
    units: "Units",
    unitsMetric: "Metres",
    unitsImperial: "Feet",
  },

  intro: {
    title: "How it works",
    open: "How it works",
    lead: "Three steps: loop lengths, coils with prices, a finished cut plan. Everything runs in your browser, no sign-up.",
    step1Title: "Enter the loops",
    step1Text:
      "Loop lengths per floor, typed by hand, pasted from Excel or taken from the sample.",
    step2Title: "Set the coils and prices",
    step2Text:
      "The length of each coil and the price of the whole coil — what the shop charges, not the price per metre.",
    step3Title: "Take the plan",
    step3Text:
      "Which coil each loop is cut from, what is left over and what it costs, plus print, CSV, HTML and a link to the project.",
    price:
      "Prices are indicative: coils of one size differ between suppliers, so every money figure carries a “~”.",
    privacy:
      "The project lives in your browser. A share link carries the project itself in the address and only travels to the people you send it to.",
  },

  steps: {
    loops: "Loops",
    params: "Purchase",
    result: "Result",
    history: "History",
    loopsHint: "Loop lengths per floor",
    paramsHint: "Coils and prices",
    resultHint: "Packing and specification",
    historyHint: "Saved calculations",
    navLabel: "Calculation steps",
  },

  loops: {
    title: "Underfloor heating loops",
    description:
      "Enter the length of every loop. Everything is stored in your browser, so you can come back later.",
    add: "Add loop",
    clear: "Clear all",
    floor: "Floor",
    length: "Length",
    room: "Room",
    roomPlaceholder: "—",
    roomHint: "Optional room name, shown in the specification and the report",
    circuit: "Loop",
    remove: "Delete loop",
    duplicate: "Duplicate",
    pasteHint: "Paste a column of numbers from Excel and every row becomes a loop",
    count: "Loops",
    designTotal: "Design length",
    withReserveTotal: "With reserve",
    emptyTitle: "No loops yet",
    emptyText: "Add loops by hand, paste a column from a spreadsheet or load the sample.",
    loadSample: "Load sample",
    invalidLength: "Enter a length greater than zero",
    pasted: "Loops added: {count}",
    cleared: "All loops removed",
    sampleLoaded: "Sample loaded: {count} loops",
  },

  /** Room names of the prefilled sample project, in sample order. */
  sample: {
    livingRoom: "Living room",
    kitchen: "Kitchen",
    bedroom: "Bedroom",
    kidsRoom: "Kids room",
    study: "Study",
    hallway: "Hallway",
    lounge: "Lounge",
    bathroom: "Bathroom",
    cloakroom: "Cloakroom",
  },

  params: {
    title: "Coils and prices",
    description: "What you can buy: the length of each coil and the price of the whole coil.",
    size: "Coil length",
    price: "Price per coil",
    add: "Add coil",
    remove: "Remove coil",
    reset: "Defaults",
    invalidSize: "Enter a coil length greater than zero",
    hint:
      "The plan minimises the purchased length, and the estimate uses these prices. The same length may appear twice — the cheaper coil is the one that gets priced.",
    reserve: "Reserve per loop",
    reserveHint: "Added to every loop",
    currency: "Currency",
    calculate: "Calculate packing",
    recalculate: "Recalculate",
  },

  summary: {
    title: "Summary",
    loops: "Loops",
    design: "Design length",
    withReserve: "With reserve",
    catalogue: "Coils in catalogue",
    hint:
      "Everything is computed locally in your browser. A share link is built only when you press it and keeps the project in the address.",
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
    searching: "Searching for the optimum",
    searchingHint:
      "Checking every packing that could turn out cheaper. The search runs off the main thread, so the page stays responsive.",
    stopped: "Search stopped",
    stoppedHint:
      "This is the best plan found so far and optimality is not proven. The gap to the minimum shows how much may still be on the table.",
    stop: "Stop search",
    restart: "Search again",
    lowerBound: "Theoretical minimum",
    gap: "Gap to minimum",
    gapZero: "no gap",
    savings: "Saved against “one coil per loop”",
    savingsHint: "This is what optimal packing saves you",
    noPrices: "Set coil prices to see the cost",
    priceBasis: "at catalogue prices",
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
    room: "Room",
    floor: "Floor",
    design: "Design",
    withReserve: "With reserve",
    coil: "Coil",
    unassigned: "—",
  },

  cutPlan: {
    title: "Cut plan",
    hint: "Mark the coils with the numbers from this plan. Every loop is cut whole from its coil, and the length under “With reserve” already includes the reserve.",
    mark: "Label both ends of every loop with its number so the loops cannot get mixed up when they are poured.",
    lengths: "Length",
    loop: "Loop",
    design: "Design",
    withReserve: "With reserve",
    cut: "Cut",
    floorShort: "fl.",
    unassigned: "No coil",
  },

  history: {
    title: "Calculation history",
    description:
      "Every calculation is stored in this browser. Open an entry to bring its loops and purchase settings back.",
    open: "Open",
    rename: "Rename",
    remove: "Delete entry",
    clear: "Clear history",
    emptyTitle: "History is empty",
    emptyText:
      "Press “Calculate” and the result shows up here. The last {limit} calculations are kept — nothing leaves your browser.",
    count: "Entries",
    saved: "Calculation saved to history",
    restored: "Calculation restored",
    removed: "Entry deleted",
    cleared: "History cleared",
    exported: "History exported to JSON",
    imported: "Entries imported: {count}",
    importFailed: "Could not read the file: it must be a JSON exported from the history",
    exportAction: "Export",
    importAction: "Import",
    namePlaceholder: "Calculation name",
    unnamed: "Calculation",
    optimal: "Optimal",
    notProven: "Not proven",
    openedAt: "Saved",
  },

  export: {
    print: "Print / PDF",
    csv: "Download CSV",
    html: "Download HTML report",
    copied: "Specification copied",
  },

  share: {
    action: "Share a link",
    hint: "Loops and prices travel in the address itself: no server, no sign-up.",
    copied: "Link copied",
    loaded: "Project loaded from the link",
    tooLarge: "The project is too large for a link — export the CSV or the HTML report",
    failed: "Could not copy the link",
  },

  errors: {
    noLoops: "Add at least one loop",
    noSizes: "Add at least one coil",
    invalidLoop: "Loop {loop}: enter a length greater than zero",
    loopTooLong: "Loop {loop}: {length} {unit} with reserve does not fit into a {maxSize} {unit} coil",
  },

  footer: {
    note: "All calculations run in your browser. Open source, MIT.",
    docs: "Documentation",
    source: "Source code",
  },
};

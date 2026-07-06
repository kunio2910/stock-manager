const STORAGE_KEY = "stock-desk-items";
const SETTINGS_KEY = "stock-desk-settings";
const ASSET_IMPORT_VERSION = 1;
const GOOGLE_SHEETS_API_URL =
  "https://script.google.com/macros/s/AKfycbxL-xGSo45yagueen_Lfct7BST6ITKOxTvQs5ymgx1t5w3L7UxDVZdRcc5L5bDqSGK7/exec";

const statusLabels = {
  watching: "Äang theo dÃµi",
  hold: "Äang náº¯m giá»¯",
  alert: "Cáº§n chÃº Ã½",
};

let { stocks, sales, assets } = loadData();
let editingId = null;
let editingLot = null;
let sellingLot = null;
let addingLotStockId = null;
let editingAssetId = null;
let activeView = "stocks";
let holdingChartMode = "quantity";
let cloudSaveTimer = null;
let isApplyingCloudData = false;
let settings = loadSettings();
const expandedStocks = new Set();
const lotSortState = {};

const form = document.querySelector("#stockForm");
const tableBody = document.querySelector("#stockTable");
const salesTable = document.querySelector("#salesTable");
const template = document.querySelector("#rowTemplate");
const lotTemplate = document.querySelector("#lotRowTemplate");
const searchInput = document.querySelector("#searchInput");
const filterInput = document.querySelector("#filterInput");
const refreshPricesButton = document.querySelector("#refreshPricesButton");
const priceUpdateStatus = document.querySelector("#priceUpdateStatus");
const emptyState = document.querySelector("#emptyState");
const salesEmptyState = document.querySelector("#salesEmptyState");
const assetsEmptyState = document.querySelector("#assetsEmptyState");
const submitButton = document.querySelector("#submitButton");
const tabButtons = document.querySelectorAll(".tab-btn");
const navButtons = document.querySelectorAll(".nav-btn");
const viewPanels = document.querySelectorAll(".view-panel");
const metricFilters = document.querySelectorAll(".metric-filter");
const holdingPie = document.querySelector("#holdingPie");
const holdingLegend = document.querySelector("#holdingLegend");
const holdingChartModeText = document.querySelector("#holdingChartModeText");
const holdingModeButtons = document.querySelectorAll(".chart-mode-btn");
const assetForm = document.querySelector("#assetForm");
const assetTimeInput = document.querySelector("#assetTimeInput");
const assetValueInput = document.querySelector("#assetValueInput");
const assetNoteInput = document.querySelector("#assetNoteInput");
const assetSubmitButton = document.querySelector("#assetSubmitButton");
const assetFromInput = document.querySelector("#assetFromInput");
const assetToInput = document.querySelector("#assetToInput");
const assetClearFilterButton = document.querySelector("#assetClearFilterButton");
const assetsTable = document.querySelector("#assetsTable");
const latestAssetValue = document.querySelector("#latestAssetValue");
const latestAssetTime = document.querySelector("#latestAssetTime");
const assetLineChart = document.querySelector("#assetLineChart");
const assetChartRange = document.querySelector("#assetChartRange");
const quickStockForm = document.querySelector("#quickStockForm");
const quickSymbolInput = document.querySelector("#quickSymbolInput");
const quickPriceInput = document.querySelector("#quickPriceInput");
const quickNameInput = document.querySelector("#quickNameInput");
const quickNoteInput = document.querySelector("#quickNoteInput");
const quickStatusInput = document.querySelector("#quickStatusInput");
const moneyVisibilityInput = document.querySelector("#moneyVisibilityInput");
const collapsibleToggles = document.querySelectorAll(".collapsible-toggle");
const sidebarToggleButton = document.querySelector("#sidebarToggleButton");

const fields = {
  symbol: document.querySelector("#symbolInput"),
  name: document.querySelector("#nameInput"),
  exchange: document.querySelector("#exchangeInput"),
  sector: document.querySelector("#sectorInput"),
  price: document.querySelector("#priceInput"),
  status: document.querySelector("#statusInput"),
  note: document.querySelector("#noteInput"),
};

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const currentStock = stocks.find((stock) => stock.id === editingId);
  const data = {
    id: editingId || createId(),
    symbol: fields.symbol.value.trim().toUpperCase(),
    name: fields.name.value.trim(),
    exchange: fields.exchange.value,
    sector: fields.sector.value.trim() || "Chua phan loai",
    price: Number(fields.price.value || 0),
    status: fields.status.value,
    note: fields.note.value.trim(),
    lots: currentStock?.lots || [],
    updatedAt: new Date().toISOString(),
  };

  if (editingId) {
    stocks = stocks.map((stock) => (stock.id === editingId ? data : stock));
  } else {
    const duplicate = stocks.some((stock) => stock.symbol === data.symbol && stock.exchange === data.exchange);
    if (duplicate) {
      fields.symbol.setCustomValidity("Ma nay da co trong cung san.");
      fields.symbol.reportValidity();
      return;
    }
    stocks.unshift(data);
    expandedStocks.add(data.id);
  }

  editingId = null;
  fields.symbol.setCustomValidity("");
  form.reset();
  submitButton.textContent = "Them ma";
  activeView = "stocks";
  saveData();
  render();
});

searchInput.addEventListener("input", render);
filterInput.addEventListener("change", render);
refreshPricesButton.addEventListener("click", updatePricesFromFireAnt);

sidebarToggleButton.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-collapsed");
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.navView || "stocks";
    filterInput.value = button.dataset.navFilter || "all";
    render();
  });
});

metricFilters.forEach((button) => {
  button.addEventListener("click", () => {
    filterInput.value = button.dataset.statusFilter;
    activeView = "stocks";
    render();
  });
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    render();
  });
});

holdingModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    holdingChartMode = button.dataset.holdingMode;
    renderHoldingChart();
  });
});

collapsibleToggles.forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".collapsible-card");
    const isOpen = card.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

assetFromInput.addEventListener("change", renderAssets);
assetToInput.addEventListener("change", renderAssets);
assetClearFilterButton.addEventListener("click", () => {
  assetFromInput.value = "";
  assetToInput.value = "";
  renderAssets();
});

assetTimeInput.value = toDateInputValue(new Date());

if (moneyVisibilityInput) {
  moneyVisibilityInput.checked = settings.showAccountMoney;
  moneyVisibilityInput.addEventListener("change", () => {
    settings.showAccountMoney = moneyVisibilityInput.checked;
    saveSettings();
    applySettings();
  });
}

quickStockForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = {
    id: createId(),
    symbol: quickSymbolInput.value.trim().toUpperCase(),
    name: quickNameInput.value.trim(),
    exchange: "HOSE",
    sector: "Chua phan loai",
    price: Number(quickPriceInput.value || 0),
    status: quickStatusInput.value,
    note: quickNoteInput.value.trim(),
    lots: [],
    updatedAt: new Date().toISOString(),
  };

  const duplicate = stocks.some((stock) => stock.symbol === data.symbol && stock.exchange === data.exchange);
  if (duplicate) {
    quickSymbolInput.setCustomValidity("MÃ£ nÃ y Ä‘Ã£ cÃ³ trong danh má»¥c.");
    quickSymbolInput.reportValidity();
    return;
  }

  quickSymbolInput.setCustomValidity("");
  stocks.unshift(data);
  expandedStocks.add(data.id);
  activeView = "stocks";
  filterInput.value = data.status;
  quickStockForm.reset();
  quickStatusInput.value = "hold";
  saveData();
  render();
});

assetForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const entry = {
    id: editingAssetId || createId(),
    time: normalizeAssetDateValue(assetTimeInput.value),
    value: Number(assetValueInput.value || 0),
    note: assetNoteInput.value.trim(),
    createdAt: new Date().toISOString(),
  };

  if (editingAssetId) {
    assets = assets.map((asset) => (asset.id === editingAssetId ? { ...asset, ...entry } : asset));
  } else {
    assets.unshift(entry);
  }

  assets.sort((a, b) => new Date(b.time) - new Date(a.time));

  editingAssetId = null;
  assetValueInput.value = "";
  assetNoteInput.value = "";
  assetTimeInput.value = toDateInputValue(new Date());
  assetSubmitButton.textContent = "Luu tong tai san";
  saveData();
  render();
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const editableCompany = event.target.closest(".editable-company");
  const editablePrice = event.target.closest(".editable-price");
  const editableLotField = event.target.closest(".editable-lot-date, .editable-lot-price, .editable-lot-quantity");
  const sortLotButton = button?.closest(".sort-lot-btn");
  if (button?.closest(".lot-form") || button?.closest(".sell-form")) return;

  const row =
    button?.closest(".stock-row") ||
    button?.closest(".lots-detail-row") ||
    editableCompany?.closest(".stock-row") ||
    editablePrice?.closest(".stock-row") ||
    editableLotField?.closest(".lots-detail-row") ||
    sortLotButton?.closest(".lots-detail-row") ||
    event.target.closest(".stock-row");
  if (!row) return;
  const stock = stocks.find((item) => item.id === row.dataset.id);
  if (!stock) return;

  if (editableCompany) {
    startInlineEdit(editableCompany, stock, "name");
    return;
  }

  if (editableLotField) {
    startLotInlineEdit(editableLotField, stock);
    return;
  }

  if (sortLotButton) {
    updateLotSort(stock.id, sortLotButton.dataset.sortKey);
    render();
    return;
  }

  if (editablePrice) {
    startInlineEdit(editablePrice, stock, "price");
    return;
  }

  if (button?.classList.contains("star-btn")) {
    stock.starred = !stock.starred;
    saveData();
    render();
    return;
  }

  if (button?.classList.contains("delete-btn")) {
    stocks = stocks.filter((item) => item.id !== stock.id);
    expandedStocks.delete(stock.id);
    delete lotSortState[stock.id];
    if (addingLotStockId === stock.id) addingLotStockId = null;
    saveData();
    render();
    return;
  }

  if (button?.classList.contains("add-lot-btn")) {
    addingLotStockId = addingLotStockId === stock.id ? null : stock.id;
    editingLot = null;
    sellingLot = null;
    expandedStocks.add(stock.id);
    render();
    return;
  }

  if (button?.classList.contains("sell-lot-btn")) {
    sellingLot = { stockId: stock.id, lotId: button.closest(".lot-row").dataset.lotId };
    editingLot = null;
    addingLotStockId = null;
    expandedStocks.add(stock.id);
    render();
    return;
  }

  if (button?.classList.contains("delete-lot-btn")) {
    const lotId = button.closest(".lot-row").dataset.lotId;
    stock.lots = stock.lots.filter((lot) => lot.id !== lotId);
    saveData();
    render();
    return;
  }

  if (!button && row.classList.contains("stock-row") && !event.target.closest("input, select, textarea, a")) {
    if (expandedStocks.has(stock.id)) {
      expandedStocks.delete(stock.id);
    } else {
      expandedStocks.add(stock.id);
    }
    render();
  }
});

tableBody.addEventListener("submit", (event) => {
  const lotForm = event.target.closest(".lot-form");
  const sellForm = event.target.closest(".sell-form");

  if (lotForm) {
    event.preventDefault();
    saveLotFromForm(lotForm);
  }

  if (sellForm) {
    event.preventDefault();
    sellLotFromForm(sellForm);
  }
});

assetsTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const asset = assets.find((item) => item.id === button.dataset.assetId);
  if (!asset) return;

  if (button.classList.contains("edit-asset-btn")) {
    editingAssetId = asset.id;
    assetTimeInput.value = toDateInputValue(new Date(asset.time));
    assetValueInput.value = asset.value || "";
    assetNoteInput.value = asset.note || "";
    assetSubmitButton.textContent = "Cap nhat tong tai san";
    assetValueInput.focus();
    return;
  }

  if (button.classList.contains("delete-asset-btn")) {
    assets = assets.filter((item) => item.id !== button.dataset.assetId);
    saveData();
  }

  render();
});

salesTable.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-sale-btn");
  if (!button) return;

  sales = sales.filter((sale) => sale.id !== button.dataset.saleId);
  saveData();
  render();
});

function saveLotFromForm(lotForm) {
  const stock = stocks.find((item) => item.id === lotForm.dataset.stockId);
  if (!stock) return;

  const quantity = Number(lotForm.querySelector(".lot-quantity-input").value || 0);
  const buyPrice = Number(lotForm.querySelector(".lot-buy-price-input").value || 0);
  const buyDate = lotForm.querySelector(".lot-buy-date-input").value || today();
  if (!quantity || !buyPrice) return;

  if (editingLot?.stockId === stock.id) {
    stock.lots = stock.lots.map((lot) =>
      lot.id === editingLot.lotId ? { ...lot, quantity, buyPrice, buyDate } : lot,
    );
    editingLot = null;
  } else {
    stock.lots.unshift({
      id: createId(),
      quantity,
      buyPrice,
      buyDate,
      createdAt: new Date().toISOString(),
    });
    addingLotStockId = null;
  }

  lotForm.reset();
  saveData();
  render();
}

function sellLotFromForm(sellForm) {
  const stock = stocks.find((item) => item.id === sellForm.dataset.stockId);
  const lot = stock?.lots.find((item) => item.id === sellForm.dataset.lotId);
  if (!stock || !lot) return;

  const sellDate = sellForm.querySelector(".sell-date-input").value || today();
  const sellPrice = Number(sellForm.querySelector(".sell-price-input").value || 0);
  const quantity = Number(sellForm.querySelector(".sell-quantity-input").value || 0);
  if (!sellPrice || !quantity || quantity > lot.quantity) return;

  const result = calculateProfit(quantity, lot.buyPrice, sellPrice);

  sales.unshift({
    id: createId(),
    stockId: stock.id,
    symbol: stock.symbol,
    name: stock.name,
    buyDate: lot.buyDate,
    sellDate,
    quantity,
    buyPrice: lot.buyPrice,
    sellPrice,
    profit: result.profit,
    profitPercent: result.profitPercent,
    createdAt: new Date().toISOString(),
  });

  lot.quantity -= quantity;
  if (lot.quantity <= 0) {
    stock.lots = stock.lots.filter((item) => item.id !== lot.id);
  }

  sellingLot = null;
  activeView = "sales";
  saveData();
  render();
}

async function updatePricesFromFireAnt() {
  refreshPricesButton.disabled = true;
  priceUpdateStatus.textContent = "Dang cap nhat gia tu FireAnt...";

  let updatedCount = 0;
  const errors = [];

  try {
    const prices = await fetchFireAntPrices(stocks);
    stocks.forEach((stock) => {
      const price = prices[getFireAntSymbol(stock)];
      if (Number(price) > 0) {
        stock.price = price;
        stock.updatedAt = new Date().toISOString();
        updatedCount += 1;
      }
    });
  } catch (error) {
    errors.push(error.message);
  }

  refreshPricesButton.disabled = false;

  if (updatedCount > 0) {
    saveData();
    render();
    priceUpdateStatus.textContent = errors.length
      ? `Da cap nhat ${updatedCount}/${stocks.length} ma, ${errors.length} ma loi.`
      : `Da cap nhat ${updatedCount}/${stocks.length} ma.`;
    return;
  }

  priceUpdateStatus.textContent = "Khong cap nhat duoc tu FireAnt. Hay nhap gia thu cong.";
  if (errors.length) {
    console.warn("FireAnt price update failed", errors);
  }
}

async function fetchFireAntPrices(items) {
  const symbols = [...new Set(items.map(getFireAntSymbol))].filter(Boolean);
  if (symbols.length === 0) return {};

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const quote = await fetchFireAntQuote(symbol);
      const price = extractFireAntPrice(quote);
      if (!price) throw new Error(`FireAnt khong co gia ${symbol}`);
      return [symbol, price];
    }),
  );

  return results.reduce((prices, result) => {
    if (result.status === "fulfilled") {
      const [symbol, price] = result.value;
      prices[symbol] = price;
    }
    return prices;
  }, {});
}

async function fetchFireAntQuote(symbol) {
  const response = await fetch(`https://restv2.fireant.vn/symbols/${encodeURIComponent(symbol)}/quote`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`FireAnt tra loi ${response.status} cho ${symbol}`);
  }
  return response.json();
}

function extractFireAntPrice(quote) {
  const source = Array.isArray(quote) ? quote[0] : quote;
  if (!source || typeof source !== "object") return 0;
  return Number(
    source.price ??
      source.lastPrice ??
      source.closePrice ??
      source.matchPrice ??
      source.currentPrice ??
      source.referencePrice ??
      source.basicPrice ??
      0,
  );
}

async function fetchTradingViewPrices(items) {
  const symbols = [...new Set(items.map(getTradingViewSymbol))].filter(Boolean).map((ticker) => ({ s: ticker, d: [] }));
  if (symbols.length === 0) return {};

  const response = await fetch("https://scanner.tradingview.com/vietnam/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbols: { tickers: symbols.map((item) => item.s), query: { types: [] } },
      columns: ["close"],
    }),
  });

  if (!response.ok) {
    throw new Error(`TradingView tráº£ lá»—i ${response.status}`);
  }

  const data = await response.json();
  return (data.data || []).reduce((prices, item) => {
    prices[item.s] = Number(item.d?.[0] || 0);
    return prices;
  }, {});
}

function render() {
  const filteredStocks = getFilteredStocks();
  const portfolioValue = stocks.reduce((total, stock) => total + calculateLotSummary(stock).value, 0);
  tableBody.innerHTML = "";

  filteredStocks.forEach((stock) => {
    const stockColor = getStockColor(stock.symbol);
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.id = stock.id;
    row.classList.add("stock-row");
    row.style.setProperty("--stock-accent", stockColor);

    const summary = calculateLotSummary(stock);
    row.querySelector(".symbol-text").textContent = stock.symbol;
    const companyName = row.querySelector(".company-name");
    companyName.textContent = stock.name;
    companyName.classList.add("editable-company");
    companyName.title = "Báº¥m Ä‘á»ƒ sá»­a tÃªn cÃ´ng ty";
    row.querySelector(".note-line").textContent = stock.note || "Khong co ghi chu";
    row.querySelector(".exchange-cell").textContent = stock.exchange;
    row.querySelector(".quantity-cell").textContent = formatNumber(summary.quantity);
    const avgPriceCell = row.querySelector(".avg-price-cell");
    avgPriceCell.textContent = summary.quantity ? formatNumber(summary.rawCost / summary.quantity) : "-";
    row.querySelector(".price-cell").innerHTML = `
      <strong class="editable-price" title="Báº¥m Ä‘á»ƒ sá»­a giÃ¡ hiá»‡n táº¡i">${formatNumber(stock.price)}</strong>
      <small>${summary.profit >= 0 ? "â–²" : "â–¼"} ${formatPercent(summary.profitPercent)}</small>
    `;
    row.querySelector(".cost-cell").textContent = formatNumber(summary.cost);
    row.querySelector(".value-cell").textContent = formatNumber(summary.value);

    const stockProfitCell = row.querySelector(".stock-profit-cell");
    stockProfitCell.innerHTML = `
      <strong>${formatProfit(summary.profit)}</strong>
      <small>${formatPercent(summary.profitPercent)}</small>
    `;
    stockProfitCell.classList.add(getProfitClass(summary.profit));

    row.querySelector(".allocation-cell").textContent = portfolioValue ? `${((summary.value / portfolioValue) * 100).toFixed(1)}%` : "0%";

    row.classList.add(`status-${stock.status}`);
    row.querySelector(".star-btn").classList.toggle("starred", Boolean(stock.starred));

    row.querySelector(".add-lot-btn").classList.toggle("active", addingLotStockId === stock.id);

    tableBody.append(row);
    if (expandedStocks.has(stock.id)) {
      tableBody.append(createLotsRow(stock, stockColor));
    }
  });

  emptyState.hidden = filteredStocks.length > 0;
  renderSales();
  renderAssets();
  renderHoldingChart();
  renderViews();
  updateMetrics();
}

function createLotsRow(stock, stockColor) {
  const row = document.createElement("tr");
  row.className = "lots-detail-row";
  row.dataset.id = stock.id;
  row.style.setProperty("--stock-accent", stockColor);

  const cell = document.createElement("td");
  cell.colSpan = 11;

  const panel = document.createElement("div");
  panel.className = "lots-panel";

  const summary = calculateLotSummary(stock);
  const header = document.createElement("div");
  header.className = "lots-header";

  const title = document.createElement("strong");
  title.textContent = "Chi tiáº¿t giao dá»‹ch mua";

  const summaryGroup = document.createElement("div");
  summaryGroup.className = "lots-summary";
  const cost = document.createElement("span");
  const value = document.createElement("span");
  const profit = document.createElement("strong");
  cost.textContent = `Von: ${formatNumber(summary.cost)}`;
  value.textContent = `Gia tri: ${formatNumber(summary.value)}`;
  profit.textContent = `${formatProfit(summary.profit)} (${formatPercent(summary.profitPercent)})`;
  profit.className = getProfitClass(summary.profit);
  summaryGroup.append(cost, value, profit);
  header.append(title, summaryGroup);

  const chart = createFireAntChart(stock);
  const shouldShowLotForm = addingLotStockId === stock.id || editingLot?.stockId === stock.id;
  const form = shouldShowLotForm ? createLotForm(stock) : null;
  const lotsList = document.createElement("table");
  lotsList.className = "lots-list";
  const sortState = lotSortState[stock.id] || { key: "buyDate", direction: "desc" };
  lotsList.innerHTML = `
    <thead>
      <tr>
        <th><button class="sort-lot-btn" type="button" data-sort-key="buyDate">NgÃ y mua ${getLotSortMark(sortState, "buyDate")}</button></th>
        <th><button class="sort-lot-btn" type="button" data-sort-key="buyPrice">GiÃ¡ mua ${getLotSortMark(sortState, "buyPrice")}</button></th>
        <th><button class="sort-lot-btn" type="button" data-sort-key="quantity">Sá»‘ lÆ°á»£ng ${getLotSortMark(sortState, "quantity")}</button></th>
        <th><button class="sort-lot-btn" type="button" data-sort-key="cost">GiÃ¡ trá»‹ vá»‘n ${getLotSortMark(sortState, "cost")}</button></th>
        <th><button class="sort-lot-btn" type="button" data-sort-key="currentPrice">GiÃ¡ hiá»‡n táº¡i ${getLotSortMark(sortState, "currentPrice")}</button></th>
        <th><button class="sort-lot-btn" type="button" data-sort-key="currentValue">GiÃ¡ trá»‹ hiá»‡n táº¡i ${getLotSortMark(sortState, "currentValue")}</button></th>
        <th><button class="sort-lot-btn" type="button" data-sort-key="profit">LÃ£i / Lá»— ${getLotSortMark(sortState, "profit")}</button></th>
        <th><button class="sort-lot-btn" type="button" data-sort-key="profitPercent">LÃ£i / Lá»— (%) ${getLotSortMark(sortState, "profitPercent")}</button></th>
        <th>Thao tÃ¡c</th>
      </tr>
    </thead>
  `;
  const lotsBody = document.createElement("tbody");

  if (stock.lots.length === 0) {
    const empty = document.createElement("tr");
    empty.innerHTML = `<td class="lot-empty" colspan="9">ChÆ°a cÃ³ giao dá»‹ch mua nÃ o cho mÃ£ nÃ y.</td>`;
    lotsBody.append(empty);
  } else {
    getSortedLots(stock, sortState).forEach((lot, index) => {
      lotsBody.append(createLotItem(stock, lot, index, stockColor));
      if (sellingLot?.stockId === stock.id && sellingLot.lotId === lot.id) {
        const sellRow = document.createElement("tr");
        const sellCell = document.createElement("td");
        sellCell.colSpan = 9;
        sellCell.append(createSellForm(stock, lot));
        sellRow.append(sellCell);
        lotsBody.append(sellRow);
      }
    });
  }
  lotsList.append(lotsBody);

  panel.append(header);
  panel.append(chart);
  if (form) panel.append(form);
  const addButton = document.createElement("button");
  addButton.className = "add-inline-btn add-lot-btn";
  addButton.type = "button";
  addButton.textContent = "+ ThÃªm giao dá»‹ch mua";
  panel.append(lotsList);
  panel.append(addButton);
  cell.append(panel);
  row.append(cell);

  return row;
}

function createFireAntChart(stock) {
  const wrapper = document.createElement("div");
  wrapper.className = "lot-chart fireant-chart";

  const title = document.createElement("div");
  title.className = "lot-chart-title";
  title.innerHTML = `
    <strong>Bieu do FireAnt</strong>
    <span>${getFireAntSymbol(stock)}</span>
  `;

  const status = document.createElement("div");
  status.className = "fireant-chart-status";
  status.textContent = "Dang tai du lieu FireAnt...";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("fireant-chart-svg");
  svg.setAttribute("viewBox", "0 0 760 260");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Bieu do FireAnt cua ${stock.symbol}`);

  wrapper.append(title, svg, status);
  loadFireAntChart(stock, wrapper, svg, status);
  return wrapper;
}

async function loadFireAntChart(stock, wrapper, svg, status) {
  try {
    const points = await fetchFireAntHistory(getFireAntSymbol(stock));
    if (!points.length) {
      throw new Error("FireAnt khong co du lieu lich su cho ma nay");
    }
    svg.innerHTML = buildFireAntChartSvg(points);
    status.textContent = "Nguon du lieu: FireAnt API";
    wrapper.classList.add("is-loaded");
  } catch (error) {
    svg.innerHTML = `<text x="380" y="132" text-anchor="middle" class="chart-empty-text">Khong tai duoc bieu do FireAnt</text>`;
    status.innerHTML = `
      <span>${error.message || "FireAnt tam thoi khong phan hoi"}.</span>
      <a href="https://fireant.vn/ma-chung-khoan/${encodeURIComponent(getFireAntSymbol(stock))}" target="_blank" rel="noopener noreferrer">Mo FireAnt ${getFireAntSymbol(stock)}</a>
    `;
  }
}

async function fetchFireAntHistory(symbol) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 120);
  const params = new URLSearchParams({
    startDate: formatApiDate(startDate),
    endDate: formatApiDate(endDate),
    offset: "0",
    limit: "240",
  });
  const response = await fetch(`https://restv2.fireant.vn/symbols/${encodeURIComponent(symbol)}/historical-quotes?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`FireAnt tra loi ${response.status}`);
  }
  const data = await response.json();
  return normalizeFireAntHistory(data)
    .filter((item) => item.date && Number(item.close) > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function normalizeFireAntHistory(data) {
  const list = Array.isArray(data) ? data : data?.data || data?.items || data?.quotes || data?.rows || [];
  return list.map((item) => ({
    date: item.date || item.tradingDate || item.time || item.timestamp,
    close: Number(item.closePrice ?? item.close ?? item.priceClose ?? item.price ?? item.lastPrice ?? 0),
    volume: Number(item.volume ?? item.totalVolume ?? item.matchVolume ?? item.tradingVolume ?? 0),
  }));
}

function buildFireAntChartSvg(points) {
  const width = 760;
  const height = 260;
  const padding = { left: 54, right: 20, top: 22, bottom: 54 };
  const prices = points.map((point) => point.close);
  const volumes = points.map((point) => point.volume || 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const maxVolume = Math.max(...volumes, 1);
  const priceSpread = maxPrice - minPrice || 1;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const volumeHeight = 42;
  const step = points.length > 1 ? chartWidth / (points.length - 1) : 0;
  const mapped = points.map((point, index) => ({
    ...point,
    x: points.length > 1 ? padding.left + index * step : padding.left + chartWidth / 2,
    y: padding.top + ((maxPrice - point.close) / priceSpread) * (chartHeight - volumeHeight - 16),
  }));
  const linePath = mapped.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${mapped[mapped.length - 1].x.toFixed(2)} ${height - padding.bottom} L ${mapped[0].x.toFixed(2)} ${height - padding.bottom} Z`;
  const barWidth = Math.max(2, Math.min(10, chartWidth / points.length - 2));
  const bars = mapped
    .map((point) => {
      const barHeight = ((point.volume || 0) / maxVolume) * volumeHeight;
      return `<rect class="fireant-volume-bar" x="${(point.x - barWidth / 2).toFixed(2)}" y="${(height - padding.bottom - barHeight).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="1"></rect>`;
    })
    .join("");
  const labelStep = Math.max(1, Math.ceil(mapped.length / 5));
  const labels = mapped
    .map((point, index) =>
      index % labelStep === 0 || index === mapped.length - 1
        ? `<text class="mini-chart-date" x="${point.x.toFixed(2)}" y="${height - 14}" text-anchor="middle">${formatShortDate(point.date)}</text>`
        : "",
    )
    .join("");
  const last = mapped[mapped.length - 1];

  return `
    <line class="mini-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
    <line class="mini-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
    <path class="fireant-price-area" d="${areaPath}"></path>
    ${bars}
    <path class="mini-price-line" d="${linePath}"></path>
    <circle class="mini-price-dot" cx="${last.x.toFixed(2)}" cy="${last.y.toFixed(2)}" r="4"></circle>
    <text class="asset-chart-label" x="${padding.left + 8}" y="18">${formatNumber(maxPrice)}</text>
    <text class="asset-chart-label" x="${padding.left + 8}" y="${height - padding.bottom - 6}">${formatNumber(minPrice)}</text>
    <text class="asset-chart-label" x="${Math.max(padding.left, last.x - 80).toFixed(2)}" y="${Math.max(18, last.y - 10).toFixed(2)}">${formatNumber(last.close)}</text>
    ${labels}
  `;
}

function formatApiDate(date) {
  return date.toISOString().slice(0, 10);
}

function createTradingViewMiniChart(stock) {
  const wrapper = document.createElement("div");
  wrapper.className = "lot-chart";

  const title = document.createElement("div");
  title.className = "lot-chart-title";
  title.innerHTML = `
    <strong>Biá»ƒu Ä‘á»“ TradingView</strong>
    <span>${getTradingViewSymbol(stock)}</span>
  `;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("lot-mini-chart");
  svg.setAttribute("viewBox", "0 0 720 220");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Biá»ƒu Ä‘á»“ giÃ¡ vÃ  khá»‘i lÆ°á»£ng ${stock.symbol}`);
  svg.innerHTML = buildLotMiniChartSvg(stock);

  const fallback = document.createElement("div");
  fallback.className = "tradingview-fallback";
  fallback.innerHTML = `
    <span>TradingView khÃ´ng cho nhÃºng trá»±c tiáº¿p mÃ£ nÃ y trong widget. Má»Ÿ chart Ä‘áº§y Ä‘á»§:</span>
    <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(getTradingViewSymbol(stock))}" target="_blank" rel="noopener noreferrer">TradingView ${getTradingViewSymbol(stock)}</a>
  `;

  wrapper.append(title, svg, fallback);
  return wrapper;
}

function buildLotMiniChartSvg(stock) {
  const lots = [...stock.lots].sort((a, b) => new Date(a.buyDate) - new Date(b.buyDate));
  if (lots.length === 0) {
    return `<text x="360" y="112" text-anchor="middle" class="chart-empty-text">ChÆ°a cÃ³ giao dá»‹ch mua Ä‘á»ƒ váº½ biá»ƒu Ä‘á»“</text>`;
  }

  const width = 720;
  const height = 220;
  const padding = { left: 44, right: 18, top: 20, bottom: 48 };
  const prices = lots.map((lot) => Number(lot.buyPrice || 0)).concat(Number(stock.price || 0));
  const volumes = lots.map((lot) => Number(lot.quantity || 0));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const maxVolume = Math.max(...volumes, 1);
  const priceSpread = maxPrice - minPrice || 1;
  const step = lots.length > 1 ? (width - padding.left - padding.right) / (lots.length - 1) : 0;
  const points = lots.map((lot, index) => {
    const x = lots.length > 1 ? padding.left + index * step : width / 2;
    const y = height - padding.bottom - ((Number(lot.buyPrice || 0) - minPrice) / priceSpread) * (height - padding.top - padding.bottom);
    return { x, y, lot };
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const bars = points
    .map((point) => {
      const barHeight = (Number(point.lot.quantity || 0) / maxVolume) * 34;
      return `<rect class="mini-volume-bar" x="${point.x - 8}" y="${height - padding.bottom + 8 - barHeight}" width="16" height="${barHeight}" rx="3"></rect>`;
    })
    .join("");
  const labels = points
    .map((point, index) =>
      index % Math.ceil(points.length / 5 || 1) === 0
        ? `<text class="mini-chart-date" x="${point.x}" y="${height - 10}" text-anchor="middle">${formatShortDate(point.lot.buyDate)}</text>`
        : "",
    )
    .join("");
  const dots = points
    .map(
      (point) =>
        `<circle class="mini-price-dot" cx="${point.x}" cy="${point.y}" r="4"><title>${formatDate(point.lot.buyDate)} - GiÃ¡ ${formatNumber(point.lot.buyPrice)} - KL ${formatNumber(point.lot.quantity)}</title></circle>`,
    )
    .join("");

  return `
    <line class="mini-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
    ${bars}
    <path class="mini-price-line" d="${linePath}"></path>
    ${dots}
    <text class="asset-chart-label" x="${padding.left}" y="16">${formatNumber(maxPrice)}</text>
    <text class="asset-chart-label" x="${padding.left}" y="${height - padding.bottom - 4}">${formatNumber(minPrice)}</text>
    ${labels}
  `;
}

function getTradingViewSymbol(stock) {
  const exchange = String(stock.exchange || "HOSE").toUpperCase();
  const symbol = String(stock.symbol || "").toUpperCase();
  if (exchange === "UPCOM") return `UPCOM:${symbol}`;
  return `${exchange}:${symbol}`;
}

function getFireAntSymbol(stock) {
  return String(stock?.symbol || stock || "").trim().toUpperCase();
}

function updateLotSort(stockId, key) {
  const current = lotSortState[stockId] || { key: "buyDate", direction: "desc" };
  lotSortState[stockId] = {
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  };
}

function getLotSortMark(sortState, key) {
  if (sortState.key !== key) return "";
  return sortState.direction === "asc" ? "â–²" : "â–¼";
}

function getSortedLots(stock, sortState) {
  return [...stock.lots].sort((a, b) => {
    const direction = sortState.direction === "asc" ? 1 : -1;
    const aValue = getLotSortValue(stock, a, sortState.key);
    const bValue = getLotSortValue(stock, b, sortState.key);
    if (aValue < bValue) return -1 * direction;
    if (aValue > bValue) return 1 * direction;
    return 0;
  });
}

function getLotSortValue(stock, lot, key) {
  const quantity = Number(lot.quantity || 0);
  const buyPrice = Number(lot.buyPrice || 0);
  const currentPrice = Number(stock.price || 0);
  const result = calculateProfit(quantity, buyPrice, currentPrice);

  if (key === "buyDate") return new Date(lot.buyDate || 0).getTime();
  if (key === "buyPrice") return buyPrice;
  if (key === "quantity") return quantity;
  if (key === "cost") return result.buyTotalWithFee;
  if (key === "currentPrice") return currentPrice;
  if (key === "currentValue") return result.sellTotalAfterFee;
  if (key === "profit") return result.profit;
  if (key === "profitPercent") return result.profitPercent || 0;
  return 0;
}

function startInlineEdit(target, stock, field) {
  if (target.querySelector("input")) return;

  const currentValue = field === "price" ? Number(stock.price || 0) : stock.name;
  const input = document.createElement("input");
  input.className = "inline-edit-input";
  input.value = field === "price" ? currentValue : String(currentValue || "");
  input.type = field === "price" ? "number" : "text";
  if (field === "price") {
    input.min = "0";
    input.step = "0.01";
  }

  const commit = () => {
    const value = input.value.trim();
    if (field === "price") {
      const nextPrice = Number(value || 0);
      if (!Number.isNaN(nextPrice)) {
        stock.price = nextPrice;
      }
    } else if (value) {
      stock.name = value;
    }
    stock.updatedAt = new Date().toISOString();
    saveData();
    render();
  };

  const cancel = () => render();

  target.replaceChildren(input);
  input.focus();
  input.select();
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("blur", commit, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      input.removeEventListener("blur", commit);
      cancel();
    }
  });
}

function startLotInlineEdit(target, stock) {
  const lotRow = target.closest(".lot-row");
  const lot = stock.lots.find((item) => item.id === lotRow?.dataset.lotId);
  if (!lot || target.querySelector("input")) return;

  const field = target.classList.contains("editable-lot-date")
    ? "buyDate"
    : target.classList.contains("editable-lot-price")
      ? "buyPrice"
      : "quantity";
  const input = document.createElement("input");
  input.className = "inline-edit-input";
  input.type = field === "buyDate" ? "date" : "number";
  input.value = field === "buyDate" ? lot.buyDate : lot[field] || "";
  if (field !== "buyDate") {
    input.min = "0";
    input.step = field === "quantity" ? "1" : "0.01";
  }

  const commit = () => {
    const value = input.value.trim();
    if (field === "buyDate") {
      lot.buyDate = value || today();
    } else {
      const nextValue = Number(value || 0);
      if (!Number.isNaN(nextValue)) {
        lot[field] = nextValue;
      }
    }
    saveData();
    render();
  };

  target.replaceChildren(input);
  input.focus();
  input.select();
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("blur", commit, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      input.removeEventListener("blur", commit);
      render();
    }
  });
}

function createLotForm(stock) {
  const lot = editingLot?.stockId === stock.id ? stock.lots.find((item) => item.id === editingLot.lotId) : null;
  const form = document.createElement("form");
  form.className = "lot-form";
  form.dataset.stockId = stock.id;
  form.innerHTML = `
    <label>
      Ngay mua
      <input class="lot-buy-date-input" type="date" value="${lot?.buyDate || today()}" required />
    </label>
    <label>
      So luong
      <input class="lot-quantity-input" type="number" min="0" step="1" placeholder="VD: 100" value="${lot?.quantity || ""}" required />
    </label>
    <label>
      Gia mua
      <input class="lot-buy-price-input" type="number" min="0" step="0.01" placeholder="VD: 25000" value="${lot?.buyPrice || ""}" required />
    </label>
    <button class="secondary-btn" type="submit">${lot ? "Cap nhat muc mua" : "Them muc mua"}</button>
  `;
  return form;
}

function createLotItem(stock, lot, index, stockColor) {
  const currentPrice = Number(stock.price || 0);
  const quantity = Number(lot.quantity || 0);
  const buyPrice = Number(lot.buyPrice || 0);
  const result = calculateProfit(quantity, buyPrice, currentPrice);
  const item = lotTemplate.content.firstElementChild.cloneNode(true);

  item.dataset.lotId = lot.id;
  item.style.setProperty("--stock-accent", stockColor);
  item.querySelector(".lot-date").textContent = formatDate(lot.buyDate);
  item.querySelector(".lot-buy-price").textContent = formatNumber(buyPrice);
  item.querySelector(".lot-quantity").textContent = formatNumber(quantity);
  item.querySelector(".lot-cost").textContent = formatNumber(result.buyTotalWithFee);
  item.querySelector(".lot-current").textContent = formatNumber(currentPrice);
  item.querySelector(".lot-current-value").textContent = formatNumber(result.sellTotalAfterFee);

  const profitCell = item.querySelector(".lot-profit");
  profitCell.textContent = formatProfit(result.profit);
  profitCell.classList.add(getProfitClass(result.profit));

  const profitPercentCell = item.querySelector(".lot-profit-percent");
  profitPercentCell.textContent = formatPercent(result.profitPercent);
  profitPercentCell.classList.add(getProfitClass(result.profit));

  return item;
}

function createSellForm(stock, lot) {
  const form = document.createElement("form");
  form.className = "sell-form";
  form.dataset.stockId = stock.id;
  form.dataset.lotId = lot.id;
  form.innerHTML = `
    <label>
      Ngay ban
      <input class="sell-date-input" type="date" value="${today()}" required />
    </label>
    <label>
      So luong ban
      <input class="sell-quantity-input" type="number" min="1" max="${lot.quantity}" step="1" value="${lot.quantity}" required />
    </label>
    <label>
      Gia ban
      <input class="sell-price-input" type="number" min="0" step="0.01" value="${stock.price || ""}" required />
    </label>
    <button class="secondary-btn" type="submit">Xac nhan ban</button>
  `;
  return form;
}

function renderSales() {
  salesTable.innerHTML = "";

  sales.forEach((sale) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="symbol-cell"></td>
      <td></td>
      <td class="number-cell"></td>
      <td class="number-cell"></td>
      <td class="number-cell"></td>
      <td class="number-cell"></td>
      <td class="number-cell"></td>
      <td class="action-cell"></td>
    `;

    const cells = row.querySelectorAll("td");
    cells[0].textContent = sale.symbol;
    cells[1].textContent = formatDate(sale.sellDate);
    cells[2].textContent = formatNumber(sale.quantity);
    cells[3].textContent = formatNumber(sale.buyPrice);
    cells[4].textContent = formatNumber(sale.sellPrice);
    cells[5].textContent = formatProfit(sale.profit);
    cells[6].textContent = formatPercent(sale.profitPercent);
    cells[5].classList.add(getProfitClass(sale.profit));
    cells[6].classList.add(getProfitClass(sale.profit));

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-btn delete-btn delete-sale-btn";
    deleteButton.type = "button";
    deleteButton.dataset.saleId = sale.id;
    deleteButton.textContent = "Xoa";
    cells[7].append(deleteButton);
    salesTable.append(row);
  });

  salesEmptyState.hidden = sales.length > 0;
}

function renderAssets() {
  assetsTable.innerHTML = "";
  const filteredAssets = getFilteredAssets();
  const sortedAssets = [...filteredAssets].sort((a, b) => new Date(b.time) - new Date(a.time));
  const ascendingAssets = [...filteredAssets].sort((a, b) => new Date(a.time) - new Date(b.time));
  const allAscendingAssets = [...assets].sort((a, b) => new Date(a.time) - new Date(b.time));

  sortedAssets.forEach((asset) => {
    const previousAsset = findPreviousAsset(asset, allAscendingAssets);
    const monthBaseAsset = findMonthBaseAsset(asset, allAscendingAssets);
    const isFixedFirstAssetDate = normalizeAssetDateValue(asset.time) === "2026-05-04";
    const previousProfit = isFixedFirstAssetDate ? 320000 : previousAsset ? asset.value - previousAsset.value : null;
    const monthlyProfit = isFixedFirstAssetDate
      ? 320000
      : monthBaseAsset
        ? asset.value - monthBaseAsset.value
        : previousProfit;
    const row = document.createElement("tr");
    if (isLastAssetOfMonth(asset, allAscendingAssets)) {
      row.classList.add("month-end-row");
    }
    row.innerHTML = `
      <td></td>
      <td class="number-cell"></td>
      <td class="number-cell"></td>
      <td class="number-cell"></td>
      <td></td>
      <td class="action-cell"></td>
    `;

    const cells = row.querySelectorAll("td");
    cells[0].textContent = formatDate(asset.time);
    cells[1].textContent = formatCurrency(asset.value);
    cells[2].textContent = previousProfit === null ? "-" : formatProfit(previousProfit, true);
    cells[3].textContent = monthlyProfit === null ? "-" : formatProfit(monthlyProfit, true);
    cells[4].textContent = asset.note || "-";
    cells[2].classList.add(getProfitClass(previousProfit));
    cells[3].classList.add(getProfitClass(monthlyProfit));

    const editButton = document.createElement("button");
    editButton.className = "icon-btn edit-btn edit-asset-btn";
    editButton.type = "button";
    editButton.dataset.assetId = asset.id;
    editButton.textContent = "Sua";

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-btn delete-btn delete-asset-btn";
    deleteButton.type = "button";
    deleteButton.dataset.assetId = asset.id;
    deleteButton.textContent = "Xoa";
    cells[5].append(editButton, deleteButton);
    assetsTable.append(row);
  });

  const latest = sortedAssets[0];
  latestAssetValue.textContent = latest ? formatCurrency(latest.value) : "-";
  latestAssetTime.textContent = latest ? formatDate(latest.time) : "Chua co du lieu";
  assetsEmptyState.hidden = sortedAssets.length > 0;
  renderAssetLineChart(ascendingAssets);
}

function renderAssetLineChart(sortedAssets) {
  assetLineChart.innerHTML = "";

  if (sortedAssets.length === 0) {
    assetChartRange.textContent = "Chua co du lieu";
    assetLineChart.innerHTML = `<text x="360" y="112" text-anchor="middle" class="chart-empty-text">Chua co du lieu</text>`;
    return;
  }

  const width = 720;
  const height = 220;
  const padding = 28;
  const values = sortedAssets.map((asset) => asset.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const step = sortedAssets.length > 1 ? (width - padding * 2) / (sortedAssets.length - 1) : 0;
  const points = sortedAssets.map((asset, index) => {
    const x = sortedAssets.length > 1 ? padding + index * step : width / 2;
    const y = height - padding - ((asset.value - min) / spread) * (height - padding * 2);
    return { x, y, asset };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  const first = sortedAssets[0];
  const last = sortedAssets[sortedAssets.length - 1];

  assetChartRange.textContent = `${formatDate(first.time)} - ${formatDate(last.time)}`;
  assetLineChart.innerHTML = `
    <path d="${areaPath}" class="asset-chart-area"></path>
    <path d="${path}" class="asset-chart-line"></path>
    ${points
      .map(
        (point) =>
          `<circle class="asset-chart-point" cx="${point.x}" cy="${point.y}" r="4"><title>${formatDate(point.asset.time)}: ${formatCurrency(point.asset.value)}</title></circle>`,
      )
      .join("")}
    <text x="${padding}" y="20" class="asset-chart-label">${formatCurrency(max)}</text>
    <text x="${padding}" y="${height - 8}" class="asset-chart-label">${formatCurrency(min)}</text>
  `;
}

function renderHoldingChart() {
  const latestAsset = [...assets].sort((a, b) => new Date(b.time) - new Date(a.time))[0];
  const latestAssetValue = Number(latestAsset?.value || 0);
  const holdings = stocks
    .map((stock) => {
      const summary = calculateLotSummary(stock);
      return {
        stock,
        quantity: summary.quantity,
        cost: summary.rawCost,
        value: holdingChartMode === "quantity" ? summary.quantity : summary.rawCost,
      };
    })
    .filter((item) => item.value > 0);
  const totalHoldingValue = holdings.reduce((total, item) => total + item.value, 0);
  const circleTotal = holdingChartMode === "cost" && latestAssetValue > 0 ? latestAssetValue : totalHoldingValue;

  holdingLegend.innerHTML = "";
  holdingModeButtons.forEach((button) => button.classList.toggle("active", button.dataset.holdingMode === holdingChartMode));
  holdingChartModeText.textContent = holdingChartMode === "quantity" ? "Theo % so luong" : "Theo % tong tien mua";

  if (!circleTotal) {
    holdingPie.style.background = "#edf2ee";
    const empty = document.createElement("span");
    empty.className = "legend-empty";
    empty.textContent = "Chua co ma dang nam giu.";
    holdingLegend.append(empty);
    return;
  }

  const colors = ["#7c3aed", "#795548", "#64748b", "#be185d", "#6d28d9", "#334155", "#9333ea", "#a21caf"];
  let current = 0;
  const slices = holdings.map((item, index) => {
    const start = current;
    current += (item.value / circleTotal) * 100;
    return `${colors[index % colors.length]} ${start}% ${current}%`;
  });
  if (holdingChartMode === "cost" && latestAssetValue > totalHoldingValue) {
    slices.push(`#edf2ee ${current}% 100%`);
  }

  holdingPie.style.background = `conic-gradient(${slices.join(", ")})`;

  holdings.forEach((item, index) => {
    const percent = (item.value / circleTotal) * 100;
    const detailText =
      holdingChartMode === "quantity"
        ? `${formatNumber(item.quantity)} (${percent.toFixed(1)}%)`
        : `${formatCurrency(item.cost)} (${percent.toFixed(1)}%)`;
    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";
    legendItem.innerHTML = `
      <span class="legend-dot" style="background:${colors[index % colors.length]}"></span>
      <strong>${item.stock.symbol}</strong>
      <span>${detailText}</span>
    `;
    holdingLegend.append(legendItem);
  });

  if (holdingChartMode === "cost" && latestAssetValue > totalHoldingValue) {
    const remaining = latestAssetValue - totalHoldingValue;
    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";
    legendItem.innerHTML = `
      <span class="legend-dot" style="background:#edf2ee"></span>
      <strong>Con lai</strong>
      <span>${formatCurrency(remaining)} (${((remaining / latestAssetValue) * 100).toFixed(1)}%)</span>
    `;
    holdingLegend.append(legendItem);
  }
}

function renderViews() {
  document.querySelectorAll(".side-menu button").forEach((button) => {
    const isNavMatch =
      button.classList.contains("nav-btn") &&
      button.dataset.navView === activeView &&
      (activeView !== "stocks" || button.dataset.navFilter === filterInput.value);
    const isTabMatch = button.classList.contains("tab-btn") && button.dataset.view === activeView;
    button.classList.toggle("active", isNavMatch || isTabMatch);
  });
  tabButtons.forEach((button) => {
    if (button.closest(".side-menu")) return;
    button.classList.toggle("active", button.dataset.view === activeView);
  });
  viewPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `${activeView}View`));
  applySettings();
}

function getFilteredStocks() {
  const query = searchInput.value.trim().toLowerCase();
  const status = filterInput.value;

  return stocks.filter((stock) => {
    const matchesStatus = status === "all" || stock.status === status;
    const lotText = stock.lots.map((lot) => `${lot.quantity} ${lot.buyPrice} ${lot.buyDate}`).join(" ");
    const haystack = `${stock.symbol} ${stock.name} ${stock.exchange} ${stock.sector} ${stock.note} ${lotText}`.toLowerCase();
    return matchesStatus && haystack.includes(query);
  });
}

function getFilteredAssets() {
  const from = assetFromInput.value ? new Date(`${assetFromInput.value}T00:00:00`) : null;
  const to = assetToInput.value ? new Date(`${assetToInput.value}T23:59:59`) : null;

  return assets.filter((asset) => {
    const assetDate = new Date(asset.time);
    return (!from || assetDate >= from) && (!to || assetDate <= to);
  });
}

function updateMetrics() {
  const summaries = stocks.map((stock) => calculateLotSummary(stock));
  const totalCost = summaries.reduce((total, summary) => total + summary.cost, 0);
  const totalValue = summaries.reduce((total, summary) => total + summary.value, 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost ? (totalProfit / totalCost) * 100 : null;
  const latestAsset = [...assets].sort((a, b) => new Date(b.time) - new Date(a.time))[0];
  const totalCapital = Number(latestAsset?.value || totalCost || totalValue || 0);
  const cash = Math.max(totalCapital - totalValue, 0);
  const cashRate = totalCapital ? (cash / totalCapital) * 100 : 0;
  const holdingCount = stocks.filter((stock) => stock.status === "hold").length;
  const watchingCount = stocks.filter((stock) => stock.status === "watching").length;
  const alertCount = stocks.filter((stock) => stock.status === "alert").length;

  setText("#totalStocks", stocks.length);
  setText("#watchingStocks", watchingCount);
  setText("#holdingStocks", holdingCount);
  setText("#alertStocks", alertCount);
  setText("#portfolioCount", holdingCount);
  setText("#watchingCountInline", watchingCount);
  setText("#totalCapitalValue", formatPlainCurrency(totalCapital));
  setText("#currentPortfolioValue", formatPlainCurrency(totalValue));
  setText("#totalProfitValue", formatProfit(totalProfit));
  setText("#totalProfitPercent", formatPercent(totalProfitPercent));
  setText("#capitalCardValue", formatPlainCurrency(totalCapital));
  setText("#valueCardValue", formatPlainCurrency(totalValue));
  setText("#profitCardValue", formatProfit(totalProfit));
  setText("#profitCardPercent", formatPercent(totalProfitPercent));
  setText("#cashRateValue", `${cashRate.toFixed(1)}%`);
  setText("#cashValue", formatCurrency(cash));
  setText("#todayProfitValue", formatProfit(totalProfit));
  setText("#todayProfitPercent", formatPercent(totalProfitPercent));
  setText("#overviewUpdatedAt", latestAsset ? `${formatDate(latestAsset.time)} 08:30` : new Date().toLocaleDateString("vi-VN"));

  document.querySelectorAll("#totalProfitValue, #profitCardValue, #profitCardPercent, #todayProfitValue, #todayProfitPercent").forEach((item) => {
    item.classList.remove("profit-positive", "profit-negative", "profit-neutral");
    item.classList.add(getProfitClass(totalProfit));
  });
  metricFilters.forEach((button) => button.classList.toggle("active", button.dataset.statusFilter === filterInput.value));
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { showAccountMoney: saved.showAccountMoney !== false };
  } catch {
    return { showAccountMoney: true };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
  document.body.classList.toggle("hide-account-money", !settings.showAccountMoney);
  if (moneyVisibilityInput) {
    moneyVisibilityInput.checked = settings.showAccountMoney;
  }
}

function calculateLotSummary(stock) {
  return stock.lots.reduce(
    (summary, lot) => {
      const quantity = Number(lot.quantity || 0);
      const buyPrice = Number(lot.buyPrice || 0);
      const currentPrice = Number(stock.price || 0);
      const result = calculateProfit(quantity, buyPrice, currentPrice);

      summary.quantity += quantity;
      summary.rawCost += quantity * buyPrice;
      summary.cost += result.buyTotalWithFee;
      summary.value += result.sellTotalAfterFee;
      summary.profit += result.profit;
      summary.profitPercent = summary.cost ? (summary.profit / summary.cost) * 100 : null;

      return summary;
    },
    { quantity: 0, rawCost: 0, cost: 0, value: 0, profit: 0, profitPercent: null },
  );
}

function calculateProfit(quantity, buyPrice, currentPrice) {
  const buyTotal = quantity * buyPrice;
  const sellTotal = quantity * currentPrice;
  const buyTotalWithFee = buyTotal + buyTotal * 0.0025;
  const sellTotalAfterFee = sellTotal - sellTotal * 0.00388;
  const profit = sellTotalAfterFee - buyTotalWithFee;
  const profitPercent = buyTotalWithFee ? (profit / buyTotalWithFee) * 100 : null;

  return {
    buyTotalWithFee,
    sellTotalAfterFee,
    profit,
    profitPercent,
  };
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(value)) return "-";
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value))} VNÄ`;
}

function formatPlainCurrency(value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function formatProfit(value, includeCurrency = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  const formatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));
  return `${prefix}${formatted}${includeCurrency ? " VNÄ" : ""}`;
}

function formatPercent(value) {
  if (value === null || Number.isNaN(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  const dateValue = value.includes("T") ? value : `${value}T00:00:00`;
  return new Intl.DateTimeFormat("vi-VN").format(new Date(dateValue));
}

function formatShortDate(value) {
  if (!value) return "-";
  const dateValue = value.includes("T") ? value : `${value}T00:00:00`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(dateValue));
}

function getProfitClass(value) {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "profit-neutral";
  return value > 0 ? "profit-positive" : "profit-negative";
}

function findPreviousAsset(asset, sortedAssets) {
  const index = sortedAssets.findIndex((item) => item.id === asset.id);
  return index > 0 ? sortedAssets[index - 1] : null;
}

function findMonthBaseAsset(asset, sortedAssets) {
  const currentDate = new Date(asset.time);
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const previousAssets = sortedAssets.filter((item) => {
    const itemDate = new Date(item.time);
    return itemDate < monthStart;
  });

  return previousAssets[previousAssets.length - 1] || null;
}

function isLastAssetOfMonth(asset, sortedAssets) {
  const currentDate = new Date(asset.time);
  const monthAssets = sortedAssets.filter((item) => {
    const itemDate = new Date(item.time);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth();
  });
  const lastAsset = monthAssets[monthAssets.length - 1];
  return lastAsset?.id === asset.id;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function normalizeAssetDateValue(value) {
  if (!value) return today();
  return value.includes("T") ? value.slice(0, 10) : value;
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return { stocks: parsed.map(normalizeStock), sales: [], assets: mergeImportedAssets([]) };
      }
      const normalizedAssets = Array.isArray(parsed.assets) ? parsed.assets.map(normalizeAsset) : [];
      return {
        stocks: Array.isArray(parsed.stocks) ? parsed.stocks.map(normalizeStock) : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales.map(normalizeSale) : [],
        assets: parsed.assetImportVersion === ASSET_IMPORT_VERSION ? normalizedAssets : mergeImportedAssets(normalizedAssets),
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return { stocks: getSampleStocks(), sales: [], assets: mergeImportedAssets([]) };
}

function getSampleStocks() {
  return [
    {
      id: createId(),
      symbol: "SSI",
      name: "Cong ty co phan chung khoan SSI",
      exchange: "HOSE",
      sector: "Chung khoan",
      price: 27200,
      status: "hold",
      note: "",
      lots: [
        {
          id: createId(),
          quantity: 100,
          buyPrice: 28550,
          buyDate: "2026-06-10",
          createdAt: new Date().toISOString(),
        },
        {
          id: createId(),
          quantity: 200,
          buyPrice: 27450,
          buyDate: "2026-06-20",
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      symbol: "FPT",
      name: "FPT Corporation",
      exchange: "HOSE",
      sector: "Cong nghe",
      price: 118500,
      status: "watching",
      note: "Theo doi tang truong loi nhuan va hop dong AI.",
      lots: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      symbol: "VCB",
      name: "Vietcombank",
      exchange: "HOSE",
      sector: "Ngan hang",
      price: 92000,
      status: "alert",
      note: "Canh bien lai lai rong va tin tin dung.",
      lots: [],
      updatedAt: new Date().toISOString(),
    },
  ];
}

function normalizeStock(stock) {
  return {
    ...stock,
    price: Number(stock.price || 0),
    status: stock.status || "watching",
    starred: Boolean(stock.starred),
    lots: Array.isArray(stock.lots) ? stock.lots.map(normalizeLot) : [],
  };
}

function normalizeLot(lot) {
  return {
    id: lot.id || createId(),
    quantity: Number(lot.quantity || 0),
    buyPrice: Number(lot.buyPrice || 0),
    buyDate: lot.buyDate || lot.createdAt?.slice(0, 10) || today(),
    createdAt: lot.createdAt || new Date().toISOString(),
  };
}

function normalizeSale(sale) {
  return {
    ...sale,
    id: sale.id || createId(),
    quantity: Number(sale.quantity || 0),
    buyPrice: Number(sale.buyPrice || 0),
    sellPrice: Number(sale.sellPrice || 0),
    profit: Number(sale.profit || 0),
    profitPercent: sale.profitPercent === null ? null : Number(sale.profitPercent || 0),
  };
}

function normalizeAsset(asset) {
  return {
    id: asset.id || createId(),
    time: normalizeAssetDateValue(asset.time || asset.createdAt || today()),
    value: Number(asset.value || 0),
    note: asset.note || "",
    createdAt: asset.createdAt || new Date().toISOString(),
  };
}

function mergeImportedAssets(existingAssets) {
  const existingDates = new Set(existingAssets.map((asset) => asset.time.slice(0, 10)));
  const importedAssets = getImportedAssetHistory().filter((asset) => !existingDates.has(asset.time.slice(0, 10)));
  return [...existingAssets, ...importedAssets]
    .map(normalizeAsset)
    .sort((a, b) => new Date(b.time) - new Date(a.time));
}

function getImportedAssetHistory() {
  const rows = [
    ["2026-05-04", 103400072],
    ["2026-05-05", 102650813],
    ["2026-05-06", 106878656],
    ["2026-05-07", 106336274],
    ["2026-05-08", 106117612],
    ["2026-05-11", 106092415],
    ["2026-05-12", 105734020],
    ["2026-05-13", 105039317],
    ["2026-05-14", 105821543],
    ["2026-05-15", 105263772],
    ["2026-05-18", 105994099],
    ["2026-05-19", 104436208],
    ["2026-05-20", 103123660],
    ["2026-05-21", 102137660],
    ["2026-05-22", 103113380],
    ["2026-05-25", 102640519],
    ["2026-05-26", 104226206],
    ["2026-05-27", 104411497],
    ["2026-05-28", 102576788],
    ["2026-05-29", 102768554],
    ["2026-06-01", 102048406],
    ["2026-06-02", 99949290],
    ["2026-06-03", 100666402],
    ["2026-06-04", 102257973],
    ["2026-06-05", 100909404],
    ["2026-06-08", 98423705],
    ["2026-06-09", 98695087],
    ["2026-06-10", 98406469],
    ["2026-06-11", 97977851],
    ["2026-06-12", 97009233],
    ["2026-06-15", 101333379],
    ["2026-06-16", 103404761],
    ["2026-06-17", 104624927],
    ["2026-06-18", 102880017],
    ["2026-06-19", 101928692],
    ["2026-06-22", 101149289],
    ["2026-06-23", 99514854],
    ["2026-06-24", 99081244],
    ["2026-06-25", 97900995],
    ["2026-06-26", 98080552],
    ["2026-06-29", 97486239],
    ["2026-06-30", 98223868],
    ["2026-07-01", 98640328],
  ];

  return rows.map(([date, value]) => ({
    id: `imported-asset-${date}`,
    time: `${date}T00:00`,
    value,
    note: "",
    createdAt: `${date}T00:00:00.000Z`,
  }));
}

function getStockColor(symbol) {
  const colors = ["#7c3aed", "#795548", "#64748b", "#be185d", "#6d28d9", "#334155", "#9333ea", "#a21caf"];
  const total = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length];
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveData() {
  const data = getAppData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  if (!isApplyingCloudData) {
    scheduleCloudSave();
  }
}

function getAppData() {
  return { stocks, sales, assets, assetImportVersion: ASSET_IMPORT_VERSION };
}

function scheduleCloudSave() {
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => {
    saveDataToCloud().catch((error) => {
      console.warn("Khong luu duoc Google Sheets", error);
    });
  }, 500);
}

async function loadDataFromCloud() {
  if (!GOOGLE_SHEETS_API_URL) return;

  try {
    const cloudData = await loadCloudDataJsonp();

    if (isEmptyCloudData(cloudData)) {
      await saveDataToCloud();
      return;
    }

    isApplyingCloudData = true;
    stocks = Array.isArray(cloudData.stocks) ? cloudData.stocks.map(normalizeStock) : [];
    sales = Array.isArray(cloudData.sales) ? cloudData.sales.map(normalizeSale) : [];
    assets = Array.isArray(cloudData.assets) ? cloudData.assets.map(normalizeAsset) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getAppData()));
    isApplyingCloudData = false;
    render();
  } catch (error) {
    isApplyingCloudData = false;
    console.warn("Khong tai duoc Google Sheets, dang dung du lieu local", error);
  }
}

async function saveDataToCloud() {
  if (!GOOGLE_SHEETS_API_URL) return;

  await fetch(GOOGLE_SHEETS_API_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(getAppData()),
  });
}

function isEmptyCloudData(data) {
  return !data || (!Array.isArray(data.stocks) && !Array.isArray(data.sales) && !Array.isArray(data.assets));
}

function loadCloudDataJsonp() {
  return new Promise((resolve, reject) => {
    const callbackName = `stockDeskCloudCallback_${Date.now()}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data || {});
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Khong tai duoc Google Sheets JSONP"));
    };

    script.src = `${GOOGLE_SHEETS_API_URL}?callback=${callbackName}&t=${Date.now()}`;
    document.body.append(script);
  });
}

render();
loadDataFromCloud();


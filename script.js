const STORAGE_KEY = "stock-desk-items";



const SETTINGS_KEY = "stock-desk-settings";



const ASSET_IMPORT_VERSION = 1;



const SALES_IMPORT_VERSION = 1;

const GOOGLE_SHEETS_API_URL =

  "https://script.google.com/macros/s/AKfycbxL-xGSo45yagueen_Lfct7BST6ITKOxTvQs5ymgx1t5w3L7UxDVZdRcc5L5bDqSGK7/exec";







const statusLabels = {



  watching: "Đang theo dõi",



  hold: "Đang nắm giữ",



  alert: "Cần chú ý",



};







let { stocks, sales, assets } = loadData();



let editingId = null;



let editingLot = null;



let sellingLot = null;



let addingLotStockId = null;



let editingAssetId = null;



let activeView = "stocks";



let selectedAnalysisStockId = null;
let selectedTradeStatsStockId = null;
let loadingTradeStatsSymbol = null;
const tradeStatsCache = new Map();

let tradeCalendarMonthDate = null;

let selectedTradeDate = null;

let cloudSaveTimer = null;

let isApplyingCloudData = false;



let settings = loadSettings();



const expandedStocks = new Set();

const lotSortState = {};

let salesSortState = { key: "sellDate", direction: "desc" };





const form = document.querySelector("#stockForm");



const tableBody = document.querySelector("#stockTable");



const salesTable = document.querySelector("#salesTable");

const monthlySalesProfit = document.querySelector("#monthlySalesProfit");

const salesProfitPie = document.querySelector("#salesProfitPie");

const salesProfitLegend = document.querySelector("#salesProfitLegend");

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



const analysisStockTabs = document.querySelector("#analysisStockTabs");

const analysisChartCard = document.querySelector("#analysisChartCard");

const tradeStatsSymbolSelect = document.querySelector("#tradeStatsSymbolSelect");
const tradeStatsRefreshButton = document.querySelector("#tradeStatsRefreshButton");
const tradeStatsStatus = document.querySelector("#tradeStatsStatus");
const tradeStatsDayVolume = document.querySelector("#tradeStatsDayVolume");
const tradeStatsDayValue = document.querySelector("#tradeStatsDayValue");
const tradeStatsMonthVolume = document.querySelector("#tradeStatsMonthVolume");
const tradeStatsMonthValue = document.querySelector("#tradeStatsMonthValue");
const tradeStatsYearVolume = document.querySelector("#tradeStatsYearVolume");
const tradeStatsYearValue = document.querySelector("#tradeStatsYearValue");
const tradeStatsBarChart = document.querySelector("#tradeStatsBarChart");



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
const quickStatusInput = document.querySelector("#quickStatusInput");

const moneyVisibilityInput = document.querySelector("#moneyVisibilityInput");

const assetVisibilityInput = document.querySelector("#assetVisibilityInput");

const collapsibleToggles = document.querySelectorAll(".collapsible-toggle");

const toolbarSettingsButton = document.querySelector(".toolbar-settings-btn");

const sidebarToggleButton = document.querySelector("#sidebarToggleButton");

const tradeCalendarMonth = document.querySelector("#tradeCalendarMonth");

const tradeCalendarGrid = document.querySelector("#tradeCalendarGrid");

const tradeCalendarDetails = document.querySelector("#tradeCalendarDetails");

const tradeCalendarPrev = document.querySelector("#tradeCalendarPrev");

const tradeCalendarNext = document.querySelector("#tradeCalendarNext");

const tradeCalendarToggle = document.querySelector(".trade-calendar-toggle");





const fields = {



  symbol: document.querySelector("#symbolInput"),



  name: document.querySelector("#nameInput"),



  exchange: document.querySelector("#exchangeInput"),



  sector: document.querySelector("#sectorInput"),



  price: document.querySelector("#priceInput"),



  status: document.querySelector("#statusInput"),
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
    note: currentStock?.note || "",
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



refreshPricesButton.addEventListener("click", updatePricesFromVnstock);







if (sidebarToggleButton) {

  sidebarToggleButton.addEventListener("click", () => {

    document.body.classList.toggle("sidebar-collapsed");

  });

}





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

    if (button.dataset.view === "settings") {
      activeView = activeView === "settings" ? "stocks" : "settings";
      render();
      return;
    }

    activeView = button.dataset.view;

    render();

  });

});



if (tradeStatsSymbolSelect) {
  tradeStatsSymbolSelect.addEventListener("change", () => {
    selectedTradeStatsStockId = tradeStatsSymbolSelect.value;
    renderTradeStats({ force: true });
  });
}

if (tradeStatsRefreshButton) {
  tradeStatsRefreshButton.addEventListener("click", () => renderTradeStats({ force: true }));
}
if (analysisStockTabs) {

  analysisStockTabs.addEventListener("click", (event) => {

    const button = event.target.closest(".analysis-stock-tab");

    if (!button) return;

    selectedAnalysisStockId = button.dataset.stockId;

    renderHoldingChart();

  });

}







collapsibleToggles.forEach((button) => {

  button.addEventListener("click", () => {

    const card = button.closest(".collapsible-card");

    const isOpen = card.classList.toggle("open");

    button.setAttribute("aria-expanded", String(isOpen));

  });

});



if (tradeCalendarToggle) {

  tradeCalendarToggle.addEventListener("click", () => {

    const card = tradeCalendarToggle.closest(".trade-calendar-card");

    const isOpen = card.classList.toggle("open");

    tradeCalendarToggle.setAttribute("aria-expanded", String(isOpen));

  });

}



if (tradeCalendarPrev) {

  tradeCalendarPrev.addEventListener("click", () => shiftTradeCalendarMonth(-1));

}



if (tradeCalendarNext) {

  tradeCalendarNext.addEventListener("click", () => shiftTradeCalendarMonth(1));

}



if (tradeCalendarGrid) {

  tradeCalendarGrid.addEventListener("click", (event) => {

    const button = event.target.closest(".trade-calendar-day");

    if (!button?.dataset.date) return;

    selectedTradeDate = button.dataset.date;

    tradeCalendarMonthDate = createDateFromKey(selectedTradeDate);

    renderTradeCalendar();

  });

}



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



if (assetVisibilityInput) {

  assetVisibilityInput.checked = settings.showAssets;

  assetVisibilityInput.addEventListener("change", () => {

    settings.showAssets = assetVisibilityInput.checked;

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
    note: "",
    lots: [],



    updatedAt: new Date().toISOString(),



  };







  const duplicate = stocks.some((stock) => stock.symbol === data.symbol && stock.exchange === data.exchange);



  if (duplicate) {



    quickSymbolInput.setCustomValidity("Mã này đã có trong danh mục.");



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

  const editableNote = null;

  const editablePrice = event.target.closest(".editable-price");

  const editableLotField = event.target.closest(".editable-lot-date, .editable-lot-price, .editable-lot-quantity");

  const sortLotButton = button?.closest(".sort-lot-btn");



  if (button?.closest(".lot-form") || button?.closest(".sell-form")) return;







  const row =



    button?.closest(".stock-row") ||



    button?.closest(".lots-detail-row") ||



    editableCompany?.closest(".stock-row") ||

    editableNote?.closest(".stock-row") ||

    editablePrice?.closest(".stock-row") ||

    editableLotField?.closest(".lots-detail-row") ||



    sortLotButton?.closest(".lots-detail-row") ||



    event.target.closest(".stock-row");



  if (!row) return;

  const stock = stocks.find((item) => item.id === row.dataset.id);

  if (!stock) return;



  if (event.target.closest(".analysis-symbol-link")) {

    selectedAnalysisStockId = stock.id;

    renderHoldingChart();

    return;

  }







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



const salesHeader = salesTable.closest("table")?.querySelector("thead");

if (salesHeader) {

  salesHeader.addEventListener("click", (event) => {

    const button = event.target.closest(".sort-sale-btn");

    if (!button) return;

    updateSalesSort(button.dataset.sortKey);

    renderSales();

  });

}





function saveLotFromForm(lotForm) {



  const stock = stocks.find((item) => item.id === lotForm.dataset.stockId);



  if (!stock) return;







  const quantity = Number(lotForm.querySelector(".lot-quantity-input").value || 0);



  const buyPrice = Number(lotForm.querySelector(".lot-buy-price-input").value || 0);

  const buyDate = lotForm.querySelector(".lot-buy-date-input").value || today();
  const note = lot?.note || "";
if (!quantity || !buyPrice) return;



  if (editingLot?.stockId === stock.id) {

    stock.lots = stock.lots.map((lot) =>

      lot.id === editingLot.lotId ? { ...lot, quantity, buyPrice, buyDate, note } : lot,

    );

    editingLot = null;



  } else {



    stock.lots.unshift({



      id: createId(),



      quantity,

      buyPrice,

      buyDate,

      note,

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







async function updatePricesFromVnstock() {
  refreshPricesButton.disabled = true;
  priceUpdateStatus.textContent = "Đang cập nhật giá qua vnstock...";

  let updatedCount = 0;
  const errors = [];

  const results = await Promise.allSettled(
    stocks.map(async (stock) => {
      const points = await fetchVnstockHistory(stock, 30);
      const latest = points[points.length - 1];
      if (!latest || !Number(latest.close)) {
        throw new Error(`Không có giá ${stock.symbol}`);
      }
      return { stock, price: Number(latest.close), date: latest.date };
    }),
  );

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      const { stock, price, date } = result.value;
      stock.price = price;
      stock.updatedAt = date ? `${date}T00:00:00.000Z` : new Date().toISOString();
      updatedCount += 1;
    } else {
      errors.push(result.reason?.message || "Không cập nhật được một mã");
    }
  });

  refreshPricesButton.disabled = false;

  if (updatedCount > 0) {
    saveData();
    render();
    priceUpdateStatus.textContent = errors.length
      ? `Đã cập nhật ${updatedCount}/${stocks.length} mã qua vnstock, còn lỗi một số mã.`
      : `Đã cập nhật ${updatedCount}/${stocks.length} mã qua vnstock.`;
    return;
  }

  priceUpdateStatus.textContent = "Không cập nhật được qua vnstock. Hãy nhập giá thủ công.";
  if (errors.length) {
    console.warn("Vnstock price update failed", errors);
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



    throw new Error(`TradingView trả lỗi ${response.status}`);



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

    const symbolText = row.querySelector(".symbol-text");

    symbolText.textContent = stock.symbol;

    symbolText.title = "Bấm để xem biểu đồ giá và khối lượng";

    symbolText.classList.add("analysis-symbol-link");



    const companyName = row.querySelector(".company-name");



    companyName.textContent = stock.name;

    companyName.classList.add("editable-company");

    companyName.title = "Bấm để sửa tên công ty";
row.querySelector(".quantity-cell").textContent = formatNumber(summary.quantity);

    const avgPriceCell = row.querySelector(".avg-price-cell");



    avgPriceCell.textContent = summary.quantity ? formatNumber(summary.rawCost / summary.quantity) : "-";



    row.querySelector(".price-cell").innerHTML = `



      <strong class="editable-price" title="Bấm để sửa giá hiện tại">${formatNumber(stock.price)}</strong>



      <small>${summary.profit >= 0 ? "▲" : "▼"} ${formatPercent(summary.profitPercent)}</small>



    `;



    row.querySelector(".cost-cell").textContent = formatNumber(summary.cost);



    row.querySelector(".value-cell").textContent = formatNumber(summary.value);







    const stockProfitCell = row.querySelector(".stock-profit-cell");



    stockProfitCell.innerHTML = `



      <strong>${formatProfit(summary.profit)}</strong>



      <small>${formatPercent(summary.profitPercent)}</small>



    `;



    stockProfitCell.classList.add(getProfitClass(summary.profit));







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

  renderTradeCalendar();

  renderHoldingChart();

  renderViews();

  updateMetrics();

  renderTradeStats();



}







function createLotsRow(stock, stockColor) {



  const row = document.createElement("tr");



  row.className = "lots-detail-row";



  row.dataset.id = stock.id;



  row.style.setProperty("--stock-accent", stockColor);







  const cell = document.createElement("td");



  cell.colSpan = 9;





  const panel = document.createElement("div");



  panel.className = "lots-panel";







  const summary = calculateLotSummary(stock);



  const header = document.createElement("div");



  header.className = "lots-header";







  const title = document.createElement("strong");



  title.textContent = "Chi tiết giao dịch mua";







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







  const shouldShowLotForm = addingLotStockId === stock.id || editingLot?.stockId === stock.id;

  const form = shouldShowLotForm ? createLotForm(stock) : null;



  const lotsList = document.createElement("table");



  lotsList.className = "lots-list";



  const sortState = lotSortState[stock.id] || { key: "buyDate", direction: "desc" };



  lotsList.innerHTML = `



    <thead>



      <tr>



        <th><button class="sort-lot-btn" type="button" data-sort-key="buyDate">Ngày mua ${getLotSortMark(sortState, "buyDate")}</button></th>



        <th><button class="sort-lot-btn" type="button" data-sort-key="buyPrice">Giá mua ${getLotSortMark(sortState, "buyPrice")}</button></th>



        <th><button class="sort-lot-btn" type="button" data-sort-key="quantity">Số lượng ${getLotSortMark(sortState, "quantity")}</button></th>



        <th><button class="sort-lot-btn" type="button" data-sort-key="cost">Giá trị vốn ${getLotSortMark(sortState, "cost")}</button></th>



        <th><button class="sort-lot-btn" type="button" data-sort-key="currentPrice">Giá hiện tại ${getLotSortMark(sortState, "currentPrice")}</button></th>



        <th><button class="sort-lot-btn" type="button" data-sort-key="currentValue">Giá trị hiện tại ${getLotSortMark(sortState, "currentValue")}</button></th>



        <th><button class="sort-lot-btn" type="button" data-sort-key="profit">Lãi / Lỗ ${getLotSortMark(sortState, "profit")}</button></th>



        <th><button class="sort-lot-btn" type="button" data-sort-key="profitPercent">Lãi / Lỗ (%) ${getLotSortMark(sortState, "profitPercent")}</button></th>
        <th>Thao tác</th>

      </tr>



    </thead>



  `;



  const lotsBody = document.createElement("tbody");







  if (stock.lots.length === 0) {



    const empty = document.createElement("tr");



    empty.innerHTML = `<td class="lot-empty" colspan="9">Chưa có giao dịch mua nào cho mã này.</td>`;

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

  if (form) panel.append(form);

  const addButton = document.createElement("button");



  addButton.className = "add-inline-btn add-lot-btn";



  addButton.type = "button";



  addButton.textContent = "+ Thêm giao dịch mua";



  panel.append(lotsList);



  panel.append(addButton);



  cell.append(panel);



  row.append(cell);







  return row;



}







function createPortfolioAnalysisChart(stock) {
  const wrapper = document.createElement("div");
  wrapper.className = "lot-chart analysis-price-volume-chart";

  const title = document.createElement("div");
  title.className = "lot-chart-title";
  title.innerHTML = `
    <strong>Biểu đồ giá và khối lượng</strong>
    <span>${getVnstockSymbol(stock)} - nguồn vnstock/VNDIRECT</span>
  `;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("fireant-chart-svg");
  svg.setAttribute("viewBox", "0 0 760 260");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Biểu đồ giá và khối lượng của ${stock.symbol}`);
  svg.innerHTML = buildPortfolioAnalysisChartSvg(buildFallbackAnalysisPoints(stock));

  const status = document.createElement("div");
  status.className = "fireant-chart-status";
  status.textContent = "Đang tải dữ liệu vnstock...";

  wrapper.append(title, svg, status);
  loadPortfolioAnalysisChart(stock, svg, status);
  return wrapper;
}

async function loadPortfolioAnalysisChart(stock, svg, status) {
  try {
    const points = await fetchVnstockHistory(stock, 180);
    if (!points.length) {
      throw new Error("vnstock không có dữ liệu lịch sử cho mã này");
    }
    svg.innerHTML = buildPortfolioAnalysisChartSvg(points);
    status.textContent = "Nguồn dữ liệu: vnstock/VNDIRECT API";
  } catch (error) {
    const fallbackPoints = buildFallbackAnalysisPoints(stock);
    svg.innerHTML = buildPortfolioAnalysisChartSvg(fallbackPoints);
    status.textContent = fallbackPoints.length
      ? "Không tải được API, đang vẽ từ dữ liệu mua trong app."
      : "Chưa có dữ liệu để vẽ chart.";
  }
}

async function fetchVnstockHistory(stockOrSymbol, days = 180) {
  const symbol = getVnstockSymbol(stockOrSymbol);
  if (!symbol) return [];

  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const url = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}`;
  const response = await fetch(url, { headers: { Accept: "application/json,text/plain,*/*" } });
  if (!response.ok) {
    throw new Error(`vnstock trả lời ${response.status} cho ${symbol}`);
  }

  const data = await response.json();
  return normalizeVnstockHistory(data)
    .filter((item) => item.date && Number(item.close) > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function normalizeVnstockHistory(data) {
  if (!data || !Array.isArray(data.t)) return [];
  return data.t.map((time, index) => ({
    date: new Date(Number(time) * 1000).toISOString().slice(0, 10),
    close: normalizeVnstockClose(data.c?.[index] ?? data.close?.[index] ?? 0),
    volume: Number(data.v?.[index] ?? data.volume?.[index] ?? 0),
  }));
}

function normalizeVnstockClose(value) {
  const price = Number(value || 0);
  return price > 0 && price < 1000 ? price * 1000 : price;
}

function buildFallbackAnalysisPoints(stock) {
  const lots = Array.isArray(stock?.lots) ? [...stock.lots] : [];
  const points = lots
    .filter((lot) => Number(lot.buyPrice) > 0 || Number(lot.quantity) > 0)
    .map((lot) => ({
      date: normalizeAssetDateValue(lot.buyDate) || today(),
      close: Number(lot.buyPrice || stock.price || 0),
      volume: Number(lot.quantity || 0),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (Number(stock?.price) > 0) {
    points.push({ date: today(), close: Number(stock.price), volume: 0 });
  }

  return points;
}

function buildPortfolioAnalysisChartSvg(points) {
  if (!points.length) {
    return `<text x="380" y="132" text-anchor="middle" class="chart-empty-text">Chưa có dữ liệu để vẽ chart</text>`;
  }

  const width = 760;
  const height = 260;
  const padding = { left: 58, right: 24, top: 24, bottom: 54 };
  const priceAreaHeight = 132;
  const volumeHeight = 46;
  const chartWidth = width - padding.left - padding.right;
  const prices = points.map((point) => Number(point.close || 0));
  const volumes = points.map((point) => Number(point.volume || 0));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const maxVolume = Math.max(...volumes, 1);
  const priceSpread = maxPrice - minPrice || 1;
  const step = points.length > 1 ? chartWidth / (points.length - 1) : 0;
  const volumeBaseY = height - padding.bottom;

  const mapped = points.map((point, index) => ({
    ...point,
    x: points.length > 1 ? padding.left + index * step : padding.left + chartWidth / 2,
    y: padding.top + ((maxPrice - Number(point.close || 0)) / priceSpread) * priceAreaHeight,
  }));

  const linePath = mapped.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${mapped[mapped.length - 1].x.toFixed(2)} ${volumeBaseY.toFixed(2)} L ${mapped[0].x.toFixed(2)} ${volumeBaseY.toFixed(2)} Z`;
  const barWidth = Math.max(3, Math.min(12, chartWidth / Math.max(points.length, 1) - 2));
  const bars = mapped
    .map((point) => {
      const barHeight = (Number(point.volume || 0) / maxVolume) * volumeHeight;
      return `<rect class="fireant-volume-bar" x="${(point.x - barWidth / 2).toFixed(2)}" y="${(volumeBaseY - barHeight).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="2"><title>${formatShortDate(point.date)} - KL ${formatNumber(point.volume)}</title></rect>`;
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
  const dots = mapped
    .map((point) => `<circle class="mini-price-dot" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3.5"><title>${formatShortDate(point.date)} - Giá ${formatNumber(point.close)}</title></circle>`)
    .join("");
  const last = mapped[mapped.length - 1];

  return `
    <line class="mini-axis" x1="${padding.left}" y1="${volumeBaseY}" x2="${width - padding.right}" y2="${volumeBaseY}"></line>
    <line class="mini-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${volumeBaseY}"></line>
    <path class="fireant-price-area" d="${areaPath}"></path>
    ${bars}
    <path class="mini-price-line" d="${linePath}"></path>
    ${dots}
    <circle class="mini-price-dot" cx="${last.x.toFixed(2)}" cy="${last.y.toFixed(2)}" r="5"></circle>
    <text class="asset-chart-label" x="${padding.left + 8}" y="18">${formatNumber(maxPrice)}</text>
    <text class="asset-chart-label" x="${padding.left + 8}" y="${volumeBaseY - 6}">${formatNumber(minPrice)}</text>
    <text class="asset-chart-label" x="${Math.max(padding.left, last.x - 90).toFixed(2)}" y="${Math.max(18, last.y - 10).toFixed(2)}">${formatNumber(last.close)}</text>
    ${labels}
  `;
}

function getVnstockSymbol(stock) {
  return String(stock?.symbol || stock || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function renderTradeStats(options = {}) {
  if (!tradeStatsSymbolSelect || !tradeStatsStatus) return;

  const currentValue = selectedTradeStatsStockId || tradeStatsSymbolSelect.value;
  tradeStatsSymbolSelect.innerHTML = stocks
    .map((stock) => `<option value="${stock.id}">${stock.symbol}</option>`)
    .join("");

  if (stocks.length === 0) {
    selectedTradeStatsStockId = null;
    clearTradeStats("Chưa có mã để thống kê.");
    return;
  }

  if (currentValue && stocks.some((stock) => stock.id === currentValue)) {
    selectedTradeStatsStockId = currentValue;
  } else if (!selectedTradeStatsStockId || !stocks.some((stock) => stock.id === selectedTradeStatsStockId)) {
    selectedTradeStatsStockId = stocks[0].id;
  }

  tradeStatsSymbolSelect.value = selectedTradeStatsStockId;
  const stock = stocks.find((item) => item.id === selectedTradeStatsStockId);
  const symbol = getVnstockSymbol(stock);

  if (!symbol) {
    clearTradeStats("Mã không hợp lệ.");
    return;
  }

  if (!options.force && tradeStatsCache.has(symbol)) {
    renderTradeStatsData(symbol, tradeStatsCache.get(symbol));
    return;
  }

  if (loadingTradeStatsSymbol === symbol) {
    tradeStatsStatus.textContent = `Đang tải dữ liệu VNDIRECT cho ${symbol}...`;
    return;
  }

  loadingTradeStatsSymbol = symbol;
  clearTradeStats(`Đang tải dữ liệu VNDIRECT cho ${symbol}...`);
  loadTradeStatsData(stock)
    .then((data) => {
      tradeStatsCache.set(symbol, data);
      loadingTradeStatsSymbol = null;
      renderTradeStatsData(symbol, data);
    })
    .catch((error) => {
      loadingTradeStatsSymbol = null;
      console.warn("Khong tai duoc thong ke giao dich VNDIRECT", error);
      clearTradeStats(`Không tải được dữ liệu VNDIRECT cho ${symbol}.`);
    });
}

async function loadTradeStatsData(stock) {
  const points = await fetchVnstockHistory(stock, 370);
  return summarizeTradeStats(points);
}

function summarizeTradeStats(points) {
  const validPoints = points.filter((point) => point.date && Number(point.volume) > 0 && Number(point.close) > 0);
  if (!validPoints.length) return null;

  const latest = validPoints[validPoints.length - 1];
  const latestMonth = latest.date.slice(0, 7);
  const latestYear = latest.date.slice(0, 4);
  const sumPoints = (items) =>
    items.reduce(
      (total, point) => {
        const volume = Number(point.volume || 0);
        total.volume += volume;
        total.value += volume * Number(point.close || 0);
        return total;
      },
      { volume: 0, value: 0 },
    );

  return {
    latestDate: latest.date,
    latestMonth,
    latestYear,
    day: sumPoints([latest]),
    month: sumPoints(validPoints.filter((point) => point.date.slice(0, 7) === latestMonth)),
    year: sumPoints(validPoints.filter((point) => point.date.slice(0, 4) === latestYear)),
    recent: validPoints.slice(-18).map((point) => {
      const volume = Number(point.volume || 0);
      return {
        date: point.date,
        volume,
        value: volume * Number(point.close || 0),
      };
    }),
  };
}

function renderTradeStatsData(symbol, data) {
  if (!data) {
    clearTradeStats(`VNDIRECT chưa có dữ liệu giao dịch cho ${symbol}.`);
    return;
  }

  tradeStatsStatus.textContent = `Nguồn VNDIRECT: ${symbol}, phiên ${formatDate(data.latestDate)}`;
  tradeStatsDayVolume.textContent = formatNumber(data.day.volume);
  tradeStatsDayValue.textContent = formatCurrency(data.day.value);
  tradeStatsMonthVolume.textContent = formatNumber(data.month.volume);
  tradeStatsMonthValue.textContent = `${formatCurrency(data.month.value)} / ${data.latestMonth}`;
  tradeStatsYearVolume.textContent = formatNumber(data.year.volume);
  tradeStatsYearValue.textContent = `${formatCurrency(data.year.value)} / ${data.latestYear}`;
  if (tradeStatsBarChart) {
    tradeStatsBarChart.innerHTML = buildTradeStatsBarChartSvg(data.recent || []);
  }
}

function clearTradeStats(message) {
  if (tradeStatsStatus) tradeStatsStatus.textContent = message;
  [tradeStatsDayVolume, tradeStatsMonthVolume, tradeStatsYearVolume].forEach((node) => {
    if (node) node.textContent = "-";
  });
  [tradeStatsDayValue, tradeStatsMonthValue, tradeStatsYearValue].forEach((node) => {
    if (node) node.textContent = "-";
  });
  if (tradeStatsBarChart) {
    tradeStatsBarChart.innerHTML = `<text x="160" y="94" text-anchor="middle" class="chart-empty-text">Chưa có dữ liệu</text>`;
  }
}

function buildTradeStatsBarChartSvg(points) {
  if (!points.length) {
    return `<text x="160" y="94" text-anchor="middle" class="chart-empty-text">Chưa có dữ liệu</text>`;
  }

  const width = 320;
  const height = 180;
  const padding = { left: 34, right: 14, top: 24, bottom: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxVolume = Math.max(...points.map((point) => point.volume), 1);
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const groupWidth = chartWidth / points.length;
  const barWidth = Math.max(3, Math.min(8, groupWidth / 3));

  const bars = points
    .map((point, index) => {
      const x = padding.left + index * groupWidth + groupWidth / 2;
      const volumeHeight = (point.volume / maxVolume) * chartHeight;
      const valueHeight = (point.value / maxValue) * chartHeight;
      const showLabel = index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 4) === 0;
      return `
        <rect class="trade-volume-bar" x="${(x - barWidth - 1).toFixed(2)}" y="${(height - padding.bottom - volumeHeight).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${volumeHeight.toFixed(2)}" rx="2">
          <title>${formatShortDate(point.date)} - KL ${formatNumber(point.volume)}</title>
        </rect>
        <rect class="trade-value-bar" x="${(x + 1).toFixed(2)}" y="${(height - padding.bottom - valueHeight).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${valueHeight.toFixed(2)}" rx="2">
          <title>${formatShortDate(point.date)} - GT ${formatCurrency(point.value)}</title>
        </rect>
        ${showLabel ? `<text class="mini-chart-date" x="${x.toFixed(2)}" y="${height - 10}" text-anchor="middle">${formatShortDate(point.date)}</text>` : ""}
      `;
    })
    .join("");

  return `
    <line class="mini-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
    <line class="mini-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
    <text class="asset-chart-label" x="${padding.left + 4}" y="16">${formatNumber(maxVolume)}</text>
    <g class="trade-stats-legend">
      <rect class="trade-volume-bar" x="188" y="8" width="8" height="8" rx="2"></rect>
      <text x="200" y="16">Khối lượng</text>
      <rect class="trade-value-bar" x="258" y="8" width="8" height="8" rx="2"></rect>
      <text x="270" y="16">Giá trị</text>
    </g>
    ${bars}
  `;
}
function createFireAntChart(stock) {



  const wrapper = document.createElement("div");



  wrapper.className = "lot-chart fireant-chart";







  const title = document.createElement("div");



  title.className = "lot-chart-title";



  title.innerHTML = `



    <strong>Biểu đồ FireAnt</strong>

    <span>${getFireAntSymbol(stock)}</span>



  `;







  const status = document.createElement("div");



  status.className = "fireant-chart-status";



  status.textContent = "Dang tai du lieu FireAnt...";







  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");



  svg.classList.add("fireant-chart-svg");



  svg.setAttribute("viewBox", "0 0 760 260");



  svg.setAttribute("role", "img");



  svg.setAttribute("aria-label", `Biểu đồ FireAnt của ${stock.symbol}`);





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



    <strong>Biểu đồ TradingView</strong>



    <span>${getTradingViewSymbol(stock)}</span>



  `;







  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");



  svg.classList.add("lot-mini-chart");



  svg.setAttribute("viewBox", "0 0 720 220");



  svg.setAttribute("role", "img");



  svg.setAttribute("aria-label", `Biểu đồ giá và khối lượng ${stock.symbol}`);



  svg.innerHTML = buildLotMiniChartSvg(stock);







  const fallback = document.createElement("div");



  fallback.className = "tradingview-fallback";



  fallback.innerHTML = `



    <span>TradingView không cho nhúng trực tiếp mã này trong widget. Mở chart đầy đủ:</span>



    <a href="https://www.tradingview.com/chart/?symbol=${encodeURIComponent(getTradingViewSymbol(stock))}" target="_blank" rel="noopener noreferrer">TradingView ${getTradingViewSymbol(stock)}</a>



  `;







  wrapper.append(title, svg, fallback);



  return wrapper;



}







function buildLotMiniChartSvg(stock) {



  const lots = [...stock.lots].sort((a, b) => new Date(a.buyDate) - new Date(b.buyDate));



  if (lots.length === 0) {



    return `<text x="360" y="112" text-anchor="middle" class="chart-empty-text">Chưa có giao dịch mua để vẽ biểu đồ</text>`;



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



        `<circle class="mini-price-dot" cx="${point.x}" cy="${point.y}" r="4"><title>${formatDate(point.lot.buyDate)} - Giá ${formatNumber(point.lot.buyPrice)} - KL ${formatNumber(point.lot.quantity)}</title></circle>`,



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



  return sortState.direction === "asc" ? "▲" : "▼";



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

  if (key === "note") return String(lot.note || "").toLowerCase();

  return 0;

}



function updateSalesSort(key) {

  salesSortState = {

    key,

    direction: salesSortState.key === key && salesSortState.direction === "asc" ? "desc" : "asc",

  };

}



function getSalesSortMark(key) {

  if (salesSortState.key !== key) return "";

  return salesSortState.direction === "asc" ? " ▲" : " ▼";

}



function getSortedSales() {

  return [...sales].sort((a, b) => {

    const direction = salesSortState.direction === "asc" ? 1 : -1;

    const aValue = getSaleSortValue(a, salesSortState.key);

    const bValue = getSaleSortValue(b, salesSortState.key);

    if (aValue < bValue) return -1 * direction;

    if (aValue > bValue) return 1 * direction;

    return 0;

  });

}



function getSaleSortValue(sale, key) {

  if (key === "symbol") return String(sale.symbol || "").toLowerCase();

  if (key === "sellDate") return new Date(sale.sellDate || 0).getTime();

  if (key === "quantity") return Number(sale.quantity || 0);

  if (key === "buyPrice") return Number(sale.buyPrice || 0);

  if (key === "sellPrice") return Number(sale.sellPrice || 0);

  if (key === "profit") return Number(sale.profit || 0);

  if (key === "profitPercent") return Number(sale.profitPercent || 0);

  return 0;

}



function startInlineEdit(target, stock, field) {

  if (target.querySelector("input")) return;







  const currentValue = field === "price" ? Number(stock.price || 0) : field === "note" ? stock.note || "" : stock.name;

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



    } else if (field === "note") {

      stock.note = value;

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

  renderSalesSummary();



  salesTable

    .closest("table")

    ?.querySelectorAll(".sort-sale-btn")

    .forEach((button) => {

      button.textContent = `${button.dataset.label || button.textContent.replace(/[ ▲▼]+$/, "")}${getSalesSortMark(button.dataset.sortKey)}`;

      button.dataset.label = button.textContent.replace(/[ ▲▼]+$/, "");

    });



  getSortedSales().forEach((sale) => {

    const row = document.createElement("tr");

    row.style.setProperty("--stock-accent", getStockColor(sale.symbol || ""));

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



function renderSalesSummary() {

  renderMonthlySalesProfit();

  renderSalesProfitPie();

}



function renderMonthlySalesProfit() {

  if (!monthlySalesProfit) return;



  const monthTotals = sales.reduce((groups, sale) => {

    const date = createDateFromKey(sale.sellDate);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const current = groups.get(key) || { key, total: 0, quantity: 0 };

    current.total += Number(sale.profit || 0);

    current.quantity += Number(sale.quantity || 0);

    groups.set(key, current);

    return groups;

  }, new Map());



  const rows = [...monthTotals.values()].sort((a, b) => (a.key < b.key ? 1 : -1));

  if (!rows.length) {

    monthlySalesProfit.innerHTML = '<span class="summary-empty">Chưa có dữ liệu bán.</span>';

    return;

  }



  monthlySalesProfit.innerHTML = rows

    .map((row) => {

      const [year, month] = row.key.split("-");

      return `

        <div class="monthly-profit-row">

          <span>Tháng ${Number(month)}/${year}</span>

          <strong class="${getProfitClass(row.total)}">${formatProfit(row.total)}</strong>

          <small>${formatNumber(row.quantity)} CP</small>

        </div>

      `;

    })

    .join("");

}



function renderSalesProfitPie() {

  if (!salesProfitPie || !salesProfitLegend) return;



  const totals = sales.reduce((groups, sale) => {

    const symbol = sale.symbol || "Khác";

    groups.set(symbol, (groups.get(symbol) || 0) + Number(sale.profit || 0));

    return groups;

  }, new Map());

  const items = [...totals.entries()]

    .map(([symbol, profit]) => ({ symbol, profit }))

    .filter((item) => item.profit > 0)

    .sort((a, b) => b.profit - a.profit);

  const totalProfit = items.reduce((total, item) => total + item.profit, 0);



  if (!items.length || totalProfit <= 0) {

    salesProfitPie.style.background = "#edf2ee";

    salesProfitLegend.innerHTML = '<span class="summary-empty">Chưa có lợi nhuận bán.</span>';

    return;

  }



  let cursor = 0;

  const segments = items.map((item) => {

    const start = cursor;

    const end = start + (item.profit / totalProfit) * 100;

    cursor = end;

    return `${getStockColor(item.symbol)} ${start}% ${end}%`;

  });

  salesProfitPie.style.background = `conic-gradient(${segments.join(", ")})`;

  salesProfitLegend.innerHTML = items

    .map((item) => {

      const percent = (item.profit / totalProfit) * 100;

      return `

        <div class="sales-profit-legend-row">

          <span class="legend-dot" style="background:${getStockColor(item.symbol)}"></span>

          <strong>${item.symbol}</strong>

          <span>${formatProfit(item.profit)} (${percent.toFixed(1)}%)</span>

        </div>

      `;

    })

    .join("");

}



function renderTradeCalendar() {

  if (!tradeCalendarGrid || !tradeCalendarMonth || !tradeCalendarDetails) return;



  const trades = getCalendarTrades();

  const groupedTrades = trades.reduce((groups, trade) => {

    if (!groups.has(trade.date)) groups.set(trade.date, []);

    groups.get(trade.date).push(trade);

    return groups;

  }, new Map());



  if (!selectedTradeDate) {

    selectedTradeDate = trades[0]?.date || today();

  }

  if (!tradeCalendarMonthDate) {

    tradeCalendarMonthDate = createDateFromKey(selectedTradeDate);

  }



  const year = tradeCalendarMonthDate.getFullYear();

  const month = tradeCalendarMonthDate.getMonth();

  const monthStart = new Date(year, month, 1);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const leadingBlankDays = (monthStart.getDay() + 6) % 7;

  tradeCalendarMonth.textContent = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(monthStart);

  tradeCalendarGrid.innerHTML = "";



  for (let index = 0; index < leadingBlankDays; index += 1) {

    const blank = document.createElement("span");

    blank.className = "trade-calendar-blank";

    tradeCalendarGrid.append(blank);

  }



  for (let day = 1; day <= daysInMonth; day += 1) {

    const date = new Date(year, month, day);

    const dateKey = toDateKey(date);

    const dayTrades = groupedTrades.get(dateKey) || [];

    const dayProfit = dayTrades.reduce((total, trade) => total + trade.profit, 0);

    const button = document.createElement("button");

    button.className = "trade-calendar-day";

    button.type = "button";

    button.dataset.date = dateKey;

    button.classList.toggle("has-trade", dayTrades.length > 0);

    button.classList.toggle("selected", selectedTradeDate === dateKey);

    if (dayTrades.length) button.classList.add(getProfitClass(dayProfit));

    button.innerHTML = `

      <span>${day}</span>

      ${dayTrades.length ? `<small>${dayTrades.length} GD</small>` : ""}

    `;

    tradeCalendarGrid.append(button);

  }



  renderTradeCalendarDetails(groupedTrades.get(selectedTradeDate) || []);

}



function renderTradeCalendarDetails(dayTrades) {

  if (!dayTrades.length) {

    tradeCalendarDetails.innerHTML = `

      <strong>${formatDate(selectedTradeDate)}</strong>

      <span class="trade-empty">Không có giao dịch mua trong ngày này.</span>

    `;

    return;

  }



  const totalQuantity = dayTrades.reduce((total, trade) => total + trade.quantity, 0);

  const totalProfit = dayTrades.reduce((total, trade) => total + trade.profit, 0);

  const items = dayTrades

    .map(

      (trade) => `

        <li>

          <div>

            <strong>${trade.symbol}</strong>

          </div>

          <div>

            <span>Giá mua</span>

            <strong>${formatNumber(trade.buyPrice)}</strong>

          </div>

          <div>

            <span>Khối lượng</span>

            <strong>${formatNumber(trade.quantity)}</strong>

          </div>

          <div class="${getProfitClass(trade.profit)}">

            <span>Lời/lỗ</span>

            <strong>${formatProfit(trade.profit)}</strong>

          </div>

        </li>

      `,

    )

    .join("");



  tradeCalendarDetails.innerHTML = `

    <div class="trade-detail-head">

      <strong>${formatDate(selectedTradeDate)}</strong>

      <span>${formatNumber(totalQuantity)} CP · ${formatProfit(totalProfit)}</span>

    </div>

    <ul>${items}</ul>

  `;

}



function getCalendarTrades() {

  return stocks

    .flatMap((stock) =>

      stock.lots.map((lot) => {

        const quantity = Number(lot.quantity || 0);

        const buyPrice = Number(lot.buyPrice || 0);

        const result = calculateProfit(quantity, buyPrice, Number(stock.price || 0));

        return {

          date: normalizeAssetDateValue(lot.buyDate),

          symbol: stock.symbol,

          name: stock.name,

          quantity,

          buyPrice,

          profit: result.profit,

        };

      }),

    )

    .filter((trade) => trade.date && trade.quantity > 0)

    .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`));

}



function shiftTradeCalendarMonth(delta) {

  if (!tradeCalendarMonthDate) {

    tradeCalendarMonthDate = createDateFromKey(selectedTradeDate || today());

  }

  tradeCalendarMonthDate = new Date(tradeCalendarMonthDate.getFullYear(), tradeCalendarMonthDate.getMonth() + delta, 1);

  const monthTrade = getCalendarTrades().find((trade) => {

    const tradeDate = createDateFromKey(trade.date);

    return tradeDate.getFullYear() === tradeCalendarMonthDate.getFullYear() && tradeDate.getMonth() === tradeCalendarMonthDate.getMonth();

  });

  selectedTradeDate = monthTrade?.date || toDateKey(tradeCalendarMonthDate);

  renderTradeCalendar();

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

  if (!analysisChartCard || !analysisStockTabs) return;



  if (stocks.length === 0) {

    analysisStockTabs.innerHTML = "";

    analysisChartCard.innerHTML = `<div class="analysis-chart-empty">Chưa có mã cổ phiếu để vẽ chart.</div>`;

    return;

  }



  if (!selectedAnalysisStockId || !stocks.some((stock) => stock.id === selectedAnalysisStockId)) {

    selectedAnalysisStockId = stocks[0].id;

  }



  analysisStockTabs.innerHTML = stocks

    .map(

      (stock) => `

        <button class="analysis-stock-tab ${stock.id === selectedAnalysisStockId ? "active" : ""}" type="button" data-stock-id="${stock.id}">

          ${stock.symbol}

        </button>

      `,

    )

    .join("");



  const selectedStock = stocks.find((stock) => stock.id === selectedAnalysisStockId);

  analysisChartCard.innerHTML = "";

  analysisChartCard.append(createPortfolioAnalysisChart(selectedStock));

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



  const holdingCount = stocks.filter((stock) => stock.status === "hold").length;

  const watchingCount = stocks.filter((stock) => stock.status === "watching").length;



  const alertCount = stocks.filter((stock) => stock.status === "alert").length;







  setText("#totalStocks", stocks.length);



  setText("#watchingStocks", watchingCount);



  setText("#holdingStocks", holdingCount);



  setText("#alertStocks", alertCount);



  setText("#portfolioCount", holdingCount);



  setText("#watchingCountInline", watchingCount);



  setText("#capitalCardValue", formatPlainCurrency(totalCapital));

  setText("#valueCardValue", formatPlainCurrency(totalValue));

  setText("#profitCardValue", formatProfit(totalProfit));

  setText("#profitCardPercent", formatPercent(totalProfitPercent));



  document.querySelectorAll("#profitCardValue, #profitCardPercent").forEach((item) => {

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

    return {

      showAccountMoney: saved.showAccountMoney !== false,

      showAssets: saved.showAssets !== false,

    };

  } catch {

    return { showAccountMoney: true, showAssets: true };

  }

}





function saveSettings() {



  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));



}







function applySettings() {

  document.body.classList.toggle("hide-account-money", !settings.showAccountMoney);

  document.body.classList.toggle("hide-asset-summary", !settings.showAssets);

  if (moneyVisibilityInput) {

    moneyVisibilityInput.checked = settings.showAccountMoney;

  }

  if (assetVisibilityInput) {

    assetVisibilityInput.checked = settings.showAssets;

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



  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value))} VN\u0110`;

}







function formatPlainCurrency(value) {



  if (value === null || value === undefined || value === "" || Number.isNaN(value)) return "-";



  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));



}







function formatProfit(value, includeCurrency = false) {



  if (value === null || value === undefined || Number.isNaN(value)) return "-";



  const prefix = value > 0 ? "+" : "";



  const formatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));



  return `${prefix}${formatted}${includeCurrency ? " VN\u0110" : ""}`;

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



function toDateKey(date) {

  return toDateInputValue(date);

}



function createDateFromKey(value) {

  return new Date(`${value || today()}T00:00:00`);

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

        return { stocks: parsed.map(normalizeStock), sales: mergeImportedSales([]), assets: mergeImportedAssets([]) };

      }

      const normalizedAssets = Array.isArray(parsed.assets) ? parsed.assets.map(normalizeAsset) : [];

      const normalizedSales = Array.isArray(parsed.sales) ? parsed.sales.map(normalizeSale) : [];

      return {

        stocks: Array.isArray(parsed.stocks) ? parsed.stocks.map(normalizeStock) : [],

        sales: parsed.salesImportVersion === SALES_IMPORT_VERSION ? normalizedSales : mergeImportedSales(normalizedSales),

        assets: parsed.assetImportVersion === ASSET_IMPORT_VERSION ? normalizedAssets : mergeImportedAssets(normalizedAssets),

      };

    } catch {



      localStorage.removeItem(STORAGE_KEY);



    }



  }







  return { stocks: getSampleStocks(), sales: mergeImportedSales([]), assets: mergeImportedAssets([]) };

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

    note: lot.note || "",

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



function mergeImportedSales(existingSales) {

  const existingIds = new Set(existingSales.map((sale) => sale.id));

  const importedSales = getImportedSales().filter((sale) => !existingIds.has(sale.id));

  return [...importedSales, ...existingSales].map(normalizeSale);

}



function getImportedSales() {

  const rows = [

    ["2026-04-08", "SSI", 26950, 28700, 200, 350000, 6.49],

    ["2026-04-08", "SSI", 27250, 28700, 300, 435000, 5.32],

    ["2026-04-08", "SSI", 27850, 29250, 200, 240000, 4.31],

    ["2026-04-08", "SSI", 27850, 29250, 100, 140000, 5.03],

    ["2026-04-08", "HAH", 53900, 56200, 100, 230000, 4.27],

    ["2026-04-22", "HAH", 53600, 55300, 100, 170000, 3.17],

    ["2026-04-23", "HAH", 54200, 56600, 100, 240000, 4.43],

    ["2026-04-23", "HAH", 54400, 56700, 100, 230000, 4.23],

    ["2026-04-23", "HAH", 55100, 57200, 100, 171000, 3.81],

    ["2026-05-06", "SSI", 27450, 28650, 200, 201000, 3.67],

    ["2026-05-07", "HAH", 55600, 57300, 100, 131000, 2.36],

    ["2026-05-07", "HAH", 56100, 57900, 100, 141000, 2.51],

    ["2026-05-08", "SSI", 27850, 28300, 100, 26000, 0.93],

    ["2026-05-13", "HAH", 56300, 58100, 100, 141000, 2.5],

    ["2026-06-04", "HAH", 52500, 55400, 100, 255000, 4.85],

    ["2026-06-17", "SSI", 26900, 27650, 200, 115000, 2.13],

    ["2026-06-17", "HAH", 53800, 56000, 100, 185000, 3.43],

    ["2026-06-17", "HAH", 54100, 56000, 100, 155000, 2.85],

  ];



  return rows.map(([sellDate, symbol, buyPrice, sellPrice, quantity, profit, profitPercent], index) => ({

    id: `imported-sale-${index + 1}`,

    stockId: "",

    symbol,

    name: symbol,

    buyDate: "",

    sellDate,

    quantity,

    buyPrice,

    sellPrice,

    profit,

    profitPercent,

    createdAt: `${sellDate}T00:00:00.000Z`,

  }));

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

  return { stocks, sales, assets, assetImportVersion: ASSET_IMPORT_VERSION, salesImportVersion: SALES_IMPORT_VERSION };

}





function scheduleCloudSave() {



  window.clearTimeout(cloudSaveTimer);



  cloudSaveTimer = window.setTimeout(() => {



    saveDataToCloud().catch((error) => {



      console.warn("Khong luu duoc Google Sheets", error);



    });



  }, 500);



}







async function loadDataFromCloud(options = {}) {
  if (!GOOGLE_SHEETS_API_URL) return;

  try {
    const cloudData = await loadCloudDataJsonp();

    if (isEmptyCloudData(cloudData)) {
      await saveDataToCloud();
      return;
    }

    isApplyingCloudData = true;
    stocks = Array.isArray(cloudData.stocks) ? cloudData.stocks.map(normalizeStock) : [];
    const cloudSales = Array.isArray(cloudData.sales) ? cloudData.sales.map(normalizeSale) : [];
    sales = cloudData.salesImportVersion === SALES_IMPORT_VERSION ? cloudSales : mergeImportedSales(cloudSales);
    assets = Array.isArray(cloudData.assets) ? cloudData.assets.map(normalizeAsset) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getAppData()));
    isApplyingCloudData = false;
    render();

    if (!options.silent && priceUpdateStatus) {
      priceUpdateStatus.innerHTML = `Dữ liệu Google Sheets<br /><strong>${formatDate(new Date().toISOString())}</strong>`;
    }
  } catch (error) {
    isApplyingCloudData = false;
    console.warn("Khong tai duoc Google Sheets, dang dung du lieu local", error);

    if (!options.silent && priceUpdateStatus) {
      priceUpdateStatus.innerHTML = "Không tải được Google Sheets<br /><strong>Dùng dữ liệu local</strong>";
    }
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

window.addEventListener("focus", () => loadDataFromCloud({ silent: true }));

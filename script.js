const STORAGE_KEY = "stock-desk-items";
const ASSET_IMPORT_VERSION = 1;

const statusLabels = {
  watching: "Dang theo doi",
  hold: "Dang nam giu",
  alert: "Can chu y",
};

let { stocks, sales, assets } = loadData();
let editingId = null;
let editingLot = null;
let sellingLot = null;
let editingAssetId = null;
let activeView = "stocks";
let holdingChartMode = "quantity";
const expandedStocks = new Set();

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
const viewPanels = document.querySelectorAll(".view-panel");
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
  saveData();
  render();
});

searchInput.addEventListener("input", render);
filterInput.addEventListener("change", render);
refreshPricesButton.addEventListener("click", updatePricesFromVietstock);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    renderViews();
  });
});

holdingModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    holdingChartMode = button.dataset.holdingMode;
    renderHoldingChart();
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
  if (!button) return;
  if (button.closest(".lot-form") || button.closest(".sell-form")) return;

  const row = button.closest("tr");
  const stock = stocks.find((item) => item.id === row.dataset.id);
  if (!stock) return;

  if (button.classList.contains("toggle-detail-btn")) {
    if (expandedStocks.has(stock.id)) {
      expandedStocks.delete(stock.id);
    } else {
      expandedStocks.add(stock.id);
    }
    render();
    return;
  }

  if (button.classList.contains("delete-btn")) {
    stocks = stocks.filter((item) => item.id !== stock.id);
    expandedStocks.delete(stock.id);
    saveData();
    render();
    return;
  }

  if (button.classList.contains("edit-lot-btn")) {
    editingLot = { stockId: stock.id, lotId: button.closest(".lot-row").dataset.lotId };
    sellingLot = null;
    expandedStocks.add(stock.id);
    render();
    return;
  }

  if (button.classList.contains("sell-lot-btn")) {
    sellingLot = { stockId: stock.id, lotId: button.closest(".lot-row").dataset.lotId };
    editingLot = null;
    expandedStocks.add(stock.id);
    render();
    return;
  }

  if (button.classList.contains("delete-lot-btn")) {
    const lotId = button.closest(".lot-row").dataset.lotId;
    stock.lots = stock.lots.filter((lot) => lot.id !== lotId);
    saveData();
    render();
    return;
  }

  editingId = stock.id;
  fields.symbol.value = stock.symbol;
  fields.name.value = stock.name;
  fields.exchange.value = stock.exchange;
  fields.sector.value = stock.sector;
  fields.price.value = stock.price || "";
  fields.status.value = stock.status;
  fields.note.value = stock.note;
  submitButton.textContent = "Cap nhat ma";
  fields.symbol.focus();
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

async function updatePricesFromVietstock() {
  refreshPricesButton.disabled = true;
  priceUpdateStatus.textContent = "Dang cap nhat gia tu Vietstock...";

  let updatedCount = 0;
  const errors = [];

  for (const stock of stocks) {
    try {
      const price = await fetchVietstockPrice(stock.symbol);
      if (price > 0) {
        stock.price = price;
        stock.updatedAt = new Date().toISOString();
        updatedCount += 1;
      }
    } catch (error) {
      errors.push(`${stock.symbol}: ${error.message}`);
    }
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

  priceUpdateStatus.textContent = errors.some((item) => item.includes("Khong thay gia"))
    ? "Vietstock khong tra gia trong HTML cong khai. Hay nhap thu cong."
    : "Khong cap nhat duoc. Hay nhap gia thu cong.";
  if (errors.length) {
    console.warn("Vietstock price update failed", errors);
  }
}

async function fetchVietstockPrice(symbol) {
  const candidates = [
    `https://finance.vietstock.vn/${encodeURIComponent(symbol)}-ctcp.htm`,
    `https://finance.vietstock.vn/${encodeURIComponent(symbol)}.htm`,
    `https://finance.vietstock.vn/${encodeURIComponent(symbol)}`,
  ];

  for (const pageUrl of candidates) {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(pageUrl)}`;
    const response = await fetch(proxyUrl, { cache: "no-store" });
    if (!response.ok) continue;

    const html = await response.text();
    const price = parseVietstockPrice(html, symbol);
    if (price) {
      return price;
    }
  }

  throw new Error("Khong thay gia trong HTML cong khai cua Vietstock");
}

function parseVietstockPrice(html, symbol) {
  const patterns = [
    /"LastPrice"\s*:\s*"?([\d.,]+)"?/i,
    /"ClosePrice"\s*:\s*"?([\d.,]+)"?/i,
    /data-price\s*=\s*"([\d.,]+)"/i,
    /<span[^>]*(?:last-price|price)[^>]*>\s*([\d.,]+)\s*<\/span>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return normalizeVietstockPrice(match[1]);
    }
  }

  const symbolIndex = html.toUpperCase().indexOf(symbol.toUpperCase());
  const nearby = symbolIndex >= 0 ? html.slice(symbolIndex, symbolIndex + 3000) : html;
  const fallback = nearby.match(/(?:price|gia|last)[^0-9]{0,80}([\d]{1,3}(?:[.,]\d{1,3})?)/i);
  return fallback ? normalizeVietstockPrice(fallback[1]) : null;
}

function normalizeVietstockPrice(value) {
  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const price = Number(normalized);
  if (!Number.isFinite(price)) return null;
  return price < 1000 ? price * 1000 : price;
}

function render() {
  const filteredStocks = getFilteredStocks();
  tableBody.innerHTML = "";

  filteredStocks.forEach((stock) => {
    const stockColor = getStockColor(stock.symbol);
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.id = stock.id;
    row.classList.add("stock-row");
    row.style.setProperty("--stock-accent", stockColor);

    const summary = calculateLotSummary(stock);
    row.querySelector(".symbol-text").textContent = stock.symbol;
    row.querySelector(".company-name").textContent = stock.name;
    row.querySelector(".note-line").textContent = stock.note || "Khong co ghi chu";
    row.querySelector(".exchange-cell").textContent = stock.exchange;
    row.querySelector(".sector-cell").textContent = stock.sector;
    row.querySelector(".price-cell").textContent = formatNumber(stock.price);

    const stockProfitCell = row.querySelector(".stock-profit-cell");
    stockProfitCell.textContent = `${formatProfit(summary.profit)} (${formatPercent(summary.profitPercent)})`;
    stockProfitCell.classList.add(getProfitClass(summary.profit));

    const statusPill = row.querySelector(".status-pill");
    statusPill.textContent = statusLabels[stock.status];
    statusPill.classList.add(`status-${stock.status}`);

    const toggleButton = row.querySelector(".toggle-detail-btn");
    toggleButton.classList.toggle("expanded", expandedStocks.has(stock.id));

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
  cell.colSpan = 8;

  const panel = document.createElement("div");
  panel.className = "lots-panel";

  const summary = calculateLotSummary(stock);
  const header = document.createElement("div");
  header.className = "lots-header";

  const titleGroup = document.createElement("div");
  const title = document.createElement("strong");
  const subtitle = document.createElement("span");
  title.textContent = `Danh sach mua ${stock.symbol}`;
  subtitle.textContent = `${stock.lots.length} muc mua, tong so luong ${formatNumber(summary.quantity)}`;
  titleGroup.append(title, subtitle);

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
  header.append(titleGroup, summaryGroup);

  const form = createLotForm(stock);
  const lotsList = document.createElement("div");
  lotsList.className = "lots-list";

  if (stock.lots.length === 0) {
    const empty = document.createElement("p");
    empty.className = "lot-empty";
    empty.textContent = "Chua co muc mua nao cho ma nay.";
    lotsList.append(empty);
  } else {
    stock.lots.forEach((lot, index) => {
      lotsList.append(createLotItem(stock, lot, index, stockColor));
      if (sellingLot?.stockId === stock.id && sellingLot.lotId === lot.id) {
        lotsList.append(createSellForm(stock, lot));
      }
    });
  }

  panel.append(header, form, lotsList);
  cell.append(panel);
  row.append(cell);

  return row;
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
  item.querySelector(".lot-title").textContent = `${stock.symbol} mua gia ${formatNumber(buyPrice)}`;
  item.querySelector(".lot-subtitle").textContent = `So luong ${formatNumber(quantity)} - Muc ${index + 1}`;
  item.querySelector(".lot-date").textContent = `Ngay mua ${formatDate(lot.buyDate)}`;
  item.querySelector(".lot-current").textContent = `Gia hien tai ${formatNumber(currentPrice)}`;

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
    const previousProfit = previousAsset ? asset.value - previousAsset.value : null;
    const monthlyProfit = monthBaseAsset && monthBaseAsset.id !== asset.id ? asset.value - monthBaseAsset.value : null;
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
  tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
  viewPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `${activeView}View`));
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
  document.querySelector("#totalStocks").textContent = stocks.length;
  document.querySelector("#watchingStocks").textContent = stocks.filter((stock) => stock.status === "watching").length;
  document.querySelector("#holdingStocks").textContent = stocks.filter((stock) => stock.status === "hold").length;
  document.querySelector("#alertStocks").textContent = stocks.filter((stock) => stock.status === "alert").length;
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
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value))} VNĐ`;
}

function formatProfit(value, includeCurrency = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  const formatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value));
  return `${prefix}${formatted}${includeCurrency ? " VNĐ" : ""}`;
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
  const monthAssets = sortedAssets.filter((item) => {
    const itemDate = new Date(item.time);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth();
  });

  return monthAssets[0] || null;
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ stocks, sales, assets, assetImportVersion: ASSET_IMPORT_VERSION }));
}

saveData();
render();

const SHEET_ID = "1ZA-vwLK0Awrsurc0J65X5XDJzsgRFpWO2j8TbkzGJaQ";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

let headers = ["存鑽老闆", "存鑽數量", "存歌數量", "存爆數量", "總數", "備註"];
let records = [];

const colors = ["col-name", "col-diamond", "col-song", "col-bomb", "col-total", "col-extra"];
const fmt = new Intl.NumberFormat("zh-Hant-TW");
const textColumnIndexes = new Set([0, 5]);
const $ = (selector) => document.querySelector(selector);

function normalize(text) {
return String(text ?? "").trim().toLowerCase();
}

function toNumber(value) {
const cleaned = String(value ?? "").replace(/,/g, "").trim();
if (cleaned === "") return 0;
const number = Number(cleaned);
return Number.isFinite(number) ? number : 0;
}

function escapeHtml(value) {
return String(value ?? "")
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function parseCSV(text) {
const rows = [];
let row = [];
let cell = "";
let inQuotes = false;

for (let i = 0; i < text.length; i++) {
const char = text[i];
const next = text[i + 1];

```
if (char === '"' && inQuotes && next === '"') {
  cell += '"';
  i++;
} else if (char === '"') {
  inQuotes = !inQuotes;
} else if (char === "," && !inQuotes) {
  row.push(cell);
  cell = "";
} else if ((char === "\n" || char === "\r") && !inQuotes) {
  if (char === "\r" && next === "\n") i++;
  row.push(cell);
  rows.push(row);
  row = [];
  cell = "";
} else {
  cell += char;
}
```

}

row.push(cell);
rows.push(row);
return rows.filter(r => r.some(c => String(c).trim() !== ""));
}

function applySiteSettings(rows) {
try {
const settings = {};

```
rows.forEach(row => {
  const key = String(row[11] ?? "").trim();   // L欄
  const value = String(row[12] ?? "").trim(); // M欄

  if (key && value) {
    settings[key] = value;
  }
});

const title = settings["網站標題"];
const subtitle = settings["網站小標題"];

const siteTitle = document.getElementById("siteTitle");
const siteSubtitle = document.getElementById("siteSubtitle");

if (title && siteTitle) {
  siteTitle.textContent = title;
  document.title = title;
}

if (subtitle && siteSubtitle) {
  siteSubtitle.textContent = subtitle;
}
```

} catch (error) {
console.warn("網站標題設定讀取失敗，但不影響表格資料：", error);
}
}

async function loadSheetData() {
const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
if (!response.ok) throw new Error(`HTTP ${response.status}`);

const csvText = await response.text();
const rows = parseCSV(csvText);
if (rows.length < 2) throw new Error("試算表沒有可顯示的資料");

applySiteSettings(rows);

headers = rows[0].slice(0, 6).map(h => String(h || "").trim()).filter(Boolean);
if (headers.length < 6) {
headers = ["存鑽老闆", "存鑽數量", "存歌數量", "存爆數量", "總數", "備註"];
}

records = rows.slice(1)
.map(row => {
const item = {};
headers.forEach((header, index) => {
item[header] = textColumnIndexes.has(index) ? String(row[index] ?? "").trim() : toNumber(row[index]);
});
return item;
})
.filter(item => String(item[headers[0]] || "").trim() !== "");
}

function renderTable(items) {
$("#tableHead").innerHTML = `<tr>${headers.map((h, index) => `<th class="${colors[index] || ''}">${escapeHtml(h)}</th>`).join("")}</tr>`;
$("#tableBody").innerHTML = items.map(item => `    <tr>
      ${headers.map((h, index) => {
        const value = textColumnIndexes.has(index) ? escapeHtml(item[h]) : fmt.format(item[h]);
        return`<td class="${index === 0 ? 'name-cell' : ''}">${value}</td>`;
      }).join("")}     </tr>
  `).join("");
}

function updateResultText(items, keyword) {
const resultText = $("#resultText");
if (!resultText) return;
resultText.textContent = keyword
? `搜尋「${keyword}」：找到 ${items.length} 筆資料。`
: "";
}

function filterRecords() {
const keyword = $("#searchInput").value.trim();
const key = normalize(keyword);
const items = !key
? records
: records.filter(item => normalize(item[headers[0]]).includes(key));

renderTable(items);
updateResultText(items, keyword);
}

async function init() {
try {
$("#resultText").textContent = "資料載入中…";
await loadSheetData();
renderTable(records);
updateResultText(records, "");
} catch (error) {
console.error(error);
records = [];
renderTable(records);
$("#resultText").textContent = "資料載入失敗：請確認 Google 試算表已開放『知道連結的使用者可檢視』。";
}

$("#searchInput").addEventListener("input", filterRecords);
$("#clearBtn").addEventListener("click", () => {
$("#searchInput").value = "";
filterRecords();
$("#searchInput").focus();
});
}

document.addEventListener("DOMContentLoaded", init);

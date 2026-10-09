# 拾火創意 PIKHUO 官網

這是一個可直接部署至 GitHub Pages 的靜態網站。HTML、CSS、文字設定、粒子程式與 Google 試算表串接程式皆已分開。

## 先預覽網站

請不要直接雙擊 `index.html`，因為瀏覽器會阻擋模組與 Logo 圖檔讀取。

在網站資料夾開啟終端機後執行：

```bash
python -m http.server 8080
```

再開啟：

```text
http://localhost:8080
```

## 修改文字

開啟 `js/content.js`。首頁標題、流程、服務、合作對象、合作方式、聯絡資訊都集中在這個檔案。

只修改引號內的文字，保留逗號、引號、中括號與大括號。

## 更換方形品牌符號

目前粒子使用：

```text
assets/pikhuo-mark.png
```

如果日後更換檔案，請維持透明背景 PNG，並使用相同檔名。程式會讀取圖片透明度，自動生成粒子座標，不會重新繪製 Logo。

## 串接 Google 試算表

1. 開啟準備接收網站合作需求的 Google 試算表。
2. 點選「擴充功能 → Apps Script」。
3. 刪除原本的範例程式。
4. 複製 `google-apps-script/Code.gs` 全部內容並貼上。
5. 按右上角「部署 → 新增部署作業」。
6. 類型選擇「網頁應用程式」。
7. 執行身分選擇「我」。
8. 存取權限選擇允許網站訪客使用的公開選項。
9. 完成授權後，複製結尾為 `/exec` 的網址。
10. 開啟 `js/content.js`，把網址貼到 `formEndpoint`：

```js
formEndpoint: "https://script.google.com/macros/s/你的部署編號/exec"
```

11. 重新上傳網站並實際送出一筆測試資料。

Apps Script 會自動建立「合作需求」工作表與欄位。網站只有在收到後端成功回應後，才會顯示成功訊息。

## 部署 GitHub Pages

把這個資料夾中的全部內容上傳到 GitHub repository 的發布分支。GitHub Pages 的 Source 若使用一般靜態檔案，選擇 `Deploy from a branch`，發布資料夾選擇 repository 根目錄。

網站必須保留以下相對路徑：

```text
index.html
css/style.css
js/content.js
js/main.js
js/particles.js
assets/pikhuo-mark.png
```

## 無動畫與備援

- 使用者開啟「減少動態效果」時，粒子會降低移動與互動。
- 不支援 WebGL 2 或載入失敗時，會改顯示靜態品牌符號。
- 文字內容保留在 HTML，即使粒子程式失敗仍可閱讀。
- 表單尚未填入 Apps Script 網址時，不會顯示假成功。

## 主要檔案

```text
index.html                       網站結構與預設備援文字
css/style.css                    全站視覺、排版與手機版
js/content.js                    可直接修改的文案與聯絡資訊
js/particles.js                  WebGL 粒子、Logo 取樣與形態轉換
js/main.js                       導覽、捲動、表單與一般互動
google-apps-script/Code.gs       Google 試算表接收程式
```

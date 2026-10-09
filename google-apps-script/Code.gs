/**
 * 拾火創意網站聯絡表單 → Google 試算表
 * 請在接收資料的 Google 試算表開啟「擴充功能 → Apps Script」，
 * 將這份程式完整貼入 Code.gs，再部署為網頁應用程式。
 */

const SHEET_NAME = '合作需求';
const HEADERS = ['編號', '送出時間', '姓名', '公司名稱', '電子郵件', '需求說明', '來源頁面', '聯絡狀態'];

function doGet() {
  return jsonResponse({ ok: true, service: 'PIKHUO contact form' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (payload.website) {
      return jsonResponse({ ok: false, error: 'Invalid submission.' });
    }

    const startedAt = Number(payload.startedAt || 0);
    if (!startedAt || Date.now() - startedAt < 1800) {
      return jsonResponse({ ok: false, error: 'Submission was too fast.' });
    }

    const name = clean(payload.name, 60);
    const company = clean(payload.company, 100);
    const email = clean(payload.email, 160);
    const message = clean(payload.message, 2000);
    const source = clean(payload.source, 500);

    if (!name || !company || !message || !/^\S+@\S+\.\S+$/.test(email)) {
      return jsonResponse({ ok: false, error: 'Required fields are invalid.' });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#160D1D')
        .setFontColor('#F0EDF2');
      sheet.setFrozenRows(1);
    }

    const requestId = Utilities.getUuid();
    sheet.appendRow([
      requestId,
      new Date(),
      safeCell(name),
      safeCell(company),
      safeCell(email),
      safeCell(message),
      safeCell(source),
      '待聯絡'
    ]);

    return jsonResponse({ ok: true, id: requestId });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'Unable to save submission.' });
  } finally {
    try {
      lock.releaseLock();
    } catch (_error) {
      // Lock 尚未取得時不需要處理。
    }
  }
}

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function safeCell(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

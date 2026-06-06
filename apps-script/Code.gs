/**
 * Whiskey 101 — shared seizure log backend.
 *
 * Paste this into the Apps Script editor of a Google Sheet, then deploy it
 * as a Web App:
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Copy the resulting Web App URL into the website's config.js
 * (window.WHISKEY_CONFIG.seizureEndpoint).
 *
 * The site calls this to add / list / delete / clear seizure entries.
 * Timestamps are stored as epoch milliseconds (column A) plus a readable
 * Sydney-time string (column B) so the sheet is easy to read by hand.
 */
var SHEET_NAME = 'SeizureLog';

function doGet(e)  { return handle_(e); }
function doPost(e) { return handle_(e); }

function handle_(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();
    var p = (e && e.parameter) || {};
    var action = p.action || 'list';

    if (action === 'add' && p.iso) {
      var ms = Number(new Date(p.iso).getTime());
      if (!isNaN(ms) && findRow_(sheet, ms) === -1) {
        var syd = Utilities.formatDate(new Date(ms), 'Australia/Sydney', 'EEE d MMM yyyy, h:mm a z');
        sheet.appendRow([ms, syd, (p.ua || '').toString().slice(0, 80)]);
      }
    } else if (action === 'delete' && p.iso) {
      var delMs = Number(new Date(p.iso).getTime());
      var row = findRow_(sheet, delMs);
      if (row > -1) sheet.deleteRow(row);
    } else if (action === 'clear') {
      if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    return reply_(e, { ok: true, entries: list_(sheet) });
  } catch (err) {
    return reply_(e, { ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp (ms)', 'Sydney time', 'Device']);
  }
  return sheet;
}

function list_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
    .map(function (r) {
      var ms = Number(r[0]);
      return isNaN(ms) ? null : { iso: new Date(ms).toISOString() };
    })
    .filter(function (x) { return x; });
}

function findRow_(sheet, ms) {
  if (sheet.getLastRow() < 2) return -1;
  var col = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (Number(col[i][0]) === Number(ms)) return i + 2;
  }
  return -1;
}

function reply_(e, obj) {
  var json = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

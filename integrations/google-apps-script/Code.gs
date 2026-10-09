const SPREADSHEET_ID = '1T__lCFK_1XsRj8K4n326E64KZWhJllhMlMkjNnYHVRY';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (payload.website) return json_({ ok: true });

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (payload.type === 'newsletter') {
      const record = payload.newsletter || {};
      const email = String(record.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Invalid email');
      record.email = email;
      upsertByEmail_(spreadsheet.getSheetByName('Newsletter'), record, 'email');
      return json_({ ok: true, type: 'newsletter' });
    }

    appendObject_(spreadsheet.getSheetByName('Screener'), payload.screener || {});
    if (payload.registration) {
      upsertByEmail_(spreadsheet.getSheetByName('Cadastro'), payload.registration, 'email');
    }
    return json_({ ok: true, type: 'program' });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function upsertByEmail_(sheet, record, key) {
  if (!sheet) throw new Error('Target sheet not found');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyColumn = headers.indexOf(key) + 1;
  const keyValue = String(record[key] || '').trim().toLowerCase();
  if (!keyColumn || !keyValue) return appendObject_(sheet, record);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, keyColumn, lastRow - 1, 1).getDisplayValues();
    const match = values.findIndex(row => String(row[0]).trim().toLowerCase() === keyValue);
    if (match >= 0) {
      sheet.getRange(match + 2, 1, 1, headers.length).setValues([
        headers.map(header => Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '')
      ]);
      return;
    }
  }
  appendObject_(sheet, record);
}

function appendObject_(sheet, record) {
  if (!sheet) throw new Error('Target sheet not found');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '');
  sheet.appendRow(row);
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

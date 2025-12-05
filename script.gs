const WEBHOOK_URL = 'https://kathe-untoured-malika.ngrok-free.dev/api/import/google/sync';
const WEBHOOK_SECRET = 'super-long-random-token';
const DOMAIN = 'orders';

function onEdit(e) {
  const sheet = e.range.getSheet();
  const ss = sheet.getParent();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  //const values = sheet.getRange(e.range.getRow(), 1, headers.length).getValues()[0];
  const values = sheet
  .getRange(e.range.getRow(), 1, 1, headers.length) // 1 row, N columns
  .getValues()[0];


  const payload = {
    domain: DOMAIN,
    spreadsheetId: ss.getId(),
    tabName: sheet.getName(),
    rowNumber: e.range.getRow(),
    action: values.join('').trim() ? 'UPSERT' : 'DELETE',
    row: buildRow(headers, values)
  };

  const response = UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    // change the header name away from X-Google-*
    headers: { 'X-Webhook-Secret': WEBHOOK_SECRET },
    muteHttpExceptions: true,
    followRedirects: false
  });

  Logger.log('Status=%s Body=%s', response.getResponseCode(), response.getContentText());
}

function buildRow(headers, values) {
  const row = {};
  headers.forEach((header, idx) => {
    if (!header) return;
    const normalized = header.toString().trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    row[normalized] = values[idx];
  });
  return row;
}

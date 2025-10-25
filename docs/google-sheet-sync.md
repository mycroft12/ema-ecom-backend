# Google Sheet → Product Sync Webhook

The Google connector now exposes a lightweight webhook so edits made inside Google Sheets can be pushed to your dynamic tables without re-running the full “Analyze & Configure” flow.

## 1. Backend configuration

1. Make sure the domain was already configured through **Import → Google Sheet Connector** (this stores the spreadsheet ID ↔ domain mapping).
2. Set the webhook secret via environment variable:

   ```bash
   export GOOGLE_SHEETS_WEBHOOK_SECRET="change-me"
   ```

   (Or set `google.sheets.webhook-secret` in your Spring configuration.)
3. Restart the backend. The endpoint `POST /api/import/google/sync` is now available. It does **not** require JWT auth but every request must include the header `X-Google-Sheets-Secret: <your-secret>`.

### Payload shape

```json
{
  "domain": "product",
  "spreadsheetId": "1AbCdEF...",
  "tabName": "Sheet1",
  "rowNumber": 42,
  "action": "UPSERT",                 // or DELETE
  "row": {
    "id": "8ae21157-7d2b-4fdb-b9a4-1c334d9c9f9c",
    "reference": "SKU-123",
    "title": "Sample",
    "price": "99.99",
    "...": "..."
  }
}
```

- `row.id` is optional for UPSERT; if omitted, the server will generate a UUID. Deletes require a valid `id`.
- Column names must match the sanitized headers that were created during the initial import (lowercase + underscores). Extra columns are ignored.

## 2. Google Apps Script trigger

1. Open the sheet, click **Extensions → Apps Script**, and paste the snippet below.
2. Update `WEBHOOK_URL`, `WEBHOOK_SECRET`, and `DOMAIN`.
3. Add an **Installable trigger** (event type: `On edit`) so the script runs whenever rows change.

```javascript
const WEBHOOK_URL = 'https://your-api.example.com/api/import/google/sync';
const WEBHOOK_SECRET = 'change-me';
const DOMAIN = 'product';

function onEdit(e) {
  const sheet = e.range.getSheet();
  const ss = sheet.getParent();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = sheet.getRange(e.range.getRow(), 1, 1, headers.length).getValues()[0];

  const payload = {
    domain: DOMAIN,
    spreadsheetId: ss.getId(),
    tabName: sheet.getName(),
    rowNumber: e.range.getRow(),
    action: rowValues.join('').trim() ? 'UPSERT' : 'DELETE',
    row: buildRow(headers, rowValues)
  };

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { 'X-Google-Sheets-Secret': WEBHOOK_SECRET },
    muteHttpExceptions: true
  });
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
```

> Tip: If a row should be removed when a user clears it, keep an `id` column in the sheet so the webhook can delete the matching record.

With this setup, edits made in Google Sheets are pushed to `/api/import/google/sync` almost immediately and persisted in the corresponding dynamic table.

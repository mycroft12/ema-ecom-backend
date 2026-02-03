export const environment = {
  production: false,
  // Base URL for the API (relative; proxied via /api)
  apiBaseUrl: '/api',
  // Configure Google picker integration (set via environment-specific files)
  googlePickerClientId: '',
  googlePickerApiKey: '',
  googleDriveMimeTypes: 'application/vnd.google-apps.spreadsheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
  currencyRates: {
    usdToMad: 10.0
  }
};

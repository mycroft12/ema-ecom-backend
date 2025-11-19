export const environment = {
  production: false,
  // Base URL for the Spring Boot backend during local development
  // Angular dev server runs on 4200; backend runs on 8080 (see backend application.yml)
  apiBase: 'http://localhost:8080',
  apiBaseUrl: 'http://localhost:8080',
  // Configure Google picker integration (set via environment-specific files)
  googlePickerClientId: '',
  googlePickerApiKey: '',
  googleDriveMimeTypes: 'application/vnd.google-apps.spreadsheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
  currencyRates: {
    usdToMad: 10.0
  }
};

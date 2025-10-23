package com.mycroft.ema.ecom.integration.google;

import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.google.api.services.sheets.v4.model.Spreadsheet;
import com.google.api.services.sheets.v4.model.Sheet;
import com.google.api.services.sheets.v4.model.SheetProperties;
import com.mycroft.ema.ecom.domains.imports.dto.GoogleSheetMetadataResponse;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class GoogleSheetsClient {

  private static final JacksonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
  private static final Pattern SPREADSHEET_ID_PATTERN = Pattern.compile("/spreadsheets/d/([a-zA-Z0-9-_]+)");

  private final GoogleSheetsProperties properties;
  private final ResourceLoader resourceLoader;
  private final GoogleServiceAccountCredentialService credentialService;

  private volatile Sheets cachedSheets;
  private volatile String cachedFingerprint;

  public GoogleSheetsClient(GoogleSheetsProperties properties,
                            ResourceLoader resourceLoader,
                            GoogleServiceAccountCredentialService credentialService) {
    this.properties = properties;
    this.resourceLoader = resourceLoader;
    this.credentialService = credentialService;
  }

  public synchronized Sheets sheets() {
    Optional<GoogleServiceAccountCredentialService.StoredServiceAccount> stored = credentialService.load();
    if (stored.isPresent()) {
      GoogleServiceAccountCredentialService.StoredServiceAccount account = stored.get();
      String fingerprint = fingerprint(account);
      if (cachedSheets == null || cachedFingerprint == null || !cachedFingerprint.equals(fingerprint)) {
        cachedSheets = createSheetsServiceFromBytes(account.jsonBytes());
        cachedFingerprint = fingerprint;
      }
      return cachedSheets;
    }
    if (cachedSheets == null) {
      cachedSheets = createSheetsServiceFromClasspath();
      cachedFingerprint = "classpath";
    }
    return cachedSheets;
  }

  public synchronized void invalidateCache() {
    this.cachedSheets = null;
    this.cachedFingerprint = null;
  }

  private Sheets createSheetsServiceFromBytes(byte[] jsonBytes) {
    try (InputStream is = new ByteArrayInputStream(jsonBytes)) {
      GoogleCredentials credentials = GoogleCredentials.fromStream(is)
          .createScoped(List.of("https://www.googleapis.com/auth/spreadsheets"));
      return new Sheets.Builder(GoogleNetHttpTransport.newTrustedTransport(), JSON_FACTORY, new HttpCredentialsAdapter(credentials))
          .setApplicationName(properties.applicationName())
          .build();
    } catch (GeneralSecurityException | IOException ex) {
      throw new IllegalStateException("Failed to initialize Google Sheets service from uploaded credentials", ex);
    }
  }

  private Sheets createSheetsServiceFromClasspath() {
    try {
      Resource resource = resourceLoader.getResource(properties.credentialsPath());
      if (!resource.exists()) {
        throw new IllegalStateException("Google service account credentials not found at " + properties.credentialsPath());
      }
      try (InputStream credentialsStream = resource.getInputStream()) {
        GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsStream)
            .createScoped(List.of("https://www.googleapis.com/auth/spreadsheets"));
        return new Sheets.Builder(GoogleNetHttpTransport.newTrustedTransport(), JSON_FACTORY, new HttpCredentialsAdapter(credentials))
            .setApplicationName(properties.applicationName())
            .build();
      }
    } catch (GeneralSecurityException | IOException ex) {
      throw new IllegalStateException("Failed to initialize Google Sheets service", ex);
    }
  }

  private String fingerprint(GoogleServiceAccountCredentialService.StoredServiceAccount account) {
    return account.clientEmail() + ":" + Optional.ofNullable(account.updatedAt()).map(Instant::toEpochMilli).orElse(0L);
  }

  public List<List<Object>> readSheet(String spreadsheetId, String range) {
    try {
      ValueRange response = sheets().spreadsheets().values()
          .get(spreadsheetId, range)
          .execute();
      List<List<Object>> values = response.getValues();
      return values != null ? values : List.of();
    } catch (IOException ex) {
      throw new IllegalStateException("Failed to read sheet range " + range + " from spreadsheet " + spreadsheetId, ex);
    }
  }

  public List<GoogleSheetMetadataResponse> listSheets(String spreadsheetId) {
    try {
      Spreadsheet spreadsheet = sheets().spreadsheets()
          .get(spreadsheetId)
          .setFields("sheets.properties(sheetId,title,index)")
          .execute();
      if (spreadsheet.getSheets() == null) {
        return List.of();
      }
      return spreadsheet.getSheets().stream()
          .map(Sheet::getProperties)
          .map(this::toSheetMetadata)
          .toList();
    } catch (IOException ex) {
      throw new IllegalStateException("Failed to fetch sheet metadata for spreadsheet " + spreadsheetId, ex);
    }
  }

  private GoogleSheetMetadataResponse toSheetMetadata(SheetProperties properties) {
    return new GoogleSheetMetadataResponse(
        properties.getSheetId(),
        properties.getTitle(),
        properties.getIndex()
    );
  }

  public String extractSpreadsheetId(String sheetUrl) {
    if (sheetUrl == null || sheetUrl.isBlank()) {
      throw new IllegalArgumentException("Sheet URL must not be blank");
    }
    Matcher matcher = SPREADSHEET_ID_PATTERN.matcher(sheetUrl);
    if (matcher.find()) {
      return matcher.group(1);
    }
    throw new IllegalArgumentException("Unable to extract spreadsheetId from URL: " + sheetUrl);
  }
}

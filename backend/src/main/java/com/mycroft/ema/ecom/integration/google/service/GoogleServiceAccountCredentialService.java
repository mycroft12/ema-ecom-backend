package com.mycroft.ema.ecom.integration.google.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.mycroft.ema.ecom.common.security.AesGcmSecretEncryptor;
import com.mycroft.ema.ecom.integration.google.domain.GoogleServiceAccountSecret;
import com.mycroft.ema.ecom.integration.google.repository.GoogleServiceAccountSecretRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Coordinates secure storage, retrieval and validation of Google Sheets service account credentials.
 */
@Service
public class GoogleServiceAccountCredentialService {

  private static final List<String> DEFAULT_SCOPES = List.of("https://www.googleapis.com/auth/spreadsheets");

  private final GoogleServiceAccountSecretRepository repository;
  private final AesGcmSecretEncryptor encryptor;
  private final ObjectMapper objectMapper;

  public GoogleServiceAccountCredentialService(GoogleServiceAccountSecretRepository repository,
                                               AesGcmSecretEncryptor encryptor,
                                               ObjectMapper objectMapper) {
    this.repository = repository;
    this.encryptor = encryptor;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public ServiceAccountStatus upload(MultipartFile file, String uploadedBy) {
    byte[] rawBytes = readBytes(file);
    JsonNode json = parseJson(rawBytes);
    validateServiceAccountJson(json);
    ServiceAccountCredentials credentials = buildServiceAccountCredentials(rawBytes);
    String clientEmail = credentials.getClientEmail();
    if (clientEmail == null || clientEmail.isBlank()) {
      throw new IllegalArgumentException("Service account JSON missing client_email");
    }

    AesGcmSecretEncryptor.EncryptionResult encrypted = encryptor.encrypt(rawBytes);
    GoogleServiceAccountSecret secret = repository.findById(GoogleServiceAccountSecret.SINGLETON_ID)
        .orElseGet(GoogleServiceAccountSecret::new);
    secret.setPayload(encrypted.cipherText());
    secret.setIv(encrypted.iv());
    secret.setUploadedBy(uploadedBy);
    repository.save(secret);

    return new ServiceAccountStatus(true, clientEmail, json.path("project_id").asText(null), secret.getUpdatedAt());
  }

  @Transactional(readOnly = true)
  public Optional<StoredServiceAccount> load() {
    return repository.findById(GoogleServiceAccountSecret.SINGLETON_ID)
        .map(secret -> {
          byte[] decrypted = encryptor.decrypt(secret.getIv(), secret.getPayload());
          JsonNode json = parseJson(decrypted);
          return new StoredServiceAccount(
              decrypted.clone(),
              json.path("client_email").asText(null),
              json.path("project_id").asText(null),
              secret.getUpdatedAt()
          );
        });
  }

  @Transactional(readOnly = true)
  public ServiceAccountStatus status() {
    return repository.findById(GoogleServiceAccountSecret.SINGLETON_ID)
        .map(secret -> {
          byte[] decrypted = encryptor.decrypt(secret.getIv(), secret.getPayload());
          JsonNode json = parseJson(decrypted);
          return new ServiceAccountStatus(
              true,
              json.path("client_email").asText(null),
              json.path("project_id").asText(null),
              secret.getUpdatedAt()
          );
        })
        .orElseGet(() -> new ServiceAccountStatus(false, null, null, null));
  }

  @Transactional
  public void delete() {
    repository.findById(GoogleServiceAccountSecret.SINGLETON_ID)
        .ifPresent(repository::delete);
  }

  private byte[] readBytes(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("Service account JSON file must not be empty");
    }
    try {
      return file.getBytes();
    } catch (IOException ex) {
      throw new IllegalArgumentException("Failed to read uploaded file", ex);
    }
  }

  private JsonNode parseJson(byte[] rawBytes) {
    try {
      return objectMapper.readTree(rawBytes);
    } catch (IOException ex) {
      throw new IllegalArgumentException("Uploaded file is not valid JSON", ex);
    }
  }

  private void validateServiceAccountJson(JsonNode json) {
    requireField(json, "type");
    requireField(json, "project_id");
    requireField(json, "private_key_id");
    requireField(json, "private_key");
    requireField(json, "client_email");
    requireField(json, "client_id");
    requireField(json, "token_uri");
    String type = json.path("type").asText("");
    if (!"service_account".equals(type)) {
      throw new IllegalArgumentException("JSON type must be 'service_account'");
    }
  }

  private void requireField(JsonNode json, String field) {
    if (!json.hasNonNull(field) || json.path(field).asText().isBlank()) {
      throw new IllegalArgumentException("Service account JSON missing required field '" + field + "'");
    }
  }

  private ServiceAccountCredentials buildServiceAccountCredentials(byte[] rawBytes) {
    try {
      ServiceAccountCredentials credentials = ServiceAccountCredentials.fromStream(new ByteArrayInputStream(rawBytes));
      return (ServiceAccountCredentials) credentials.createScoped(DEFAULT_SCOPES);
    } catch (IOException ex) {
      throw new IllegalArgumentException("Failed to parse service account JSON", ex);
    }
  }

  /**
   * Descriptor summarizing whether service account credentials are configured and relevant metadata.
   */
  public record ServiceAccountStatus(boolean configured, String clientEmail, String projectId, Instant updatedAt) {}

  /**
   * Container holding decrypted service account JSON for internal reuse.
   */
  public record StoredServiceAccount(byte[] jsonBytes, String clientEmail, String projectId, Instant updatedAt) {}
}

package com.mycroft.ema.ecom.common.files;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/**
 * Strongly typed application properties that drive the MinIO integration, covering credentials, bucket usage and upload constraints.
 */
@Component
@ConfigurationProperties(prefix = "app.minio")
public class MinioProperties {
  /** Endpoint like http://localhost:9000 */
  private String endpoint;
  private String accessKey;
  private String secretKey;
  /** Bucket where images are stored */
  private String bucket = "ema-ecom";
  /** Optional public base URL (CDN/reverse proxy). If set, returned URLs will use it. */
  private String publicBaseUrl;
  /** Maximum allowed image size in bytes (defaults to 5 MiB). */
  private long maxImageSizeBytes = 5L * 1024L * 1024L;
  /** Allowed mime types for image uploads. */
  private List<String> allowedImageMimeTypes = List.of(
      "image/jpeg", "image/png", "image/webp", "image/gif");
  /** Default presigned URL expiry in seconds (<= 7 days). */
  private Duration defaultExpiry = Duration.ofDays(6);
  /** Refresh threshold for presigned URLs (urls expiring sooner will be refreshed). */
  private Duration refreshThreshold = Duration.ofHours(24);
  /** Safety buffer applied when evaluating expiry to avoid clock skew. */
  private Duration refreshClockSkew = Duration.ofMinutes(2);
  /** Default maximum number of images per MINIO:IMAGE field when metadata is missing. */
  private int defaultMaxImages = 1;
  /** Interval at which presigned URL refresh job runs. */
  private Duration refreshInterval = Duration.ofHours(12);

  public String getEndpoint() { return endpoint; }
  public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
  public String getAccessKey() { return accessKey; }
  public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
  public String getSecretKey() { return secretKey; }
  public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
  public String getBucket() { return bucket; }
  public void setBucket(String bucket) { this.bucket = bucket; }
  public String getPublicBaseUrl() { return publicBaseUrl; }
  public void setPublicBaseUrl(String publicBaseUrl) { this.publicBaseUrl = publicBaseUrl; }
  public long getMaxImageSizeBytes() { return maxImageSizeBytes; }
  public void setMaxImageSizeBytes(long maxImageSizeBytes) { this.maxImageSizeBytes = maxImageSizeBytes; }
  public List<String> getAllowedImageMimeTypes() { return allowedImageMimeTypes; }
  public void setAllowedImageMimeTypes(List<String> allowedImageMimeTypes) { this.allowedImageMimeTypes = allowedImageMimeTypes; }
  public Duration getDefaultExpiry() { return defaultExpiry; }
  public void setDefaultExpiry(Duration defaultExpiry) { this.defaultExpiry = defaultExpiry; }
  public Duration getRefreshThreshold() { return refreshThreshold; }
  public void setRefreshThreshold(Duration refreshThreshold) { this.refreshThreshold = refreshThreshold; }
  public Duration getRefreshClockSkew() { return refreshClockSkew; }
  public void setRefreshClockSkew(Duration refreshClockSkew) { this.refreshClockSkew = refreshClockSkew; }
  public int getDefaultMaxImages() { return defaultMaxImages; }
  public void setDefaultMaxImages(int defaultMaxImages) { this.defaultMaxImages = defaultMaxImages; }
  public Duration getRefreshInterval() { return refreshInterval; }
  public void setRefreshInterval(Duration refreshInterval) { this.refreshInterval = refreshInterval; }

  public boolean isConfigured(){
    return endpoint != null && !endpoint.isBlank() && accessKey != null && secretKey != null;
  }
}

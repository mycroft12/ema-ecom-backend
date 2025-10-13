package com.mycroft.ema.ecom.common.files;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

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

  public boolean isConfigured(){
    return endpoint != null && !endpoint.isBlank() && accessKey != null && secretKey != null;
  }
}

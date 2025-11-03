package com.mycroft.ema.ecom.common.files;

import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Service facade over the MinIO Java client responsible for uploading content and issuing presigned download URLs.
 */
@Service
@ConditionalOnBean(MinioClient.class)
public class MinioFileStorageService {
  private final MinioClient client;
  private final MinioProperties props;

  public MinioFileStorageService(MinioClient client, MinioProperties props){
    this.client = client;
    this.props = props;
  }

  private static final Duration MAX_EXPIRY = Duration.ofDays(7);

  public UploadResponse uploadImage(MultipartFile file, String domain, String field){
    try{
      ensureBucket();
      String contentType = file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
      String ext = guessExtension(contentType, file.getOriginalFilename());
      String object = (domain == null ? "generic" : domain) + "/" + (field == null ? "file" : field) + "/" + UUID.randomUUID() + (ext != null ? ("."+ext) : "");
      client.putObject(PutObjectArgs.builder()
          .bucket(props.getBucket())
          .object(object)
          .contentType(contentType)
          .stream(file.getInputStream(), file.getSize(), -1)
          .build());
      Instant expiresAt = Instant.now().plus(resolveDefaultExpiry());
      String url = buildSignedUrl(object, expiresAt);
      return new UploadResponse(object, url, expiresAt, contentType, file.getSize());
    }catch (Exception e){
      throw new RuntimeException("Failed to upload to MinIO: " + e.getMessage(), e);
    }
  }

  public UploadResponse uploadImage(byte[] content, String contentType, String originalFilename,
                                    String domain, String field) {
    if (content == null || content.length == 0) {
      throw new IllegalArgumentException("Image content cannot be empty");
    }
    try {
      ensureBucket();
      String resolvedContentType = contentType != null ? contentType : MediaType.APPLICATION_OCTET_STREAM_VALUE;
      String ext = guessExtension(resolvedContentType, originalFilename);
      String object = (domain == null ? "generic" : domain) + "/" + (field == null ? "file" : field) + "/" + UUID.randomUUID() + (ext != null ? ("." + ext) : "");
      try (ByteArrayInputStream bais = new ByteArrayInputStream(content)) {
        client.putObject(PutObjectArgs.builder()
            .bucket(props.getBucket())
            .object(object)
            .contentType(resolvedContentType)
            .stream(bais, content.length, -1)
            .build());
      }
      Instant expiresAt = Instant.now().plus(resolveDefaultExpiry());
      String url = buildSignedUrl(object, expiresAt);
      return new UploadResponse(object, url, expiresAt, resolvedContentType, (long) content.length);
    } catch (Exception e) {
      throw new RuntimeException("Failed to upload to MinIO: " + e.getMessage(), e);
    }
  }

  private void ensureBucket() throws Exception{
    boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(props.getBucket()).build());
    if(!exists){
      client.makeBucket(MakeBucketArgs.builder().bucket(props.getBucket()).build());
    }
  }

  public UploadResponse refreshUrl(String objectKey) {
    return refreshUrl(objectKey, resolveDefaultExpiry(), null, null);
  }

  public UploadResponse refreshUrl(String objectKey, Duration expiry) {
    return refreshUrl(objectKey, expiry, null, null);
  }

  public UploadResponse refreshUrl(String objectKey, Duration expiry, String contentType, Long sizeBytes) {
    if (objectKey == null || objectKey.isBlank()) {
      throw new IllegalArgumentException("Object key is required to refresh URL");
    }
    Instant expiresAt = Instant.now().plus(expiry == null ? resolveDefaultExpiry() : expiry);
    String url = buildSignedUrl(objectKey, expiresAt);
    return new UploadResponse(objectKey, url, expiresAt, contentType, sizeBytes);
  }

  private String buildSignedUrl(String object, Instant expiresAt) {
    try {
      Duration untilExpiry = Duration.between(Instant.now(), expiresAt);
      long seconds = untilExpiry.getSeconds();
      if (seconds <= 0) {
        seconds = resolveDefaultExpiry().getSeconds();
        expiresAt = Instant.now().plus(resolveDefaultExpiry());
      }
      long cappedSeconds = Math.min(seconds, MAX_EXPIRY.getSeconds());
      return client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
          .method(Method.GET)
          .bucket(props.getBucket())
          .object(object)
          .expiry((int) Math.max(1, cappedSeconds))
          .build());
    } catch (Exception ex) {
      return buildPublicUrl(object);
    }
  }

  private String buildPublicUrl(String object){
    if(props.getPublicBaseUrl() != null && !props.getPublicBaseUrl().isBlank()){
      String base = props.getPublicBaseUrl();
      if(base.endsWith("/")) base = base.substring(0, base.length()-1);
      return base + "/" + object;
    }
    String ep = props.getEndpoint();
    if(ep.endsWith("/")) ep = ep.substring(0, ep.length()-1);
    return ep + "/" + props.getBucket() + "/" + object;
  }

  private String guessExtension(String contentType, String originalName){
    if(originalName != null && originalName.contains(".")){
      return originalName.substring(originalName.lastIndexOf('.')+1);
    }
    if("image/jpeg".equals(contentType)) return "jpg";
    if("image/png".equals(contentType)) return "png";
    if("image/gif".equals(contentType)) return "gif";
    return null;
  }

  private Duration resolveDefaultExpiry() {
    Duration configured = props.getDefaultExpiry();
    if (configured == null || configured.isNegative() || configured.isZero()) {
      return Duration.ofDays(6);
    }
    long seconds = Math.min(configured.getSeconds(), MAX_EXPIRY.getSeconds());
    if (seconds <= 0) {
      seconds = Duration.ofHours(1).getSeconds();
    }
    return Duration.ofSeconds(seconds);
  }

  /**
   * Response payload returned after uploading or refreshing an object stored in MinIO.
   */
  public record UploadResponse(String key, String url, Instant expiresAt, String contentType, Long sizeBytes) {}
}

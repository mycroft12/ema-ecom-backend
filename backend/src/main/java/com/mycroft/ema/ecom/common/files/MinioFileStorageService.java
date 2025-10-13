package com.mycroft.ema.ecom.common.files;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@ConditionalOnBean(MinioClient.class)
public class MinioFileStorageService {
  private final MinioClient client;
  private final MinioProperties props;

  public MinioFileStorageService(MinioClient client, MinioProperties props){
    this.client = client;
    this.props = props;
  }

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
      String url = buildPublicUrl(object);
      return new UploadResponse(object, url);
    }catch (Exception e){
      throw new RuntimeException("Failed to upload to MinIO: " + e.getMessage(), e);
    }
  }

  private void ensureBucket() throws Exception{
    boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(props.getBucket()).build());
    if(!exists){
      client.makeBucket(MakeBucketArgs.builder().bucket(props.getBucket()).build());
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

  public record UploadResponse(String key, String url) {}
}

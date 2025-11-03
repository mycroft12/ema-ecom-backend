package com.mycroft.ema.ecom.common.files;

import io.minio.MinioClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the {@link io.minio.MinioClient} bean when MinIO connection properties are supplied.
 */
@Configuration
public class MinioConfig {

  @Bean
  @ConditionalOnProperty(prefix = "app.minio", name = {"endpoint","access-key","secret-key"})
  public MinioClient minioClient(MinioProperties props){
    return MinioClient.builder()
        .endpoint(props.getEndpoint())
        .credentials(props.getAccessKey(), props.getSecretKey())
        .build();
  }
}

package com.mycroft.ema.ecom.domains.products;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.common.error.BadRequestException;
import com.mycroft.ema.ecom.common.files.MinioFileStorageService;
import com.mycroft.ema.ecom.common.files.MinioImageRefreshScheduler;
import com.mycroft.ema.ecom.common.files.MinioProperties;
import com.mycroft.ema.ecom.common.metadata.ColumnSemanticsService;
import com.mycroft.ema.ecom.domains.products.dto.ProductUpdateDto;
import com.mycroft.ema.ecom.domains.products.dto.ResponseDto;
import com.mycroft.ema.ecom.domains.products.service.impl.ProductServiceImpl;
import io.minio.MinioClient;
import org.h2.jdbcx.JdbcConnectionPool;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductMinioIntegrationTests {

  private static JdbcConnectionPool connectionPool;
  private static JdbcTemplate jdbcTemplate;
  private static ColumnSemanticsService semanticsService;
  private static MinioProperties minioProperties;
  private static ObjectMapper objectMapper;
  private static ProductServiceImpl productService;
  private static MinioImageRefreshScheduler refreshScheduler;

  @BeforeAll
  static void setupAll() {
    connectionPool = JdbcConnectionPool.create("jdbc:h2:mem:ema_minio;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
    jdbcTemplate = new JdbcTemplate(connectionPool);
    objectMapper = new ObjectMapper();
    semanticsService = new ColumnSemanticsService(jdbcTemplate, objectMapper);
    minioProperties = new MinioProperties();
    minioProperties.setDefaultMaxImages(1);
    minioProperties.setMaxImageSizeBytes(5 * 1024 * 1024);

    MinioClient minioClient = MinioClient.builder()
        .endpoint("http://localhost:9000")
        .credentials("test", "test")
        .build();

    MinioFileStorageService storage = new MinioFileStorageService(minioClient, minioProperties) {
      @Override
      public UploadResponse refreshUrl(String objectKey, Duration expiry, String contentType, Long sizeBytes) {
        return new UploadResponse(objectKey, "https://refreshed.example/" + objectKey, Instant.now().plusSeconds(3600), contentType, sizeBytes);
      }
    };

    ObjectProvider<MinioFileStorageService> provider = new StaticObjectProvider(storage);
    productService = new ProductServiceImpl(jdbcTemplate, provider, semanticsService, minioProperties);
    refreshScheduler = new MinioImageRefreshScheduler(jdbcTemplate, storage, semanticsService, minioProperties, objectMapper);
  }

  @AfterAll
  static void tearDownAll() {
    if (connectionPool != null) {
      connectionPool.dispose();
    }
  }

  @BeforeEach
  void setupSchema() throws Exception {
    jdbcTemplate.execute("drop table if exists product_config");
    jdbcTemplate.execute("create table product_config (id uuid primary key, name varchar(255), image_url varchar(2048))");
    jdbcTemplate.execute("create table if not exists column_semantics (" +
        "id bigint generated always as identity primary key, " +
        "domain varchar(255) not null, " +
        "table_name varchar(255) not null, " +
        "column_name varchar(255) not null, " +
        "semantic_type varchar(255) not null, " +
        "metadata text default '{}', " +
        "created_at timestamp default current_timestamp, " +
        "updated_at timestamp default current_timestamp)" );
    jdbcTemplate.execute("create unique index if not exists uq_column_semantics on column_semantics(table_name, column_name)");
    jdbcTemplate.update("delete from column_semantics");
    jdbcTemplate.update(
        "insert into column_semantics(domain, table_name, column_name, semantic_type, metadata, created_at, updated_at) " +
            "values (?,?,?,?,?, current_timestamp, current_timestamp)",
        "product",
        "product_config",
        "image_url",
        "MINIO:IMAGE",
        objectMapper.writeValueAsString(Map.of("maxImages", 1))
    );
  }

  @Test
  void listColumnsReflectsSemanticType() {
    List<ResponseDto.ColumnDto> columns = productService.listColumns();
    ResponseDto.ColumnDto imageColumn = columns.stream()
        .filter(col -> "image_url".equals(col.name()))
        .findFirst()
        .orElseThrow();

    assertThat(imageColumn.type()).isEqualTo(ResponseDto.ColumnType.MINIO_IMAGE);
    assertThat(imageColumn.semanticType()).isEqualTo("MINIO:IMAGE");
    assertThat(imageColumn.metadata()).containsEntry("maxImages", 1);
  }

  @Test
  void maxImagesConstraintIsEnforced() {
    UUID id = UUID.randomUUID();
    jdbcTemplate.update("insert into product_config (id, name, image_url) values (?,?,?)", id, "sample", null);

    Map<String, Object> payload = Map.of(
        "type", "MINIO_IMAGE",
        "items", List.of(
            Map.of("key", "key-1", "url", "https://example.com/1.jpg"),
            Map.of("key", "key-2", "url", "https://example.com/2.jpg")
        )
    );

    assertThatThrownBy(() -> productService.update(id, new ProductUpdateDto(Map.of("image_url", payload))))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("image");
  }

  @Test
  void uploadFlowStoresPresignedUrlAndExpiry() throws Exception {
    UUID id = UUID.randomUUID();
    jdbcTemplate.update("insert into product_config (id, name, image_url) values (?,?,?)", id, "sample", null);

    Instant expires = Instant.now().plusSeconds(3600);
    Map<String, Object> payload = Map.of(
        "type", "MINIO_IMAGE",
        "items", List.of(Map.of(
            "key", "key-1",
            "url", "https://example.com/1.jpg",
            "expiresAt", expires.toString()))
    );

    productService.update(id, new ProductUpdateDto(Map.of("image_url", payload)));

    String stored = jdbcTemplate.queryForObject("select image_url from product_config where id = ?", String.class, id);
    JsonNode node = objectMapper.readTree(stored);
    assertThat(node.path("type").asText()).isEqualTo("MINIO_IMAGE");
    assertThat(node.path("items").get(0).path("url").asText()).isEqualTo("https://example.com/1.jpg");
    assertThat(node.path("items").get(0).path("expiresAt").asText()).isEqualTo(expires.toString());
  }

  @Test
  void refreshJobUpdatesExpiringUrls() {
    UUID id = UUID.randomUUID();
    jdbcTemplate.update("insert into product_config (id, name, image_url) values (?,?,?)", id, "sample",
        "{\"type\":\"MINIO_IMAGE\",\"items\":[{\"key\":\"key-1\",\"url\":\"https://old.example/1.jpg\",\"expiresAt\":\"" +
            Instant.now().plusSeconds(60).toString() + "\"}]}"
    );

    refreshScheduler.refreshExpiringImages();

    String stored = jdbcTemplate.queryForObject("select image_url from product_config where id = ?", String.class, id);
    assertThat(stored).contains("https://refreshed.example/key-1");
  }

  private static class StaticObjectProvider implements ObjectProvider<MinioFileStorageService> {
    private final MinioFileStorageService delegate;

    StaticObjectProvider(MinioFileStorageService delegate) {
      this.delegate = delegate;
    }

    @Override
    public MinioFileStorageService getObject(Object... args) {
      return delegate;
    }

    @Override
    public MinioFileStorageService getIfAvailable() {
      return delegate;
    }

    @Override
    public MinioFileStorageService getIfUnique() {
      return delegate;
    }

    @Override
    public void forEach(Consumer<? super MinioFileStorageService> action) {
      action.accept(delegate);
    }

    @Override
    public Stream<MinioFileStorageService> orderedStream() {
      return Stream.of(delegate);
    }
  }
}

package com.mycroft.ema.ecom.common.files;

import com.mycroft.ema.ecom.common.metadata.ColumnSemantics;
import com.mycroft.ema.ecom.common.metadata.ColumnSemanticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/**
 * REST controller that handles MinIO uploads, validating payloads against semantic constraints before issuing presigned URLs.
 */
@RestController
@RequestMapping("/api/files")
@Tag(name = "Files", description = "Upload files to MinIO and get public URLs")
@ConditionalOnBean(MinioFileStorageService.class)
public class FileUploadController {

  private final MinioFileStorageService storage;
  private final ColumnSemanticsService semanticsService;
  private final MinioProperties properties;

  public FileUploadController(MinioFileStorageService storage,
                              ColumnSemanticsService semanticsService,
                              MinioProperties properties){
    this.storage = storage;
    this.semanticsService = semanticsService;
    this.properties = properties;
  }

  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAnyAuthority('product:create','product:update')")
  @Operation(summary = "Upload image/file", description = "Uploads a file to MinIO and returns a public URL. Store this URL in your dynamic column (e.g., photo)")
  public MinioFileStorageService.UploadResponse upload(@RequestParam("file") MultipartFile file,
                                                       @RequestParam(value = "domain", required = false) String domain,
                                                       @RequestParam(value = "field", required = false) String field){
    ColumnSemantics semantics = resolveSemantics(domain, field);
    validateFile(file, semantics);
    return storage.uploadImage(file, domain, field);
  }

  private ColumnSemantics resolveSemantics(String domain, String field) {
    if (!StringUtils.hasText(field)) {
      return null;
    }
    if (StringUtils.hasText(domain)) {
      return semanticsService.findByDomainAndColumn(domain, field).orElse(null);
    }
    return null;
  }

  private void validateFile(MultipartFile file, ColumnSemantics semantics) {
    if (file == null || file.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file provided");
    }
    long maxSize = semantics != null
        ? semantics.maxFileSizeBytes(properties.getMaxImageSizeBytes())
        : properties.getMaxImageSizeBytes();
    if (maxSize > 0 && file.getSize() > maxSize) {
      throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
          "File exceeds max allowed size of " + maxSize + " bytes");
    }
    String contentType = file.getContentType();
    List<String> allowed = semantics != null
        ? semantics.allowedMimeTypes(properties.getAllowedImageMimeTypes())
        : properties.getAllowedImageMimeTypes();
    if (allowed != null && !allowed.isEmpty() && StringUtils.hasText(contentType)) {
      String normalized = contentType.trim().toLowerCase(Locale.ROOT);
      boolean permitted = allowed.stream()
          .map(value -> value == null ? "" : value.trim().toLowerCase(Locale.ROOT))
          .anyMatch(value -> value.equals(normalized) || (value.endsWith("/*") && normalized.startsWith(value.substring(0, value.indexOf('/')))));
      if (!permitted) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "Unsupported file type '" + contentType + "'");
      }
    }
  }
}

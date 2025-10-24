package com.mycroft.ema.ecom.common.files;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@Tag(name = "Files", description = "Upload files to MinIO and get public URLs")
@ConditionalOnBean(MinioFileStorageService.class)
public class FileUploadController {

  private final MinioFileStorageService storage;

  public FileUploadController(MinioFileStorageService storage){
    this.storage = storage;
  }

  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAnyAuthority('product:create','product:update')")
  @Operation(summary = "Upload image/file", description = "Uploads a file to MinIO and returns a public URL. Store this URL in your dynamic column (e.g., photo)")
  public MinioFileStorageService.UploadResponse upload(@RequestParam("file") MultipartFile file,
                                                       @RequestParam(value = "domain", required = false) String domain,
                                                       @RequestParam(value = "field", required = false) String field){
    return storage.uploadImage(file, domain, field);
  }
}

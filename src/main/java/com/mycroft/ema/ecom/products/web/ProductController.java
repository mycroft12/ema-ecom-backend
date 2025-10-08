package com.mycroft.ema.ecom.products.web;

import com.mycroft.ema.ecom.common.web.PageResponse;
import com.mycroft.ema.ecom.products.dto.*;
import com.mycroft.ema.ecom.products.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@Tag(name = "Products", description = "Manage products")
public class ProductController {
  private final ProductService service;
  public ProductController(ProductService service){ this.service=service; }

  @GetMapping
  @PreAuthorize("hasAuthority('product:read')")
  @Operation(summary = "Search products", description = "Search by title or reference with pagination")
  public PageResponse<ProductViewDto> search(@RequestParam(required = false) String q,
                                             Pageable pageable){
    return PageResponse.of(service.search(q, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('product:read')")
  @Operation(summary = "Get product")
  public ProductViewDto get(@PathVariable UUID id){ return service.get(id); }

  @PostMapping
  @PreAuthorize("hasAuthority('product:create')")
  @Operation(summary = "Create product")
  public ProductViewDto create(@Valid @RequestBody ProductCreateDto dto){ return service.create(dto); }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('product:update')")
  @Operation(summary = "Update product")
  public ProductViewDto update(@PathVariable UUID id, @Valid @RequestBody ProductUpdateDto dto){ return service.update(id, dto); }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('product:delete')")
  @Operation(summary = "Delete product")
  public void delete(@PathVariable UUID id){ service.delete(id); }
}

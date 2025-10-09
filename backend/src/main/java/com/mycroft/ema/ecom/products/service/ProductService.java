package com.mycroft.ema.ecom.products.service;

import com.mycroft.ema.ecom.products.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ProductService {
  Page<ProductViewDto> search(String q, Pageable pageable);
  ProductViewDto create(ProductCreateDto dto);
  ProductViewDto update(UUID id, ProductUpdateDto dto);
  void delete(UUID id);
  ProductViewDto get(UUID id);
}

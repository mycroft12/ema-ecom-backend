package com.mycroft.ema.ecom.domains.products.service;

import com.mycroft.ema.ecom.domains.products.dto.ProductCreateDto;
import com.mycroft.ema.ecom.domains.products.dto.ProductUpdateDto;
import com.mycroft.ema.ecom.domains.products.dto.ProductViewDto;
import com.mycroft.ema.ecom.domains.products.dto.ResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ProductService {
  Page<ProductViewDto> search(String q, Pageable pageable);
  List<ResponseDto.ColumnDto> listColumns();
  ProductViewDto create(ProductCreateDto dto);
  ProductViewDto update(UUID id, ProductUpdateDto dto);
  void delete(UUID id);
  ProductViewDto get(UUID id);
}

package com.mycroft.ema.ecom.domains.products.service.impl;

import com.mycroft.ema.ecom.domains.hybrid.dto.HybridCreateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridResponseDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridUpdateDto;
import com.mycroft.ema.ecom.domains.hybrid.dto.HybridViewDto;
import com.mycroft.ema.ecom.domains.hybrid.service.HybridEntityService;
import com.mycroft.ema.ecom.domains.products.dto.ProductCreateDto;
import com.mycroft.ema.ecom.domains.products.dto.ProductUpdateDto;
import com.mycroft.ema.ecom.domains.products.dto.ProductViewDto;
import com.mycroft.ema.ecom.domains.products.dto.ResponseDto;
import com.mycroft.ema.ecom.domains.products.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

  private static final String ENTITY_TYPE = "product";

  private final HybridEntityService hybridService;

  public ProductServiceImpl(HybridEntityService hybridService) {
    this.hybridService = hybridService;
  }

  @Override
  public Page<ProductViewDto> search(String q, MultiValueMap<String, String> filters, Pageable pageable) {
    return hybridService.search(ENTITY_TYPE, q, filters, pageable)
        .map(this::toProductView);
  }

  @Override
  public List<ResponseDto.ColumnDto> listColumns() {
    return hybridService.listColumns(ENTITY_TYPE).stream()
        .map(this::toProductColumn)
        .toList();
  }

  @Override
  @Transactional
  public ProductViewDto create(ProductCreateDto dto) {
    HybridCreateDto hybridCreate = new HybridCreateDto(dto.attributes());
    return toProductView(hybridService.create(ENTITY_TYPE, hybridCreate));
  }

  @Override
  @Transactional
  public ProductViewDto update(UUID id, ProductUpdateDto dto) {
    HybridUpdateDto hybridUpdate = new HybridUpdateDto(dto.attributes());
    return toProductView(hybridService.update(ENTITY_TYPE, id, hybridUpdate));
  }

  @Override
  @Transactional
  public void delete(UUID id) {
    hybridService.delete(ENTITY_TYPE, id);
  }

  @Override
  public ProductViewDto get(UUID id) {
    return toProductView(hybridService.get(ENTITY_TYPE, id));
  }

  private ProductViewDto toProductView(HybridViewDto view) {
    Map<String, Object> attrs = view.attributes() == null ? Map.of() : view.attributes();
    return new ProductViewDto(view.id(), attrs);
  }

  private ResponseDto.ColumnDto toProductColumn(HybridResponseDto.ColumnDto column) {
    ResponseDto.ColumnType type = ResponseDto.ColumnType.valueOf(column.type().name());
    return new ResponseDto.ColumnDto(
        column.name(),
        column.displayName(),
        type,
        column.hidden(),
        column.displayOrder(),
        column.semanticType(),
        column.metadata()
    );
  }
}

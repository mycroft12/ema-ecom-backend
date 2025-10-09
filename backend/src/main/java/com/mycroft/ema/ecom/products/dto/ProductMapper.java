package com.mycroft.ema.ecom.products.dto;

import com.mycroft.ema.ecom.products.domain.Product;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface ProductMapper {
  Product toEntity(ProductCreateDto dto);
  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  void updateEntity(ProductUpdateDto dto, @MappingTarget Product entity);
  ProductViewDto toView(Product p);
}

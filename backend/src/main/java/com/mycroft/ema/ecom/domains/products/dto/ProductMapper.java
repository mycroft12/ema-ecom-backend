package com.mycroft.ema.ecom.domains.products.dto;

import com.mycroft.ema.ecom.domains.products.domain.Product;
import org.springframework.stereotype.Component;

import java.util.Map;
import org.springframework.context.annotation.Primary;

@Primary
@Component
public class ProductMapper {
  public Product toEntity(ProductCreateDto dto){
    // No static columns to set; return a new Product with only BaseEntity fields.
    return new Product();
  }
  public void updateEntity(ProductUpdateDto dto, Product entity){
    // No-op: dynamic fields are not represented on the entity.
  }
  public ProductViewDto toView(Product p){
    // We only expose id and an empty attributes map at this stage.
    return new ProductViewDto(p.getId(), Map.of());
  }
}

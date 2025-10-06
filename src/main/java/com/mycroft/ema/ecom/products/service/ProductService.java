package com.mycroft.ema.ecom.products.service;

import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.products.domain.Product;
import com.mycroft.ema.ecom.products.dto.*;
import com.mycroft.ema.ecom.products.repo.ProductRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ProductService {
  private final ProductRepository repo; private final ProductMapper mapper;
  public ProductService(ProductRepository repo, ProductMapper mapper){ this.repo=repo; this.mapper=mapper; }

  public Page<ProductViewDto> search(String q, Boolean active, Pageable pageable){
    Specification<Product> byName = (root, cq, cb) -> q==null ? null : cb.like(cb.lower(root.get("name")), "%"+q.toLowerCase()+"%");
    Specification<Product> byActive = (root, cq, cb) -> active==null?null: cb.equal(root.get("active"), active);
    Specification<Product> spec = Specification.allOf(byName, byActive);
    return repo.findAll(spec, pageable).map(mapper::toView);
  }
  public ProductViewDto create(ProductCreateDto dto){ return mapper.toView(repo.save(mapper.toEntity(dto))); }
  public ProductViewDto update(UUID id, ProductUpdateDto dto){ var p = repo.findById(id).orElseThrow(()->new NotFoundException("Product not found")); mapper.updateEntity(dto, p); return mapper.toView(repo.save(p)); }
  public void delete(UUID id){ repo.deleteById(id); }
  public ProductViewDto get(UUID id){ return repo.findById(id).map(mapper::toView).orElseThrow(()->new NotFoundException("Product not found")); }
}

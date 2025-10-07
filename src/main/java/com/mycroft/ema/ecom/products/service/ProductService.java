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

  public Page<ProductViewDto> search(String q, Pageable pageable){
    Specification<Product> byTitle = (root, cq, cb) -> q==null ? null : cb.like(cb.lower(root.get("title")), "%"+q.toLowerCase()+"%");
    Specification<Product> byReference = (root, cq, cb) -> q==null ? null : cb.like(cb.lower(root.get("reference")), "%"+q.toLowerCase()+"%");
    Specification<Product> spec = Specification.anyOf(byTitle, byReference);
    return repo.findAll(spec, pageable).map(mapper::toView);
  }
  public ProductViewDto create(ProductCreateDto dto){ return mapper.toView(repo.save(mapper.toEntity(dto))); }
  public ProductViewDto update(UUID id, ProductUpdateDto dto){ var p = repo.findById(id).orElseThrow(()->new NotFoundException("Product not found")); mapper.updateEntity(dto, p); return mapper.toView(repo.save(p)); }
  public void delete(UUID id){ repo.deleteById(id); }
  public ProductViewDto get(UUID id){ return repo.findById(id).map(mapper::toView).orElseThrow(()->new NotFoundException("Product not found")); }
}

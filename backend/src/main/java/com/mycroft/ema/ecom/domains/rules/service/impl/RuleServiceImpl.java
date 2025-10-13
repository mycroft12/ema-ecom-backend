package com.mycroft.ema.ecom.domains.rules.service.impl;

import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.domains.rules.domain.Rule;
import com.mycroft.ema.ecom.domains.rules.dto.RuleCreateDto;
import com.mycroft.ema.ecom.domains.rules.dto.RuleMapper;
import com.mycroft.ema.ecom.domains.rules.dto.RuleUpdateDto;
import com.mycroft.ema.ecom.domains.rules.dto.RuleViewDto;
import com.mycroft.ema.ecom.domains.rules.repo.RuleRepository;
import com.mycroft.ema.ecom.domains.rules.service.RuleEngine;
import com.mycroft.ema.ecom.domains.rules.service.RuleService;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class RuleServiceImpl implements RuleService {
  private final RuleRepository repo;
  private final RuleMapper mapper;
  private final RuleEngine engine;

  public RuleServiceImpl(RuleRepository repo, RuleMapper mapper, RuleEngine engine){
    this.repo=repo; this.mapper=mapper; this.engine=engine;
  }

  @Override
  public Page<RuleViewDto> search(String q, Boolean active, Pageable pageable){
    Specification<Rule> byName = (root, cq, cb) ->
            q==null? null : cb.like(cb.lower(root.get("name")), "%"+q.toLowerCase()+"%");
    Specification<Rule> byActive = (root, cq, cb) ->
            active==null?null:cb.equal(root.get("active"), active);
    Specification<Rule> spec = Specification.allOf(byName, byActive);
    return repo.findAll(spec, pageable).map(mapper::toView);
  }
  @Override
  public RuleViewDto create(RuleCreateDto dto){ return mapper.toView(repo.save(mapper.toEntity(dto))); }

  @Override
  public RuleViewDto update(UUID id, RuleUpdateDto dto){
    var r = repo.findById(id)
          .orElseThrow(()->new NotFoundException("Rule not found"));
    mapper.updateEntity(dto, r);
    return mapper.toView(repo.save(r));
  }

  @Override
  public void delete(UUID id){ repo.deleteById(id); }

  @Override
  public RuleViewDto get(UUID id){
    return repo.findById(id).map(mapper::toView)
            .orElseThrow(()->new NotFoundException("Rule not found"));
  }
}

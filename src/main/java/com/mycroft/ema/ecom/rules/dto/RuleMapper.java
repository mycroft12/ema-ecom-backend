package com.mycroft.ema.ecom.rules.dto;

import com.mycroft.ema.ecom.rules.domain.Rule;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface RuleMapper {
  Rule toEntity(RuleCreateDto dto);
  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  void updateEntity(RuleUpdateDto dto, @MappingTarget Rule entity);
  RuleViewDto toView(Rule r);
}

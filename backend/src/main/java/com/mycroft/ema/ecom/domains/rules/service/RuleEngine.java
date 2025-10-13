package com.mycroft.ema.ecom.domains.rules.service;

import com.mycroft.ema.ecom.domains.rules.domain.Rule;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class RuleEngine {
  public Map<String,Object> evaluate(Rule rule, Map<String,Object> facts){
    return Map.of("result","not-implemented");
  }
}

package com.mycroft.ema.ecom.domains.rules.repo;

import com.mycroft.ema.ecom.domains.rules.domain.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface RuleRepository extends JpaRepository<Rule, UUID>, JpaSpecificationExecutor<Rule> {}

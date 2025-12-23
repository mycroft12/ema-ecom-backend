package com.mycroft.ema.ecom.domains.dashboard.web;

import com.mycroft.ema.ecom.domains.dashboard.dto.DashboardKpiFilters;
import com.mycroft.ema.ecom.domains.dashboard.dto.DashboardKpiResponse;
import com.mycroft.ema.ecom.domains.dashboard.service.DashboardMetricsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard Metrics", description = "Aggregated KPIs for the dashboard cards")
public class DashboardMetricsController {

  private final DashboardMetricsService metricsService;

  public DashboardMetricsController(DashboardMetricsService metricsService) {
    this.metricsService = metricsService;
  }

  @GetMapping("/kpis")
  @PreAuthorize("hasAuthority('dashboard:view')")
  @Operation(summary = "Calculate dashboard KPIs using live data")
  public DashboardKpiResponse kpis(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
      @RequestParam(required = false) String agent,
      @RequestParam(required = false) String mediaBuyer,
      @RequestParam(required = false) String product
  ) {
    return metricsService.loadKpis(new DashboardKpiFilters(fromDate, toDate, agent, mediaBuyer, product));
  }
}

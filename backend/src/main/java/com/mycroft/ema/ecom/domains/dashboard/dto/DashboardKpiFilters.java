package com.mycroft.ema.ecom.domains.dashboard.dto;

import java.time.LocalDate;

public record DashboardKpiFilters(
    LocalDate fromDate,
    LocalDate toDate,
    String agent,
    String mediaBuyer,
    String product
) {
}

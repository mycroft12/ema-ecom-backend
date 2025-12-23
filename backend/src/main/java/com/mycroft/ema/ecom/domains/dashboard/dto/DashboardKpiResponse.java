package com.mycroft.ema.ecom.domains.dashboard.dto;

/**
 * KPI payload returned to the dashboard front-end.
 */
public record DashboardKpiResponse(
    double confirmationRate,
    double deliveryRate,
    double profitPerProduct,
    double agentCommission,
    double totalRevenue,
    double totalProfit,
    double averageOrderValue,
    double roas,
    double cac
) {
  public static DashboardKpiResponse empty() {
    return new DashboardKpiResponse(0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}

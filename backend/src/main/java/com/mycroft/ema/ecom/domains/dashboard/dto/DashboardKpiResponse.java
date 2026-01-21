package com.mycroft.ema.ecom.domains.dashboard.dto;

/**
 * KPI payload returned to the dashboard front-end.
 */
public record DashboardKpiResponse(
    long totalLeads,
    long totalConfirmedLeads,
    long totalDeliveredLeads,
    double totalAdsCost,
    double totalDeliveredAmount,
    double totalCostOfGoods,
    double totalCpl,
    double costPerDelivered,
    double averageDeliveredOrderValue,
    double confirmationRate,
    double deliveryRate
) {
  public static DashboardKpiResponse empty() {
    return new DashboardKpiResponse(0L, 0L, 0L, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}

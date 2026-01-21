package com.mycroft.ema.ecom.domains.dashboard.service;

import com.mycroft.ema.ecom.domains.dashboard.dto.DashboardKpiFilters;
import com.mycroft.ema.ecom.domains.dashboard.dto.DashboardKpiResponse;
import com.mycroft.ema.ecom.domains.imports.service.DomainImportService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class DashboardMetricsService {

  private static final List<String> CONFIRMED_STATUSES = List.of(
      "confirmer", "envoyer", "livrer", "saisie",
      "confirmed", "shipped", "delivered"
  );
  private static final List<String> DELIVERED_STATUSES = List.of("livrer", "delivered");

  private final DomainImportService domainImportService;
  private final JdbcTemplate jdbcTemplate;

  public DashboardMetricsService(DomainImportService domainImportService, JdbcTemplate jdbcTemplate) {
    this.domainImportService = domainImportService;
    this.jdbcTemplate = jdbcTemplate;
  }

  public DashboardKpiResponse loadKpis(DashboardKpiFilters filters) {
    Optional<String> ordersTable = tableForDomain("orders");
    if (ordersTable.isEmpty()) {
      return DashboardKpiResponse.empty();
    }
    Optional<String> adsTable = tableForDomain("ads");

    OrderMetrics orderMetrics = loadOrderMetrics(ordersTable.get(), filters);
    BigDecimal adSpend = adsTable.map(table -> loadAdSpend(table, filters)).orElse(BigDecimal.ZERO);
    BigDecimal totalCpl = adsTable.map(table -> loadTotalCpl(table, filters)).orElse(BigDecimal.ZERO);

    BigDecimal costPerDelivered = orderMetrics.deliveredOrders() > 0
        ? adSpend.divide(BigDecimal.valueOf(orderMetrics.deliveredOrders()), 2, RoundingMode.HALF_UP)
        : BigDecimal.ZERO;
    BigDecimal averageDelivered = orderMetrics.deliveredOrders() > 0
        ? orderMetrics.deliveredRevenue().divide(BigDecimal.valueOf(orderMetrics.deliveredOrders()), 2, RoundingMode.HALF_UP)
        : BigDecimal.ZERO;

    double confirmationRate = orderMetrics.totalOrders() > 0
        ? (double) orderMetrics.confirmedOrders() / (double) orderMetrics.totalOrders()
        : 0d;
    double deliveryRate = orderMetrics.confirmedOrders() > 0
        ? (double) orderMetrics.deliveredOrders() / (double) orderMetrics.confirmedOrders()
        : 0d;

    return new DashboardKpiResponse(
        orderMetrics.totalOrders(),
        orderMetrics.confirmedOrders(),
        orderMetrics.deliveredOrders(),
        adSpend.doubleValue(),
        orderMetrics.deliveredRevenue().doubleValue(),
        orderMetrics.deliveredCostOfGoods().doubleValue(),
        totalCpl.doubleValue(),
        costPerDelivered.doubleValue(),
        averageDelivered.doubleValue(),
        confirmationRate,
        deliveryRate
    );
  }

  private OrderMetrics loadOrderMetrics(String table, DashboardKpiFilters filters) {
    SqlClause base = buildOrdersWhere(table, filters);
    long totalOrders = queryForLong("select count(*) from " + table + base.where(), base.args());
    long confirmed = hasColumn(table, "status") ? countStatuses(table, base, CONFIRMED_STATUSES) : 0L;
    long delivered = hasColumn(table, "status") ? countStatuses(table, base, DELIVERED_STATUSES) : 0L;

    BigDecimal deliveredRevenue = sumStatusColumn(table, base, "total_price", DELIVERED_STATUSES);
    BigDecimal costOfGoods = sumStatusColumn(table, base, resolveCostOfGoodsColumn(table), DELIVERED_STATUSES);

    return new OrderMetrics(totalOrders, confirmed, delivered, deliveredRevenue, costOfGoods);
  }

  private BigDecimal loadAdSpend(String table, DashboardKpiFilters filters) {
    if (!hasColumn(table, "ad_spend")) {
      return BigDecimal.ZERO;
    }
    SqlClause base = buildAdsWhere(table, filters);
    return queryForBigDecimal("select coalesce(sum(ad_spend), 0) from " + table + base.where(), base.args());
  }

  private BigDecimal loadTotalCpl(String table, DashboardKpiFilters filters) {
    if (!hasColumn(table, "cpl")) {
      return BigDecimal.ZERO;
    }
    SqlClause base = buildAdsWhere(table, filters);
    return queryForBigDecimal("select coalesce(sum(cpl), 0) from " + table + base.where(), base.args());
  }

  private SqlClause buildOrdersWhere(String table, DashboardKpiFilters filters) {
    StringBuilder where = new StringBuilder(" where 1=1");
    List<Object> args = new ArrayList<>();
    appendDateRange(where, args, table, "created_at", filters.fromDate(), filters.toDate());

    if (StringUtils.hasText(filters.agent()) && hasColumn(table, "assigned_agent")) {
      where.append(" and lower(assigned_agent) like ?");
      args.add(like(filters.agent()));
    }
    if (StringUtils.hasText(filters.product()) && hasColumn(table, "product_summary")) {
      where.append(" and lower(product_summary) like ?");
      args.add(like(filters.product()));
    }
    return new SqlClause(where.toString(), args);
  }

  private SqlClause buildAdsWhere(String table, DashboardKpiFilters filters) {
    StringBuilder where = new StringBuilder(" where 1=1");
    List<Object> args = new ArrayList<>();
    appendDateRange(where, args, table, "spend_date", filters.fromDate(), filters.toDate());

    if (StringUtils.hasText(filters.mediaBuyer()) && hasColumn(table, "media_buyer")) {
      where.append(" and lower(media_buyer) like ?");
      args.add(like(filters.mediaBuyer()));
    }
    if (StringUtils.hasText(filters.product()) && hasColumn(table, "product_reference")) {
      where.append(" and lower(product_reference) like ?");
      args.add(like(filters.product()));
    }
    return new SqlClause(where.toString(), args);
  }

  private void appendDateRange(StringBuilder where, List<Object> args, String table, String column, LocalDate from, LocalDate to) {
    if (!StringUtils.hasText(column) || !hasColumn(table, column)) {
      return;
    }
    if (from != null) {
      where.append(" and ").append(column).append("::date >= ?");
      args.add(from);
    }
    if (to != null) {
      where.append(" and ").append(column).append("::date <= ?");
      args.add(to);
    }
  }

  private long countStatuses(String table, SqlClause base, List<String> statuses) {
    if (statuses == null || statuses.isEmpty()) {
      return 0L;
    }
    String placeholders = String.join(", ", statuses.stream().map(s -> "?").toList());
    String sql = "select count(*) from " + table + base.where() + " and lower(status) in (" + placeholders + ")";
    List<Object> args = new ArrayList<>(base.args());
    statuses.stream()
        .map(status -> status == null ? "" : status.toLowerCase(Locale.ROOT))
        .forEach(args::add);
    return queryForLong(sql, args);
  }

  private BigDecimal sumStatusColumn(String table, SqlClause base, String column, List<String> statuses) {
    if (!StringUtils.hasText(column)
        || !hasColumn(table, column)
        || !hasColumn(table, "status")
        || statuses == null
        || statuses.isEmpty()) {
      return BigDecimal.ZERO;
    }
    String placeholders = String.join(", ", statuses.stream().map(s -> "?").toList());
    String sql = "select coalesce(sum(" + column + "), 0) from " + table + base.where() + " and lower(status) in (" + placeholders + ")";
    List<Object> args = new ArrayList<>(base.args());
    statuses.stream()
        .map(status -> status == null ? "" : status.toLowerCase(Locale.ROOT))
        .forEach(args::add);
    return queryForBigDecimal(sql, args);
  }

  private BigDecimal queryForBigDecimal(String sql, List<Object> args) {
    try {
      BigDecimal result = jdbcTemplate.queryForObject(sql, args.toArray(), BigDecimal.class);
      return result == null ? BigDecimal.ZERO : result;
    } catch (Exception ex) {
      return BigDecimal.ZERO;
    }
  }

  private long queryForLong(String sql, List<Object> args) {
    try {
      Long result = jdbcTemplate.queryForObject(sql, args.toArray(), Long.class);
      return result == null ? 0L : result;
    } catch (Exception ex) {
      return 0L;
    }
  }

  private Optional<String> tableForDomain(String domain) {
    try {
      return Optional.ofNullable(domainImportService.tableForDomain(domain));
    } catch (Exception ex) {
      return Optional.empty();
    }
  }

  private boolean hasColumn(String table, String column) {
    if (!StringUtils.hasText(table) || !StringUtils.hasText(column)) {
      return false;
    }
    try {
      Boolean exists = jdbcTemplate.queryForObject("""
          select exists (
            select 1 from information_schema.columns 
            where table_schema = current_schema() and table_name = ? and column_name = ?
          )
          """, Boolean.class, table, column);
      return Boolean.TRUE.equals(exists);
    } catch (Exception ex) {
      return false;
    }
  }

  private String firstExistingColumn(String table, String... candidates) {
    if (candidates == null || candidates.length == 0) {
      return null;
    }
    return Arrays.stream(candidates)
        .filter(StringUtils::hasText)
        .map(name -> name.trim().toLowerCase(Locale.ROOT))
        .filter(name -> hasColumn(table, name))
        .findFirst()
        .orElse(null);
  }

  private String resolveCostOfGoodsColumn(String table) {
    return firstExistingColumn(table, "cost_of_goods", "cost_product", "product_cost", "cogs", "cost_goods");
  }

  private String like(String value) {
    return "%" + value.trim().toLowerCase(Locale.ROOT) + "%";
  }

  private record SqlClause(String where, List<Object> args) {
  }

  private record OrderMetrics(long totalOrders,
                              long confirmedOrders,
                              long deliveredOrders,
                              BigDecimal deliveredRevenue,
                              BigDecimal deliveredCostOfGoods) {
    public static OrderMetrics empty() {
      return new OrderMetrics(0L, 0L, 0L, BigDecimal.ZERO, BigDecimal.ZERO);
    }
  }
}

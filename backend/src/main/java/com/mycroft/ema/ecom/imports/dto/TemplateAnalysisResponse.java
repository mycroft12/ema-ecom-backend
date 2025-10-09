package com.mycroft.ema.ecom.imports.dto;

import java.util.List;

public class TemplateAnalysisResponse {
  private String tableName;
  private List<ColumnInfo> columns;
  private String createTableSql;
  private List<String> warnings;

  public TemplateAnalysisResponse(){}

  public TemplateAnalysisResponse(String tableName, List<ColumnInfo> columns, String createTableSql, List<String> warnings) {
    this.tableName = tableName;
    this.columns = columns;
    this.createTableSql = createTableSql;
    this.warnings = warnings;
  }

  public String getTableName() { return tableName; }
  public void setTableName(String tableName) { this.tableName = tableName; }
  public List<ColumnInfo> getColumns() { return columns; }
  public void setColumns(List<ColumnInfo> columns) { this.columns = columns; }
  public String getCreateTableSql() { return createTableSql; }
  public void setCreateTableSql(String createTableSql) { this.createTableSql = createTableSql; }
  public List<String> getWarnings() { return warnings; }
  public void setWarnings(List<String> warnings) { this.warnings = warnings; }
}
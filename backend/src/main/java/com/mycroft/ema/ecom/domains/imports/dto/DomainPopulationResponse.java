package com.mycroft.ema.ecom.domains.imports.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Response payload returned after populating an existing domain table from a CSV upload.
 */
public class DomainPopulationResponse {

  private String domain;
  private String tableName;
  private long rowsInserted;
  private boolean replacedExistingRows;
  private List<String> warnings;

  public DomainPopulationResponse() {
  }

  public DomainPopulationResponse(String domain,
                                  String tableName,
                                  long rowsInserted,
                                  boolean replacedExistingRows,
                                  List<String> warnings) {
    this.domain = domain;
    this.tableName = tableName;
    this.rowsInserted = rowsInserted;
    this.replacedExistingRows = replacedExistingRows;
    this.warnings = warnings == null ? new ArrayList<>() : new ArrayList<>(warnings);
  }

  public String getDomain() {
    return domain;
  }

  public void setDomain(String domain) {
    this.domain = domain;
  }

  public String getTableName() {
    return tableName;
  }

  public void setTableName(String tableName) {
    this.tableName = tableName;
  }

  public long getRowsInserted() {
    return rowsInserted;
  }

  public void setRowsInserted(long rowsInserted) {
    this.rowsInserted = rowsInserted;
  }

  public boolean isReplacedExistingRows() {
    return replacedExistingRows;
  }

  public void setReplacedExistingRows(boolean replacedExistingRows) {
    this.replacedExistingRows = replacedExistingRows;
  }

  public List<String> getWarnings() {
    if (warnings == null) {
      warnings = new ArrayList<>();
    }
    return warnings;
  }

  public void setWarnings(List<String> warnings) {
    this.warnings = warnings;
  }
}

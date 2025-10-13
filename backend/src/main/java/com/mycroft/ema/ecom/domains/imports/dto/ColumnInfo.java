package com.mycroft.ema.ecom.domains.imports.dto;

public class ColumnInfo {
  private String excelName; // header as in the Excel file
  private String name;      // normalized snake_case name
  private String inferredType; // STRING, INTEGER, DECIMAL, DATE, BOOLEAN
  private String sqlType;      // VARCHAR(255), BIGINT, NUMERIC(...), TIMESTAMP, BOOLEAN
  private boolean nullable;
  private String sampleValue;

  public ColumnInfo(){}

  public ColumnInfo(String excelName, String name, String inferredType, String sqlType, boolean nullable, String sampleValue){
    this.excelName = excelName;
    this.name = name;
    this.inferredType = inferredType;
    this.sqlType = sqlType;
    this.nullable = nullable;
    this.sampleValue = sampleValue;
  }

  public String getExcelName() { return excelName; }
  public void setExcelName(String excelName) { this.excelName = excelName; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getInferredType() { return inferredType; }
  public void setInferredType(String inferredType) { this.inferredType = inferredType; }
  public String getSqlType() { return sqlType; }
  public void setSqlType(String sqlType) { this.sqlType = sqlType; }
  public boolean isNullable() { return nullable; }
  public void setNullable(boolean nullable) { this.nullable = nullable; }
  public String getSampleValue() { return sampleValue; }
  public void setSampleValue(String sampleValue) { this.sampleValue = sampleValue; }
}
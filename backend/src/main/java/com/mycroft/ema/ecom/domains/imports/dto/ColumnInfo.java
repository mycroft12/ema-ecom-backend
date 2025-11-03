package com.mycroft.ema.ecom.domains.imports.dto;

/**
 * Descriptor for a column inferred from templates, containing both logical metadata and generated SQL definitions.
 */
public class ColumnInfo {
  private String excelName; // header as in the Excel file
  private String name;      // normalized snake_case name
  private String inferredType; // STRING, INTEGER, DECIMAL, DATE, BOOLEAN
  private String sqlType;      // VARCHAR(255), BIGINT, NUMERIC(...), TIMESTAMP, BOOLEAN
  private boolean nullable;
  private String sampleValue;
  private String semanticType; // e.g. MINIO:IMAGE
  private java.util.Map<String, Object> metadata;

  public ColumnInfo(){}

  public ColumnInfo(String excelName, String name, String inferredType, String sqlType, boolean nullable, String sampleValue){
    this.excelName = excelName;
    this.name = name;
    this.inferredType = inferredType;
    this.sqlType = sqlType;
    this.nullable = nullable;
    this.sampleValue = sampleValue;
  }

  public ColumnInfo(String excelName, String name, String inferredType, String sqlType, boolean nullable,
                    String sampleValue, String semanticType, java.util.Map<String, Object> metadata) {
    this(excelName, name, inferredType, sqlType, nullable, sampleValue);
    this.semanticType = semanticType;
    this.metadata = metadata;
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
  public String getSemanticType() { return semanticType; }
  public void setSemanticType(String semanticType) { this.semanticType = semanticType; }
  public java.util.Map<String, Object> getMetadata() { return metadata; }
  public void setMetadata(java.util.Map<String, Object> metadata) { this.metadata = metadata; }
}

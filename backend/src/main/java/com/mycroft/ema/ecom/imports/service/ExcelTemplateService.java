package com.mycroft.ema.ecom.imports.service;

import com.mycroft.ema.ecom.imports.dto.ColumnInfo;
import com.mycroft.ema.ecom.imports.dto.TemplateAnalysisResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class ExcelTemplateService {

  private static final int SAMPLE_ROWS = 100;
  private static final Pattern SNAKE_CASE_NON_ALNUM = Pattern.compile("[^a-z0-9_]");

  public TemplateAnalysisResponse analyzeTemplate(MultipartFile file, String tableName) {
    var warnings = new ArrayList<String>();
    try(InputStream is = file.getInputStream()){
      Workbook wb = WorkbookFactory.create(is);
      Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
      if(sheet == null){
        throw new IllegalArgumentException("The Excel file has no sheets");
      }
      Row header = sheet.getRow(sheet.getFirstRowNum());
      if(header == null){
        throw new IllegalArgumentException("The first row must contain headers");
      }

      List<String> headers = new ArrayList<>();
      for(int c = header.getFirstCellNum(); c < header.getLastCellNum(); c++){
        Cell cell = header.getCell(c);
        String h = cell != null ? cell.toString().trim() : null;
        if(h == null || h.isBlank()){
          headers.add("col_"+c);
          warnings.add("Empty header at column index "+c+", using default name col_"+c);
        }else{
          headers.add(h);
        }
      }

      List<ColumnInfo> columns = new ArrayList<>();
      Map<String, String> inferred = new LinkedHashMap<>();
      Map<String, String> samples = new HashMap<>();
      Map<String, Boolean> nullable = new HashMap<>();

      int firstDataRow = sheet.getFirstRowNum() + 1;
      int lastRow = Math.min(sheet.getLastRowNum(), firstDataRow + SAMPLE_ROWS);

      for(int i=0;i<headers.size();i++){
        inferred.put(headers.get(i), "UNKNOWN");
        nullable.put(headers.get(i), Boolean.FALSE);
      }

      for(int r = firstDataRow; r <= lastRow; r++){
        Row row = sheet.getRow(r);
        if(row == null) continue;
        for(int c = 0; c < headers.size(); c++){
          Cell cell = row.getCell(c);
          String head = headers.get(c);
          if(cell == null || cell.getCellType() == CellType.BLANK){
            nullable.put(head, Boolean.TRUE);
            continue;
          }
          Object val = getCellValue(cell);
          if(val == null){
            nullable.put(head, Boolean.TRUE);
            continue;
          }
          if(!samples.containsKey(head)) samples.put(head, val.toString());
          String cur = inferred.get(head);
          String now = typeOf(val);
          inferred.put(head, mergeTypes(cur, now));
        }
      }

      for(String h : headers){
        String norm = normalize(h);
        String inferredType = inferred.getOrDefault(h, "UNKNOWN");
        if("UNKNOWN".equals(inferredType)){
          inferredType = "STRING"; // fallback
          warnings.add("Column '"+h+"' has unknown type; defaulting to STRING");
        }
        String sqlType = sqlTypeFor(inferredType);
        boolean isNullable = nullable.getOrDefault(h, Boolean.TRUE);
        columns.add(new ColumnInfo(h, norm, inferredType, sqlType, isNullable, samples.get(h)));
      }

      String normalizedTable = normalize(tableName);
      String ddl = buildCreateTable(normalizedTable, columns);
      return new TemplateAnalysisResponse(normalizedTable, columns, ddl, warnings);
    }catch (Exception e){
      throw new RuntimeException("Failed to analyze Excel template: "+e.getMessage(), e);
    }
  }

  public byte[] generateExampleTemplate(String type){
    List<String> headers;
    String t = type == null ? "generic" : type.trim().toLowerCase(Locale.ROOT);
    switch (t){
      case "product" -> headers = List.of("Reference","Title","Description","Price","Stock","Is Active","Release Date");
      case "employee" -> headers = List.of("First Name","Last Name","Email","Phone","Hire Date","Salary","Is Manager");
      default -> headers = List.of("External Id","Name","Description","Quantity","Unit Price","Active","Created At");
    }
    try(Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream bos = new ByteArrayOutputStream()){
      Sheet sheet = wb.createSheet("Template");
      Row header = sheet.createRow(0);
      for(int i=0;i<headers.size();i++){
        Cell cell = header.createCell(i, CellType.STRING);
        cell.setCellValue(headers.get(i));
        sheet.autoSizeColumn(i);
      }
      // add one sample row with placeholders
      Row sample = sheet.createRow(1);
      for(int i=0;i<headers.size();i++){
        sample.createCell(i, CellType.STRING).setCellValue("<sample>");
      }
      wb.write(bos);
      return bos.toByteArray();
    }catch (Exception e){
      throw new RuntimeException("Failed to generate example template: "+e.getMessage(), e);
    }
  }

  private String normalize(String name){
    if(name == null) return "";
    String s = name.trim().toLowerCase(Locale.ROOT)
        .replaceAll("[\u00A0\s]+", "_");
    s = SNAKE_CASE_NON_ALNUM.matcher(s).replaceAll("");
    if(s.isEmpty()) s = "col";
    if(Character.isDigit(s.charAt(0))) s = "c_"+s;
    return s;
  }

  private Object getCellValue(Cell cell){
    return switch (cell.getCellType()){
      case STRING -> cell.getStringCellValue();
      case NUMERIC -> {
        if(DateUtil.isCellDateFormatted(cell)){
          Date d = cell.getDateCellValue();
          yield LocalDate.ofInstant(d.toInstant(), ZoneId.systemDefault());
        }
        double n = cell.getNumericCellValue();
        if(n == Math.rint(n)) yield (long) n; // integer
        yield BigDecimal.valueOf(n);
      }
      case BOOLEAN -> cell.getBooleanCellValue();
      case FORMULA -> {
        try{
          FormulaEvaluator ev = cell.getSheet().getWorkbook().getCreationHelper().createFormulaEvaluator();
          CellValue cv = ev.evaluate(cell);
          yield switch (cv.getCellType()){
            case STRING -> cv.getStringValue();
            case NUMERIC -> {
              if(DateUtil.isCellDateFormatted(cell)){
                Date d = cell.getDateCellValue();
                yield LocalDate.ofInstant(d.toInstant(), ZoneId.systemDefault());
              }
              double n = cv.getNumberValue();
              if(n == Math.rint(n)) yield (long) n; else yield BigDecimal.valueOf(n);
            }
            case BOOLEAN -> cv.getBooleanValue();
            default -> null;
          };
        }catch (Exception ex){
          yield null;
        }
      }
      default -> null;
    };
  }

  private String typeOf(Object val){
    if(val instanceof Boolean) return "BOOLEAN";
    if(val instanceof LocalDate) return "DATE";
    if(val instanceof Long || val instanceof Integer) return "INTEGER";
    if(val instanceof BigDecimal || val instanceof Double || val instanceof Float) return "DECIMAL";
    // try to coerce string
    if(val instanceof String s){
      if(s.isBlank()) return "STRING";
      try{ Long.parseLong(s); return "INTEGER"; }catch (Exception ignored){}
      try{ new BigDecimal(s); return "DECIMAL"; }catch (Exception ignored){}
      try{ LocalDate.parse(s); return "DATE"; }catch (Exception ignored){}
      if("true".equalsIgnoreCase(s) || "false".equalsIgnoreCase(s)) return "BOOLEAN";
      return "STRING";
    }
    return "STRING";
  }

  private String mergeTypes(String a, String b){
    if(a == null || "UNKNOWN".equals(a)) return b;
    if(b == null || "UNKNOWN".equals(b)) return a;
    if(a.equals(b)) return a;
    // if conflict, widen to STRING except DECIMAL+INTEGER -> DECIMAL, DATE+STRING -> STRING
    if((a.equals("DECIMAL") && b.equals("INTEGER")) || (a.equals("INTEGER") && b.equals("DECIMAL"))) return "DECIMAL";
    return "STRING";
  }

  private String sqlTypeFor(String inferred){
    return switch (inferred){
      case "INTEGER" -> "BIGINT";
      case "DECIMAL" -> "NUMERIC(19,2)";
      case "DATE" -> "TIMESTAMP";
      case "BOOLEAN" -> "BOOLEAN";
      default -> "VARCHAR(255)";
    };
  }

  private String buildCreateTable(String table, List<ColumnInfo> cols){
    StringBuilder sb = new StringBuilder();
    sb.append("CREATE TABLE IF NOT EXISTS ").append(table).append(" (\n");
    // add id if not present
    boolean hasId = cols.stream().anyMatch(c -> c.getName().equals("id"));
    if(!hasId){
      sb.append("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n");
    }
    for(int i=0;i<cols.size();i++){
      ColumnInfo c = cols.get(i);
      sb.append("  ").append(c.getName()).append(" ").append(c.getSqlType());
      if(!c.isNullable()) sb.append(" NOT NULL");
      if(i < cols.size()-1) sb.append(",");
      sb.append("\n");
    }
    sb.append(");");
    return sb.toString();
  }
}

package com.mycroft.ema.ecom.integration.google.dto;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record GoogleSheetTestResponse(
    List<String> headers,
    List<String> typeRow,
    long dataRowCount
) {

  public static GoogleSheetTestResponse fromValues(List<List<Object>> values) {
    if (values == null || values.isEmpty()) {
      return new GoogleSheetTestResponse(List.of(), List.of(), 0);
    }

    List<String> headers = toStringRow(values.get(0));
    List<String> typeRow = values.size() > 1 ? toStringRow(values.get(1)) : List.of();
    long dataRows = Math.max(values.size() - (typeRow.isEmpty() ? 1 : 2), 0);
    return new GoogleSheetTestResponse(headers, typeRow, dataRows);
  }

  private static List<String> toStringRow(List<Object> row) {
    if (row == null) {
      return Collections.emptyList();
    }
    List<String> result = new ArrayList<>(row.size());
    for (Object value : row) {
      result.add(value == null ? "" : value.toString());
    }
    return result;
  }
}

package com.mycroft.ema.ecom.domains.employees.service.impl;

import com.mycroft.ema.ecom.common.error.NotFoundException;
import com.mycroft.ema.ecom.domains.employees.dto.EmployeeCreateDto;
import com.mycroft.ema.ecom.domains.employees.dto.EmployeeUpdateDto;
import com.mycroft.ema.ecom.domains.employees.dto.EmployeeViewDto;
import com.mycroft.ema.ecom.domains.employees.service.EmployeeService;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class EmployeeServiceImpl implements EmployeeService {

  private final JdbcTemplate jdbc;
  private static final String TABLE = "employee_config";

  public EmployeeServiceImpl(JdbcTemplate jdbc){
    this.jdbc = jdbc;
  }

  @Override
  public Page<EmployeeViewDto> search(String q, Pageable pageable){
    long total = jdbc.queryForObject("select count(*) from " + TABLE, Long.class);
    int pageSize = pageable.getPageSize();
    int offset = (int) pageable.getOffset();
    List<Map<String, Object>> rows = jdbc.queryForList(
        "select * from " + TABLE + " order by id limit ? offset ?", pageSize, offset);
    List<EmployeeViewDto> content = new ArrayList<>();
    for(Map<String, Object> row : rows){
      UUID id = row.get("id") == null ? null : UUID.fromString(row.get("id").toString());
      Map<String, Object> attrs = new LinkedHashMap<>(row);
      attrs.remove("id");
      content.add(new EmployeeViewDto(id, attrs));
    }
    return new PageImpl<>(content, pageable, total);
  }

  @Override
  public EmployeeViewDto create(EmployeeCreateDto dto){
    Map<String, Object> attrs = dto.attributes() == null ? Collections.emptyMap() : dto.attributes();
    Set<String> valid = tableColumns();
    List<String> cols = new ArrayList<>();
    List<Object> vals = new ArrayList<>();
    for (Map.Entry<String,Object> e : attrs.entrySet()){
      String col = e.getKey();
      if ("id".equalsIgnoreCase(col)) continue;
      if (valid.contains(col)){
        cols.add(col);
        vals.add(e.getValue());
      }
    }
    UUID id;
    if(cols.isEmpty()){
      id = jdbc.queryForObject("insert into " + TABLE + " default values returning id", UUID.class);
    }else{
      String placeholders = String.join(", ", Collections.nCopies(cols.size(), "?"));
      String columns = String.join(", ", cols);
      String sql = "insert into " + TABLE + " (" + columns + ") values (" + placeholders + ") returning id";
      id = jdbc.queryForObject(sql, vals.toArray(), UUID.class);
    }
    return get(id);
  }

  @Override
  public EmployeeViewDto update(UUID id, EmployeeUpdateDto dto){
    Map<String, Object> attrs = dto.attributes() == null ? Collections.emptyMap() : dto.attributes();
    if(attrs.isEmpty()){
      return get(id);
    }
    Set<String> valid = tableColumns();
    List<String> sets = new ArrayList<>();
    List<Object> vals = new ArrayList<>();
    for (Map.Entry<String,Object> e : attrs.entrySet()){
      String col = e.getKey();
      if ("id".equalsIgnoreCase(col)) continue;
      if (valid.contains(col)){
        sets.add(col + " = ?");
        vals.add(e.getValue());
      }
    }
    if(!sets.isEmpty()){
      String sql = "update " + TABLE + " set " + String.join(", ", sets) + " where id = ?";
      vals.add(id);
      jdbc.update(sql, vals.toArray());
    }
    return get(id);
  }

  @Override
  public void delete(UUID id){
    jdbc.update("delete from " + TABLE + " where id = ?", id);
  }

  @Override
  public EmployeeViewDto get(UUID id){
    try {
      Map<String, Object> row = jdbc.queryForMap("select * from " + TABLE + " where id = ?", id);
      Map<String, Object> attrs = new LinkedHashMap<>(row);
      attrs.remove("id");
      return new EmployeeViewDto(id, attrs);
    } catch (EmptyResultDataAccessException ex){
      throw new NotFoundException("Employee not found");
    }
  }

  private Set<String> tableColumns(){
    return new HashSet<>(jdbc.queryForList(
        "select column_name from information_schema.columns where table_name = ?",
        String.class, TABLE));
  }
}

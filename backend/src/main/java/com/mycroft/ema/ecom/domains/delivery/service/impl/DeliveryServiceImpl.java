package com.mycroft.ema.ecom.domains.delivery.service.impl;

import com.mycroft.ema.ecom.domains.delivery.dto.DeliveryProviderCreateUpdateDto;
import com.mycroft.ema.ecom.domains.delivery.dto.DeliveryProviderDto;
import com.mycroft.ema.ecom.domains.delivery.service.DeliveryService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class DeliveryServiceImpl implements DeliveryService {

    private final JdbcTemplate jdbc;
    private static final String TABLE = "delivery_config";

    public DeliveryServiceImpl(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private DeliveryProviderDto mapRow(Map<String, Object> row){
        UUID id = row.get("id") == null ? null : UUID.fromString(row.get("id").toString());
        Map<String, Object> attrs = new LinkedHashMap<>(row);
        attrs.remove("id");
        return new DeliveryProviderDto(id, attrs);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryProviderDto> findAll() {
        List<Map<String,Object>> rows = jdbc.queryForList("select * from " + TABLE + " order by id");
        List<DeliveryProviderDto> list = new ArrayList<>();
        for (Map<String,Object> r : rows){
            list.add(mapRow(r));
        }
        return list;
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryProviderDto get(UUID id) {
        Map<String, Object> row = jdbc.queryForMap("select * from " + TABLE + " where id = ?", id);
        return mapRow(row);
    }

    @Override
    public DeliveryProviderDto create(DeliveryProviderCreateUpdateDto dto) {
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
    public DeliveryProviderDto update(UUID id, DeliveryProviderCreateUpdateDto dto) {
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
    public void delete(UUID id) {
        jdbc.update("delete from " + TABLE + " where id = ?", id);
    }

    private Set<String> tableColumns(){
        return new HashSet<>(jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = ?",
                String.class, TABLE));
    }
}

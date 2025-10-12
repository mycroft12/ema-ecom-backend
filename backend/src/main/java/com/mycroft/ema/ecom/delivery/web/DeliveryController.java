package com.mycroft.ema.ecom.delivery.web;

import com.mycroft.ema.ecom.delivery.dto.DeliveryProviderCreateUpdateDto;
import com.mycroft.ema.ecom.delivery.dto.DeliveryProviderDto;
import com.mycroft.ema.ecom.delivery.service.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/delivery-providers")
@Tag(name = "Delivery Providers", description = "Manage delivery providers and types")
public class DeliveryController {

    private final DeliveryService service;

    public DeliveryController(DeliveryService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List delivery providers")
    @PreAuthorize("hasAuthority('delivery:read')")
    public ResponseEntity<List<DeliveryProviderDto>> list(){
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a delivery provider by ID")
    @PreAuthorize("hasAuthority('delivery:read')")
    public ResponseEntity<DeliveryProviderDto> get(@PathVariable UUID id){
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    @Operation(summary = "Create a delivery provider")
    @PreAuthorize("hasAuthority('delivery:create')")
    public ResponseEntity<DeliveryProviderDto> create(@Valid @RequestBody DeliveryProviderCreateUpdateDto dto){
        var created = service.create(dto);
        return ResponseEntity.created(URI.create("/api/delivery-providers/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a delivery provider")
    @PreAuthorize("hasAuthority('delivery:update')")
    public ResponseEntity<DeliveryProviderDto> update(@PathVariable UUID id, @Valid @RequestBody DeliveryProviderCreateUpdateDto dto){
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a delivery provider")
    @PreAuthorize("hasAuthority('delivery:delete')")
    public ResponseEntity<Void> delete(@PathVariable UUID id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}

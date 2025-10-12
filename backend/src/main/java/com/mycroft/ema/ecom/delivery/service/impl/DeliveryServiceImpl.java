package com.mycroft.ema.ecom.delivery.service.impl;

import com.mycroft.ema.ecom.delivery.domain.DeliveryProvider;
import com.mycroft.ema.ecom.delivery.dto.DeliveryProviderCreateUpdateDto;
import com.mycroft.ema.ecom.delivery.dto.DeliveryProviderDto;
import com.mycroft.ema.ecom.delivery.repo.DeliveryProviderRepository;
import com.mycroft.ema.ecom.delivery.service.DeliveryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class DeliveryServiceImpl implements DeliveryService {

    private final DeliveryProviderRepository repo;

    public DeliveryServiceImpl(DeliveryProviderRepository repo) {
        this.repo = repo;
    }

    private DeliveryProviderDto toDto(DeliveryProvider e){
        return new DeliveryProviderDto(
                e.getId(), e.getName(), e.getType(), e.getContactName(), e.getContactEmail(), e.getContactPhone(), e.isActive()
        );
    }

    private void apply(DeliveryProvider e, DeliveryProviderCreateUpdateDto dto){
        e.setName(dto.name());
        e.setType(dto.type());
        e.setContactName(dto.contactName());
        e.setContactEmail(dto.contactEmail());
        e.setContactPhone(dto.contactPhone());
        if (dto.active() != null) e.setActive(dto.active());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryProviderDto> findAll() {
        return repo.findAll().stream().map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryProviderDto get(UUID id) {
        var e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Delivery provider not found"));
        return toDto(e);
    }

    @Override
    public DeliveryProviderDto create(DeliveryProviderCreateUpdateDto dto) {
        var e = new DeliveryProvider();
        apply(e, dto);
        return toDto(repo.save(e));
    }

    @Override
    public DeliveryProviderDto update(UUID id, DeliveryProviderCreateUpdateDto dto) {
        var e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Delivery provider not found"));
        apply(e, dto);
        return toDto(repo.save(e));
    }

    @Override
    public void delete(UUID id) {
        if (!repo.existsById(id)) throw new IllegalArgumentException("Delivery provider not found");
        repo.deleteById(id);
    }
}

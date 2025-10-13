package com.mycroft.ema.ecom.domains.delivery.service;

import com.mycroft.ema.ecom.domains.delivery.dto.DeliveryProviderCreateUpdateDto;
import com.mycroft.ema.ecom.domains.delivery.dto.DeliveryProviderDto;

import java.util.List;
import java.util.UUID;

public interface DeliveryService {
    List<DeliveryProviderDto> findAll();
    DeliveryProviderDto get(UUID id);
    DeliveryProviderDto create(DeliveryProviderCreateUpdateDto dto);
    DeliveryProviderDto update(UUID id, DeliveryProviderCreateUpdateDto dto);
    void delete(UUID id);
}

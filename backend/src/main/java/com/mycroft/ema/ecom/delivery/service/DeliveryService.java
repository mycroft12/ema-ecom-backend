package com.mycroft.ema.ecom.delivery.service;

import com.mycroft.ema.ecom.delivery.dto.DeliveryProviderCreateUpdateDto;
import com.mycroft.ema.ecom.delivery.dto.DeliveryProviderDto;

import java.util.List;
import java.util.UUID;

public interface DeliveryService {
    List<DeliveryProviderDto> findAll();
    DeliveryProviderDto get(UUID id);
    DeliveryProviderDto create(DeliveryProviderCreateUpdateDto dto);
    DeliveryProviderDto update(UUID id, DeliveryProviderCreateUpdateDto dto);
    void delete(UUID id);
}

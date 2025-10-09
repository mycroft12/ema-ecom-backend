package com.mycroft.ema.ecom.common.error;

public class NotFoundException extends RuntimeException {
  public NotFoundException(String message){
    super(message);
  }
}

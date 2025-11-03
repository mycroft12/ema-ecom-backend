package com.mycroft.ema.ecom.common.error;

/**
 * Runtime exception indicating a requested resource was not located and should result in an HTTP 404.
 */
public class NotFoundException extends RuntimeException {
  public NotFoundException(String message){
    super(message);
  }
}

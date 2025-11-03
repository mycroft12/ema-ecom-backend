package com.mycroft.ema.ecom.common.error;

/**
 * Runtime exception used for validation or client input issues that should translate to a 400 Bad Request response.
 */
public class BadRequestException extends RuntimeException {
  public BadRequestException(String message) {
    super(message);
  }

  public BadRequestException(String message, Throwable cause) {
    super(message, cause);
  }
}

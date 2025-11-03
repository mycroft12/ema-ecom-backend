package com.mycroft.ema.ecom.auth.service;

/**
 * Authentication boundary providing login, refresh and logout workflows.
 */
public interface AuthService {
  /**
   * Credentials provided by a client when initiating a login operation.
   */
  record LoginRequest(String username, String password) {}

  /**
   * Pair of access and refresh tokens returned upon successful authentication.
   */
  record TokenPair(String accessToken, String refreshToken) {}

  TokenPair login(LoginRequest req);
  TokenPair refresh(String refreshToken);
  void logout(String refreshToken);
}

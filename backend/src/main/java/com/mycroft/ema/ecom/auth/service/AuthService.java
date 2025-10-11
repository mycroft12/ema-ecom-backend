package com.mycroft.ema.ecom.auth.service;

public interface AuthService {
  record LoginRequest(String username, String password) {}
  record TokenPair(String accessToken, String refreshToken) {}

  TokenPair login(LoginRequest req);
  TokenPair refresh(String refreshToken);
  void logout(String refreshToken);

  /**
   * Initiate a forgot password flow for the given identifier (username or email).
   * Implementations should not reveal whether the user exists.
   */
  void forgotPassword(String identifier);
}

package com.mycroft.ema.ecom.auth.service;

public interface AuthService {
  record LoginRequest(String username, String password) {}
  record TokenPair(String accessToken, String refreshToken) {}

  TokenPair login(LoginRequest req);
  TokenPair refresh(String refreshToken);
  void logout(String refreshToken);
}

package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.dto.RefreshRequest;
import com.mycroft.ema.ecom.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Authentication APIs: login, refresh, logout")
public class AuthController {

  private final AuthService auth;

  public AuthController(AuthService auth){
    this.auth = auth;
  }

  @PostMapping("/login")
  @Operation(summary = "Login", description = "Authenticate with username/password and receive access + refresh tokens")
  public ResponseEntity<AuthService.TokenPair> login(@RequestBody AuthService.LoginRequest req){
    return ResponseEntity.ok(auth.login(req));
  }

  @PostMapping("/refresh")
  @Operation(summary = "Refresh Access Token", description = "Exchange a valid refresh token for a new access token")
  public ResponseEntity<AuthService.TokenPair> refresh(@RequestBody RefreshRequest req){
    return ResponseEntity.ok(auth.refresh(req.refreshToken()));
  }

  @PostMapping("/logout")
  @Operation(summary = "Logout", description = "Revoke the provided refresh token")
  public ResponseEntity<Void> logout(@RequestBody RefreshRequest req){
    auth.logout(req.refreshToken());
    return ResponseEntity.noContent().build();
  }

}

package com.mycroft.ema.ecom.auth.web;

import com.mycroft.ema.ecom.auth.service.AuthService;
import org.springframework.http.ResponseEntity; import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {

  private final AuthService auth;

  public AuthController(AuthService auth){
    this.auth = auth;
  }

  @PostMapping("/login")
  public ResponseEntity<AuthService.TokenPair> login(@RequestBody AuthService.LoginRequest req){
    return ResponseEntity.ok(auth.login(req));
  }

  public record RefreshRequest(String refreshToken){}

  @PostMapping("/refresh")
  public ResponseEntity<AuthService.TokenPair> refresh(@RequestBody RefreshRequest req){
    return ResponseEntity.ok(auth.refresh(req.refreshToken()));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(@RequestBody RefreshRequest req){
    auth.logout(req.refreshToken());
    return ResponseEntity.noContent().build();
  }

}

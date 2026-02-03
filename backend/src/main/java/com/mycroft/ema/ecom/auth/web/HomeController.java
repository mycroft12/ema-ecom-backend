package com.mycroft.ema.ecom.auth.web;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class HomeController {

  @GetMapping("/")
  public String ok() {
    return "EMA ECOM backend is running ✅";
  }
}

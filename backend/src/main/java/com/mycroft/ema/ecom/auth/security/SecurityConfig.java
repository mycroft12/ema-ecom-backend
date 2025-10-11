package com.mycroft.ema.ecom.auth.security;

import com.mycroft.ema.ecom.auth.repo.UserRepository;
import com.mycroft.ema.ecom.auth.service.AccessControlService;
import com.mycroft.ema.ecom.auth.service.JwtService;
import com.mycroft.ema.ecom.auth.domain.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException; import java.util.Collection;

@Configuration
@EnableAutoConfiguration(exclude = UserDetailsServiceAutoConfiguration.class)
public class SecurityConfig {
  @Bean PasswordEncoder passwordEncoder(){ return new BCryptPasswordEncoder(); }

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable);
    http.cors(cors -> {});
    http.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
    http.authorizeHttpRequests(auth -> auth
        .requestMatchers("/v3/api-docs/**","/swagger-ui/**","/swagger-ui.html","/swagger","/swagger-ui","/actuator/health").permitAll()
        .requestMatchers(HttpMethod.POST,"/api/auth/login","/api/auth/refresh","/api/auth/forgot-password").permitAll()
        .anyRequest().authenticated());
    http.addFilterBefore(jwtFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwt, UserRepository users, AccessControlService ac){
    return new JwtAuthenticationFilter(jwt, users, ac);
  }

  static class JwtAuthenticationToken extends AbstractAuthenticationToken {
    private final User principal;

    JwtAuthenticationToken(User user, Collection<SimpleGrantedAuthority> auth){
      super(auth); this.principal=user; setAuthenticated(true);
    }

    @Override public Object getCredentials(){
      return "";
    }

    @Override public Object getPrincipal(){
      return principal;
    }

  }

  static class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;
    private final AccessControlService ac;

    JwtAuthenticationFilter(JwtService jwt, UserRepository users, AccessControlService ac){
      this.jwt=jwt;
      this.users=users;
      this.ac=ac;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
      var header = req.getHeader("Authorization");
      if(header != null && header.startsWith("Bearer ")){
        var token = header.substring(7);
        try{
          var decoded = jwt.verify(token);
          var userId = java.util.UUID.fromString(decoded.getSubject());
          var user = users.findById(userId).orElse(null);
          if(user != null && user.isEnabled()){
            var permissions = ac.permissions(user).stream().map(SimpleGrantedAuthority::new).toList();
            var roles = user.getRoles().stream().map(r -> new SimpleGrantedAuthority("ROLE_"+r.getName())).toList();
            var authorities = new java.util.ArrayList<>(permissions); authorities.addAll(roles);
            var auth = new JwtAuthenticationToken(user, authorities);
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
          }
        }catch (Exception ignored){ }
      }
      chain.doFilter(req, res);
    }
  }
}

package com.mycroft.ema.ecom.auth.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;
import java.util.Set;

/**
 * User entity capturing login credentials, contact information and granted roles.
 */
@Entity @Table(name="users")
@Getter @Setter
public class User extends BaseEntity {
  @Column(unique = true, nullable = false) private String username;
  @Column(unique = true) private String email; // optional but unique when set
  @Column(nullable = false) private String password; // bcrypt
  @Column(nullable = false) private boolean enabled = true;

  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name="users_roles",
      joinColumns = @JoinColumn(name="user_id"),
      inverseJoinColumns = @JoinColumn(name="role_id"))
  private Set<Role> roles;
}

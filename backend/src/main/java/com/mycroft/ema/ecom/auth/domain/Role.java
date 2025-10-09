package com.mycroft.ema.ecom.auth.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;

import java.util.Set;

@Entity
@Table(name="roles")
@Getter @Setter
public class Role extends BaseEntity {
  @Column(unique = true, nullable = false)
  private String name; // ADMIN, MANAGER // EMPLOYEE_LIVREUR_SCT // EMPLOYEE_LIVREUR_INDIVI
  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name="roles_permissions",
      joinColumns = @JoinColumn(name="role_id"),
      inverseJoinColumns = @JoinColumn(name="permission_id"))
  private Set<Permission> permissions = Set.of();
}

package com.mycroft.ema.ecom.employees.domain;

import com.mycroft.ema.ecom.common.persistence.BaseEntity;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;

@Entity
@Table(name="employees")
@Getter
@Setter
public class Employee extends BaseEntity {
  @Column(nullable=false)
  private String firstName;

  @Column(nullable=false)
  private String lastName;

  @Enumerated(EnumType.STRING)
  @Column(nullable=false)
  private EmployeeType type;

  private String companyName;
  private String phone;
  private String email;
}

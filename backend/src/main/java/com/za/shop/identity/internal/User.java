package com.za.shop.identity.internal;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.za.shop.identity.Role;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private String email;

    private String passwordHash;

    private String firstName;

    private String lastName;

    private boolean emailVerified;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = new HashSet<>();

    private Instant deletedAt;

    private Instant createdAt;

    private Instant updatedAt;

    @Version
    private Long version;

    protected User() {
    }

    public User(String email, String passwordHash, String firstName, String lastName, Instant now) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.firstName = firstName;
        this.lastName = lastName;
        this.roles.add(Role.CUSTOMER);
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void changePassword(String newPasswordHash, Instant now) {
        this.passwordHash = newPasswordHash;
        this.updatedAt = now;
    }

    /** Erases the personal data. The row stays so that orders keep a valid (but unreachable) owner. */
    public void anonymize(String placeholderEmail, String unusablePasswordHash, Instant now) {
        this.email = placeholderEmail;
        this.passwordHash = unusablePasswordHash;
        this.firstName = "Deleted";
        this.lastName = "customer";
        this.emailVerified = false;
        this.deletedAt = now;
        this.updatedAt = now;
    }

    public void markEmailVerified(Instant now) {
        this.emailVerified = true;
        this.updatedAt = now;
    }

    public void grant(Role role, Instant now) {
        if (roles.add(role)) {
            this.updatedAt = now;
        }
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public Set<Role> getRoles() {
        return Set.copyOf(roles);
    }
}

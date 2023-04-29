package com.ZA.Shop.Interfaces;

import com.ZA.Shop.database.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RoleRepository extends JpaRepository<Role,Long> {

    @Query("SELECT u FROM Role u WHERE u.name = ?1")
    public Role findroleByName(String name);
}

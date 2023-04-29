package com.ZA.Shop.Services;

import com.ZA.Shop.Interfaces.RoleRepository;
import com.ZA.Shop.database.Role;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RoleServices {

    @Autowired
    private RoleRepository roleRepository;

    @PostConstruct
    public void init() {
        if (roleRepository.findroleByName("Admin") == null) {
            Role adminRole = new Role(1,"Admin");
            roleRepository.save(adminRole);
        }

        if (roleRepository.findroleByName("User") == null) {
            Role userRole = new Role(2,"User");
            roleRepository.save(userRole);
        }
    }
}


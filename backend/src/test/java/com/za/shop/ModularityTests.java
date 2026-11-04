package com.za.shop;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/**
 * Fails the build when a module reaches into another module's internals or when modules depend on
 * each other in a cycle — the rules that keep the monolith splittable into services later.
 */
class ModularityTests {

    private final ApplicationModules modules = ApplicationModules.of(ShopApplication.class);

    @Test
    void modulesRespectTheirBoundaries() {
        modules.verify();
    }

    @Test
    void writeModuleDocumentation() {
        // Generates PlantUML component diagrams and module canvases into target/spring-modulith-docs.
        new Documenter(modules).writeDocumentation();
    }
}

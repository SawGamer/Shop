package com.za.shop.catalog.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    Optional<Product> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    boolean existsByBrandId(UUID brandId);

    @Query("select p.id from Product p where p.status = com.za.shop.catalog.internal.ProductStatus.ACTIVE order by p.id")
    Page<UUID> findActiveIds(Pageable pageable);

    @Query("select p.id from Product p where p.brand.id = :brandId")
    List<UUID> findIdsByBrand(UUID brandId);

    @Query("select p.id from Product p join p.categories c where c.id = :categoryId")
    List<UUID> findIdsByCategory(UUID categoryId);
}

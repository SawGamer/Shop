package com.za.shop.catalog.internal;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, UUID id);

    @Query("select v from ProductVariant v join fetch v.product p join fetch p.brand where v.id in :ids")
    List<ProductVariant> findWithProduct(Collection<UUID> ids);

    @Query("select distinct v.product.id from ProductVariant v where v.id in :ids")
    List<UUID> findProductIds(Collection<UUID> ids);
}

package com.za.shop.catalog.internal;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * Aggregate root of the catalog. All associations are LAZY (loaded in batches when needed): the
 * old app loaded every image of every product on every page, which cannot scale.
 */
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private String slug;

    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    @Enumerated(EnumType.STRING)
    private ProductStatus status;

    @ManyToMany
    @JoinTable(name = "product_categories", joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<Category> categories = new HashSet<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position asc, createdAt asc")
    private List<ProductVariant> variants = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position asc, createdAt asc")
    private List<ProductImage> images = new ArrayList<>();

    private Instant createdAt;

    private Instant updatedAt;

    @Version
    private Long version;

    protected Product() {
    }

    public Product(String slug, String name, String description, Brand brand, ProductStatus status, Instant now) {
        this.slug = slug;
        this.name = name;
        this.description = description;
        this.brand = brand;
        this.status = status;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String slug, String name, String description, Brand brand, ProductStatus status,
            Set<Category> categories, Instant now) {
        this.slug = slug;
        this.name = name;
        this.description = description;
        this.brand = brand;
        this.status = status;
        this.categories.clear();
        this.categories.addAll(categories);
        touch(now);
    }

    public void archive(Instant now) {
        this.status = ProductStatus.ARCHIVED;
        touch(now);
    }

    public void touch(Instant now) {
        this.updatedAt = now;
    }

    public boolean isPublished() {
        return status == ProductStatus.ACTIVE && !variants.isEmpty();
    }

    public UUID getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Brand getBrand() {
        return brand;
    }

    public ProductStatus getStatus() {
        return status;
    }

    public Set<Category> getCategories() {
        return categories;
    }

    public List<ProductVariant> getVariants() {
        return variants;
    }

    public List<ProductImage> getImages() {
        return images;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

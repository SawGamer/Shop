package com.za.shop.catalog.internal;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** One line of a product's specification, e.g. "Display › Screen size = 6.4″". */
@Entity
@Table(name = "product_specs")
public class ProductSpec {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    private int position;

    private String specKey;

    private String specGroup;

    private String label;

    private String specValue;

    private boolean filterable;

    protected ProductSpec() {
    }

    public ProductSpec(Product product, int position, String specKey, String specGroup, String label,
            String specValue, boolean filterable) {
        this.product = product;
        this.position = position;
        this.specKey = specKey;
        this.specGroup = specGroup;
        this.label = label;
        this.specValue = specValue;
        this.filterable = filterable;
    }

    /** "8 GB RAM": the value followed by the label, used as a short highlight on product cards. */
    public String highlight() {
        return specValue + " " + label;
    }

    public String getSpecKey() {
        return specKey;
    }

    public String getSpecGroup() {
        return specGroup;
    }

    public String getLabel() {
        return label;
    }

    public String getSpecValue() {
        return specValue;
    }

    public boolean isFilterable() {
        return filterable;
    }
}

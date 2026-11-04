package com.za.shop.catalog.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.za.shop.catalog.internal.CatalogDtos.AdminProductDto;
import com.za.shop.catalog.internal.CatalogDtos.AdminProductSummaryDto;
import com.za.shop.catalog.internal.CatalogDtos.BrandDto;
import com.za.shop.catalog.internal.CatalogDtos.BrandUpsert;
import com.za.shop.catalog.internal.CatalogDtos.CategoryNode;
import com.za.shop.catalog.internal.CatalogDtos.CategoryUpsert;
import com.za.shop.catalog.internal.CatalogDtos.ProductUpsert;
import com.za.shop.catalog.internal.CatalogDtos.VariantUpsert;
import com.za.shop.shared.PageResponse;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin: catalog")
class AdminCatalogController {

    private final CatalogAdminService admin;
    private final CatalogQueryService queries;

    AdminCatalogController(CatalogAdminService admin, CatalogQueryService queries) {
        this.admin = admin;
        this.queries = queries;
    }

    @GetMapping("/products")
    PageResponse<AdminProductSummaryDto> products(@RequestParam(required = false) String q,
            @RequestParam(required = false) ProductStatus status, @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        return admin.list(q, status, page, pageSize);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    AdminProductDto create(@Valid @RequestBody ProductUpsert request) {
        return admin.create(request);
    }

    @GetMapping("/products/{id}")
    AdminProductDto product(@PathVariable UUID id) {
        return admin.get(id);
    }

    @PutMapping("/products/{id}")
    AdminProductDto update(@PathVariable UUID id, @Valid @RequestBody ProductUpsert request) {
        return admin.update(id, request);
    }

    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void archive(@PathVariable UUID id) {
        admin.archive(id);
    }

    @PostMapping("/products/{id}/variants")
    @ResponseStatus(HttpStatus.CREATED)
    AdminProductDto addVariant(@PathVariable UUID id, @Valid @RequestBody VariantUpsert request) {
        return admin.addVariant(id, request);
    }

    @PutMapping("/products/{id}/variants/{variantId}")
    AdminProductDto updateVariant(@PathVariable UUID id, @PathVariable UUID variantId,
            @Valid @RequestBody VariantUpsert request) {
        return admin.updateVariant(id, variantId, request);
    }

    @DeleteMapping("/products/{id}/variants/{variantId}")
    AdminProductDto deleteVariant(@PathVariable UUID id, @PathVariable UUID variantId) {
        return admin.deleteVariant(id, variantId);
    }

    @PostMapping(value = "/products/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    AdminProductDto addImage(@PathVariable UUID id, @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String alt) {
        return admin.addImage(id, file, alt);
    }

    @DeleteMapping("/products/{id}/images/{imageId}")
    AdminProductDto deleteImage(@PathVariable UUID id, @PathVariable UUID imageId) {
        return admin.deleteImage(id, imageId);
    }

    @GetMapping("/categories")
    List<CategoryNode> categories() {
        return queries.flatCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    CategoryNode createCategory(@Valid @RequestBody CategoryUpsert request) {
        return admin.createCategory(request);
    }

    @PutMapping("/categories/{id}")
    CategoryNode updateCategory(@PathVariable UUID id, @Valid @RequestBody CategoryUpsert request) {
        return admin.updateCategory(id, request);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteCategory(@PathVariable UUID id) {
        admin.deleteCategory(id);
    }

    @PostMapping("/brands")
    @ResponseStatus(HttpStatus.CREATED)
    BrandDto createBrand(@Valid @RequestBody BrandUpsert request) {
        return admin.createBrand(request);
    }

    @PutMapping("/brands/{id}")
    BrandDto updateBrand(@PathVariable UUID id, @Valid @RequestBody BrandUpsert request) {
        return admin.updateBrand(id, request);
    }

    @DeleteMapping("/brands/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteBrand(@PathVariable UUID id) {
        admin.deleteBrand(id);
    }
}

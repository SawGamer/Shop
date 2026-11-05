package com.za.shop.identity.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.shared.CurrentUser;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1/me/addresses")
@Tag(name = "Saved addresses")
class AddressController {

    record AddressRequest(
            @Size(max = 40) String label,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Size(max = 160) String line1,
            @Size(max = 160) String line2,
            @NotBlank @Size(max = 20) String postalCode,
            @NotBlank @Size(max = 80) String city,
            @NotBlank @Pattern(regexp = "^[A-Z]{2}$", message = "must be an ISO-3166 alpha-2 code like DE") String country,
            @Size(max = 40) String phone,
            Boolean isDefault) {

        AddressService.Input toInput() {
            return new AddressService.Input(label, fullName, line1, line2, postalCode, city, country, phone, isDefault);
        }
    }

    record AddressResponse(UUID id, String label, String fullName, String line1, String line2, String postalCode,
            String city, String country, String phone, boolean isDefault) {

        static AddressResponse of(SavedAddress a) {
            return new AddressResponse(a.getId(), a.getLabel(), a.getFullName(), a.getLine1(), a.getLine2(),
                    a.getPostalCode(), a.getCity(), a.getCountry(), a.getPhone(), a.isDefault());
        }
    }

    private final AddressService addresses;

    AddressController(AddressService addresses) {
        this.addresses = addresses;
    }

    @GetMapping
    List<AddressResponse> list() {
        return addresses.list(CurrentUser.require().id()).stream().map(AddressResponse::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AddressResponse create(@Valid @RequestBody AddressRequest request) {
        return AddressResponse.of(addresses.create(CurrentUser.require().id(), request.toInput()));
    }

    @PutMapping("/{id}")
    AddressResponse update(@PathVariable UUID id, @Valid @RequestBody AddressRequest request) {
        return AddressResponse.of(addresses.update(CurrentUser.require().id(), id, request.toInput()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        addresses.delete(CurrentUser.require().id(), id);
    }
}

package com.za.shop.identity.internal;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.za.shop.shared.ApiException;

/** A customer's address book. At most {@value #LIMIT} addresses; exactly one default once there is any. */
@Service
@Transactional
class AddressService {

    static final int LIMIT = 10;

    record Input(String label, String fullName, String line1, String line2, String postalCode, String city,
            String country, String phone, Boolean isDefault) {
    }

    private final SavedAddressRepository addresses;
    private final Clock clock;

    AddressService(SavedAddressRepository addresses, Clock clock) {
        this.addresses = addresses;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    List<SavedAddress> list(UUID userId) {
        return addresses.findAllOf(userId);
    }

    SavedAddress create(UUID userId, Input input) {
        if (addresses.countByUserId(userId) >= LIMIT) {
            throw ApiException.conflict("ADDRESS_LIMIT", "You can save up to " + LIMIT + " addresses");
        }
        boolean first = addresses.countByUserId(userId) == 0;
        boolean makeDefault = first || Boolean.TRUE.equals(input.isDefault());
        if (makeDefault) {
            addresses.clearDefault(userId);
        }
        SavedAddress address = new SavedAddress(userId, clock.instant());
        fill(address, input);
        address.setDefault(makeDefault);
        return addresses.save(address);
    }

    SavedAddress update(UUID userId, UUID id, Input input) {
        SavedAddress address = owned(userId, id);
        fill(address, input);
        if (Boolean.TRUE.equals(input.isDefault()) && !address.isDefault()) {
            addresses.clearDefault(userId);
            address.setDefault(true);
        }
        return address;
    }

    void delete(UUID userId, UUID id) {
        SavedAddress address = owned(userId, id);
        boolean wasDefault = address.isDefault();
        addresses.delete(address);
        addresses.flush();
        if (wasDefault) {
            addresses.findAllOf(userId).stream().findFirst().ifPresent(next -> next.setDefault(true));
        }
    }

    private SavedAddress owned(UUID userId, UUID id) {
        return addresses.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Address"));
    }

    private static void fill(SavedAddress address, Input in) {
        address.fill(blank(in.label()), in.fullName().trim(), in.line1().trim(), blank(in.line2()),
                in.postalCode().trim(), in.city().trim(), in.country(), blank(in.phone()));
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

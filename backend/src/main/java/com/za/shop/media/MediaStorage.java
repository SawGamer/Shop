package com.za.shop.media;

/** Stores public media (product images). Backed by S3-compatible object storage, or local disk in tests. */
public interface MediaStorage {

    StoredObject store(String key, byte[] content, String contentType);

    void delete(String key);

    record StoredObject(String key, String url) {
    }
}

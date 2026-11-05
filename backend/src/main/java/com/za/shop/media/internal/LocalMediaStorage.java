package com.za.shop.media.internal;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

import com.za.shop.media.MediaStorage;

/** Stores media on local disk and serves it from {@code /media/**}. For tests and single-node setups. */
class LocalMediaStorage implements MediaStorage {

    private final Path root;
    private final MediaProperties properties;

    LocalMediaStorage(MediaProperties properties) {
        this.properties = properties;
        this.root = properties.local().directory().toAbsolutePath().normalize();
    }

    Path root() {
        return root;
    }

    @Override
    public StoredObject store(String key, byte[] content, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        }
        catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return new StoredObject(key, properties.urlFor(key));
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        }
        catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private Path resolve(String key) {
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Invalid media key: " + key);
        }
        return target;
    }
}

package com.za.shop.media.internal;

import java.net.URI;
import java.nio.file.Path;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param provider      {@code s3} (any S3 compatible store: AWS S3, MinIO, R2…) or {@code local}
 * @param publicBaseUrl URL prefix under which stored objects are publicly reachable (a CDN in production)
 */
@ConfigurationProperties("shop.media")
public record MediaProperties(
        @DefaultValue("local") String provider,
        @DefaultValue("http://localhost:8080/media") String publicBaseUrl,
        @DefaultValue S3 s3,
        @DefaultValue Local local) {

    /**
     * @param createBucket create the bucket with a public-read policy on startup (local MinIO convenience)
     */
    public record S3(URI endpoint, @DefaultValue("eu-central-1") String region, @DefaultValue("shop-media") String bucket,
            String accessKey, String secretKey, @DefaultValue("true") boolean pathStyle,
            @DefaultValue("false") boolean createBucket) {
    }

    public record Local(@DefaultValue("./data/media") Path directory) {
    }

    public String urlFor(String key) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/" + key;
    }
}

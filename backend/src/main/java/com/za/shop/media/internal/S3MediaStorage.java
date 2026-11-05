package com.za.shop.media.internal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.za.shop.media.MediaStorage;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.BucketAlreadyOwnedByYouException;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;

class S3MediaStorage implements MediaStorage {

    private static final Logger log = LoggerFactory.getLogger(S3MediaStorage.class);

    private final S3Client s3;
    private final MediaProperties properties;

    S3MediaStorage(MediaProperties properties) {
        this.properties = properties;
        MediaProperties.S3 config = properties.s3();
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(config.region()))
                .httpClient(UrlConnectionHttpClient.create())
                .forcePathStyle(config.pathStyle());
        if (config.endpoint() != null) {
            builder.endpointOverride(config.endpoint());
        }
        builder.credentialsProvider(config.accessKey() != null && !config.accessKey().isBlank()
                ? StaticCredentialsProvider.create(AwsBasicCredentials.create(config.accessKey(), config.secretKey()))
                : DefaultCredentialsProvider.builder().build());
        this.s3 = builder.build();
        if (config.createBucket()) {
            ensurePublicBucket(config.bucket());
        }
    }

    @Override
    public StoredObject store(String key, byte[] content, String contentType) {
        s3.putObject(b -> b.bucket(properties.s3().bucket()).key(key).contentType(contentType)
                .cacheControl("public, max-age=31536000, immutable"), RequestBody.fromBytes(content));
        return new StoredObject(key, properties.urlFor(key));
    }

    @Override
    public void delete(String key) {
        s3.deleteObject(b -> b.bucket(properties.s3().bucket()).key(key));
    }

    private void ensurePublicBucket(String bucket) {
        try {
            s3.headBucket(b -> b.bucket(bucket));
        }
        catch (NoSuchBucketException e) {
            try {
                s3.createBucket(b -> b.bucket(bucket));
                log.info("Created media bucket {}", bucket);
            }
            catch (BucketAlreadyOwnedByYouException ignored) {
                // created concurrently by another instance
            }
        }
        String policy = """
                {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},\
                "Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}""".formatted(bucket);
        s3.putBucketPolicy(b -> b.bucket(bucket).policy(policy));
    }
}

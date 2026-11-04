package com.za.shop.identity.internal;

import java.io.IOException;
import java.io.InputStream;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.security.converter.RsaKeyConverters;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * RS256 signed access tokens. Any service that has the public key can verify them without calling
 * this API, which keeps authentication stateless and horizontally scalable.
 */
@Configuration(proxyBeanMethods = false)
class JwtConfig {

    private static final Logger log = LoggerFactory.getLogger(JwtConfig.class);

    record JwtKeys(RSAPublicKey publicKey, RSAPrivateKey privateKey) {
    }

    @Bean
    JwtKeys jwtKeys(IdentityProperties properties) throws IOException, NoSuchAlgorithmException {
        if (properties.jwtPrivateKey() != null && properties.jwtPublicKey() != null) {
            return new JwtKeys(read(properties.jwtPublicKey(), true), read(properties.jwtPrivateKey(), false));
        }
        log.warn("No JWT key pair configured (shop.identity.jwt-private-key / jwt-public-key). Generating a temporary "
                + "key: tokens will not survive restarts and multiple instances will not accept each other's tokens.");
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        var pair = generator.generateKeyPair();
        return new JwtKeys((RSAPublicKey) pair.getPublic(), (RSAPrivateKey) pair.getPrivate());
    }

    @Bean
    JwtEncoder jwtEncoder(JwtKeys keys) {
        return NimbusJwtEncoder.withKeyPair(keys.publicKey(), keys.privateKey()).build();
    }

    @Bean
    JwtDecoder jwtDecoder(JwtKeys keys, IdentityProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(keys.publicKey()).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
        return decoder;
    }

    @SuppressWarnings("unchecked")
    private static <T> T read(Resource resource, boolean publicKey) throws IOException {
        try (InputStream in = resource.getInputStream()) {
            return (T) (publicKey ? RsaKeyConverters.x509().convert(in) : RsaKeyConverters.pkcs8().convert(in));
        }
    }
}

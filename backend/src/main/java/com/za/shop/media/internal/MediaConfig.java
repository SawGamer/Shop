package com.za.shop.media.internal;

import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.za.shop.media.MediaStorage;

@Configuration(proxyBeanMethods = false)
class MediaConfig {

    @Bean
    @ConditionalOnProperty(name = "shop.media.provider", havingValue = "s3")
    MediaStorage s3MediaStorage(MediaProperties properties) {
        return new S3MediaStorage(properties);
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(name = "shop.media.provider", havingValue = "local", matchIfMissing = true)
    static class LocalMedia implements WebMvcConfigurer {

        private final LocalMediaStorage storage;

        LocalMedia(MediaProperties properties) {
            this.storage = new LocalMediaStorage(properties);
        }

        @Bean
        MediaStorage localMediaStorage() {
            return storage;
        }

        @Override
        public void addResourceHandlers(ResourceHandlerRegistry registry) {
            registry.addResourceHandler("/media/**")
                    .addResourceLocations(storage.root().toUri().toString() + "/")
                    .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
        }
    }
}

package com.za.shop.search.internal;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("shop.search")
public record SearchProperties(@DefaultValue Meilisearch meilisearch) {

    public record Meilisearch(
            @DefaultValue("http://localhost:7700") String url,
            String apiKey,
            @DefaultValue("products") String index,
            @DefaultValue("5s") Duration timeout) {
    }
}

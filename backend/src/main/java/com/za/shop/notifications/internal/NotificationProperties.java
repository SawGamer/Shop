package com.za.shop.notifications.internal;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("shop.notifications")
public record NotificationProperties(@DefaultValue("no-reply@za-shop.local") String fromAddress) {
}

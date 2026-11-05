package com.za.shop.notifications.internal;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Currency;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriUtils;

import com.za.shop.identity.VerificationEmailRequested;
import com.za.shop.orders.OrderEvents;
import com.za.shop.settings.ShopSettingsService;
import com.za.shop.shared.ShopProperties;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Sends transactional emails. Listeners run asynchronously after the triggering transaction commits and
 * their events are persisted, so a mail server outage delays emails instead of failing checkouts.
 * Everything user-controlled is HTML-escaped.
 */
@Component
class EmailNotifications {

    private static final Logger log = LoggerFactory.getLogger(EmailNotifications.class);

    private final JavaMailSender mail;
    private final NotificationProperties properties;
    private final ShopProperties shop;
    private final ShopSettingsService settings;

    EmailNotifications(JavaMailSender mail, NotificationProperties properties, ShopProperties shop,
            ShopSettingsService settings) {
        this.mail = mail;
        this.properties = properties;
        this.shop = shop;
        this.settings = settings;
    }

    @ApplicationModuleListener
    void on(VerificationEmailRequested event) {
        String link = shop.storefrontUrl() + "/verify-email?token="
                + UriUtils.encodeQueryParam(event.token(), java.nio.charset.StandardCharsets.UTF_8);
        send(event.email(), "Confirm your email address", """
                <p>Hi %s,</p>
                <p>welcome to %s! Please confirm your email address:</p>
                <p><a href="%s" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;\
                text-decoration:none">Confirm email</a></p>
                <p style="color:#666">If you did not create an account you can ignore this email.</p>
                """.formatted(esc(event.firstName()), esc(settings.current().name()), esc(link)));
    }

    @ApplicationModuleListener
    void on(OrderEvents.OrderPaid event) {
        StringBuilder rows = new StringBuilder();
        for (OrderEvents.Line line : event.lines()) {
            rows.append("<tr><td>%s<br><small style=\"color:#666\">%s</small></td><td>× %d</td><td align=\"right\">%s</td></tr>"
                    .formatted(esc(line.productName()), esc(line.details()), line.quantity(),
                            money(line.lineTotalCents(), event.currency())));
        }
        send(event.customerEmail(), "Order " + event.orderNumber() + " confirmed", """
                <p>Thank you for your order!</p>
                <p>We received your payment for order <strong>%s</strong> and are getting it ready.</p>
                <table cellpadding="6" style="border-collapse:collapse">%s
                <tr><td colspan="2">Shipping</td><td align="right">%s</td></tr>
                <tr><td colspan="2"><strong>Total</strong></td><td align="right"><strong>%s</strong></td></tr>
                </table>
                <p><a href="%s">View your order</a></p>
                """.formatted(esc(event.orderNumber()), rows, money(event.shippingCents(), event.currency()),
                money(event.totalCents(), event.currency()),
                esc(shop.storefrontUrl() + "/account/orders/" + event.orderId())));
    }

    @ApplicationModuleListener
    void on(OrderEvents.OrderShipped event) {
        send(event.customerEmail(), "Order " + event.orderNumber() + " is on its way", """
                <p>Good news: your order <strong>%s</strong> has shipped.</p>
                <p><a href="%s">Track your order</a></p>
                """.formatted(esc(event.orderNumber()),
                esc(shop.storefrontUrl() + "/account/orders/" + event.orderId())));
    }

    private void send(String to, String subject, String html) {
        String shopName = settings.current().name();
        try {
            MimeMessage message = mail.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.fromAddress(), shopName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText("""
                    <div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">%s
                    <p style="color:#888;font-size:12px">%s</p></div>""".formatted(html, esc(shopName)),
                    true);
            mail.send(message);
            log.info("Sent '{}' email", subject);
        }
        catch (MessagingException | UnsupportedEncodingException e) {
            throw new IllegalStateException("Could not build email", e);
        }
    }

    private static String esc(String value) {
        return value == null ? "" : HtmlUtils.htmlEscape(value);
    }

    private static String money(long cents, String currency) {
        NumberFormat format = NumberFormat.getCurrencyInstance(Locale.GERMANY);
        format.setCurrency(Currency.getInstance(currency));
        return esc(format.format(BigDecimal.valueOf(cents, 2)));
    }
}

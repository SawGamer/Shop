package com.za.shop;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import jakarta.mail.internet.MimeMessage;

@TestConfiguration(proxyBeanMethods = false)
public class TestMailConfiguration {

    @Bean
    @Primary
    CapturingMailSender capturingMailSender() {
        return new CapturingMailSender();
    }

    /** Records emails instead of sending them. */
    public static class CapturingMailSender extends JavaMailSenderImpl {

        private final List<MimeMessage> sent = new CopyOnWriteArrayList<>();

        @Override
        protected void doSend(MimeMessage[] mimeMessages, Object[] originalMessages) {
            sent.addAll(List.of(mimeMessages));
        }

        public List<MimeMessage> sent() {
            return sent;
        }

        public List<String> subjectsTo(String email) {
            return sent.stream().filter(m -> {
                try {
                    return m.getAllRecipients()[0].toString().equals(email);
                }
                catch (Exception e) {
                    return false;
                }
            }).map(m -> {
                try {
                    return m.getSubject();
                }
                catch (Exception e) {
                    return "";
                }
            }).toList();
        }
    }
}

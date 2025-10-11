package com.mycroft.ema.ecom.common.mail;

public interface MailService {
    void send(String to, String subject, String textBody);
}

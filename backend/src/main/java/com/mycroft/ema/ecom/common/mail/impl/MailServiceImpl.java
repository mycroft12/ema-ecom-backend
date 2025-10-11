package com.mycroft.ema.ecom.common.mail.impl;

import com.mycroft.ema.ecom.common.mail.MailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@org.springframework.boot.autoconfigure.condition.ConditionalOnBean(JavaMailSender.class)
public class MailServiceImpl implements MailService {

    private static final Logger log = LoggerFactory.getLogger(MailServiceImpl.class);

    private final JavaMailSender mailSender;

    public MailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void send(String to, String subject, String textBody) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(textBody);
            mailSender.send(message);
            log.info("Sent email to {} with subject '{}'", to, subject);
        } catch (Exception e) {
            // Fallback to logging to avoid breaking flow in dev
            log.warn("Failed to send email using JavaMailSender, falling back to log. Error: {}", e.getMessage());
            log.info("[DEV-EMAIL] To: {}\nSubject: {}\n{}", to, subject, textBody);
        }
    }
}

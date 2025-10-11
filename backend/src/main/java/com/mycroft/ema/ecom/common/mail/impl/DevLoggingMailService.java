package com.mycroft.ema.ecom.common.mail.impl;

import com.mycroft.ema.ecom.common.mail.MailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnMissingBean(type = "org.springframework.mail.javamail.JavaMailSender")
public class DevLoggingMailService implements MailService {

    private static final Logger log = LoggerFactory.getLogger(DevLoggingMailService.class);

    @Override
    public void send(String to, String subject, String textBody) {
        log.info("[DEV-EMAIL] To: {}\nSubject: {}\n{}", to, subject, textBody);
    }
}

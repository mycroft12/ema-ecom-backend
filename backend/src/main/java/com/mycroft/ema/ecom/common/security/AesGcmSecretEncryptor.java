package com.mycroft.ema.ecom.common.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class AesGcmSecretEncryptor {

  private static final String TRANSFORMATION = "AES/GCM/NoPadding";
  private static final int GCM_TAG_LENGTH = 128;
  private static final int IV_LENGTH = 12;

  private final String masterKeyBase64;
  private SecretKey secretKey;
  private final SecureRandom secureRandom = new SecureRandom();

  public AesGcmSecretEncryptor(@Value("${app.security.master-key:}") String masterKeyBase64) {
    this.masterKeyBase64 = masterKeyBase64 == null ? "" : masterKeyBase64.trim();
  }

  @PostConstruct
  void initialize() {
    if (masterKeyBase64.isEmpty()) {
      throw new IllegalStateException("app.security.master-key must be configured (provide 32-byte key, base64 encoded)");
    }
    byte[] decoded;
    try {
      decoded = Base64.getDecoder().decode(masterKeyBase64);
    } catch (IllegalArgumentException ex) {
      throw new IllegalStateException("app.security.master-key is not valid base64", ex);
    }
    if (decoded.length != 32) {
      throw new IllegalStateException("app.security.master-key must decode to 32 bytes for AES-256-GCM");
    }
    this.secretKey = new SecretKeySpec(decoded, "AES");
  }

  public EncryptionResult encrypt(byte[] plainText) {
    try {
      byte[] iv = new byte[IV_LENGTH];
      secureRandom.nextBytes(iv);
      Cipher cipher = Cipher.getInstance(TRANSFORMATION);
      cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
      byte[] cipherText = cipher.doFinal(plainText);
      return new EncryptionResult(iv, cipherText);
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("Failed to encrypt secret", ex);
    }
  }

  public byte[] decrypt(byte[] iv, byte[] cipherText) {
    try {
      Cipher cipher = Cipher.getInstance(TRANSFORMATION);
      cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
      return cipher.doFinal(cipherText);
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("Failed to decrypt secret", ex);
    }
  }

  public record EncryptionResult(byte[] iv, byte[] cipherText) {}
}

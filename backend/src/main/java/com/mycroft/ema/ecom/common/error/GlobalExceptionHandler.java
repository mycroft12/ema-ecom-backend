package com.mycroft.ema.ecom.common.error;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    public GlobalExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        String code = "error.auth.badCredentials";
        String msg = messageSource.getMessage(code, null, "Invalid username or password.", LocaleContextHolder.getLocale());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(code, msg));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ErrorResponse> handleDisabled(DisabledException ex) {
        String code = "auth.errors.disabled";
        String msg = messageSource.getMessage(code, null, "Your account is not activated yet.", LocaleContextHolder.getLocale());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(code, msg));
    }

    // fallback (optional): could add handlers for other exceptions to return i18n messages

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        String code = "error.validation";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(code, ex.getMessage()));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
        String code = ex.getMessage() == null ? "error.badRequest" : ex.getMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(code, ex.getMessage()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntime(RuntimeException ex) {
        String code = "error.runtime";
        // Check if this is a template validation error
        String message = ex.getMessage();
        if (message != null && message.contains("Template validation error")) {
            code = "error.template.validation";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(code, message));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse(code, message));
    }
}

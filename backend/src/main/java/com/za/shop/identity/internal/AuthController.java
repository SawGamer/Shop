package com.za.shop.identity.internal;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.za.shop.identity.Role;
import com.za.shop.shared.CurrentUser;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Auth")
class AuthController {

    record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 60) String firstName,
            @NotBlank @Size(max = 60) String lastName) {
    }

    record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    record RefreshRequest(@NotBlank String refreshToken) {
    }

    record VerifyEmailRequest(@NotBlank String token) {
    }

    record UserResponse(UUID id, String email, String firstName, String lastName, List<String> roles,
            boolean emailVerified) {

        static UserResponse of(User user) {
            return new UserResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
                    user.getRoles().stream().sorted(Comparator.comparing(Role::ordinal)).map(Role::name).toList(),
                    user.isEmailVerified());
        }
    }

    record AuthResponse(String accessToken, Instant accessTokenExpiresAt, String refreshToken,
            Instant refreshTokenExpiresAt, UserResponse user) {

        static AuthResponse of(TokenService.IssuedTokens tokens) {
            return new AuthResponse(tokens.accessToken(), tokens.accessTokenExpiresAt(), tokens.refreshToken(),
                    tokens.refreshTokenExpiresAt(), UserResponse.of(tokens.user()));
        }
    }

    private final AuthService authService;
    private final TokenService tokenService;

    AuthController(AuthService authService, TokenService tokenService) {
        this.authService = authService;
        this.tokenService = tokenService;
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return AuthResponse.of(authService.register(request.email(), request.password(), request.firstName(),
                request.lastName()));
    }

    @PostMapping("/auth/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return AuthResponse.of(authService.login(request.email(), request.password()));
    }

    @PostMapping("/auth/refresh")
    AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return AuthResponse.of(tokenService.rotate(request.refreshToken()));
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@Valid @RequestBody RefreshRequest request) {
        tokenService.revokeSession(request.refreshToken());
    }

    @PostMapping("/auth/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.token());
    }

    @PostMapping("/auth/resend-verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resendVerification() {
        authService.resendVerification(CurrentUser.require().id());
    }

    @GetMapping("/me")
    UserResponse me() {
        return UserResponse.of(authService.get(CurrentUser.require().id()));
    }
}

package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.PromoCodeCreateRequest;
import com.festivalapp.backend.dto.PromoCodeResponse;
import com.festivalapp.backend.dto.PromoCodeValidateResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.PromoCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PromoCodeController {

    private final PromoCodeService promoCodeService;

    @GetMapping("/api/organizer/promo-codes")
    public ResponseEntity<List<PromoCodeResponse>> list(Authentication auth) {
        return ResponseEntity.ok(promoCodeService.getByOrganizer(resolveIdentifier(auth)));
    }

    @PostMapping("/api/organizer/promo-codes")
    public ResponseEntity<PromoCodeResponse> create(@Valid @RequestBody PromoCodeCreateRequest request,
                                                    Authentication auth) {
        return ResponseEntity.ok(promoCodeService.create(request, resolveIdentifier(auth)));
    }

    @DeleteMapping("/api/organizer/promo-codes/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        promoCodeService.delete(id, resolveIdentifier(auth));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/promo-codes/validate")
    public ResponseEntity<PromoCodeValidateResponse> validate(@RequestParam String code) {
        return ResponseEntity.ok(promoCodeService.validate(code));
    }

    private String resolveIdentifier(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) throw new UnauthorizedException("Unauthorized");
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) return ud.getUsername();
        return auth.getName();
    }
}

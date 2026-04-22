package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.OrderCreateRequest;
import com.festivalapp.backend.dto.OrderResponse;
import com.festivalapp.backend.dto.PaymentConfirmRequest;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody OrderCreateRequest request,
                                                Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(orderService.createOrder(request, extractUserIdentifier(authentication)));
    }

    @GetMapping("/my")
    public ResponseEntity<List<OrderResponse>> getMine(Authentication authentication) {
        return ResponseEntity.ok(orderService.getMyOrders(extractUserIdentifier(authentication)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getById(@PathVariable Long id,
                                                 Authentication authentication) {
        return ResponseEntity.ok(orderService.getMyOrderById(id, extractUserIdentifier(authentication)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable Long id,
                                                      Authentication authentication) {
        return ResponseEntity.ok(orderService.cancelOrder(id, extractUserIdentifier(authentication)));
    }

    @PostMapping("/{id}/confirm-payment")
    public ResponseEntity<OrderResponse> confirmPayment(@PathVariable Long id,
                                                        @RequestBody(required = false) PaymentConfirmRequest request,
                                                        Authentication authentication) {
        PaymentConfirmRequest safeRequest = request == null ? new PaymentConfirmRequest() : request;
        return ResponseEntity.ok(orderService.confirmPayment(id, safeRequest, extractUserIdentifier(authentication)));
    }

    private String extractUserIdentifier(Authentication authentication) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            throw new UnauthorizedException("Unauthorized user");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails && StringUtils.hasText(userDetails.getUsername())) {
            return userDetails.getUsername();
        }
        if (principal instanceof OAuth2User oauth2User) {
            String email = oauth2User.getAttribute("email");
            if (StringUtils.hasText(email)) {
                return email;
            }
            String defaultEmail = oauth2User.getAttribute("default_email");
            if (StringUtils.hasText(defaultEmail)) {
                return defaultEmail;
            }
            if (StringUtils.hasText(oauth2User.getName())) {
                return oauth2User.getName();
            }
        }
        if (principal instanceof String principalString && StringUtils.hasText(principalString)
            && !"anonymousUser".equalsIgnoreCase(principalString)) {
            return principalString;
        }
        if (StringUtils.hasText(authentication.getName())
            && !"anonymousUser".equalsIgnoreCase(authentication.getName())) {
            return authentication.getName();
        }

        throw new UnauthorizedException("Unauthorized user");
    }
}

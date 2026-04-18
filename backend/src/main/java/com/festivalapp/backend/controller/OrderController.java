package com.festivalapp.backend.controller;

import com.festivalapp.backend.dto.OrderCreateRequest;
import com.festivalapp.backend.dto.OrderResponse;
import com.festivalapp.backend.exception.UnauthorizedException;
import com.festivalapp.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
                                                @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(orderService.createOrder(request, extractUsername(principal)));
    }

    @GetMapping("/my")
    public ResponseEntity<List<OrderResponse>> getMine(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(orderService.getMyOrders(extractUsername(principal)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getById(@PathVariable Long id,
                                                 @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(orderService.getMyOrderById(id, extractUsername(principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable Long id,
                                                      @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(orderService.cancelOrder(id, extractUsername(principal)));
    }

    private String extractUsername(UserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Unauthorized user");
        }
        return principal.getUsername();
    }
}

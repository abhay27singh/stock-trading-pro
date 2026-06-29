package com.stocktrading.trading.controller;

import com.stocktrading.trading.dto.OptionOrderRequest;
import com.stocktrading.trading.service.OptionsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Options trading endpoints (buy / list positions / close). Pricing & chain are
 * served by the Market-Data service; these own the user's positions + wallet flow.
 */
@RestController
@RequestMapping("/api/options")
@RequiredArgsConstructor
public class OptionsController {

    private final OptionsService optionsService;

    @PostMapping("/buy")
    public ResponseEntity<String> buy(Authentication authentication,
                                      @RequestBody OptionOrderRequest request) {
        return ResponseEntity.ok(optionsService.buy(authentication.getName(), request));
    }

    @GetMapping("/positions")
    public ResponseEntity<List<Map<String, Object>>> positions(Authentication authentication) {
        return ResponseEntity.ok(optionsService.positions(authentication.getName()));
    }

    @PostMapping("/close/{id}")
    public ResponseEntity<String> close(Authentication authentication, @PathVariable Long id) {
        return ResponseEntity.ok(optionsService.close(authentication.getName(), id));
    }
}

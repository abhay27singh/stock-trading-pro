package com.stocktrading.trading.controller;

import com.stocktrading.trading.dto.TradeRequest;
import com.stocktrading.trading.entity.Portfolio;
import com.stocktrading.trading.entity.Transaction;
import com.stocktrading.trading.service.TradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/trade")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @PostMapping("/execute")
    public ResponseEntity<String> executeTrade(Authentication authentication,
                                               @RequestBody TradeRequest request) {
        return ResponseEntity.ok(tradeService.executeTrade(authentication.getName(), request));
    }

    @GetMapping("/portfolio")
    public ResponseEntity<List<Portfolio>> getPortfolio(Authentication authentication) {
        return ResponseEntity.ok(tradeService.getPortfolio(authentication.getName()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Transaction>> getHistory(Authentication authentication) {
        return ResponseEntity.ok(tradeService.getTransactionHistory(authentication.getName()));
    }
}

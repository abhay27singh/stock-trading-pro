package com.stocktrading.trading.controller;

import com.stocktrading.trading.entity.Watchlist;
import com.stocktrading.trading.service.WatchlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;

    @GetMapping
    public ResponseEntity<List<Watchlist>> getWatchlist(Authentication authentication) {
        return ResponseEntity.ok(watchlistService.getWatchlist(authentication.getName()));
    }

    @PostMapping("/add/{symbol}")
    public ResponseEntity<String> add(Authentication authentication, @PathVariable String symbol) {
        return ResponseEntity.ok(watchlistService.addToWatchlist(authentication.getName(), symbol));
    }

    @DeleteMapping("/remove/{symbol}")
    public ResponseEntity<String> remove(Authentication authentication, @PathVariable String symbol) {
        return ResponseEntity.ok(watchlistService.removeFromWatchlist(authentication.getName(), symbol));
    }
}

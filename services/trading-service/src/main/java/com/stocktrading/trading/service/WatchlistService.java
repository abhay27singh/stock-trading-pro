package com.stocktrading.trading.service;

import com.stocktrading.trading.client.MarketDataClient;
import com.stocktrading.trading.entity.Watchlist;
import com.stocktrading.trading.repository.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final MarketDataClient marketDataClient;

    public List<Watchlist> getWatchlist(String email) {
        return watchlistRepository.findByUserEmail(email);
    }

    public String addToWatchlist(String email, String symbol) {
        MarketDataClient.Quote q = marketDataClient.getQuote(symbol);
        if (q == null) throw new RuntimeException("Stock not found");
        if (watchlistRepository.findByUserEmailAndSymbol(email, q.symbol()).isPresent()) {
            return "Stock already in watchlist!";
        }
        Watchlist w = new Watchlist();
        w.setUserEmail(email);
        w.setSymbol(q.symbol());
        w.setCompanyName(q.companyName());
        watchlistRepository.save(w);
        return "Added " + q.symbol() + " to watchlist!";
    }

    @Transactional
    public String removeFromWatchlist(String email, String symbol) {
        watchlistRepository.deleteByUserEmailAndSymbol(email, symbol.toUpperCase());
        return "Removed " + symbol + " from watchlist!";
    }
}

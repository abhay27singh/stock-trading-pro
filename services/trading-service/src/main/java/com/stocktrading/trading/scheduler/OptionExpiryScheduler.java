package com.stocktrading.trading.scheduler;

import com.stocktrading.trading.service.OptionsService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Settles option positions once they pass their expiry date.
 *
 * <p>Nothing else ever retires a position: {@code remainingDays} clamps at 0, so an
 * expired option would otherwise keep being repriced against the current spot forever —
 * turning a cheap short-dated call into a perpetual one. This sweep pays each expired
 * position its intrinsic value and closes it, which is what expiry means.
 *
 * <p>Runs an hour after the NSE close so the day's final prices are in, and again at
 * startup so positions that expired while the service was down are not missed.
 */
@Component
@RequiredArgsConstructor
public class OptionExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(OptionExpiryScheduler.class);

    private final OptionsService optionsService;

    /** 16:30 IST daily — NSE closes at 15:30. */
    @Scheduled(cron = "0 30 16 * * *", zone = "Asia/Kolkata")
    public void settleExpiredPositions() {
        List<Long> expired = optionsService.expiredPositionIds();
        if (expired.isEmpty()) return;

        log.info("Settling {} expired option position(s)", expired.size());
        for (Long id : expired) {
            try {
                optionsService.settleExpired(id);
            } catch (Exception e) {
                // One bad position must not abort the sweep; the next run retries it.
                log.error("Failed to settle expired option position {}", id, e);
            }
        }
    }

    /** Catch up on anything that expired while the service was stopped. */
    @Scheduled(initialDelay = 30_000, fixedDelay = Long.MAX_VALUE)
    public void settleOnStartup() {
        settleExpiredPositions();
    }
}

package com.stocktrading.trading.config;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Builds RestTemplates with bounded connect/read timeouts. A default
 * {@code new RestTemplate()} waits forever, so one hung upstream call (auth or
 * market-data service) can pin a request thread indefinitely. Always use this.
 */
public final class RestClients {

    private RestClients() {}

    public static RestTemplate withTimeouts() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofSeconds(3));
        f.setReadTimeout(Duration.ofSeconds(5));
        return new RestTemplate(f);
    }
}

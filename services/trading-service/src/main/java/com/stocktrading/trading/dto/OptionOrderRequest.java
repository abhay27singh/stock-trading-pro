package com.stocktrading.trading.dto;

import lombok.Data;

@Data
public class OptionOrderRequest {
    private String symbol;
    private String type;        // "call" or "put"
    private Double strike;
    private Integer days;       // days to expiry
    private Integer quantity;
}

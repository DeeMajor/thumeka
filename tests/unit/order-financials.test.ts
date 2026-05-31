import { describe, expect, it } from "vitest";

import {
  DEFAULT_DELIVERY_COMMISSION_PERCENTAGE,
  calculateOrderFinancials
} from "@/lib/order-rules";

describe("calculateOrderFinancials — delivery fee split", () => {
  it("splits the delivery fee into driver_earning (92%) and delivery_commission (8%) by default", () => {
    const result = calculateOrderFinancials({
      listingPrice: 250,
      deliveryFee: 70
    });

    expect(result.deliveryFee).toBe(70);
    expect(result.deliveryCommissionPercentage).toBe(
      DEFAULT_DELIVERY_COMMISSION_PERCENTAGE
    );
    expect(result.deliveryCommissionAmount).toBe(5.6);
    expect(result.driverEarning).toBe(64.4);
    // The two amounts always reconcile to the full fee.
    expect(result.driverEarning + result.deliveryCommissionAmount).toBe(
      result.deliveryFee
    );
  });

  it("honours an overridden delivery commission percentage", () => {
    const result = calculateOrderFinancials({
      listingPrice: 250,
      deliveryFee: 100,
      deliveryCommissionPercentage: 10
    });

    expect(result.deliveryCommissionAmount).toBe(10);
    expect(result.driverEarning).toBe(90);
  });

  it("leaves listing commission unaffected by the delivery split", () => {
    const result = calculateOrderFinancials({
      listingPrice: 250,
      deliveryFee: 70,
      commissionPercentage: 12
    });

    expect(result.commissionAmount).toBe(30);
    expect(result.providerEarning).toBe(220);
    expect(result.buyerTotal).toBe(320);
  });

  it("zeroes the driver and commission amounts when there is no delivery", () => {
    const result = calculateOrderFinancials({
      listingPrice: 100,
      deliveryFee: 0
    });

    expect(result.deliveryFee).toBe(0);
    expect(result.driverEarning).toBe(0);
    expect(result.deliveryCommissionAmount).toBe(0);
    expect(result.buyerTotal).toBe(100);
  });

  it("reconciles cents on awkward fees by subtracting the commission from the fee", () => {
    // 33.33 * 0.08 = 2.6664 → rounds to 2.67, driver_earning = 33.33 - 2.67 = 30.66
    const result = calculateOrderFinancials({
      listingPrice: 200,
      deliveryFee: 33.33
    });

    expect(result.deliveryCommissionAmount).toBe(2.67);
    expect(result.driverEarning).toBe(30.66);
    expect(result.driverEarning + result.deliveryCommissionAmount).toBe(33.33);
  });
});

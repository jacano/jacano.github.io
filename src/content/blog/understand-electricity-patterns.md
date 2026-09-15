---
title: 'Understand your electricity patterns over a year'
date: '2026-09-14'
tag: 'Energy'
excerpt: 'An unofficial Python client for the e-distribucion private area. It downloads your full hourly history, so you can compare tariffs, set the contracted power and cut your bill.'
read: '3 min'
---

The bill shows one number per month. It does not show *when* you used the energy. Without the hours, you cannot compare tariffs with real numbers.

In Spain, the distributor keeps the data, and not the retailer. **e-distribucion** (the Endesa group) covers part of Spain. Your bill shows the name of your distributor.

If the distributor is e-distribucion, the private area has every hour of your history. The portal shows the data in small parts, so you cannot see the full picture.

So I wrote a tool. It reads the full history and gives one report per CUPS.

---

## The three periods

Since 2021 the home tariff is 2.0TD. The grid fee changes with the hour:

- **P1 (peak):** the most expensive. Monday to Friday, 10:00-14:00 and 18:00-22:00.
- **P2 (flat):** in between.
- **P3 (off-peak):** the cheapest. Weekdays 00:00-08:00, plus all weekend and national holidays.

A retailer sells the same energy at a different price for each period. The tool adds your hours into P1, P2 and P3.

---

## Choose the tariff

The split by period tells you which tariff fits you:

- mostly **P3**: look for a low off-peak price,
- a lot in **P1**: look for a low peak price, or a flat price,
- the three periods close: a flat price is simpler.

There are many comparators, and [luzfija.es](https://github.com/almax-es/luzfija.es) is one of them. Copy the split into a comparator, and compare your numbers.

---

## Adjust the contracted power

The **contracted power** is the fixed part of the bill. Two errors are common:

- Too high: you pay for a power that you never use.
- Too low: the ICP trips and the supply goes off.

The 2.0TD tariff has two power periods. P1 covers the peak and flat hours. P2 covers the off-peak hours. The tool gives the **maximum demanded power** for each period, and it lists the months where the demand passed the contract.

### kWh and kW are not the same

In one hour you use the oven (2 kW), the air conditioner (2 kW) and the washing machine (0.5 kW). That hour is 4.5 kWh.

For 15 minutes you add a machine of 5 kW. The demanded power is then 9.5 kW.

- **kWh** = how much you used.
- **kW** = how hard you pulled at one moment.

Use the maximum demanded power for the contract. Use the top hour for the tariff.

---

## Real data, not estimates

The portal gives some hours as **estimated**, not real. The distributor has no reading yet. The number can be close, but it is not a measure.

The tool marks every day as real, estimated or pending. It finds the **longest period in a row with real data only** and gives the totals.

Use that period in a comparator. Then the result comes from real measures.

---

## See it for yourself

```bash
pipx install .
edistribucion login --save   # one time
edistribucion                # the report
```

The report has the real and estimated totals, the split by P1, P2 and P3, the use by year, month, hour and day of the week, the top hours, the demanded power and a reading map.

The code and the guide are here:

<https://github.com/jacano/edistribucion-client>

It uses HTTP only, with no browser and no third-party package. It is not connected to e-distribucion or Endesa.

The tool works only when your distributor is e-distribucion. It reads the 2.0TD tariff.

---

## Try it

The tool is free and open source. Use it only with your own account.

- Star the project on GitHub.
- Send it to a friend whose distributor is e-distribucion.

Read your last three years of consumption.

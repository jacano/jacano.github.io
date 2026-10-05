---
title: 'Understand your electricity patterns over a year'
date: '2026-09-14'
tag: 'Energy'
excerpt: 'An unofficial Python client for the e-distribucion private area. It downloads hourly readings so you can compare tariffs and check contracted power.'
---

A monthly bill tells you how much electricity you used, not when you used it. That makes tariff comparisons mostly guesswork.

In Spain, the distributor holds the hourly readings, not the retailer. Each area has its own distributor. [e-distribucion](https://www.edistribucion.com/) covers part of Spain, and your bill tells you whether it is your distributor.

If e-distribucion is your distributor, its private area contains the readings. The portal displays them in small pieces, though, which makes the full year hard to inspect.

I wrote a tool that reads the full history and produces one report for each CUPS.

## The three periods

Since 2021, the standard home tariff has been [2.0TD](https://www.boe.es/buscar/act.php?id=BOE-A-2020-1066), whose grid fee changes by hour:

- **P1 (peak):** the most expensive. Monday to Friday, 10:00-14:00 and 18:00-22:00.
- **P2 (flat):** in between.
- **P3 (off-peak):** the cheapest. Weekdays 00:00-08:00, plus all weekend and national holidays.

Retailers sell the same energy at a different price for each period, so your bill is a mix of the three. The tool does the mix for you: it adds your hours into P1, P2 and P3.

## Which tariff fits

Once you see the split, the choice becomes easier:

- mostly **P3**: look for a low off-peak price,
- a lot in **P1**: look for a low peak price, or a flat price,
- the three periods close: a flat price is simpler.

There are many comparators, and [luzfija.es](https://github.com/almax-es/luzfija.es) is one of them. Copy the split into a comparator, and compare your numbers.

## Adjust the contracted power

**Contracted power** is the fixed part of the bill. Two mistakes are common:

- Too high: you pay for a power that you never use.
- Too low: the ICP trips and the supply goes off.

The 2.0TD tariff has two power periods. P1 covers the peak and flat hours, P2 the off-peak hours. The tool gives the **maximum demanded power** for each period, and it lists the months where you passed the contract.

**kWh** is how much you used. **kW** is how strong you pulled at one moment. Pick the contract with the maximum demanded power, and the tariff with the split by period.

## Real data, not estimates

The portal marks some hours as **estimated** because the distributor has not received a real reading yet. The number can be close, but it is not a measure.

The tool marks every day as real, estimated or pending, and it finds the **longest period in a row with real data only**. Use that period in a comparator, and the result comes from real measures.

## See it for yourself

```bash
pipx install .
edistribucion login --save   # one time
edistribucion                # the report
```

The report includes real and estimated totals, the P1/P2/P3 split, usage by year, month, hour, and day of the week, the highest-use hours, demanded power, and a reading map.

The code and the guide are here:

<https://github.com/jacano/edistribucion-client>

It uses HTTP only, with no browser and no third-party package. It is unofficial: Endesa does not support it. It needs the 2.0TD tariff and the e-distribucion distributor, so check your bill first.

## Where to read more

- The distributor: [edistribucion.com](https://www.edistribucion.com/). Your data lives in the private area, at [zonaprivada.edistribucion.com](https://zonaprivada.edistribucion.com/).
- The 2.0TD periods: [Circular 3/2020 of the CNMC](https://www.boe.es/buscar/act.php?id=BOE-A-2020-1066), article 7.
- The tool and the period rules: [github.com/jacano/edistribucion-client](https://github.com/jacano/edistribucion-client).

## Before you change anything

The tool is free and open source, and it is unofficial. Use it only with your own account, and check the results before you change a tariff or a contracted power: the report is only as good as the readings behind it, and some of them are estimates.
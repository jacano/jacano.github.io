---
title: 'Understand your electricity patterns over a year'
date: '2026-09-14'
tag: 'Energy'
excerpt: 'An unofficial Python client for the e-distribucion private area. It downloads your hourly history, so you can compare tariffs and review your contracted power.'
---

Your electricity bill tells you one number per month. It does not tell you *when* you used the energy. And without the hours, you cannot compare tariffs with real numbers. You can only guess.

Here is the problem. In Spain, the distributor keeps the data, not the retailer. Each area has its own distributor, and [e-distribucion](https://www.edistribucion.com/) (the Endesa group) covers part of Spain. Your bill shows the name of yours.

If yours is e-distribucion, you are in luck. The private area holds every hour of your history. The bad news is the portal: it shows the data in small parts, so you never see the full picture.

So I wrote a tool. It reads the whole history and gives you one clean report per CUPS.

---

## The three periods

Since 2021 the home tariff is [2.0TD](https://www.boe.es/buscar/act.php?id=BOE-A-2020-1066), and the grid fee changes with the hour:

- **P1 (peak):** the most expensive. Monday to Friday, 10:00-14:00 and 18:00-22:00.
- **P2 (flat):** in between.
- **P3 (off-peak):** the cheapest. Weekdays 00:00-08:00, plus all weekend and national holidays.

Retailers sell the same energy at a different price for each period, so your bill is a mix of the three. The tool does the mix for you: it adds your hours into P1, P2 and P3.

---

## Choose the tariff

Once you see the split, the choice gets easier:

- mostly **P3**: look for a low off-peak price,
- a lot in **P1**: look for a low peak price, or a flat price,
- the three periods close: a flat price is simpler.

There are many comparators, and [luzfija.es](https://github.com/almax-es/luzfija.es) is one of them. Copy the split into a comparator, and compare your numbers.

---

## Adjust the contracted power

The **contracted power** is the fixed part of the bill. Two mistakes are common:

- Too high: you pay for a power that you never use.
- Too low: the ICP trips and the supply goes off.

The 2.0TD tariff has two power periods. P1 covers the peak and flat hours, P2 the off-peak hours. The tool gives the **maximum demanded power** for each period, and it lists the months where you passed the contract.

**kWh** is how much you used. **kW** is how strong you pulled at one moment. Pick the contract with the maximum demanded power, and the tariff with the split by period.

---

## Real data, not estimates

The portal gives some hours as **estimated**, not real. The distributor has no reading yet. The number can be close, but it is not a measure.

The tool marks every day as real, estimated or pending, and it finds the **longest period in a row with real data only**. Use that period in a comparator, and the result comes from real measures.

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

It uses HTTP only, with no browser and no third-party package. It is unofficial: Endesa does not support it. It needs the 2.0TD tariff and the e-distribucion distributor, so check your bill first.

---

## Where to read more

- The distributor: [edistribucion.com](https://www.edistribucion.com/). Your data lives in the private area, at [zonaprivada.edistribucion.com](https://zonaprivada.edistribucion.com/).
- The 2.0TD periods: [Circular 3/2020 of the CNMC](https://www.boe.es/buscar/act.php?id=BOE-A-2020-1066), article 7.
- The tool and the period rules: [github.com/jacano/edistribucion-client](https://github.com/jacano/edistribucion-client).

---

## Try it

The tool is free and open source. Use it only with your own account.

- Star the project on GitHub.
- Send it to a friend whose distributor is e-distribucion.

Read your last three years of consumption.

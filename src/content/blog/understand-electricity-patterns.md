---
title: 'Understand your electricity patterns over a year'
date: '2026-09-14'
tag: 'Energy'
excerpt: 'An unofficial Python client for the e-distribucion private area. It downloads your full hourly history, so you can compare tariffs, set the contracted power and cut your bill.'
read: '3 min'
---

Your electricity bill is a monthly mystery. It shows one number, and it hides the one thing that matters: *when* you used the energy. Without that, you cannot compare tariffs with real numbers. You can only guess.

In Spain, the distributor keeps the real data, and not the retailer. Each area has its own distributor. **e-distribucion** (the Endesa group) covers part of Spain. Look at your bill: it shows the name of your distributor.

If your distributor is e-distribucion, you are lucky. Its private area has every hour of your history. But the portal shows the data in small parts. You never see the full picture.

So I wrote a small tool. It reads the full history and gives one clean report.

> Stop guessing. Read your own data. Cut your bill.

---

## The three periods

Since 2021 the home tariff is 2.0TD. The grid fee changes with the hour:

- **P1 (peak):** the most expensive. Monday to Friday, 10:00-14:00 and 18:00-22:00.
- **P2 (flat):** in between.
- **P3 (off-peak):** the cheapest. Weekdays 00:00-08:00, plus all weekend and national holidays.

A retailer sells the same energy at a different price for each period. Your bill is a mix of the three. The tool splits your whole history into P1, P2 and P3 in one minute.

This is the part that a monthly bill hides from you.

---

## Choose the tariff

Your split by period tells you which tariff fits you:

- mostly **P3**: look for a low off-peak price,
- a lot in **P1**: look for a low peak price, or a flat price,
- the three periods close: a flat price is simpler.

There are many comparators, and [luzfija.es](https://github.com/almax-es/luzfija.es) is one of them. Copy the split into the one that you like, and compare with *your* numbers.

---

## Adjust the contracted power

The **contracted power** is the fixed part of the bill. Many homes pay too much for it, or too little.

- Too high: you pay every month for a power that you never use.
- Too low: the ICP trips and the supply goes off.

The 2.0TD tariff has two power periods. P1 covers the peak and flat hours. P2 covers the off-peak hours. The tool gives the **maximum demanded power** for each one, and it flags the months where the demand passed the contract.

### kWh and kW are not the same

In one hour you use the oven (2 kW), the air conditioner (2 kW) and the washing machine (0.5 kW). That hour is about 4.5 kWh.

Then, for 15 minutes, you add a machine of 5 kW. The demanded power jumps to 9.5 kW. So:

- **kWh** = how much you used.
- **kW** = how hard you pulled at one moment.

Use the top demanded power for the contract. Use the top hour for the tariff.

---

## Real data, not estimates

The portal gives some hours as **estimated**, not real. The distributor has no reading yet. The number can be close, but it is not a measure.

The tool marks every day as real, estimated or pending. It finds the **longest period in a row with real data only** and gives the totals.

Give that period to a comparator. It is the most interesting number that you can give it. Then the comparison is clean, and it is fair.

---

## See it for yourself

One command gives the whole report:

```bash
pipx install .
edistribucion login --save   # only one time
edistribucion                # the report
```

You get your real and estimated totals, the split by P1, P2 and P3, the use by year, month, hour and day of the week, your top hours, the demanded power and a reading map.

The code and the guide are here:

<https://github.com/jacano/edistribucion-client>

It uses HTTP only. No browser. It uses the Python standard library only. It is not connected to e-distribucion or Endesa.

Check your bill first. The tool works only when your distributor is e-distribucion. It reads the 2.0TD tariff, the common home tariff.

---

## Try it

The tool is free and open source. Use it only with your own account.

If the report helps you, you can help in three small ways:

- Star the project on GitHub.
- Send it to a friend whose distributor is e-distribucion.
- Write about your own saving and tag me.

A real number beats a guess. Read your last three years, and make your next bill smaller.

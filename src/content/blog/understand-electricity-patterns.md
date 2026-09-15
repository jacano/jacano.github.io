---
title: 'Understand your electricity patterns over a year'
date: '2026-09-14'
tag: 'Energy'
excerpt: 'An unofficial Python client for the e-distribucion private area. It downloads your full hourly history, so you can compare tariffs, set the contracted power and cut your bill.'
read: '6 min'
---

The electricity bill shows one number per month. It does not tell you *when* you use the energy. Without the hourly data you cannot compare tariffs with real numbers. You can only guess.

In Spain, the distributor keeps the real data, and not the retailer. Each area has its own distributor. **e-distribucion** (the Endesa group) works in some areas of Spain only. Look at your bill: it shows the name of your distributor.

If your distributor is e-distribucion, you are lucky. Its private area has an hourly history for every supply point (CUPS). But the portal shows the data in small parts, so you cannot see the full picture.

So I wrote a small tool. It reads your full history and gives one clean report.

> Try it. Compare your tariff. Set your power. Maybe cut your bill. The code is free and open.

---

## What the tool does

The code and the guide are in the repository:

<https://github.com/jacano/edistribucion-client>

- It is a Python client for the e-distribucion private area.
- It uses HTTP only. No browser. It uses the Python standard library only.
- It reads the hourly consumption of every CUPS of your account.
- It splits the hours into the 2.0TD periods: P1 (peak), P2 (flat) and P3 (off-peak).
- It marks each hour as real or estimated.
- It gives the totals by year, month, hour and day of the week.
- It gives the top hour and the maximum demanded power, with the split by P1 and P2.
- It flags the months where the demand passes the contracted power.
- It finds the longest period in a row with real data only.
- It writes the hourly curve to a CSV file, so a comparator can read it.

---

## The three periods

Since 2021 the home tariff is 2.0TD. The grid fee changes with the period of the day:

- **P1 (peak):** the most expensive. Monday to Friday, 10:00-14:00 and 18:00-22:00.
- **P2 (flat):** in between. Monday to Friday, 08:00-10:00, 14:00-18:00 and 22:00-24:00.
- **P3 (off-peak):** the cheapest. Monday to Friday 00:00-08:00, plus all hours on weekends and national holidays.

A retailer sells the same energy with different prices for P1, P2 and P3. Your bill depends on how much energy you use in each period.

With your real split you can compare two retailers in one minute. You can also see if moving the washing machine or the car charge to P3 saves money.

This is the part that a monthly bill hides from you.

---

## Choose the tariff

The split by period tells you which tariff fits you:

- mostly **P3**: a tariff with a low off-peak price is for you,
- a lot in **P1**: look for a low peak price, or a flat price,
- the three periods close: a flat price is simpler to compare.

The top hour tells you *when* your biggest hour of energy happens. That hour is in one period. Use it to check the fit.

The day of the week also helps. Most homes use more energy on the weekend, and all the weekend hours are P3. Your P3 total shows the result.

---

## Adjust the contracted power

The tool helps with the price of the energy. It also helps with the **contracted power**, the fixed part of the bill. Many homes pay too much for it, or too little.

- Too high: you pay every month for a power that you never use.
- Too low: the ICP trips and the supply goes off.

The 2.0TD tariff has two power periods. P1 covers the peak and flat hours. P2 covers the off-peak hours. You can contract a different power for each one. The report gives the **maximum demanded power** per period and per year. The value comes from the portal as a 15 minute measure.

With that real value you can set each period to the power that you need. Example: if your top demand is 4.0 kW in P1 and 3.0 kW in P2, you can keep 4.0 kW in one and lower the other. The saving comes every month.

The report also flags the months where the demand passed the contracted power. Use them to check if your power is too low.

### kWh and kW are not the same

An example makes it clear. In one hour you use the oven (2 kW), the air conditioner (2 kW), the washing machine (0.5 kW) and other things (0.5 kW). The energy of that hour is about 5 kWh.

But for 15 minutes you also connect a machine of 5 kW. The demanded power is then 10 kW. So you can have:

- top hour = 5 kWh (energy),
- top demanded power = 10 kW (power).

They can fall on different days. A simple way to remember:

- **kWh** = how much you used,
- **kW** = how hard you pulled at one moment.

Do not use the top hour to choose the power. Use the **top demanded power** for the contracted power, and the **split by period** for the tariff and your habits.

---

## Use only real data

The portal gives some hours as **estimated**, not real. The distributor has no reading for them yet. The number can be close, but it is not a measure.

For a fair comparison, use real hours only. The report finds the **longest period in a row with real data only**, and gives its totals by P1, P2 and P3. Use that period in a comparator, so the result is not a mix.

The report also marks each day as real, estimated or pending, in a monthly map. Then you can see the quality of the data at a glance.

---

## Use the numbers in a comparator

A comparator turns the kWh into euros for every tariff. I checked the 2.0TD calculation of this tool against [luzfija.es](https://github.com/almax-es/luzfija.es), a free comparator. The rules match.

Two ways to use both tools together:

- Copy the split by P1, P2 and P3 from the report into the comparator. Use the plain kWh, or the period with real data only.
- Run `edistribucion report --export-csv curve.csv`. The file uses the same format as the portal, and the comparator imports it. Then the comparator can price the exact hours, not the totals.

The second way is better for indexed tariffs, because the price changes every hour.

---

## How it works

I read the portal traffic and found two ways to get the hourly curve:

1. A per-range call. It gives about 35 days per call. The full history needs many calls. It does not scale.
2. A "massive download" call. The portal makes one zip with all the hours and all the contract versions. One request is enough.

The tool uses the second way. It asks for the zip, waits for it, reads it, and deletes it. Then it builds the report.

The portal does not send the tariff period with the data. The tool works out the period from the date, the hour and the zone. It uses the 2.0TD calendar and the nine national holidays with a fixed date. Easter is not off-peak, because it has no fixed date. Ceuta and Melilla use their own hours, one hour later. The tool reads the postal code to pick the zone.

The session is the `sid` cookie. You can log in with your user and password, import a cookies file, or paste the value. The tool keeps the password in the credential store of the system, so it can log in again when the session expires.

---

## What I learned

- The last one or two days come as estimated with no value. The portal has no reading for them yet. The tool calls them "pending", not "estimated".
- A full year of data can be half estimated. The real periods are the ones that matter for a clean comparison.
- The tool supports the 2.0TD tariff only. A 3.0TD supply has six periods, and needs more work.

---

## How to use it

```bash
pipx install .
edistribucion login --save   # only one time
edistribucion                # the report
edistribucion report --export-csv curve.csv
```

With several CUPS, the report shows a summary first, then one section per CUPS.

First, check your bill. The tool works only when your distributor is e-distribucion. The retailer can be any company.

---

## Try it and share it

The tool is free and open source. It is not connected to e-distribucion or Endesa. Use it only with your own account.

If the report helps you, you can help in three small ways:

- Star the project on GitHub.
- Send it to a friend whose distributor is e-distribucion.
- Write about your own saving and tag me.

A real number beats a guess. Go and read your last three years of consumption.

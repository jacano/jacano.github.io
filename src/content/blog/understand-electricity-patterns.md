---
title: 'Understand your electricity patterns over a year'
date: '2026-09-14'
tag: 'Energy'
excerpt: 'An unofficial Python client for the e-distribucion private area. It downloads your full hourly history, so you can compare tariffs, set the contracted power and cut your bill.'
read: '5 min'
---

The electricity bill shows one number per month. It does not tell you *when* you use the energy. Without the hourly data you cannot compare tariffs with real numbers. You can only guess.

In Spain, the distributor keeps the real data, and not the retailer. Each area has its own distributor. **e-distribucion** (the Endesa group) works in some areas of Spain only. Look at your bill: it shows the name of your distributor.

If your distributor is e-distribucion, you are lucky. Its private area has an hourly history for every supply point (CUPS). But the portal gives the data in small parts, so you cannot see the full picture.

So I wrote a small tool. It reads your full history and gives one clean report.

> Try it. Compare your tariff. Set your power. Maybe cut your bill. The code is free and open.

---

## What the tool does

The code and the guide are in the repository:

<https://github.com/jacano/edistribucion-client>

- It is a Python client for the e-distribucion private area.
- It uses HTTP only. No browser. It uses the Python standard library only.
- It reads the hourly consumption of every CUPS of your account.
- It splits the hours into the 2.0TD periods: peak (P1), flat (P2) and off-peak (P3).
- It marks each hour as real or estimated.
- It gives the totals by year, month and hour.
- It gives the top hour and the top demanded power. Use them to compare tariffs and to set the contracted power.

---

## Why the periods matter

Since 2021 the home tariff is 2.0TD. The grid fee changes with the period of the day:

- **P1 (peak):** the most expensive. Monday to Friday, 10:00-14:00 and 18:00-22:00.
- **P2 (flat):** in between.
- **P3 (off-peak):** the cheapest. Monday to Friday 00:00-08:00, plus all hours on weekends and national holidays.

A retailer sells the same energy with different prices for P1, P2 and P3. Your bill depends on how much energy you use in each period.

With your real split you can compare two retailers in one minute. You can also see if moving the washing machine or the car charge to P3 saves money.

This is the part that a monthly bill hides from you.

---

## Choose the tariff

The top hour tells you *when* your biggest hour of energy happens. That hour is in one period: P1, P2 or P3. With your full split by period you can see the tariff that fits you:

- mostly **P3**: a tariff with a low off-peak price is for you,
- a lot in **P1**: look for a low peak price, or a flat price,
- the three periods close: a flat price is simpler to compare.

The day of the week also helps. Most homes use more energy on the weekend, and all the weekend hours are P3. Your P3 total shows the result of this.

---

## Adjust the contracted power

The tool helps with the price of the energy. It also helps with the **contracted power**, the fixed part of the bill. Many homes pay too much for it, or too little.

- Too high: you pay every month for a power that you never use.
- Too low: the ICP trips and the supply goes off.

The 2.0TD tariff has two power periods: peak-flat and off-peak. You can contract a different power for each one. The report gives the **maximum demanded power** per year and per month, and it comes from the portal as a 15 minute measure.

With that real value you can set each period to the power that you need. Example: if your top demand is 4.0 kW in the peak-flat period and 3.0 kW in the off-peak period, you can keep 4.0 kW in one and lower the other. The saving comes every month.

### kWh and kW are not the same

An example makes it clear. In one hour you use the oven (2 kW), the air conditioner (2 kW), the washing machine (0.5 kW) and other things (0.5 kW). The energy of that hour is about 5 kWh.

But for 15 minutes you also connect a machine of 5 kW. The demanded power is then 10 kW. So you can have:

- top hour = 5 kWh (energy),
- top demanded power = 10 kW (power).

They can fall on different days. A simple way to remember:

- **kWh** = how much you used,
- **kW** = how hard you pulled at one moment.

Do not use the top hour to choose the power. Use the **top demanded power** for the contracted power, and the **top hour** with its period for the tariff and your habits.

---

## How it works

I read the portal traffic and found two ways to get the hourly curve:

1. A per-range call. It gives about 35 days per call. The full history needs many calls. It does not scale.
2. A "massive download" call. The portal makes one zip with all the hours and all the contract versions. One request is enough.

The tool uses the second way. It asks for the zip, waits for it, reads it, and deletes it. Then it builds the report.

The portal does not send the tariff period with the data. The tool works out the period from the date and the hour. It uses the 2.0TD calendar and the nine national holidays with a fixed date. Easter is not off-peak, because it has no fixed date.

The session is the `sid` cookie. You can log in with your user and password, import a cookies file, or paste the value. The tool keeps the password in the credential store of the system, so it can log in again when the session expires.

---

## What I learned

- The last one or two days come as estimated with no value. The portal has no reading for them yet. The tool calls them "pending", not "estimated".
- The tool supports the 2.0TD tariff only. A 3.0TD supply has six periods, and needs more work.

---

## How to use it

```bash
pipx install .
edistribucion login --save   # only one time
edistribucion                # the report
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

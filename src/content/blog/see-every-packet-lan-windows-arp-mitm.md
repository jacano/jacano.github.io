---
title: 'See every packet on your LAN from Windows'
date: '2026-09-16'
tag: 'Networking'
excerpt: 'A switch shows you only your own traffic. With Npcap, Wireshark and one short Python script, you can sit in the middle of another device on your own network and read its packets.'
---

> **Run this only on your own network, or on a network where you have written permission.** ARP spoofing interrupts the traffic of another device. On a network that is not yours, it is a crime. This guide is for your own lab.

A network switch is a good doorman. It learns which device sits on which port. Then it sends each packet to one port only. That is why you cannot see the traffic of your neighbour: your network card never receives it.

A hub worked the other way. It copied every packet to every port. Hubs are gone.

So to watch another device, you must first make it send its packets to you. That is the job of ARP.

---

## ARP has no lock

Every device keeps a small address book. The book maps an IP address to a MAC address. The name of the book is the **ARP cache**.

ARP fills the book with a simple rule. If someone answers "this IP is at this MAC", the device writes it down. It does not ask who answered.

Send a false answer, and you change the book. The victim sends its packets to you. Send a second false answer to the router, and the return packets come to you too. Now you sit in the middle. This is **ARP poisoning**, or ARP spoofing.

---

## What you can see

You see every packet that passes through you:

- the servers the device contacts, by IP and by DNS name,
- the size and the timing of each flow,
- the ports and the protocols.

If the traffic uses TLS, you see the metadata, not the content. For many devices the metadata is enough. A camera that talks to one cloud server every 60 seconds tells you a lot.

---

## The tools that work on Windows

Three free tools:

- **Npcap** — the capture driver. Windows has no packet socket. Npcap adds one, and it gives you `libpcap`.
- **Wireshark** — it brings `tshark` and `dumpcap` to read the capture.
- **Python and scapy** — scapy sends the false ARP answers and moves the packets.

You need administrator rights.

---

## Install

**1. Wireshark**, from a terminal:

```powershell
winget install --id WiresharkFoundation.Wireshark --silent
```

The Wireshark package is an MSI, and the MSI does **not** include Npcap. Go to the next step.

**2. Npcap**, from the official site [npcap.com](https://npcap.com/). The silent flag (`/S`) failed for me, so run the normal installer. In the wizard, mark **"Install Npcap in WinPcap API-compatible Mode"**. Without that mark, Python and scapy cannot find the driver.

**3. scapy:**

```powershell
python -m pip install scapy
```

Check that scapy sees the driver:

```powershell
python -c "from scapy.all import conf; conf.use_pcap=True; from scapy.arch.windows import get_windows_if_list; print([i['name'] for i in get_windows_if_list()])"
```

---

## Why the Windows router mode fails

The easy plan is to turn on IP forwarding in Windows and let the system move the packets. On one interface it fails. Windows receives the packet and sends it back out of the same card. It often drops the packet, or it answers with an ICMP redirect.

So the script moves the packets by hand, one level lower. It reads the frame, changes the destination MAC, and sends it again. The IP layer never changes, so the checksums stay correct and the sessions stay alive.

---

## The script

The full script is in the companion repository:

<https://github.com/jacano/arp-mitm-windows>

It does three things:

1. **Poison** — every 1.5 seconds it tells the victim that the router is at its MAC, and tells the router that the victim is at its MAC. It also answers the ARP requests of each side.
2. **Relay** — for each frame that arrives for it, it rewrites the destination MAC and sends the frame on.
3. **Capture** — it writes the victim traffic to a `.pcap` file, and it prints DNS names and TLS server names as they appear.

---

## Run it

```powershell
python mitm.py --target 192.168.1.84 --gateway 192.168.1.1 --iface Ethernet --out victim.pcap
```

Find the target with a ping sweep. Find the MAC with `arp -a`. Find the interface name with `Get-NetAdapter`.

To stop, press Ctrl+C. The script then sends the correct ARP answers, and both sides return to normal.

---

## Proof that it works

Open the capture:

```powershell
tshark -r victim.pcap -n -q -z conv,tcp
```

A good capture shows one clean stream. In my test the sequence numbers moved with no gaps, and there were no retransmissions. That means the relay was transparent. The device never knew.

---

## Takeaways

- A switch hides the traffic. You must **move** the packet, not sniff harder.
- ARP trusts any answer. One false answer moves the traffic.
- Npcap is the missing part on Windows. The Wireshark MSI does not install it.
- The Windows IP router fails on one interface. Relay at **layer 2** instead.
- Rewrite only the MAC. Do not touch the IP, and the checksums stay valid.
- Always **restore** the ARP cache at the end.

---

## Limits

- TLS hides the content. You see the metadata only.
- The tool is **fail-open**. If your machine stops, the poison stops, and the device returns to normal when the ARP entry expires.
- Some networks block ARP spoofing. Managed switches can use DHCP snooping and dynamic ARP inspection.
- IPv6 uses NDP, not ARP. This script is for IPv4.

---

## Learn more

- The script and the guide: [github.com/jacano/arp-mitm-windows](https://github.com/jacano/arp-mitm-windows)
- A ready tool with a user interface: [bettercap](https://www.bettercap.org/)
- The capture driver: [npcap.com](https://npcap.com/)

---

*Use it on your own network only.*

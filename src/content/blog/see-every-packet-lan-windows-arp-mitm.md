---
title: 'See every packet on your LAN from Windows'
date: '2026-09-16'
tag: 'Networking'
excerpt: 'Your smart devices phone home, and your switch hides every word. With Npcap, Wireshark and one short Python script, you can stand in the middle of another device on your own network and read its life. I used it to check a camera that I did not trust.'
---

> **Run this only on your own network, or on a network where you have written permission.** ARP spoofing interrupts the traffic of another device. On a network that is not yours, it is a crime. This is a guide for your own lab.

Every smart device in your house sends messages to the internet. A camera, a plug, a doorbell. Some of them talk a lot. The problem is that you cannot see them do it.

You can read the privacy policy, or you can guess. Or you can watch the packets. This article shows the third option. It works on Windows, with three free tools and one short script.

---

## Why you see nothing

A network switch has good memory. It learns which device sits on which port, and it sends each packet to one port only. Your card receives your traffic, and nothing else.

That is good for speed, and it is good for your neighbour. It is bad for inspection. To watch another device, you must first make it send its traffic to you.

---

## ARP trusts the first answer

A device must find the MAC address of the next hop. The next hop is usually the router. So the device shouts into the network: "Who has 192.168.1.1?"

Any device can answer. The answer goes into a small cache, and nobody checks the source. No signature. No password. No question.

A false answer moves the traffic. One lie to the victim, one lie to the router, and the packets pass through the liar. This is **ARP spoofing**, and the seat in the middle is the **man in the middle**.

---

## What you can read

Everything that passes through the middle:

- the servers the device calls, by IP and by name,
- the size and the rhythm of every flow,
- the ports and the protocols.

TLS keeps the content hidden. You read the envelope, not the letter. For many devices, the envelope is the whole story. The size, the timing and the destination tell you what the device is doing.

---

## The camera I did not trust

That is why I built this tool. I have a Tapo camera at home. The vendor promises privacy. I wanted proof, not a promise.

So I put the camera in the middle of my own capture and I waited. When the camera was idle, it sent one small keepalive every 55 seconds. No image. No sound. When I opened the app, the traffic exploded to megabytes.

The camera was honest. But I only knew it because I looked.

---

## The three tools

Windows has no packet socket. You need three tools:

- **Npcap** — the missing limb. It adds the packet driver, and it gives you `libpcap`.
- **Wireshark** — it brings `tshark` and `dumpcap`, the tools that read a capture.
- **Python and scapy** — the hands. scapy sends the lies and moves the packets.

You need administrator rights. Put on the gloves.

---

## Install it

**Wireshark**, from a terminal:

```powershell
winget install --id WiresharkFoundation.Wireshark --silent
```

The Wireshark package is an MSI, and the MSI does **not** include Npcap. Go to the next step.

**Npcap**, from the official site [npcap.com](https://npcap.com/). The silent flag (`/S`) failed for me, so run the normal installer. In the wizard, mark **"Install Npcap in WinPcap API-compatible Mode"**. Without that mark, Python and scapy cannot find the driver.

**scapy:**

```powershell
python -m pip install scapy
```

Check that scapy sees the driver:

```powershell
python -c "from scapy.all import conf; conf.use_pcap=True; from scapy.arch.windows import get_windows_if_list; print([i['name'] for i in get_windows_if_list()])"
```

---

## Why not the Windows router

The obvious plan is to turn on IP forwarding in Windows and let the system move the packets. Do not bother. On one card, Windows drops the packet. At best, it sends an ICMP redirect and stops.

So the script moves the frame itself, one level below the IP. It swaps the destination MAC and sends the frame out again. The IP layer never moves, so the checksums stay valid and the connections stay alive.

---

## The script

The full script is in the companion repository:

<https://github.com/jacano/arp-mitm-windows>

It does three things:

- **Poison**: every 1.5 seconds it tells the victim that the router is at its MAC, and tells the router that the victim is at its MAC. It also answers the ARP requests of each side.
- **Relay**: for each frame that arrives for it, it rewrites the destination MAC and sends the frame on.
- **Capture**: it writes the victim traffic to a `.pcap` file, and it prints DNS names and TLS server names as they appear.

---

## Run it

```powershell
python mitm.py --target 192.168.1.84 --gateway 192.168.1.1 --iface Ethernet --out victim.pcap
```

Find the target with a ping sweep. Find the MAC with `arp -a`. Find the interface name with `Get-NetAdapter`.

To stop, press Ctrl+C. The script then sends the correct ARP answers, and both sides return to normal.

---

## Did it work?

Open the capture:

```powershell
tshark -r victim.pcap -n -q -z conv,tcp
```

A good capture shows one clean stream. In my test the sequence numbers moved with no gaps, and there were no retransmissions. The device never knew that I was there.

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

*Use it on your own network only. Verify first, then trust.*

---
title: 'See every packet on your LAN from Windows'
date: '2026-09-16'
tag: 'Networking'
excerpt: 'Your switch keeps secrets. With Npcap, Wireshark and one short Python script, you can stand in the middle of another device on your own network and read its life. I used it to check a camera that I did not trust.'
---

> **Run this only on your own network, or on a network where you have written permission.** ARP spoofing interrupts the traffic of another device. On a network that is not yours, it is a crime. This is a guide for your own lab.

Imagine a building. Every device on your network is an apartment. The switch in the basement is the doorman.

The doorman is good at his job. He learns who lives where. Then he walks each letter to one door only. Your neighbour never sees your mail. You never see his.

That is the deal, and it is a fair one. It is also the exact reason you cannot see what your smart devices say when you sleep.

---

## The doorman has no ID check

To find a door, the doorman asks a simple question into the hallway: "Who has 192.168.1.84?"

The owner answers: "Me. I am at this MAC address." The doorman writes the answer in a small book. He never checks an ID. The name of the book is the **ARP cache**.

You can already see the hole. Anyone can answer.

One false answer, and the doorman delivers every letter for that address to the impostor.

---

## Impersonate both sides

Here is the trick. I lie to the doorman, and I lie to the apartment.

- To the camera: "The router is at my MAC address."
- To the router: "The camera is at my MAC address."

Now the camera sends everything to me. I read it, and I pass it to the router. The router sends the answers to me. I read them, and I pass them back. Nobody in the hallway notices.

This is **ARP spoofing**, and the seat in the middle has a name: the **man in the middle**.

---

## What you can read

Everything that passes through the middle:

- the servers the device calls, by IP and by name,
- the size and the rhythm of every flow,
- the ports and the protocols.

TLS keeps the content hidden. You read the envelope, not the letter. For many devices, the envelope is the whole story. The size, the timing and the destination tell you what the device is doing.

---

## A camera that I did not trust

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

## The Windows trap

Here is the part that eats an afternoon. The lazy plan is to turn on IP forwarding in Windows and let the operating system move the packets for you.

It does not work on one interface. Windows takes the packet, looks at the same card, and gives up. It drops the packet, or it sends an ICMP redirect and pretends to help.

So the script does the work by hand, one level lower. It takes the frame, swaps the destination MAC, and sends it out again. The IP layer never moves, so the checksums stay valid and the connections stay alive.

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

*Use it on your own network only. The doorman trusts you.*

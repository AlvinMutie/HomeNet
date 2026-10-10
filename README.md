# HomeNet Manager — Home Network & Fibre Router Dashboard

**HomeNet Manager** is a full-stack network monitoring and device management dashboard engineered for modern home networks and GPON Optical Network Terminals (such as the **Huawei HG8145V6**).

Developed for **Kali Linux** and local home environments, it delivers real-time visibility, automated multi-signal device fingerprinting, persistent identity tagging, and network diagnostics without relying on opaque router menus or running invasive background agents.

---

## The Problem & Motivation (Why HomeNet Manager?)

Most standard ISP-supplied fibre routers and GPON gateways come with barebones, locked-down, or opaque management interfaces. When logging into the default router portal, devices on your home network typically appear only as cryptic hexadecimal MAC addresses or generic hardware identifiers, leaving you in the dark:
- *Which device is my smartphone versus my laptop or smart TV?*
- *Is that unfamiliar MAC address a neighbour piggybacking on my Wi-Fi, an IoT gadget, or a family member's phone using a randomized virtual MAC?*
- *Why does the default router interface require obscure serial numbers, technician passwords, or physical router access just to see what is connected to my own Wi-Fi?*

**HomeNet Manager was created directly out of this need: to know with certainty every single device connected to the home Wi-Fi.**

Instead of dealing with clunky, inaccessible router portals or installing third-party agent software on each device, HomeNet Manager runs locally on your network. It passively discovers active devices, uses multi-signal fingerprinting (mDNS hostnames, IP TTL inspection, signature port probes, and IEEE OUI lookups) to identify whether a device is an iPhone, Android smartphone, Sony Smart TV, or PC, and lets you assign persistent friendly names and trust classifications.

---

## 1. System Architecture

```
                  ┌──────────────────────────────────────────────────┐
                  │                 Browser Client                   │
                  │        (React 19 + TypeScript + Vite)            │
                  │  Dark Navy UI • Recharts • Lucide • Tailwind     │
                  └─────────────────────────┬────────────────────────┘
                                            │ HTTP / JSON (Port 5173 / Proxy)
                                            ▼
                  ┌──────────────────────────────────────────────────┐
                  │              FastAPI Backend (Port 8000)         │
                  │       Pydantic v2 • SQLite (WAL Mode)            │
                  └──────────────┬────────────────────────┬──────────┘
                                 │                        │
         ┌───────────────────────┴────────┐   ┌───────────┴───────────────────────┐
         │     Network Scanner Service    │   │      Router Integration Service   │
         │  • Unprivileged ICMP Sweep     │   │  • Huawei HG8145V6 Gateway Probe  │
         │  • Linux Kernel ARP Resolution │   │  • HTTPS Port 443 Status Check    │
         │  • Multi-Signal Fingerprinting │   │  • Verified WAN Internet Check    │
         │  • IEEE OUI & Private MAC Flag │   │  • Native Session Blacklist Stub  │
         │  • SQLite Label Persistence    │   │                                   │
         └───────────────┬────────────────┘   └───────────┬───────────────────────┘
                         │                                │
                         ▼                                ▼
            Local Subnet (192.168.100.0/24)     Router Gateway (192.168.100.1)
```

### Key Technical Pillars
1. **Real Dynamic Discovery**: Employs an asynchronous ICMP echo sweep across the local IPv4 subnet (`192.168.100.0/24`) that elicits kernel ARP resolution (`/proc/net/arp` and `ip neigh`). Discovers active devices, IP, MAC, and latency in ~7 seconds without root privileges.
2. **Multi-Signal Device Fingerprinting**: Combines reverse mDNS queries (`.local`), IP TTL analysis (identifying Linux/Android vs. Windows vs. iOS), targeted signature port probing (Apple Wireless Sync on 62078, Sony Bravia DIAL/REST on 20000, Android UPnP), and a comprehensive IEEE OUI database (including Transsion/Tecno/Infinix, Samsung, Apple, Sony) to automatically recognize device brands and models.
3. **Honest Hardware & Router Separation**: Clearly distinguishes local ARP discovery from authoritative router client lists. The dashboard tests real router gateway reachability (`https://192.168.100.1`) and real WAN internet connectivity (`1.1.1.1:53` / `8.8.8.8`) independently.
4. **No Simulated Blocking**: Device blocking is safely designated as requiring authoritative router control. It explains why client-side ARP spoofing cannot reliably disconnect devices and guides users to the router's genuine hardware MAC filter.
5. **Persistent Identification**: Device names ("My iPhone", "Living Room TV", "Work Laptop") and trust classifications are stored in SQLite matching devices by MAC address across scans.

---

## 2. Hardware and Environment Specifications

- **Operating System**: Kali Linux (Debian-based x86_64)
- **Target Router**: Huawei HG8145V6 (EchoLife GPON ONT)
- **Firmware**: ISP-customized ONT firmware
- **Router Gateway**: `192.168.100.1` (HTTPS on port 443 / HTTP on port 80)
- **Local Network**: `192.168.100.0/24`
- **Primary Network Interface**: `wlan0`
- **Development Host IP**: `192.168.100.7`

---

## 3. Installation & Setup on Kali Linux

### Prerequisites
Make sure Python 3.10+, Node.js 18+, and standard network utilities are installed:
```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm iproute2 iputils-ping
```

### Clone and Configure
```bash
git clone https://github.com/AlvinMutie/HomeNet.git
cd HomeNet

# Copy sample environment configuration
cp .env.example .env
```

### Backend Setup (FastAPI + Python Virtual Environment)
```bash
# Create dedicated virtual environment
python3 -m venv backend/venv

# Activate and install dependencies
./backend/venv/bin/pip install --upgrade pip
./backend/venv/bin/pip install -r backend/requirements.txt
```

### Frontend Setup (React + Vite + TypeScript + Tailwind)
```bash
cd frontend
npm install
cd ..
```

---

## 4. Running the Application

### Running in Two Terminals

**Terminal 1 — Backend (FastAPI on Port 8000)**:
```bash
# From repository root
PYTHONPATH=. ./backend/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend (Vite on Port 5173)**:
```bash
# From repository root
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Open your browser and navigate to:
**[http://localhost:5173](http://localhost:5173)**

The interactive Swagger API documentation is available at:
**[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

---

## 5. Automated Tests

Run the complete backend test suite covering API endpoints, SQLite persistence, network validation, and router reachability:

```bash
PYTHONPATH=. ./backend/venv/bin/pytest backend/tests -v
```

All 15 automated tests validate:
- Device listing, searching, filtering, and numerical IP sorting.
- Persistent custom friendly names and trust classifications across scans.
- Safe blocking error handling (HTTP 501 with security notice).
- OUI manufacturer lookup and IEEE 802 locally administered/randomized MAC detection.
- Rejection of public IP ranges and excessively large subnets.
- Router status and stats endpoints.

To run the TypeScript frontend build verification:
```bash
cd frontend && npm run build
```

---

## 6. Accessing the Dashboard from Other Devices on Home Wi-Fi

To access the HomeNet Manager dashboard from your smartphone, tablet, or another laptop connected to the same home Wi-Fi:

1. **Configure Backend Host**:
   In `.env`, set:
   ```env
   HOST=0.0.0.0
   ```
2. **Allow Traffic through Kali Linux Firewall**:
   ```bash
   # Allow incoming TCP traffic from the local 192.168.100.0/24 subnet
   sudo ufw allow from 192.168.100.0/24 to any port 5173 proto tcp
   sudo ufw allow from 192.168.100.0/24 to any port 8000 proto tcp
   ```
   *(If using raw `iptables`: `sudo iptables -A INPUT -s 192.168.100.0/24 -p tcp -m multiport --dports 5173,8000 -j ACCEPT`)*

3. **Open the Dashboard on your Device**:
   Open a browser on your mobile device and navigate to:
   ```
   http://192.168.100.7:5173
   ```

---

## 7. Security, Permissions, and Network Safety

### Why Root / Sudo is Not Required
- HomeNet Manager uses asynchronous ICMP echo probes (`ping -c 1 -w 1 -W 1`) concurrently across the `/24` subnet.
- The Linux kernel automatically issues ARP requests to resolve each IP to its MAC address and updates `/proc/net/arp` and `ip neigh`.
- HomeNet Manager reads these kernel tables directly, discovering MAC addresses and vendors without needing raw socket captures or running Python as root.

### Optional: Granting Raw ARP Capture Capabilities
If you wish to run `/usr/sbin/arp-scan` without root, grant capabilities to the binary rather than running the application with elevated privileges:
```bash
sudo setcap cap_net_raw+ep /usr/sbin/arp-scan
```

### Local Network Isolation
- HomeNet Manager only scans private subnets (`192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`).
- Public IP ranges (e.g. `8.8.8.8`) are strictly rejected.
- No network data, device telemetry, or IP records are transmitted to external servers.

---

## 8. Router Gateway Integration Roadmap

### Current Capabilities (Version 1.0)
- **Gateway Reachability**: Verifies ICMP ping and round-trip latency to `192.168.100.1`.
- **Web Portal Probe**: Probes `https://192.168.100.1:443`, validating HTTP status, response time, and TLS headers.
- **WAN Internet Test**: Distinctly verifies WAN connectivity via external socket connection to `1.1.1.1:53` / `8.8.8.8`.
- **Architecture Decoupling**: Router integration logic is strictly separated from local ARP discovery in `backend/app/services/router_service.py`.

### How to Safely Investigate the Router Web Interface
1. Connect to your home Wi-Fi and open `https://192.168.100.1` in Chrome or Firefox.
2. Open Developer Tools (`F12`) and switch to the **Network** tab.
3. Log in with your ONT credentials (printed on the router label or provided on your installation sheet).
4. Inspect the authenticated requests to locate endpoints such as:
   - Client association list: `/api/system/HostInfo` or `cgi-bin` forms
   - Wireless association: 2.4GHz / 5GHz connected client lists
   - Optical diagnostics: Rx/Tx power levels
5. Note session cookies and CSRF tokens (`X-CSRF-Token` or form tokens).

> **Warning**: Never run automated brute-force scripts against the Huawei HG8145V6 web portal. Modern ONT firmware enforces account lockout after multiple incorrect password attempts.

---

## 9. Project File Structure

```
homenet/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── devices.py          # Device listing, search, filtering, patching, safe block stub
│   │   │   ├── health.py           # Health check endpoint
│   │   │   ├── router.py           # Huawei HG8145V6 status and diagnostics
│   │   │   └── stats.py            # Aggregated telemetry and chart metrics
│   │   ├── models/
│   │   │   ├── device.py           # Pydantic device schemas and scan requests
│   │   │   └── router.py           # Router status and diagnostics schemas
│   │   ├── services/
│   │   │   ├── diagnostics.py      # System interface diagnostics
│   │   │   ├── fingerprint.py      # Multi-signal device fingerprinting (mDNS, TTL, ports)
│   │   │   ├── oui_lookup.py       # IEEE OUI dictionary and private MAC detection
│   │   │   ├── router_service.py   # Huawei HG8145V6 adapter & WAN internet checker
│   │   │   └── scanner.py          # Safe async ICMP sweep & Linux ARP table parser
│   │   ├── config.py               # Settings and environment variables
│   │   ├── database.py             # SQLite persistence with WAL mode
│   │   └── main.py                 # FastAPI application and CORS setup
│   ├── tests/
│   │   ├── conftest.py             # Pytest database fixtures
│   │   ├── test_devices_api.py     # Endpoints and safety tests
│   │   ├── test_persistence.py     # SQLite device identity preservation tests
│   │   ├── test_router_status.py   # Router reachability and stats tests
│   │   └── test_scanner.py         # Subnet validation and OUI lookup tests
│   ├── data/                       # SQLite storage directory (.gitkeep)
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlockExplanationModal.tsx # Educational modal explaining real blocking
│   │   │   ├── DeviceEditModal.tsx       # Modal for friendly names & trust tags
│   │   │   ├── Header.tsx                # Navigation, status badges, and rescan action
│   │   │   ├── MetricCard.tsx            # Telemetry statistic cards
│   │   │   ├── NetworkCharts.tsx         # Recharts diagrams for trust & latency
│   │   │   └── RouterStatusCard.tsx      # Huawei HG8145V6 gateway & internet card
│   │   ├── services/
│   │   │   └── api.ts                    # Frontend API client
│   │   ├── types/
│   │   │   └── index.ts                  # TypeScript interface definitions
│   │   ├── views/
│   │   │   ├── DevicesView.tsx           # Full device inventory & management
│   │   │   ├── OverviewView.tsx          # Dashboard overview with telemetry & graphs
│   │   │   ├── RouterView.tsx            # Hardware diagnostics & integration guide
│   │   │   └── SettingsView.tsx          # Network settings & Kali access instructions
│   │   ├── App.tsx                       # Master application component
│   │   ├── index.css                     # Tailwind CSS and theme design system
│   │   └── main.tsx                      # React root
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts                    # Vite config with Tailwind & backend proxy
├── .env.example                          # Sample environment configuration
├── .gitignore                            # Git ignore configuration
└── README.md                             # Documentation
```

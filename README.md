<h2 align="center">
  <br>
  F R A M E D
  <br>
  <br>
</h2>
<h3 align="center">System-wide Web3 for macOS, Windows and Linux :tada:</h3>
<br>
<h5 align="center">
  <a href="#features">Features</a> ⁃
  <a href="#installation">Installation</a> ⁃
  <a href="#usage">Usage</a>
</h5>
<br>

Framed is a modernized fork of [Frame](https://github.com/floating/frame), a web3 platform that creates a secure system-wide interface to your chains and accounts. Now any browser, command-line, or native application has the ability to access web3.

### Features

- **First-class Hardware Signer Support**
  - Use your GridPlus, Ledger and Trezor accounts with any dapp!
- **Extensive Software Signer Support**
  - Use a mnemonic phrase, keystore.json or standalone private keys to create and backup accounts!
- **Permissions**
  - You'll always have full control of which dapps have permission to access Frame and can monitor with full transparency what requests are being made to the network.
- **Omnichain Routing**
  - With Frame's Omnichain routing dapps can seamlessly use multiple chains at the same time, enabling truly multichain experiences.
- **Transaction Decoding**
  - By utilizing verified contract ABIs, transaction calldata can be decoded into concise and informative summaries, allowing you to sign transactions with confidence.
- **Set your own connections to Ethereum and IPFS**
  - Never be locked into using a centralized gateway
- **Menu Bar Support**
  - Frame stays out of the way and sits quietly in your menu bar until needed
- **Cross Platform**
  - MacOS, Windows and Linux!

### Changes from upstream Frame

This fork includes the following improvements over the original [floating/frame](https://github.com/floating/frame):

#### Modernized stack
- **Electron 23 → 40** — Chromium 144, Node 24, modern web platform APIs and security patches.
- **TypeScript 4.9 → 5.7** with ESLint 8 → 9 — stricter types throughout, all `any` types replaced with proper TypeScript types across the app.
- **Parcel → Vite** (electron-vite) — dramatically faster builds and HMR.
- **ethers.js v5 → viem** — lighter, tree-shakeable, better TypeScript support.
- **react-restore → valtio** — simpler reactive state management for both main and renderer processes.
- **New frontend architecture** — single-window design with Tailwind CSS, responsive layout with collapsible sidebar and stacked views.

#### New features
- **Responsive layout** with collapsible sidebar and stacked views.
- **Keyboard shortcut configurator** in Settings.
- **L1 data fee display** for OP Stack chain transactions.
- **Onboarding flow** and native Send view.
- **Auto-updater UI** banner with update badge.
- **Request type indicator** in the queue.

#### Removed Pylon dependency
The original Frame relied on Pylon (`evm.pylon.link`, `data.pylon.link`), a proprietary service run by Frame Labs for RPC proxying, token price data, and NFT inventory. Since the original project is no longer maintained, these servers could go offline without warning. This fork eliminates Pylon entirely:
- **RPC connections** now use [PublicNode](https://publicnode.com) HTTPS endpoints — fast (~70ms), no-tracking public RPCs for all supported chains (Ethereum, Optimism, Polygon, Base, Arbitrum, and testnets).
- **Token price rates** now come from [DefiLlama](https://defillama.com)'s free price API — no API key required, generous rate limits, and contract-address-based lookups that align naturally with Frame's data model.
- **NFT inventory** subscription removed — it only served ENS token ID lookups in transaction descriptions and was never displayed in any UI. ENS registration, renewal, and transfer transactions are still fully decoded.
- The `@framelabs/pylon-client` package has been removed from dependencies.

### Installation

**On Ubuntu:** Run `sudo apt-get install build-essential libudev-dev`.

```bash
# Clone
› git clone https://github.com/wakamex/framed

# Install
› ./setup.sh

# Run
› npm run prod
```

#### Build

```bash
› npm run bundle # Create bundle
› npm run build # Build Framed for current platform
```

### Usage

#### Connect to Frame natively

Frame exposes system-wide JSON-RPC endpoints `ws://127.0.0.1:1248` and `http://127.0.0.1:1248` that you can connect to from any app. We recommend using [eth-provider](https://github.com/floating/eth-provider) to create a connection `const provider = ethProvider('frame')` as `eth-provider` will handle any connection edge cases across browsers and environments

### Frame's injected provider

Frame also has a browser extension for injecting a Frame-connected [EIP-1193](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md) provider into web apps as `window.ethereum`. This can be used to inject a connection when an app does not provide the option to connect to Frame natively.

### Related

- [Frame Browser Extension](https://github.com/frame-labs/frame-extension) - Use Frame with any web dapp
- [eth-provider](https://github.com/floating/eth-provider) - A universal Ethereum provider
- [Original Frame](https://github.com/floating/frame) - The upstream project this fork is based on

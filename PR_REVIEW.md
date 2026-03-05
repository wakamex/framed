# Screenshot Test Swarm PR Review

PRs #54-#129 from the e2e screenshot test swarm. All PRs modify only `scripts/_screenshot_main.cjs` (and occasionally `.beads` metadata). **Zero bugs found or fixed in application code by any of these PRs.** All actual bugs (React #310, ChainBadge crash, O(n^2 observer cascade, startup hang) were found manually.

## Rating Scale

- **Score /100**: Usefulness as a regression test
- **Action**: KEEP (merged, valuable), REMOVE (merged but wasteful/duplicate), CLOSE (open, not worth merging), EXPAND (good foundation for future behavioral tests)

---

## PR #54 — Add add-contact modal screenshot test
**State:** MERGED | **Size:** 12+/0- | **Score: 55/100**
Clicks "+ Add Contact" button, screenshots the modal. Simple, exercises a real UI path.
**Action:** KEEP

## PR #55 — Add add-token modal screenshot test
**State:** OPEN | **Size:** 11+/0- | **Score: 55/100**
Same pattern as #54 but for tokens. Exercises the add-token modal.
**Action:** KEEP — merge it.

## PR #56 — Add light-mode screenshot tests for key views
**State:** MERGED | **Size:** 38+/0- | **Score: 70/100**
Toggles colorway to 'light' via stateSync and captures accounts, portfolio, settings. Good — tests the theme switching path and would catch CSS regressions in light mode.
**Action:** KEEP

## PR #57 — Add request-overlay screenshot test with mock pending transaction
**State:** MERGED | **Size:** 34+/1- | **Score: 80/100**
Adds a pending `eth_sendTransaction` to mock state and screenshots the request overlay. This is one of the most valuable tests — the request overlay is the most complex UI in the app and the most likely to break.
**Action:** KEEP — EXPAND with behavioral tests for approve/decline flows.

## PR #58 — Add add-account panel screenshot test
**State:** MERGED | **Size:** 10+/0- | **Score: 60/100**
Clicks "+ Add" to show the account type selector grid. Simple, useful baseline.
**Action:** KEEP

## PR #59 — Add onboarding-flow screenshot test
**State:** OPEN | **Size:** 53+/0- | **Score: 45/100**
Reloads the app with empty accounts to trigger OnboardView. Multi-step flow (Welcome -> Create -> Cancel -> Done). Reloading the whole app mid-test is fragile. Superseded by merged PR #105 which does the same thing.
**Action:** CLOSE — duplicate of #105.

## PR #60 — Add chain-detail interaction screenshot test
**State:** MERGED | **Size:** 12+/0- | **Score: 55/100**
Clicks Ethereum chain to show detail panel. Simple, useful.
**Action:** KEEP

## PR #61 — Add signer-detail interaction screenshot test
**State:** MERGED | **Size:** 76+/5- | **Score: 55/100**
Clicks first signer to show detail panel. 71 of the 76 added lines are `.beads` metadata, only 5 lines of actual test code. The test itself is fine.
**Action:** KEEP

## PR #62 — Add portfolio with collapsed section screenshot test
**State:** OPEN | **Size:** 16+/0- | **Score: 25/100**
Tries to find a "By Chain" collapsible section to click. Fragile selector guessing (`className.includes('font-medium')`). The portfolio view may not even have collapsible sections depending on mock data.
**Action:** CLOSE — speculative, fragile selectors.

## PR #63 — Add settings reset-confirmation modal screenshot test
**State:** OPEN | **Size:** 15+/0- | **Score: 50/100**
Scrolls to bottom, clicks "Reset All Settings". Tests a real destructive-action confirmation path.
**Action:** KEEP — merge it.

## PR #64 — Add history view with mock transaction data screenshot test
**State:** MERGED | **Size:** 14+/0- | **Score: 65/100**
Adds `txHistory` mock data (confirmed, pending, failed transactions). Good — the history view was previously empty, now it has real data to render. Also added tailwind classes for failed-tx styling.
**Action:** KEEP

## PR #65 — Add send view with contact autocomplete screenshot test
**State:** OPEN | **Size:** 23+/1- | **Score: 40/100**
Types 'a' into recipient field using `nativeSetter` hack to trigger autocomplete. Requires addressBook mock data. The nativeSetter approach may not trigger React's controlled input properly.
**Action:** CLOSE — fragile, covered better by #67 (send-filled-form).

## PR #66 — Add chain discovery modal screenshot test
**State:** MERGED | **Size:** 14+/0- | **Score: 55/100**
Clicks "Discover" button to open chain discovery modal. Simple, works.
**Action:** KEEP

## PR #67 — Add send form with filled fields and validation screenshot test
**State:** MERGED | **Size:** 24+/0- | **Score: 60/100**
Fills recipient address and sets amount to 999999 to trigger "insufficient balance" validation. Tests a real validation path.
**Action:** KEEP

## PR #68 — Add signature request overlay screenshot test
**State:** MERGED | **Size:** 33+/1- | **Score: 75/100**
Adds a `signTypedData` (Permit) request to Hardware Wallet account. Screenshots the signature review overlay. Valuable — permit signing is a critical security-sensitive flow.
**Action:** KEEP — EXPAND with unit tests for permit parsing.

## PR #69 — Add settings keyboard shortcut configurator screenshot test
**State:** MERGED | **Size:** 15+/0- | **Score: 45/100**
Clicks "Change" button in settings to show shortcut configurator. Niche feature, low regression risk.
**Action:** KEEP

## PR #70 — Add chain-detail interaction screenshot test
**State:** OPEN | **Size:** 12+/0- | **Score: 0/100**
Exact duplicate of merged PR #60.
**Action:** CLOSE — duplicate.

## PR #71 — Add account removal confirmation modal screenshot test
**State:** MERGED | **Size:** 19+/0- | **Score: 60/100**
Clicks account, then clicks "Remove" to show confirmation modal. Tests a destructive action path.
**Action:** KEEP

## PR #72 — Add token removal confirmation modal screenshot test
**State:** MERGED | **Size:** 22+/0- | **Score: 45/100**
Finds remove button for a custom token. Fragile — searches by text content, aria-label, title, SVG icon, and icon-only buttons as fallbacks. Over-engineered selector.
**Action:** KEEP

## PR #73 — Add populated address book with mock contacts screenshot test
**State:** MERGED | **Size:** 7+/1- | **Score: 60/100**
Adds 4 contacts to mock state. Small, focused — gives the contacts view real data to render.
**Action:** KEEP

## PR #74 — Add gas adjuster expanded screenshot test
**State:** MERGED | **Size:** 10+/0- | **Score: 65/100**
Clicks "Adjust" button in transaction review to expand gas adjuster. Tests an important interactive panel.
**Action:** KEEP

## PR #75 — Add light mode screenshots for send, history, chains, tokens, and signers views
**State:** CLOSED | **Size:** 27+/0- | **Score: N/A**
Closed — extended light mode views but also included duplicate token removal code. Functionality absorbed by later PRs (#95, #123).
**Action:** N/A — already closed.

## PR #76 — Add multiple pending requests queue navigation screenshot test
**State:** OPEN | **Size:** 71+/0- | **Score: 50/100**
Adds 2 more pending requests and a `request-queue-nav` interaction that clicks "Next" to navigate between them. Tests queue navigation, which is important but the 71 lines are mostly mock data boilerplate.
**Action:** KEEP — merge it, but the queue navigation logic is already better covered by #89.

## PR #77 — Add locked signer with password prompt screenshot test
**State:** OPEN | **Size:** 36+/0- | **Score: 35/100**
Superseded by merged PR #128 which adds the same locked signer + unlock form + error state with better coverage.
**Action:** CLOSE — duplicate of #128.

## PR #78 — Add chain health status variants screenshot
**State:** MERGED | **Size:** 24+/0- | **Score: 55/100**
Adds chain health status variants via stateSync (disconnected primary). Tests RPC status badge rendering.
**Action:** KEEP

## PR #79 — Add compact/narrow window mode screenshots
**State:** MERGED | **Size:** 46+/0- | **Score: 70/100**
Resizes window to 400px width, captures compact mode for accounts, portfolio, settings. Tests responsive layout — one of the more valuable tests since compact mode has different code paths.
**Action:** KEEP — EXPAND with compact mode navigation tests.

## PR #80 — Add empty-state screenshots for portfolio, history, tokens, and contacts
**State:** CLOSED | **Size:** 43+/0- | **Score: N/A**
Closed — superseded by merged PR #91.
**Action:** N/A — already closed.

## PR #81 — Add transaction with EIP-1559 gas fields and contract interaction screenshot
**State:** MERGED | **Size:** 63+/1- | **Score: 75/100**
Adds a DeFi Wallet account with EIP-1559 transaction (maxFeePerGas, maxPriorityFeePerGas). Adds contract call data. Tests the most complex transaction review variant.
**Action:** KEEP — EXPAND with unit tests for EIP-1559 gas fee display logic.

## PR #82 — Add contact detail with notes and delete confirmation screenshot test
**State:** MERGED | **Size:** 34+/0- | **Score: 55/100**
Clicks a contact to show details, then clicks delete for confirmation modal. Two-step interaction.
**Action:** KEEP

## PR #83 — Add signer with error/disconnected status screenshot test
**State:** MERGED | **Size:** 35+/1- | **Score: 60/100**
Adds Trezor signer with `status: 'error'` and error message. Tests error state rendering.
**Action:** KEEP

## PR #84 — Add account with multiple dapp permissions screenshot test
**State:** MERGED | **Size:** 26+/2- | **Score: 55/100**
Adds more permissions entries (Aave, OpenSea) to test the permissions list rendering.
**Action:** KEEP

## PR #85 — Add watch-only account detail screenshot test
**State:** OPEN | **Size:** 23+/0- | **Score: 50/100**
Adds a watch-only account (no signer) and screenshots its detail view. Tests the "disconnected" signer state. Reasonable.
**Action:** KEEP — merge it.

## PR #86 — Add account rename inline form screenshot test
**State:** MERGED | **Size:** 9+/0- | **Score: 55/100**
Clicks "rename" button to show inline rename form. Simple, tests a real UI interaction.
**Action:** KEEP

## PR #87 — Add multi-chain portfolio with diverse balances screenshot test
**State:** MERGED | **Size:** 40+/2- | **Score: 60/100**
Adds balances across multiple chains (Ethereum, Polygon, Optimism) to test portfolio aggregation display.
**Action:** KEEP

## PR #88 — Add addToken request overlay screenshot test
**State:** MERGED | **Size:** 36+/0- | **Score: 55/100**
Adds `wallet_watchAsset` request and screenshots the addToken overlay. Tests a less common but real dapp request.
**Action:** KEEP

## PR #89 — Add mixed request queue with diverse request types screenshot test
**State:** OPEN | **Size:** 116+/0- | **Score: 45/100**
Adds access, addChain, and signTypedData requests. Adds 4 interactions to navigate the queue and show each type. Large PR (116 lines) for screenshots of states already covered by individual PRs (#57, #68, #92).
**Action:** CLOSE — redundant with individual request type PRs.

## PR #90 — Add switchChain request overlay screenshot test
**State:** OPEN | **Size:** 31+/0- | **Score: 50/100**
Adds a `switchChain` request and interaction. Tests a specific dapp request type not covered elsewhere.
**Action:** KEEP — merge it.

## PR #91 — Add empty-state screenshots for portfolio, history, tokens, and contacts
**State:** MERGED | **Size:** 44+/0- | **Score: 55/100**
Sends stateSync to clear data, then screenshots each view's empty state. Tests the "No X yet" fallback rendering.
**Action:** KEEP

## PR #92 — Add dapp access request overlay screenshot test
**State:** OPEN | **Size:** 46+/0- | **Score: 55/100**
Adds an `access` request and screenshots the "wants to connect" overlay. Tests a real dapp connection flow.
**Action:** KEEP — merge it.

## PR #93 — Add signer remove confirmation modal screenshot test
**State:** MERGED | **Size:** 16+/0- | **Score: 50/100**
Clicks remove on a signer to show confirmation modal. Simple, tests destructive action path.
**Action:** KEEP

## PR #94 — Add addChain request overlay screenshot test
**State:** CLOSED | **Size:** 35+/0- | **Score: N/A**
Closed — functionality absorbed into other PRs.
**Action:** N/A — already closed.

## PR #95 — Add light mode screenshots for contacts view and light+compact combined screenshots
**State:** MERGED | **Size:** 49+/0- | **Score: 60/100**
Adds light mode contacts + combined light+compact screenshots. Tests a cross-cutting combination.
**Action:** KEEP

## PR #96 — Add history clear confirmation modal and account selector screenshot tests
**State:** OPEN | **Size:** 29+/0- | **Score: 40/100**
Clicks "Clear History" to show confirmation. Also tries to interact with an account selector dropdown. Moderately useful.
**Action:** KEEP — merge it.

## PR #97 — Add light mode screenshots for contacts view and light+compact combined screenshots
**State:** OPEN | **Size:** 49+/0- | **Score: 0/100**
Exact duplicate of merged PR #95.
**Action:** CLOSE — duplicate.

## PR #98 — Add compact mode screenshots for remaining views
**State:** MERGED | **Size:** 5+/0- | **Score: 50/100**
Extends compact mode screenshots to send, contacts, signers, history, tokens. Just adds navIndex entries — tiny but completes the compact coverage.
**Action:** KEEP

## PR #99 — Add settings scrolled sections screenshot
**State:** MERGED | **Size:** 33+/0- | **Score: 45/100**
Scrolls settings view to capture Gas Alerts, Hardware, API Keys sections. Tests that settings renders all sections.
**Action:** KEEP

## PR #100 — Add send form with network/token selector dropdown open screenshot
**State:** OPEN | **Size:** 30+/0- | **Score: 0/100**
Exact duplicate of merged PR #101.
**Action:** CLOSE — duplicate.

## PR #101 — Add send form with network/token selector dropdown open screenshot
**State:** MERGED | **Size:** 30+/0- | **Score: 45/100**
Tries to open network and token dropdowns. Fragile — uses `select`, `[role="listbox"]`, `[role="combobox"]` with fallbacks. May not actually work depending on the dropdown implementation.
**Action:** KEEP

## PR #102 — Add personal_sign plain message overlay screenshot test
**State:** MERGED | **Size:** 50+/0- | **Score: 60/100**
Adds `personal_sign` request with decoded message text. Multi-step navigation (close panel, click account, navigate queue). Tests plain message signing distinct from typed data.
**Action:** KEEP

## PR #103 — Add permission revoke interaction screenshot test
**State:** MERGED | **Size:** 14+/0- | **Score: 55/100**
Clicks "Revoke" on a connected origin. Tests permission revocation UI feedback.
**Action:** KEEP

## PR #104 — Add AddAccount watch address form with ENS resolution screenshot test
**State:** MERGED | **Size:** 29+/0- | **Score: 55/100**
Navigates to Watch Address form, types "vitalik.eth" to show ENS resolution UI. Tests ENS input path.
**Action:** KEEP

## PR #105 — Add onboarding step progression screenshots
**State:** MERGED | **Size:** 55+/0- | **Score: 60/100**
Full onboarding flow: Welcome -> Get Started -> Create -> Skip -> Done. Multi-step with app reload. Tests the first-run experience.
**Action:** KEEP

## PR #106 — Add permit signature with expired deadline screenshot test
**State:** MERGED | **Size:** 37+/1- | **Score: 65/100**
Adds permit with expired deadline (1hr in the past) and max uint256 value. Tests a security-critical edge case — expired permits should show a warning.
**Action:** KEEP — EXPAND with unit test asserting the warning is actually rendered.

## PR #107 — Add AddAccount hardware signer info screens screenshot test
**State:** MERGED | **Size:** 53+/6- | **Score: 55/100**
Screenshots Ledger, Trezor, Lattice info screens during account creation. Three-step navigation flow.
**Action:** KEEP

## PR #108 — Add token list search/filter interaction screenshot test
**State:** MERGED | **Size:** 21+/2- | **Score: 50/100**
Expands custom tokens from 2 to 6, types "USD" in search. Tests token filtering.
**Action:** KEEP

## PR #109 — Add chain network toggle on/off screenshot test
**State:** MERGED | **Size:** 25+/0- | **Score: 55/100**
Clicks Arbitrum toggle switch. Tests network enable/disable UI.
**Action:** KEEP

## PR #110 — Add AddAccount seed phrase import form screenshot test
**State:** MERGED | **Size:** 25+/0- | **Score: 50/100**
Navigates to Seed Phrase form, fills mismatched passwords for validation error. Tests form validation.
**Action:** KEEP

## PR #111 — Add contact edit modal screenshot test
**State:** MERGED | **Size:** 18+/0- | **Score: 50/100**
Clicks Edit button on a contact entry. Tests edit modal rendering.
**Action:** KEEP

## PR #112 — Add contact edit modal screenshot test
**State:** CLOSED | **Size:** 22+/0- | **Score: 0/100**
Duplicate of #111.
**Action:** N/A — already closed.

## PR #113 — Add compact mode request overlay screenshot test
**State:** MERGED | **Size:** 30+/0- | **Score: 60/100**
Captures request overlay in compact (400px) mode. Tests that the overlay renders correctly in narrow layout — a distinct code path from normal mode.
**Action:** KEEP

## PR #114 — Add settings hardware derivation dropdown and API key input interaction screenshot tests
**State:** MERGED | **Size:** 39+/0- | **Score: 45/100**
Changes Ledger derivation to Legacy, fills API key inputs with demo values. Tests settings interactions.
**Action:** KEEP

## PR #115 — Add settings hardware derivation dropdown and API key input interaction screenshot tests
**State:** MERGED | **Size:** 39+/0- | **Score: 0/100**
Exact duplicate of #114. Both were merged.
**Action:** NO-OP — merge commit was empty (content already present from #114). No revert needed.

## PR #116 — Add approved transaction post-action state with explorer link screenshot test
**State:** MERGED | **Size:** 37+/0- | **Score: 65/100**
Uses stateSync to set transaction status to 'confirmed' with tx hash. Tests the post-approval view with explorer link. Tests an important state transition.
**Action:** KEEP

## PR #117 — Add update available and ready-to-install banner screenshot tests
**State:** MERGED | **Size:** 27+/0- | **Score: 60/100**
Injects update badge via stateSync for both "available" and "ready" states. Tests the UpdateBanner component in both variants.
**Action:** KEEP

## PR #118 — Add OP Stack L1 data fee in transaction review screenshot test
**State:** MERGED | **Size:** 46+/1- | **Score: 65/100**
Adds Optimism transaction with `chainData.optimism.l1Fees`. Tests L1 data fee display — a chain-specific rendering path.
**Action:** KEEP

## PR #119 — Add transaction with recognized contract actions screenshot test
**State:** MERGED | **Size:** 4+/0- | **Score: 50/100**
Adds `recognizedActions` array to existing EIP-1559 request. Tiny, focused change.
**Action:** KEEP

## PR #120 — Add transaction with recognized contract actions screenshot test
**State:** MERGED | **Size:** 4+/0- | **Score: 0/100**
Exact duplicate of #119. Both were merged.
**Action:** NO-OP — merge commit was empty (content already present from #119). No revert needed.

## PR #121 — Add AddAccount private key import form screenshot test
**State:** MERGED | **Size:** 36+/0- | **Score: 50/100**
Private key form with mismatched password validation. Same pattern as #110 (seed phrase).
**Action:** KEEP

## PR #122 — Add AddAccount keystore file import form screenshot test
**State:** MERGED | **Size:** 27+/0- | **Score: 55/100**
Keystore import form + IPC mock handler for `locateKeystore`. Tests file import path and adds necessary IPC infrastructure.
**Action:** KEEP

## PR #123 — Add light mode screenshot tests for request overlays
**State:** MERGED | **Size:** 81+/0- | **Score: 55/100**
Light mode versions of transaction, signature, and permit overlays. Tests theme on the most complex views. 81 lines is large for 3 screenshots but includes navigation logic.
**Action:** KEEP

## PR #124 — Add transaction sending/confirming in-progress state screenshot tests
**State:** MERGED | **Size:** 69+/0- | **Score: 65/100**
Uses stateSync to set transaction through sending -> confirming -> verifying states. Tests the full transaction lifecycle UI. Good coverage of state transitions.
**Action:** KEEP

## PR #125 — Add chain RPC health degraded/down status and custom RPC screenshot tests
**State:** MERGED | **Size:** 56+/0- | **Score: 60/100**
Tests RPC health badge (degraded with 450ms latency), custom RPC URL input, and dual-connection display. Tests chain infrastructure UI.
**Action:** KEEP

## PR #126 — Add WatchList CSV import results with mixed success/error screenshot test
**State:** MERGED | **Size:** 43+/0- | **Score: 60/100**
WatchList form + results with 7 successes and 2 errors. Adds `loadWatchList` IPC handler. Tests the bulk import feature end-to-end in the screenshot harness.
**Action:** KEEP

## PR #127 — Add chain discovery search filtering and 'already added' state screenshot tests
**State:** MERGED | **Size:** 124+/13- | **Score: 55/100**
Chain discovery search with "Polygon" and "Ethereum" (already added) queries. Adds `fetchChainlist` IPC handler with 8 mock chains. Largest PR, mostly mock data and `.beads` metadata.
**Action:** KEEP

## PR #128 — Add signer unlock password form and error state screenshot tests
**State:** MERGED | **Size:** 60+/1- | **Score: 35/100**
Adds locked signer, fills password, **injects fake "Invalid password" error text directly into the DOM** instead of triggering the actual error flow. The password form screenshot is legitimate; the error state is fabricated.
**Action:** KEEP the password form part. The DOM injection error is misleading — it tests screenshot rendering of fake HTML, not actual app behavior.

## PR #129 — Add declined transaction and error state screenshot tests
**State:** MERGED | **Size:** 54+/0- | **Score: 60/100**
Uses stateSync to set transaction to 'declined' and 'error' states with notice messages. Tests terminal transaction states.
**Action:** KEEP

---

## Summary

| Metric | Count |
|---|---|
| Total PRs reviewed | 76 (54-129) |
| MERGED | 56 |
| OPEN | 16 |
| CLOSED | 4 |
| Duplicates merged (waste) | 3 (#115, #120 are dupes; #70 is open dupe) |
| Bugs found in app code | **0** |
| Lines added to app source | **0** |
| Total lines added to screenshot script | ~2100 |

### Action Summary

- **KEEP (merged):** 50 PRs — leave as-is
- **DUPLICATE (merged, no-op):** 2 PRs (#115, #120) — merge commits were empty, no revert needed
- **CLOSED (cleanup done):** 11 PRs total
  - Worthless/duplicate: #59, #62, #65, #70, #89, #97, #100 — closed with comments
  - Merge conflicts: #76, #85, #90, #92 — closed (conflicts from 50+ prior merges to same file)
- **MERGED (already):** #55, #63, #96 — were already merged before cleanup
- **EXPAND (good foundation for behavioral tests):** 4 PRs (#57, #68, #79, #81)
- **EXPAND (good foundation for behavioral tests):** 4 PRs (#57, #68, #79, #81)

### Quality Assessment

**Strengths:**
- Broad coverage: 9 nav views + dozens of interactions, light/dark mode, compact mode
- Mock data is realistic and well-structured
- stateSync-based state transitions test real Valtio update paths
- IPC mock handlers (getState, locateKeystore, loadWatchList, fetchChainlist) build useful test infrastructure

**Weaknesses:**
- Zero bugs found — all actual bugs were caught manually
- No behavioral assertions — only validates screenshot size > 5000 bytes
- DOM injection hacks (#128) create fake UI states that don't reflect real behavior
- Fragile selectors (`querySelectorAll('button').find(b => b.textContent.includes(...))`)
- 3 duplicate PRs merged due to lack of dedup checks in the swarm
- Single 2100-line file with no structure — tests for different views are interleaved
- `nativeSetter` hack for React inputs may not actually trigger controlled component updates

### Recommendation

Stop the screenshot swarm. The coverage is comprehensive enough for regression detection. Future testing investment should go toward:
1. **Behavioral unit tests** (Jest + Testing Library) that assert actual rendered content
2. **State integration tests** (like `accountSelection.test.js`) that test real Valtio flows
3. **Error boundary tests** that would catch hooks violations like the React #310 bug

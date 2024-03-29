# Pulsar TWAMM

## Introduction

[![built-with openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF)](https://docs.openzeppelin.com/)

**Time-Weighted Average Market Maker ([TWAMM](https://www.paradigm.xyz/2021/07/twamm/))** is a new on-chain market making model, designed by [@\_Dave\_\_White\_](https://twitter.com/_Dave__White_), [@danrobinson](https://twitter.com/danrobinson) and [@haydenzadams](https://twitter.com/haydenzadams). TWAMM allows market participants to efficiently execute large orders over multiple blocks on Ethereum.

**Pulsar TWAMM** is the first implementation of TWAMM. The math involved in TWAMM can be found in this article: <https://hackmd.io/@luffy/SJxSsOH1Y>

## Implementation Notes

### Overview

`TWAMM.sol` directly implements most of the standard AMM functionality (liquidity provision, liquidity removal, and swapping). The logic for execution of long-term orders is split across two libraries, `OrderPool.sol`, `LongTermOrders.sol` and `BinarySearchTree.sol`.

### Order Pool

The main abstraction for implementing long-term orders is the `OrderPool`. The order pool represents a set of long-term orders, which sell a given token to the embedded AMM at a constant rate. The token pool also handles the logic for the distribution of sales proceeds to the owners of the long-term orders.

The distribution of proceeds is done through a modified version of algorithm from [Scalable Reward Distribution on the Ethereum Blockchain](https://uploads-ssl.webflow.com/5ad71ffeb79acc67c8bcdaba/5ad8d1193a40977462982470_scalable-reward-distribution-paper.pdf). Since order expiries are decoupled from proceeds distribution in the TWAMM model, the modified algorithm needs to keep track of additional parameters to compute proceeds correctly.

### Long Term Orders

In addition to the order pools, the `LongTermOrders` struct keep the state of the virtual order execution. Most importantly, it keep track of the last block where virtual orders were executed. Before every interaction with the embedded AMM, the state of virtual order execution is brought forward to the present block. We can do this efficiently because only certain blocks are eligible for virtual order expiry. Thus, we can advance the state by a full block interval in a single computation. Crucially, advancing the state of long-term order execution is linear only in the number of block intervals since the last interaction with TWAMM, not linear in the number of orders.

### Binary Search Tree

`BinarySearchTree (BST)` is a data structure that is used to store and organize data in a hierarchical manner. In Pulsar's particular BST, the nodes are long-term order expiration block heights. The tree allows for nodes to be inserted and deleted, and when execute virtual orders, it will retrieve a list of expirations from the [lastVirtualOrderBlock](https://github.com/PulsarSwap/TWAMM-Contracts/blob/ffb6cfc4a640e1efeddc18adb04c3fd248705a92/contracts/libraries/LongTermOrders.sol#L39) up until the current time, as well as a list of expirations for the next week.

### Fixed Point Math

This implementation uses the [PRBMath Library](https://github.com/hifi-finance/prb-math) for fixed point arithmetic, in order to implement the closed form solution to settling long-term trades. Efforts were made to make the computation numerically stable, but there's remaining work to be done here in order to ensure that the computation is correct for the full set of expected inputs.

## How to run

```bash
# Install dependencies
npm install

# Compile contracts with hardhat
npx hardhat compile

# Test contracts with hardhat
npx hardhat test
```

# Non-profit DAO (On-chain governance DAO for social goods)<br>

![np-dao](./images/np-dao.png)

## About

Simple DAO prototype for my research seminar

## Contracts

### NToken

- DAO governance token<br>
- `NToken` has compatibility with other ERC20 tokens.<br>

### NLock

- Ntoken holders can receive `NLocked token` by locking their `Ntoken` on this contract.<br>
- `NLocked token` amount equals the token holder's voting power.
  Voting power is calculated by `Ntoken amount * lock time / MIN_TIME`.
  Once NToken is locked on this contract, it is not released until unlock time.

- `Nlocked token` doesn't have compatibility with other ERC20 tokens.<br>
  Token holders can not transfer.

### NVoting

- This contract controls the voting system for this non-profit DAO.
- DAO members can propose and vote by using `Nlocked token`.<br>
- A result of the voting is not opened to the public until the voting period ends.

### NTreasury

- The main role of this contract is to keep an accounts of DAO's incoming and outgoing with their information.(ex: donation, paying, expenditure, etc)

# Inspired by

- Gitcoin.co
- uniswap.org
- Curve.fi
- Maker DAO

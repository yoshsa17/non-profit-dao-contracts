const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { toWei } = web3.utils;
const NToken = artifacts.require("NToken");

contract("NToken", async (accounts) => {
  const [CONTRACT_CREATOR, RECEIVER, , ...OTHERS] = accounts;
  const INITIAL_TOKEN_AMOUNT = toWei("1000");
  const ONE_TOKEN = toWei("1");
  const TEN_TOKEN = toWei("10");
  const ZERO_TOKEN = toWei("0");
  const ZERO_ADDRESS = constants.ZERO_ADDRESS;

  let token;
  beforeEach(async () => {
    token = await NToken.new({ from: CONTRACT_CREATOR });
  });

  describe("constructor", async () => {
    it("initializes token meta data", async () => {
      expect(await token.name()).to.equal("Non-profit DAO Token");
      expect(await token.symbol()).to.equal("NPO");
      expect(await token.decimals()).to.be.bignumber.equal("18");
      expect(await token.totalSupply()).to.be.bignumber.equal(
        INITIAL_TOKEN_AMOUNT
      );
    });
  });

  describe("balanceOf", async () => {
    it("returns INITIAL_TOKEN_AMOUNT", async () => {
      expect(await token.balanceOf(CONTRACT_CREATOR)).to.be.bignumber.equal(
        INITIAL_TOKEN_AMOUNT
      );
    });

    it("returns zero", async () => {
      expect(await token.balanceOf(RECEIVER)).to.be.bignumber.equal("0");
    });
  });

  describe("transfer", () => {
    describe("CONTRACT_CREATOR transfers the requested amount", () => {
      it("returns expected amounts", async () => {
        await token.transfer(RECEIVER, new BN(ONE_TOKEN), {
          from: CONTRACT_CREATOR,
        });
        expect(await token.balanceOf(CONTRACT_CREATOR)).to.be.bignumber.equal(
          toWei("999")
        );
        expect(await token.balanceOf(RECEIVER)).to.be.bignumber.equal(
          ONE_TOKEN
        );
      });
    });

    describe("events during transferring", () => {
      it("emits a transfer event", async () => {
        const { logs } = await token.transfer(RECEIVER, new BN(ONE_TOKEN), {
          from: CONTRACT_CREATOR,
        });

        expectEvent.inLogs(logs, "Transfer", {
          from: CONTRACT_CREATOR,
          to: RECEIVER,
          value: new BN(ONE_TOKEN),
        });
      });
    });

    describe("reverts during transferring", () => {
      // InsufficientBalance()
      it("reverts if the amount exceeds source's amount", async () => {
        const balance = await token.balanceOf(CONTRACT_CREATOR);

        expectRevert.unspecified(
          token.transfer(RECEIVER, balance.add(new BN(ONE_TOKEN)), {
            from: CONTRACT_CREATOR,
          })
        );
      });

      // ZeroAmount()
      it("reverts if the amount is zero", async () => {
        expectRevert.unspecified(
          token.transfer(RECEIVER, new BN(ZERO_TOKEN), {
            from: CONTRACT_CREATOR,
          })
        );
      });

      // ZeroAddress()
      it("reverts if the target is Zero Address", async () => {
        expectRevert.unspecified(
          token.transfer(ZERO_ADDRESS, new BN(ONE_TOKEN), {
            from: CONTRACT_CREATOR,
          })
        );
      });
    });
  });

  describe("approve/transferFrom", () => {
    describe("OTHERS[0] transfers 10 NPO from CONTRACT_CREATOR to RECEIVER", () => {
      it("approves 10 NPO to OTHERS[0]", async () => {
        await token.approve(OTHERS[0], new BN(TEN_TOKEN), {
          from: CONTRACT_CREATOR,
        });
        expect(
          await token.allowance(CONTRACT_CREATOR, OTHERS[0])
        ).to.be.bignumber.equal(TEN_TOKEN);
      });

      it("transfers 10 NPO from CONTRACT_CREATOR to RECEIVER", async () => {
        await token.approve(OTHERS[0], new BN(TEN_TOKEN), {
          from: CONTRACT_CREATOR,
        });

        await token.transferFrom(
          CONTRACT_CREATOR,
          RECEIVER,
          new BN(TEN_TOKEN),
          {
            from: OTHERS[0],
          }
        );
        expect(await token.balanceOf(CONTRACT_CREATOR)).to.be.bignumber.equal(
          toWei("990")
        );
        expect(await token.balanceOf(RECEIVER)).to.be.bignumber.equal(
          TEN_TOKEN
        );
      });
    });

    describe("events during execution of approve/transferFrom", () => {
      it("emits a approval event", async () => {
        const { logs } = await token.approve(OTHERS[0], new BN(TEN_TOKEN), {
          from: CONTRACT_CREATOR,
        });

        expectEvent.inLogs(logs, "Approval", {
          owner: CONTRACT_CREATOR,
          spender: OTHERS[0],
          value: new BN(TEN_TOKEN),
        });
      });
    });

    describe("reverts during execution of approve/transferFrom", () => {
      // ZeroAddress()
      it("reverts if approval target is zero address", async () => {
        expectRevert.unspecified(
          token.approve(ZERO_ADDRESS, new BN(TEN_TOKEN), {
            from: CONTRACT_CREATOR,
          })
        );
      });

      // InsufficientAllowance()
      it("reverts if transfer amount > allowance", async () => {
        await token.approve(OTHERS[0], new BN(TEN_TOKEN), {
          from: CONTRACT_CREATOR,
        });

        expectRevert.unspecified(
          token.transferFrom(
            RECEIVER,
            new BN(TEN_TOKEN).add(new BN(TEN_TOKEN)),
            {
              from: CONTRACT_CREATOR,
            }
          )
        );
      });
    });
  });
});

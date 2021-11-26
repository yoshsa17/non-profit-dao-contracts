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
  const ONE_TOKEN = new BN(toWei("1"));
  const TEN_TOKEN = new BN(toWei("10"));
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
        await token.transfer(RECEIVER, ONE_TOKEN, {
          from: CONTRACT_CREATOR,
        });
        expect(await token.balanceOf(CONTRACT_CREATOR)).to.be.bignumber.equal(
          toWei("999")
        );
        expect(await token.balanceOf(RECEIVER)).to.be.bignumber.equal(
          ONE_TOKEN.toString()
        );
      });
    });

    describe("events during transferring", () => {
      it("emits a transfer event", async () => {
        const txReceipt = await token.transfer(RECEIVER, ONE_TOKEN, {
          from: CONTRACT_CREATOR,
        });

        await expectEvent(txReceipt, "Transfer", {
          from: CONTRACT_CREATOR,
          to: RECEIVER,
          value: ONE_TOKEN,
        });
      });
    });

    describe("reverts during transferring", () => {
      // InsufficientBalance
      it("reverts if the amount exceeds source's amount", async () => {
        const balance = await token.balanceOf(CONTRACT_CREATOR);

        await expectRevert.unspecified(
          token.transfer(RECEIVER, balance.add(ONE_TOKEN), {
            from: CONTRACT_CREATOR,
          })
        );
      });

      // ZeroAmount
      it("reverts if the amount is zero", async () => {
        await expectRevert.unspecified(
          token.transfer(RECEIVER, ONE_TOKEN, {
            from: CONTRACT_CREATOR,
          })
        );
      });

      // ZeroAddress
      it("reverts if the target is Zero Address", async () => {
        await expectRevert.unspecified(
          token.transfer(ZERO_ADDRESS, ONE_TOKEN, {
            from: CONTRACT_CREATOR,
          })
        );
      });
    });
  });

  describe("approve/transferFrom", () => {
    describe("OTHERS[0] transfers 10 NPO from CONTRACT_CREATOR to RECEIVER", () => {
      it("approves 10 NPO to OTHERS[0]", async () => {
        await token.approve(OTHERS[0], TEN_TOKEN, {
          from: CONTRACT_CREATOR,
        });
        expect(
          await token.allowance(CONTRACT_CREATOR, OTHERS[0])
        ).to.be.bignumber.equal(TEN_TOKEN.toString());
      });

      it("transfers 10 NPO from CONTRACT_CREATOR to RECEIVER", async () => {
        await token.approve(OTHERS[0], TEN_TOKEN, {
          from: CONTRACT_CREATOR,
        });

        await token.transferFrom(CONTRACT_CREATOR, RECEIVER, TEN_TOKEN, {
          from: OTHERS[0],
        });
        expect(await token.balanceOf(CONTRACT_CREATOR)).to.be.bignumber.equal(
          toWei("990")
        );
        expect(await token.balanceOf(RECEIVER)).to.be.bignumber.equal(
          TEN_TOKEN.toString()
        );
      });
    });

    describe("events during execution of approve/transferFrom", () => {
      it("emits a approval event", async () => {
        const txReceipt = await token.approve(OTHERS[0], TEN_TOKEN, {
          from: CONTRACT_CREATOR,
        });

        await expectEvent(txReceipt, "Approval", {
          owner: CONTRACT_CREATOR,
          spender: OTHERS[0],
          value: TEN_TOKEN,
        });
      });
    });

    describe("reverts during execution of approve/transferFrom", () => {
      // ZeroAddress()
      it("reverts if approval target is zero address", async () => {
        await expectRevert.unspecified(
          token.approve(ZERO_ADDRESS, TEN_TOKEN, {
            from: CONTRACT_CREATOR,
          })
        );
      });

      // InsufficientAllowance()
      it("reverts if transfer amount > allowance", async () => {
        await token.approve(OTHERS[0], TEN_TOKEN, {
          from: CONTRACT_CREATOR,
        });

        const exceedAmount = new BN(toWei("1000"));

        await expectRevert.unspecified(
          token.transferFrom(CONTRACT_CREATOR, RECEIVER, exceedAmount, {
            from: OTHERS[0],
          })
        );
      });
    });
  });
});

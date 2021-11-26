const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const NToken = artifacts.require("NToken");
const Treasury = artifacts.require("Treasury");
const MockVoting = artifacts.require("MockVoting");

const { toWei } = web3.utils;

contract("Treasury", async (accounts) => {
  const [SENDER, RECIPIENT, ...OTHERS] = accounts;
  const ONE_ETHER = new BN(toWei("1"));
  const ZERO_ADDRESS = constants.ZERO_ADDRESS;

  let token;
  let mockVoting;
  let treasury;
  before(async () => {
    token = await NToken.new();
    mockVoting = await MockVoting.new();
    treasury = await Treasury.new(token.address, mockVoting.address);
    await mockVoting.initTreasury(treasury.address);
  });

  describe("constructor", () => {
    it("sets initial values", async () => {
      expect(await web3.eth.getBalance(treasury.address)).to.be.equal("0");
      expect(await treasury.isAcceptableToken(token.address)).to.be.equal(true);
    });
  });

  describe("fallback function", () => {
    let txReceipt;
    before(async () => {
      txReceipt = await treasury.sendTransaction({
        from: SENDER,
        value: ONE_ETHER,
      });
    });

    it("returns the transaction information (fallback function)", async () => {
      expect(await treasury.getTransaction(1)).deep.to.be.equal([
        ZERO_ADDRESS,
        SENDER,
        true,
        ONE_ETHER.toString(),
        "",
      ]);
    });

    it("increases the treasury contract balance (1ETH)", async () => {
      expect(await web3.eth.getBalance(treasury.address)).to.be.bignumber.equal(
        ONE_ETHER.toString()
      );
    });

    it("emits a EtherDeposited event", async () => {
      expectEvent(txReceipt, "EtherDeposited", {
        transactionId: new BN("1"),
        source: SENDER,
        amount: ONE_ETHER,
        information: "",
      });
    });
  });

  describe("deposit", () => {
    let txReceipt;
    const TEST_REFERENCE = "TEST TRANSACTION";

    describe("SENDER deposit 1 ETH with a reference", () => {
      before(async () => {
        txReceipt = await treasury.deposit(TEST_REFERENCE, {
          value: ONE_ETHER,
          from: SENDER,
        });
      });

      it("returns the transaction information (deposit function)", async () => {
        expect(await treasury.getTransaction(2)).deep.to.be.equal([
          ZERO_ADDRESS,
          SENDER,
          true,
          ONE_ETHER.toString(),
          TEST_REFERENCE,
        ]);
      });

      it("emits a EtherDeposited event including a reference", async () => {
        expectEvent(txReceipt, "EtherDeposited", {
          transactionId: new BN("2"),
          source: SENDER,
          amount: ONE_ETHER,
          information: TEST_REFERENCE,
        });
      });

      it("increases treasury contract balance (2ETH)", async () => {
        expect(
          await web3.eth.getBalance(treasury.address)
        ).to.be.bignumber.equal(ONE_ETHER.mul(new BN("2")));
      });
    });

    describe("Reverts during calling `deposit`", () => {
      // ZeroValue
      it("reverts if tx.value is zero", async () => {
        await expectRevert.unspecified(
          treasury.deposit(TEST_REFERENCE, {
            value: 0,
            from: SENDER,
          })
        );
      });
      // InvalidInformationLength
      it("reverts if the information length is longer `MAX_TX_INFO_LENGTH`", async () => {
        await expectRevert.unspecified(
          treasury.deposit("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", {
            value: ONE_ETHER,
            from: SENDER,
          })
        );
      });
    });
  });

  describe("send", () => {
    let txReceipt;
    const TEST_REFERENCE = "PAYMENT";

    describe("Treasury contract sends 1 ETH to RECIPIENT", () => {
      before(async () => {
        txReceipt = await mockVoting.callSend(
          RECIPIENT,
          ONE_ETHER,
          TEST_REFERENCE
        );
      });

      it("returns the transaction information", async () => {
        expect(await treasury.getTransaction(3)).deep.to.be.equal([
          ZERO_ADDRESS,
          RECIPIENT,
          false,
          ONE_ETHER.toString(),
          TEST_REFERENCE,
        ]);
      });

      it("emits a EtherSent event with a reference", async () => {
        expectEvent.inTransaction(txReceipt.tx, treasury, "EtherSent", {
          transactionId: new BN("3"),
          target: RECIPIENT,
          amount: ONE_ETHER.toString(),
          information: TEST_REFERENCE,
        });
      });

      it("decreases treasury contract balance (1ETH)", async () => {
        expect(
          await web3.eth.getBalance(treasury.address)
        ).to.be.bignumber.equal(ONE_ETHER);
      });
    });

    describe("Reverts during calling `send`", () => {
      // OnlyGovernance
      it("reverts if msg.sender is not the voting contract", async () => {
        await expectRevert.unspecified(
          treasury.send(RECIPIENT, ONE_ETHER, TEST_REFERENCE, {
            from: SENDER,
          })
        );
      });

      // InsufficientBalance
      it("reverts if the treasury contract balance < amount", async () => {
        const TEN_ETHER = ONE_ETHER.mul(new BN("10"));
        await expectRevert.unspecified(
          mockVoting.callSend(RECIPIENT, TEN_ETHER, TEST_REFERENCE)
        );
      });

      // TODO:: find how to make the transaction fail
      // TransactionFailed
      // it("reverts if msg.sender is not voting contract", async () => {
      //   await expectRevert.unspecified();
      // });

      // InvalidInformationLength
      it("reverts if msg.sender is not voting contract", async () => {
        await expectRevert.unspecified(
          treasury.send(
            RECIPIENT,
            ONE_ETHER,
            "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            {
              from: SENDER,
            }
          )
        );
      });
    });
  });
});

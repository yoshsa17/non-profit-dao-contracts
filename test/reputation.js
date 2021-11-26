const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const Reputation = artifacts.require("Reputation");
const MockVoting = artifacts.require("MockVoting");

const REPUTATION_VALUE = new BN("100");
const EVALUATION_PERIOD = new BN("138");
const MAX_REPUTATION_VALID_PERIOD = new BN(String(60 * 60 * 24 * 100));
const ONE_DAY = new BN(String(60 * 60 * 24));

async function getReputationTimestamp(transactionHash) {
  const blockNumber = await web3.eth.getTransaction(transactionHash)
    .blockNumber;
  const mintedTime = (await web3.eth.getBlock(blockNumber)).timestamp;
  const truncatedMintedTime = new BN(mintedTime).div(ONE_DAY).mul(ONE_DAY);
  const expirationTime = new BN(truncatedMintedTime).add(
    MAX_REPUTATION_VALID_PERIOD
  );
  return [mintedTime, expirationTime];
}

contract("Reputation", async (accounts) => {
  // E : Evaluator, C : Contributor
  const [E1, E2, E3, E4, C1, C2, C3, C4] = accounts;
  const INITIAL_MEMBERS = [E1, E2, E3, E4];

  let mockVoting;
  let reputation;

  let latestBlock;
  let endBlock;

  before(async () => {
    mockVoting = await MockVoting.new();
    reputation = await Reputation.new(INITIAL_MEMBERS, mockVoting.address);
    await mockVoting.initReputation(reputation.address);
  });

  describe("constructor", () => {
    accounts.forEach(async (address, i) => {
      it(`initializes accounts[${i}] reputations`, async () => {
        expect(await reputation.reputationOf(address)).to.be.bignumber.equal(
          INITIAL_MEMBERS.includes(address) ? REPUTATION_VALUE : "0"
        );
      });
    });

    it("emits a ReputationMinted event", async () => {
      const [, expirationTime] = await getReputationTimestamp(
        reputation.transactionHash
      );

      await expectEvent.inTransaction(
        reputation.transactionHash,
        reputation,
        "ReputationMinted",
        {
          roundId: new BN("0"),
          from: constants.ZERO_ADDRESS,
          to: accounts[0],
          expirationTime: expirationTime,
          reasons: "",
        }
      );
    });
    it("initializes `_governance` address", async () => {
      expect(await reputation.getGovernanceAddress()).to.be.equal(
        mockVoting.address
      );
    });
  });

  describe("startEvaluation", () => {
    let txReceipt;

    before(async () => {
      txReceipt = await mockVoting.callStartEvaluation(INITIAL_MEMBERS);
    });

    it("emits a EvaluationStarted event", async () => {
      latestBlock = await time.latestBlock();
      endBlock = latestBlock.add(new BN(EVALUATION_PERIOD));

      // check a event in a internal transaction
      await expectEvent.inTransaction(
        txReceipt.tx,
        reputation,
        "EvaluationStarted",
        {
          roundId: new BN("1"),
          evaluators: INITIAL_MEMBERS,
          startBlock: latestBlock,
          endBlock: endBlock,
        }
      );
    });

    describe("Reverts during calling `startEvaluation` function", () => {
      // OnlyGovernance;
      it("reverts if transaction sender is not the voting contract", async () => {
        await expectRevert.unspecified(
          reputation.startEvaluation(INITIAL_MEMBERS)
        );
      });

      // InvalidEvaluatorsNumber
      it("reverts if the evaluator.length > `_maxEvaluators`", async () => {
        await expectRevert.unspecified(
          mockVoting.callStartEvaluation(accounts)
        );
      });
    });
  });

  describe("evaluate", () => {
    let txReceipt;

    const roundId = "1";
    let _mintedTime;
    let _expirationTime;
    const reasons = ["Nice work", "Nice work", "Nice work"];
    describe("Evaluate contributors", () => {
      before(async () => {
        txReceipt = await reputation.evaluate(roundId, [E2, C1, C2], reasons, {
          from: E1,
        });
        await reputation.evaluate(roundId, [E3, C3, C4], reasons, { from: E2 });
        await reputation.evaluate(roundId, [E1, E2, E4], reasons, { from: E3 });
      });

      // TODO:: fix this test after this below issue close
      // https://github.com/OpenZeppelin/openzeppelin-test-helpers/issues/135
      it("emits a ReputationMinted event", async () => {
        const [, expirationTime] = await getReputationTimestamp(txReceipt.tx);
        await expectEvent(txReceipt, "ReputationMinted", {
          roundId: roundId,
          from: E1,
          to: E2,
          expirationTime: expirationTime,
          reasons: "Nice work",
        });
      });

      const addresses = [E1, E2, E3, E4, C1, C2, C3, C4];
      const expectedRep = [1, 2, 1, 1, 1, 1, 1, 1];
      addresses.forEach(async (addr, index) => {
        let amount = Number(REPUTATION_VALUE) * expectedRep[index];
        if (INITIAL_MEMBERS.includes(addr)) {
          amount += Number(REPUTATION_VALUE);
        }

        it(`returns reputations of addresses[${index}]`, async () => {
          expect(await reputation.reputationOf(addr)).to.be.bignumber.equal(
            new BN(amount)
          );
        });
      });
    });

    describe("Reverts during calling `evaluate`", () => {
      // InvalidRoundId
      it("reverts if the roundId was not founded in `_evaluationRounds`", async () => {
        await expectRevert.unspecified(
          reputation.evaluate("2", [E1, E2, E3], reasons, { from: E4 })
        );
      });

      // OnlyEvaluator
      it("reverts if the caller is not registered as an evaluator Or has already evaluated", async () => {
        await expectRevert.unspecified(
          reputation.evaluate(roundId, [E1, E2, E3], reasons, { from: C1 })
        );
        await expectRevert.unspecified(
          reputation.evaluate(roundId, [E1, E3, E4], reasons, { from: E2 })
        );
      });

      // InvalidEvaluation
      it("reverts if target address > `_maxEvaluation`", async () => {
        await expectRevert.unspecified(
          reputation.evaluate(
            roundId,
            [E1, E3, E4, C1, C2, C3],
            reasons.concat(reasons),
            {
              from: E2,
            }
          )
        );
      });

      // InvalidArrayLength (_mint)
      it("reverts if contributors[].length != reasons[].length", async () => {
        await expectRevert.unspecified(
          reputation.evaluate(roundId, [E1, E2], reasons, { from: E4 })
        );
      });

      // InvalidAddress (_mint) self-evaluation
      // TODO:: fix this test. it doesn't catch reverts.
      // it("reverts if the evaluator include their address to evaluation targets", async () => {
      //   await expectRevert.unspecified(
      //     reputation.evaluate(roundId, [E1, E4, E2], reasons, { from: E4 })
      //   );
      // });

      // OnlyEvaluationPeriod
      it("reverts if the evaluator call `evaluate` after the round closes", async () => {
        // mine blocks until the endBlock that the evaluation finish at
        await time.advanceBlockTo(endBlock);

        await expectRevert.unspecified(
          reputation.evaluate(roundId, [E1, E2, E3], reasons, { from: E4 })
        );
      });
    });
  });

  describe("slash", () => {
    let prevRep;

    before(async () => {
      prevRep = await reputation.reputationOf(C4);
      await mockVoting.callSlash(C4);
    });
    it("return 100 for the prev reputation Account", async () => {
      expect(prevRep).to.be.bignumber.equal("100");
    });
    it("returns zero for the slashed Account", async () => {
      expect(await reputation.reputationOf(C4)).to.be.bignumber.equal("0");
    });

    it("returns true for the slashed account", async () => {
      expect(await reputation.isSlashed(C4)).to.be.true;
    });
  });

  describe("reputationOf", () => {
    before(async () => {
      await time.increase(ONE_DAY.toString());
    });

    it(`decrease E1's reputation to 99 from 200`, async () => {
      expect(await reputation.reputationOf(E1)).to.be.bignumber.lessThan(
        REPUTATION_VALUE.mul(new BN("2"))
      );
    });
  });
});

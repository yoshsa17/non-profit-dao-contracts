const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require("@openzeppelin/test-helpers");
const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const { expect } = require("chai");
const { ethers } = require("ethers");
const { toWei } = web3.utils;

const Voting = artifacts.require("Voting");
const Reputation = artifacts.require("Reputation");
// const NToken = artifacts.require("NToken");
// const Treasury = artifacts.require("Treasury");
const ActionTarget = artifacts.require("ActionTarget");

const ActionTargetIface = new ethers.utils.Interface([
  "function targetFun(uint256 number) external returns (bool)",
]);

const VOTE_TYPE = {
  Against: "0",
  For: "1",
  Abstain: "2",
};

const PROPOSAL_STATUS = {
  Pending: "0",
  Active: "1",
  Succeeded: "2",
  Defeated: "3",
  Canceled: "4",
  Executed: "5",
};

contract("Voting", async (accounts) => {
  const [PROPOSER, VOTER_1, VOTER_2, VOTER_3, VOTER_4, ...OTHERS] = accounts;
  const initialMembers = [PROPOSER, VOTER_1, VOTER_2, VOTER_3, VOTER_4];

  let voting;
  let reputation;
  let actionTarget;

  let startBlock;
  let endBlock;
  let executeBlock;
  let transactionReceipt;

  // let token;
  // let treasury;
  before(async () => {
    // token = await NToken.new();
    voting = await Voting.new();
    reputation = await Reputation.new(initialMembers, Voting.address);
    // treasury = await Treasury.new(token.address, voting.address);

    actionTarget = await ActionTarget.deployed();
    await voting.init(reputation.address);
  });

  describe("constructor", () => {
    it("sets initial values ", async () => {
      expect(await voting.votingPeriod()).to.be.bignumber.equal("138");
      expect(await voting.votingDelay()).to.be.bignumber.equal("138");
      expect(await voting.proposalTimeLock()).to.be.bignumber.equal("138");
      expect(await voting.proposalMaxOperations()).to.be.bignumber.equal("5");
      expect(await voting.proposalThreshold()).to.be.bignumber.equal("50");
      expect(await voting.proposalCount()).to.be.bignumber.equal("0");
    });
  });

  describe("propose", async () => {
    const target = ActionTarget.address;
    const description = "add 5 to state value";
    const calldata = ActionTargetIface.encodeFunctionData("targetFun", [5]);
    // const calldata = treasuryIface.encodeFunctionData("addNum", [
    //   OTHERS[0],
    //   TEN_ETHER,
    //   "PAYMENT",
    // ]);

    describe("PROPOSER proposes the first proposal", async () => {
      before(async () => {
        transactionReceipt = await voting.propose(
          0,
          [target],
          [0],
          [calldata],
          description,
          {
            from: PROPOSER,
          }
        );
      });

      it(`increases proposalCount`, async () => {
        expect(await voting.proposalCount()).to.be.bignumber.equal("1");
      });

      it("returns proposal details", async () => {
        startBlock = new BN(await web3.eth.getBlockNumber()).add(
          await voting.votingDelay()
        );
        endBlock = startBlock.add(await voting.votingPeriod());
        executeBlock = endBlock.add(await voting.proposalTimeLock());

        const res = await voting.getProposal(1);
        expect(res.proposer).to.be.equal(PROPOSER);
        expect(res.description).to.be.equal(description);
        expect(res.targets).deep.to.be.eql([target]);
        // TODO:: fix
        expect(res.values[0]).to.be.bignumber.equal("0");
        expect(res.calldatas).deep.to.be.equal([calldata]);
        expect(res.startBlock).to.be.bignumber.equal(startBlock);
        expect(res.endBlock).to.be.bignumber.equal(endBlock);
        expect(res.executeBlock).to.be.bignumber.equal(executeBlock);
      });

      it("emits a ProposalCreated event", async () => {
        expectEvent(transactionReceipt, "ProposalCreated", {
          proposalId: new BN("1"),
          proposer: PROPOSER,
          description: description,
          targets: [target],
          // TODO:: fix
          // values: [new BN("0")],
          calldatas: [calldata],
          startBlock: startBlock,
          endBlock: endBlock,
        });
      });

      it("returns the proposal status (pending)", async () => {
        expect(await voting.getStatus(1)).to.be.bignumber.equal(
          PROPOSAL_STATUS.Pending
        );
      });
    });

    describe("Reverts during a proposal creation", async () => {
      // ReputationBelowThreshold
      it("reverts if proposer's reputation is below the threshold", async () => {
        await expectRevert.unspecified(
          voting.propose(0, [target], [0], [calldata], description, {
            from: OTHERS[3],
          })
        );
      });

      // InvalidOperationNumber
      it("reverts if proposer's reputation is below the threshold", async () => {
        await expectRevert.unspecified(
          voting.propose(
            0,
            [target, target],
            [0, 0, 0],
            [calldata],
            description,
            {
              from: PROPOSER,
            }
          )
        );
      });
    });
  });

  describe("castVote", async () => {
    const reason = `test reason`;

    before(async () => {
      await time.advanceBlockTo(startBlock);
    });

    it("returns the proposal status (Active)", async () => {
      expect(await voting.getStatus(1)).to.be.bignumber.equal(
        PROPOSAL_STATUS.Active
      );
    });

    describe("VOTER_1 votes for the first proposal", async () => {
      let transactionReceipt;
      let weight;

      before(async () => {
        transactionReceipt = await voting.castVote(1, VOTE_TYPE.For, reason, {
          from: VOTER_1,
        });
        weight = await reputation.reputationOf(VOTER_1);
      });

      it("emits a VoteCast event ", async () => {
        expectEvent(transactionReceipt, "VoteCast", {
          voter: VOTER_1,
          proposalId: "1",
          voteType: VOTE_TYPE.For,
          amt: weight,
          reason,
        });
      });

      it("returns a receipt for VOTER_1", async () => {
        expect(await voting.getReceipt(1, VOTER_1)).deep.to.be.equal([
          true,
          VOTE_TYPE.For,
          weight.toString(),
        ]);
      });

      it("returns true for VOTER_1", async () => {
        expect(await voting.hasVoted(1, VOTER_1)).to.be.true;
      });
    });

    describe("Reverts during a proposal creation", () => {
      // OnlyMember
      it("reverts if voter has no reputations", async () => {
        await expectRevert.unspecified(
          voting.castVote(1, VOTE_TYPE.For, reason, {
            from: OTHERS[3],
          })
        );
      });

      // InvalidProposalId
      it("reverts if proposal status is not active", async () => {
        await expectRevert.unspecified(
          voting.castVote(2, VOTE_TYPE.For, reason, {
            from: VOTER_2,
          })
        );
      });

      // InvalidDoubleVoting
      it("reverts if the voter has already voted", async () => {
        await expectRevert.unspecified(
          voting.castVote(1, VOTE_TYPE.For, reason, {
            from: VOTER_1,
          })
        );
      });

      // InvalidVoteType
      it("reverts if a invalid support number was given", async () => {
        await expectRevert.unspecified(
          voting.castVote(1, "33", reason, {
            from: VOTER_2,
          })
        );
      });
    });
  });

  describe("execute", () => {
    before(async () => {
      await time.advanceBlockTo(executeBlock);
    });

    it("checks that current blockNumber and blocknumber", async () => {
      const currentBlock = await web3.eth.getBlockNumber();
      assert.equal(currentBlock, new BN(executeBlock));
    });

    it("returns the proposal status (Succeeded)", async () => {
      expect(await voting.getStatus(1)).to.be.bignumber.equal(
        PROPOSAL_STATUS.Succeeded
      );
    });

    describe("PROPOSER call execute the proposal", () => {
      let transactionReceipt;
      before(async () => {
        transactionReceipt = await voting.execute(1, { from: PROPOSER });
      });

      it("emits a ProposalExecuted event", async () => {
        expectEvent(transactionReceipt, "ProposalExecuted", {
          proposalId: "1",
        });
      });

      it("returns a status(Executed)", async () => {
        expect(await voting.getStatus(1)).to.be.bignumber.equal(
          PROPOSAL_STATUS.Executed
        );
      });

      it("adds 5 to `state` and add voting.address to `caller` in TestTarget.sol", async () => {
        expect(await actionTarget.state()).to.be.bignumber.equal("5");
        expect(await actionTarget.caller()).to.be.equal(voting.address);
      });
    });

    describe("Reverts during executions", () => {
      // NotSucceededProposal
      it("reverts if the proposal's status is not Succeeded", async () => {
        await expectRevert.unspecified(voting.execute(1, { from: PROPOSER }));
      });

      // InvalidProposalId
      it("reverts if the proposal doesn't exist", async () => {
        await expectRevert.unspecified(voting.execute(5, { from: PROPOSER }));
      });
    });
  });
});
// describe("cancel", () => {
// before(() => {
// await voting.cancel(1, { from: PROPOSER });
// });
//
// it("cancels the first proposal", async () => {
// const proposal1 = await voting.getProposal(1);
// const status1 = await voting.getStatus(1);
//
// assert.equal(proposal2.canceled, true);
// assert.equal(status2.toString(), ProposalStatus.Canceled);
// });
// it("emits a ProposalCanceled event", async () => {
// ("ProposalCanceled");
// assert.equal(eventValue.proposalId, 1);
// });
// });
//
// for (let i; i < initialMembers.length; i++) {
//   let support = Math.floor(Math.random() * 4);
//   let weight = await reputation.reputationOf(initialMembers[i]);
//   let reason = `This is a reason from ${initialMembers[i]}`;

//   transactionReceipt = await voting.castVote(1, support, reason, {
//     from: initialMembers[i],
//   });

//   it(`emits a VoteCast event ${i}`, async () => {
//     expectEvent(transactionReceipt, "ProposalCreated", {
//       voter: initialMembers[i],
//       proposalId: 1,
//       voteType: support,
//       amt: weight,
//       reason,
//     });
//   });
// }
// it("executes and send 10 ETH from treasury to OTHERS[0]", async () => {
//   expect(await web3.eth.getBalance(OTHERS[0])).to.be.equal(
//     balanceOfReceiver.add(new BN(TEN_ETHER))
//   );
// });

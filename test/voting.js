// TODO:: add tests for custom error and `execute()`

const NVoting = artifacts.require("Voting");
const NToken = artifacts.require("NToken");
const NReputation = artifacts.require("Reputation");

const TRUFFLE_VM_ERROR =
  "Error: Returned error: VM Exception while processing transaction: revert";

const sleep = (waitTime) =>
  new Promise((resolve) => setTimeout(resolve, waitTime));

const VOTE_TYPE = {
  Against: 0,
  For: 1,
  Abstain: 2,
};

const ProposalStatus = {
  Pending: 0,
  Active: 1,
  Succeeded: 2,
  Defeated: 3,
  Canceled: 4,
  Executed: 5,
};

contract("NVoting", async (accounts) => {
  let voting;
  let reputation;

  before(async () => {
    voting = await NVoting.deployed();
    reputation = await NReputation.deployed();
    voting.init(NReputation.address, { from: accounts[0] });
  });

  describe("constructor", () => {
    it("should set correct value ", async () => {
      const votingPeriod = await voting.votingPeriod();
      const proposalThreshold = await voting.proposalThreshold();
      const votingDelay = await voting.votingDelay();
      const proposalTimeLock = await voting.proposalTimeLock();
      const proposalCount = await voting.proposalCount();
      assert.equal(votingPeriod, 19938);
      assert.equal(proposalThreshold, 50);
      assert.equal(votingDelay, 0);
      assert.equal(proposalTimeLock, 0);
      assert.equal(proposalCount, 0);
    });
  });

  describe("createProposal/getProposal/ProposalCreated event", () => {
    const tokenContractAddress = NToken.address;
    const fDescription = "transferring token";
    const fCalldata = "0x012345678910";

    let _startBlock;
    let _endBlock;

    it("should create a proposal and increase proposalCount", async () => {
      const r = await reputation.reputationOf(accounts[0]);
      assert.equal(r.toNumber(), 100);

      await voting.propose(
        0,
        [tokenContractAddress],
        [0],
        [fCalldata],
        fDescription
      );

      const count = await voting.proposalCount();
      assert.equal(count, 1);
    });

    it("should get the proposal by getProposalFunction", async () => {
      const _blockNumber = await web3.eth.getBlockNumber();
      const _votingDelay = await voting.votingDelay();
      const _votingPeriod = await voting.votingPeriod();
      _startBlock =
        _votingDelay == 0
          ? _blockNumber
          : Number(_blockNumber) + Number(_votingDelay);
      _endBlock = Number(_startBlock) + Number(_votingPeriod);

      const {
        id,
        proposer,
        startBlock,
        endBlock,
        forVotes,
        againstVotes,
        abstainVotes,
        canceled,
        executed,
      } = await voting.getProposal(1);

      assert.equal(id, 1);
      assert.equal(proposer, accounts[0]);
      assert.equal(forVotes, 0);
      assert.equal(againstVotes, 0);
      assert.equal(abstainVotes, 0);
      assert.equal(canceled, false);
      assert.equal(executed, false);
      assert.equal(startBlock.toString(), _startBlock);
      assert.equal(endBlock.toString(), _endBlock);
    });

    it("should get the proposal by Event", async () => {
      eventList = await voting.getPastEvents("ProposalCreated");
      eventValue = eventList[0].returnValues;

      assert.equal(eventValue.proposalId, "1");
      assert.equal(eventValue.proposer, accounts[0]);
      assert.equal(eventValue.description, fDescription);
      assert.equal(eventValue.targets, tokenContractAddress);
      assert.equal(eventValue.values, 0);
      assert.equal(eventValue.calldatas.toString(10), fCalldata);
      assert.equal(eventValue.startBlock, _startBlock);
      assert.equal(eventValue.endBlock, _endBlock);
    });

    it("should get the proposal status (pending)", async () => {
      const status = await voting.getStatus(1);
      assert.equal(status, 0);
    });

    // it("should revert due to ReputationBelowThreshold() ", async () => {
    //   let error;
    //   try {
    //     await voting.propose(
    //       0,
    //       [tokenContractAddress],
    //       [0],
    //       [fCalldata],
    //       fDescription,
    //       { from: accounts[5] }
    //     );
    //   } catch (e) {
    //     error = e;
    //   }
    //   assert.equal(error, TRUFFLE_VM_ERROR);
    // });

    // it("should revert due to InvalidOperationNumber() ", async () => {
    //   let error;
    //   try {
    //     await voting.propose(
    //       0,
    //       [tokenContractAddress, tokenContractAddress],
    //       [0, 0, 0],
    //       [fCalldata],
    //       fDescription,
    //       { from: accounts[5] }
    //     );
    //   } catch (e) {
    //     error = e;
    //   }
    //   assert.equal(error, TRUFFLE_VM_ERROR);
    // });
  });

  describe("castVote/getProposal/hasVoted/getReceipt/VoteCast", () => {
    // This test should pass only if _votingDelay is 0 day
    it("should get the proposal status (Active)", async () => {
      // wait 2sec to send transaction in next block(set ganache with 2sec block time )
      await sleep(3000);
      const blockNumber = await web3.eth.getBlockNumber();
      const proposal = await voting.getProposal(1);
      const status = await voting.getStatus(1);
      assert.isAbove(Number(blockNumber), proposal.startBlock.toNumber());
      assert.equal(status, 1);
    });
    it("should vote for the first proposal and emit VoteCast() Event ", async () => {
      await voting.castVote(1, VOTE_TYPE.For, { from: accounts[1] });
      const weight = await reputation.reputationOf(accounts[1]);
      eventList = await voting.getPastEvents("VoteCast");
      eventValue = eventList[0].returnValues;
      assert.equal(eventValue.voter, accounts[1]);
      assert.equal(eventValue.proposalId, 1);
      assert.equal(eventValue.voteType, VOTE_TYPE.For);
      assert.equal(eventValue.amt, weight);
      const proposal = await voting.getProposal(1);
      assert.equal(proposal.forVotes.toString(), weight.toString());
      const receipt = await voting.getReceipt(1, accounts[1]);
      assert.equal(receipt.hasVoted, true);
      assert.equal(receipt.support, VOTE_TYPE.For);
      assert.equal(receipt.votes, weight);
    });
    it("should returns true for account 1 and false for account2", async () => {
      const hasVotedOfAccount1 = await voting.hasVoted(1, accounts[1]);
      const hasVotedOfAccount2 = await voting.hasVoted(1, accounts[2]);
      assert.equal(hasVotedOfAccount1, true);
      assert.equal(hasVotedOfAccount2, false);
    });
    // it("should fail to vote for the first proposal", async () => {
    //   let errMsg;
    //   try {
    //     await voting.castVote(1, VOTE_TYPE.For, { from: accounts[5] });
    //   } catch (e) {
    //     errMsg = e;
    //   }
    //   assert.equal(errMsg, "");
    // });
  });

  describe("cancel/ProposalCanceled", () => {
    it("should cancel the first proposal", async () => {
      const proposal1 = await voting.getProposal(1);
      const status1 = await voting.getStatus(1);
      await voting.cancel(1, { from: accounts[0] });
      const proposal2 = await voting.getProposal(1);
      const status2 = await voting.getStatus(1);
      assert.equal(proposal1.canceled, false);
      assert.equal(proposal2.canceled, true);
      assert.equal(status1.toString(), ProposalStatus.Active);
      assert.equal(status2.toString(), ProposalStatus.Canceled);
    });
    it("should emit ProposalCanceled event", async () => {
      eventList = await voting.getPastEvents("ProposalCanceled");
      eventValue = eventList[0].returnValues;
      assert.equal(eventValue.proposalId, 1);
    });
  });

  // TODO:: test with voting contract
  // describe('execute', () => {
  // 	it('should execute proposal function', async () => {});
  // });
});

const NVoting = artifacts.require("NVoting");
const NLock = artifacts.require("NLock");
const NToken = artifacts.require("NToken");

const BN = web3.utils.BN;
const SIX_MONTH = (60 * 60 * 24 * 365) / 2;
const now = Math.round(new Date().getTime() / 1000);

contract("NVoting", async accounts => {
  let nVoting;
  let nLock;
  let nToken;
  const unlockTime = now + SIX_MONTH;
  before(async () => {
    nVoting = await NVoting.deployed();
    nLock = await NLock.deployed();
    nToken = await NToken.deployed();
  });

  describe("constructor", () => {
    it("should set correct value ", async () => {
      const name = await nVoting.name();
      const proposalCount = await nVoting.proposalCount();
      const minVotingPeriod = await nVoting.minVotingPeriod();
      assert.equal(name, "NVoting");
      assert.equal(proposalCount, 0);
      assert.equal(minVotingPeriod, 0);
    });
  });

  describe("createProposal and getProposal", () => {
    it("should create the first proposal", async () => {
      await nToken.approve(NLock.address, 10);
      await nLock.createLock(10, unlockTime);

      const ProposalUri = "foo";
      const votingOption = 1;
      const startBlock = (await web3.eth.getBlockNumber()) + 1;
      const endBlock = startBlock + 10;

      const id = await nVoting.createProposal(
        ProposalUri,
        votingOption,
        startBlock,
        endBlock
      );
      const count = await nVoting.proposalCount();
      const proposal = await nVoting.getProposal(1);

      assert.equal(count, 1);
      assert.equal(proposal.proposer, accounts[0]);
      assert.equal(proposal.proposalUri, ProposalUri);
      assert.equal(proposal.votingOption, votingOption);
      assert.equal(proposal.startBlock, startBlock);
      assert.equal(proposal.endBlock, endBlock);
    });

    it("should get the proposal status (Pending)", async () => {
      const status = await nVoting.getStatus(1);
      const p = await nVoting.getProposal(1);
      const blockNumber = await web3.eth.getBlockNumber();
      assert.equal(BN(p.startBlock).toString(), blockNumber);
      assert.equal(status, 0);
    });

    it("should create the second proposal", async () => {
      await nToken.transfer(accounts[1], 10);
      await nToken.approve(NLock.address, 10, { from: accounts[1] });
      await nLock.createLock(10, unlockTime, { from: accounts[1] });
      const ProposalUri = "hoge";
      const votingOption = 2;
      const startBlock = (await web3.eth.getBlockNumber()) + 1;
      const endBlock = startBlock + 10;

      const id = await nVoting.createProposal(
        ProposalUri,
        votingOption,
        startBlock,
        endBlock,
        { from: accounts[1] }
      );
      const count = await nVoting.proposalCount();
      const proposal = await nVoting.getProposal(2);

      assert.equal(count, 2);
      assert.equal(proposal.proposer, accounts[1]);
      assert.equal(proposal.proposalUri, ProposalUri);
      assert.equal(proposal.votingOption, votingOption);
      assert.equal(proposal.startBlock, startBlock);
      assert.equal(proposal.endBlock, endBlock);
      assert.equal(proposal.canceled, false);
    });
  });

  describe("CastVote and getProposalVotes", () => {
    it("should get the proposal status (Active)", async () => {
      const blockNumber = await web3.eth.getBlockNumber();
      const p = await nVoting.getProposal(1);
      const status = await nVoting.getStatus(1);
      assert.isAbove(blockNumber, BN(p.startBlock).toNumber());
      assert.equal(status, 1);
    });

    it("should vote for the first proposal", async () => {
      await nToken.transfer(accounts[2], 10);
      await nToken.approve(NLock.address, 10, { from: accounts[2] });
      await nLock.createLock(10, unlockTime, { from: accounts[2] });
      await nVoting.castVote(1, true, { from: accounts[2] });

      const totalVotes = await nVoting.getProposalVotes(1);
      assert.equal(totalVotes, 5);
    });

    it("should fail to vote for the first proposal", async () => {
      let errMsg;
      try {
        await nVoting.castVote(1, true, { from: accounts[2] });
      } catch (e) {
        errMsg = e.reason;
      }
      assert.equal(errMsg, "NVoting::You already voted for this proposal");
    });
  });

  describe("Cancel", () => {
    it("should cancel the second proposal", async () => {
      await nVoting.cancelProposal(2, { from: accounts[1] });
      const p = await nVoting.getProposal(2);
      assert.equal(p.canceled, true);
    });

    it("should fail to cancel the second proposal", async () => {
      let errMsg;
      try {
        await nVoting.cancelProposal(1, { from: accounts[4] });
      } catch (e) {
        errMsg = e.reason;
      }
      const p = await nVoting.getProposal(1);
      assert.equal(p.canceled, false);
      assert.equal(errMsg, "NVoting::You are not a propose Owner");
    });
  });

  describe("getStatus", () => {
    it("should get the first proposal status(Succeeded)", async () => {
      const blockNumber = await web3.eth.getBlockNumber();
      const p = await nVoting.getProposal(1);
      const status = await nVoting.getStatus(1);
      assert.isAbove(blockNumber, BN(p.startBlock).toNumber());
      assert.isAbove(blockNumber, BN(p.endBlock).toNumber());
      assert.equal(BN(status).toNumber(), 2);
    });
    it("should get the first proposal status(Succeeded)", async () => {
      const status = await nVoting.getStatus(2);
      assert.equal(BN(status).toNumber(), 4);
    });
  });
});

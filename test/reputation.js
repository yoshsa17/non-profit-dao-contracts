const NReputation = artifacts.require("Reputation");
const REPUTATION_VALUE = 100;
const ZERO_ADDRESS = `0x0000000000000000000000000000000000000000`;
const MAX_REPUTATION_VALID_PERIOD = 664615;

const sleep = (waitTime) =>
  new Promise((resolve) => setTimeout(resolve, waitTime));

contract("NReputation", async (accounts) => {
  let instance;
  beforeEach(async () => {
    instance = await NReputation.deployed();
  });

  describe("constructor", async () => {
    it("should initialize initialMember's reputations", async () => {
      const reputationOfAccount1 = await instance.reputationOf(accounts[0]);
      const reputationOfAccount2 = await instance.reputationOf(accounts[1]);
      const reputationOfAccount3 = await instance.reputationOf(accounts[2]);

      assert.equal(reputationOfAccount1.toNumber(), REPUTATION_VALUE);
      assert.equal(reputationOfAccount2.toNumber(), REPUTATION_VALUE);
      assert.equal(reputationOfAccount3.toNumber(), REPUTATION_VALUE);
    });
  });

  // // TODO: integration test
  // describe("evaluateContributor/reputationOf", async () => {
  //   it("should add evaluation to accounts[2] and accounts[3]", async () => {
  //     await instance.evaluate([accounts[2], accounts[3]], ["test", "test2"]);
  //     const reputationOfAccount2 = await instance.reputationOf(accounts[2]);
  //     const reputationOfAccount3 = await instance.reputationOf(accounts[3]);
  //     assert.equal(reputationOfAccount2.toNumber(), REPUTATION_VALUE * 2);
  //     assert.equal(reputationOfAccount3.toNumber(), REPUTATION_VALUE);
  //   });
  // });

  // TODO: integration test
  // describe("slash/isSlashed", () => {
  //   it("should return true for slashed account", async () => {
  //     await instance.slash(accounts[1]);
  //     const isSlashed = await instance.isSlashed(accounts[1]);
  //     assert.equal(isSlashed, true);
  //   });
  // });
});

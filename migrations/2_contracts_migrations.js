const NToken = artifacts.require("NToken.sol");
const Reputation = artifacts.require("Reputation");
const Treasury = artifacts.require("Treasury");
const Voting = artifacts.require("Voting");

const ActionTarget = artifacts.require("ActionTarget");
const MockVoting = artifacts.require("MockVoting");

module.exports = async (deployer, network, accounts) => {
  const INITIAL_MEMBERS = [accounts[0], accounts[1], accounts[2]];

  await deployer.deploy(NToken);
  await deployer.deploy(Voting);
  await deployer.deploy(Reputation, INITIAL_MEMBERS, Voting.address);
  await deployer.deploy(Treasury, NToken.address, Voting.address);
  // Test helper contracts
  await deployer.deploy(ActionTarget);
  await deployer.deploy(MockVoting);
};

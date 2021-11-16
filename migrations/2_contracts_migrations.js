const NToken = artifacts.require("NToken.sol");
const Reputation = artifacts.require("Reputation");
const Treasury = artifacts.require("Treasury");
const Voting = artifacts.require("Voting");

module.exports = async (deployer, network, accounts) => {
  const initialMembers = [accounts[0], accounts[1], accounts[2]];

  await deployer.deploy(NToken);
  await deployer.deploy(Voting);
  await deployer.deploy(Reputation, initialMembers, Voting.address);
  await deployer.deploy(Treasury, NToken.address, Voting.address);
};

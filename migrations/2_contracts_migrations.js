const NToken = artifacts.require("NToken");
const NTreasury = artifacts.require("NTreasury")
const NVoting = artifacts.require("NVoting");
const NLock = artifacts.require("NLock");

module.exports = async (deployer) => {
  await deployer.deploy(NTreasury);
  await deployer.deploy(NToken, 10000);
  await deployer.deploy(NLock, NToken.address);
  await deployer.deploy(NVoting, NLock.address);
};

const NToken = artifacts.require("NToken");
const NTreasury = artifacts.require("NTreasury");
const NVoting = artifacts.require("NVoting");
const NLock = artifacts.require("NLock");

// 365 days == 365days * 24hour * 60min * 60sec (epoch time)
const maxLockTime = 365 * 24 * 60 * 60;
const minLockTime = 0;

module.exports = async deployer => {
  await deployer.deploy(NTreasury);
  await deployer.deploy(NToken, 10000);
  await deployer.deploy(NLock, NToken.address, maxLockTime, minLockTime);
  await deployer.deploy(NVoting, NLock.address);
};

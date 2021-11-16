const NTreasury = artifacts.require("Treasury");
const NToken = artifacts.require("NToken");
const ZERO_ADDRESS = `0x0000000000000000000000000000000000000000`;

contract("NTreasury", async (accounts) => {
  let instance;
  beforeEach(async () => {
    instance = await NTreasury.deployed();
  });

  describe("constructor", () => {
    it("should initialize state data", async () => {
      const totalBalance = await web3.eth.getBalance(NTreasury.address);
      const isNTokenAcceptable = await instance.isAcceptableToken(
        NToken.address
      );
      assert.equal(totalBalance, "0");
      assert.equal(isNTokenAcceptable, true);
    });
  });

  describe("deposit/send", () => {
    const ONE_ETHER_IN_WEI = web3.utils.toWei("1", "ether");
    let eventList;
    let eventValue;

    it("should receive ether(fallback function)", async () => {
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: NTreasury.address,
        value: ONE_ETHER_IN_WEI,
        gasPrice: 10000000,
        gasLimit: 6721975,
      });
      eventList = await instance.getPastEvents("EtherDeposited");
      eventValue = eventList[0].returnValues;
      const totalBalance = await web3.eth.getBalance(NTreasury.address);
      assert.equal(eventValue.transactionId, "1");
      assert.equal(eventValue.source, accounts[0]);
      assert.equal(eventValue.amount, ONE_ETHER_IN_WEI);
      assert.equal(eventValue.information, "");
      assert.equal(totalBalance, ONE_ETHER_IN_WEI);
    });

    it("should receive ether(deposit function)", async () => {
      const TEST_REFERENCE = "TEST TRANSACTION";
      await instance.deposit(TEST_REFERENCE, { value: ONE_ETHER_IN_WEI });

      eventList = await instance.getPastEvents("EtherDeposited");
      eventValue = eventList[0].returnValues;
      const totalBalance = await web3.eth.getBalance(NTreasury.address);
      assert.equal(eventValue.transactionId, "2");
      assert.equal(eventValue.source, accounts[0]);
      assert.equal(eventValue.amount, ONE_ETHER_IN_WEI);
      assert.equal(eventValue.information, TEST_REFERENCE);
      assert.equal(totalBalance, ONE_ETHER_IN_WEI * 2);
    });

    // TODO:: test with a transaction from governance contract
    // it("should send ether to account[1] from NTreasury", async () => {
    //   await instance.send(accounts[1], v / 2, "[p-Id:3232]workforce expenses");
    //   const totalFunds = await instance.getTotalFunds();
    //   assert.equal(web3.utils.fromWei(totalFunds, "ether"), 0.005);
    // });

    // it("should return transaction Transaction record ", async () => {
    //   const first = await instance.getTxRecord(1);
    //   const second = await instance.getTxRecord(2);
    //   assert.equal(first.src, accounts[0]);
    //   assert.equal(first.dst, NTreasury.address);
    //   assert.equal(first.amt, v);
    //   assert.equal(first.info, "Donation");

    //   assert.equal(second.src, NTreasury.address);
    //   assert.equal(second.dst, accounts[1]);
    //   assert.equal(second.amt, v / 2);
    //   assert.equal(second.info, "[p-Id:3232]workforce expenses");
    // });
  });
});

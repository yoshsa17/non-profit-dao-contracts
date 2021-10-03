const NTreasury = artifacts.require("NTreasury");

const BN = web3.utils.BN;

contract("NTreasury", async (accounts) => {
  let nTreasury;
  beforeEach(async () => {
    nTreasury = await NTreasury.deployed();
  })

  describe("constructor", () => {
    it("should initialize state data", async () => {
      const totalFunds = await nTreasury.getTotalFunds();
      const recordCnt = await nTreasury.getRecordCnt();
      assert.equal(totalFunds, 0);
      assert.equal(recordCnt, 0);
    });
  });

  describe("receive and send", () => {
    const v = web3.utils.toWei("0.01", 'ether');
    it("should receive donation", async () =>{
      await web3.eth.sendTransaction({
        from:accounts[0],
        to:NTreasury.address,
        value:v,
        gasPrice: 10000000,
        gasLimit: 6721975
      })
      const totalFunds = await nTreasury.getTotalFunds();
      assert.equal(totalFunds, v);
    });

    it("should send ether to account[1] from NTreasury", async () => {
      await nTreasury.send(accounts[1], v/2, "[p-Id:3232]workforce expenses");
      const totalFunds = await nTreasury.getTotalFunds();
      assert.equal(web3.utils.fromWei(totalFunds, "ether"), 0.005 );
    });

    it("should return transaction Transaction record ", async () => {
      const first = await nTreasury.getTxRecord(1);
      const second = await nTreasury.getTxRecord(2);
      assert.equal(first.src, accounts[0]);
      assert.equal(first.dst, NTreasury.address);
      assert.equal(first.amt, v);
      assert.equal(first.info, "Donation");

      assert.equal(second.src, NTreasury.address);
      assert.equal(second.dst, accounts[1]);
      assert.equal(second.amt, v/2);
      assert.equal(second.info, "[p-Id:3232]workforce expenses");
    });
  });
});

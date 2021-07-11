const NLock = artifacts.require("NLock");
const NToken = artifacts.require("NToken");

contract("NLock", async (accounts) => {
  let nLock;
  let nToken;
  const SIX_MONTH = 60*60*24*365/2;
  const now = Math.round((new Date()).getTime() / 1000);
  beforeEach(async () => {
    nLock = await NLock.deployed();
    nToken = await NToken.deployed();
  })

  describe("constructor", () => {
    it("should initialize all state data", async () => {
      const name = await nLock.name();
      const symbol = await nLock.symbol();
      const decimal = await nLock.decimal();
      const totalLockedToken = await nLock.totalSupply()

      assert.equal(name, 'locked Non-profit DAO Token');
      assert.equal(symbol, 'loNPO');
      assert.equal(decimal, 18);
      assert.equal(totalLockedToken, 0);
    });
  })

  describe("balanceOf", () => {
    it("should return 0 NLock",  async () => {
      const balance = await nLock.balanceOf(accounts[0]);
      assert.equal(balance, 0);
    })
  })

  describe("createLock", () => {
    const unlockTime =  now+SIX_MONTH;

    it("should approve NLock.address", async () =>{
      await nToken.approve(NLock.address , 10);
      const allowance = await nToken.allowance(accounts[0], NLock.address);
      assert.equal(allowance, 10);
    });

    it("should transfer from msg.sender to NLock.address", async () => {
      await nLock.createLock(10, unlockTime);
      const nTokenBalanceOfAccount1 =await nToken.balanceOf(accounts[0]);
      const nTokenBalance = await nToken.balanceOf(NLock.address);
      assert.equal(nTokenBalanceOfAccount1, 9990);
      assert.equal(nTokenBalance, 10);
    })

    it("should return voting power of accounts[0]", async () => {
      const balance = await nLock.balanceOf(accounts[0]);
      // 10 NPO * 6 month / 12 month = 5 loNPO
      assert.equal(balance , 5)
    })
  })

  describe("withdraw", () => {
    // it("should withdraw the NToken from NLock ", async () => {

    // });
  });
});

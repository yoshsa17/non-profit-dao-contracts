const NToken = artifacts.require("NToken");

contract("NToken", async (accounts) => {
  let instance;

  beforeEach(async () => {
    instance = await NToken.deployed();
  });

  const INITIAL_TOKEN_AMOUNT = 10 ** 18 * 1000;
  const ONE_TOKEN = 10 ** 18;
  // const ZERO_ADDRESS = `0x0000000000000000000000000000000000000000`;

  describe("constructor", () => {
    it("should initialize all token state values", async () => {
      const name = await instance.name();
      const symbol = await instance.symbol();
      const decimals = await instance.decimals();
      const totalSupply = await instance.totalSupply();

      assert.equal(name, "Non-profit DAO Token");
      assert.equal(symbol, "NPO");
      assert.equal(decimals.toNumber(), 18);
      assert.equal(totalSupply, INITIAL_TOKEN_AMOUNT);
    });

    it("should put 1000 NToken in the msg.sender account", async () => {
      const balance = await instance.balanceOf(accounts[0]);
      assert.equal(balance, INITIAL_TOKEN_AMOUNT);
    });
  });

  describe("transfer", async () => {
    it("should transfer 1 token from accounts[0] to accounts[1]", async () => {
      await instance.transfer(accounts[1], BigInt(ONE_TOKEN));
      const balanceOfAccount1 = await instance.balanceOf(accounts[1]);
      assert.equal(balanceOfAccount1, ONE_TOKEN);
    });
  });

  describe("approve/transferFrom", () => {
    it("should approve accounts[0] to transfer from account[1]", async () => {
      await instance.approve(accounts[1], BigInt(ONE_TOKEN));
      const allowance = await instance.allowance(accounts[0], accounts[1]);
      assert.equal(allowance, ONE_TOKEN);
    });

    it("should transfer from accounts[0] to account[2]", async () => {
      await instance.transferFrom(accounts[0], accounts[2], BigInt(ONE_TOKEN), {
        from: accounts[1],
      });
      const balanceOfAccounts2 = await instance.balanceOf(accounts[2]);
      assert.equal(balanceOfAccounts2, ONE_TOKEN);
    });
  });
});

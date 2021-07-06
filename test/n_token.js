const NToken = artifacts.require("NToken");

contract("NToken", async (accounts) => {
  let instance;
  beforeEach(async () => {
    instance = await NToken.deployed();
  })

  describe("constructor", ()=> {
    it("should initialize all token values", async () => {
      const name = await instance.name();
      const symbol = await instance.symbol();
      const decimal = await instance.decimal();
      const totalSupply = await instance.totalSupply();

      assert.equal(name, 'Non-profit DAO Token');
      assert.equal(symbol, 'NPO');
      assert.equal(decimal, 18);
      assert.equal(totalSupply, 10000);
    });

    it("should put 1000 NToken in the msg.sender account", async () =>{
      const balance = await instance.balanceOf(accounts[0]);
      assert.equal(balance, 10000);
    });
  });

  describe("transfer", async () => {
    it("should transfer from accounts[0] to accounts[1]", async () => {
      await instance.transfer(accounts[1], 1000);
      const balanceOfAccount1 = await instance.balanceOf(accounts[1]);
      assert.equal(balanceOfAccount1, 1000);
    })
  })

  describe("approve and transferFrom", () => {
    it("should approve accounts[0] to transfer from account[1]", async () => {
      await instance.approve(accounts[1], 1000);
      const allowance = await instance.allowance(accounts[0], accounts[1]);
      assert.equal(allowance, 1000);
    })

    it("should transfer from accounts[0] to account[2]", async () => {
      await instance.transferFrom(accounts[0], accounts[2], 1000, {from: accounts[1]});
      const balanceOfAccounts2 = await instance.balanceOf(accounts[2]);
      assert.equal(balanceOfAccounts2, 1000);
    });
  })
});

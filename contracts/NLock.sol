//SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./libraries/NSafeMath.sol";

contract NLock{
    using NSafeMath for uint;

    // 365 days == 365*24*60*60(epoch time)
    uint private constant MAX_LOCKTIME = 365 days;

    uint private constant MINI_LOCKTIME = 0;
    uint private constant DAY = 60*60*24;

    string private _name = "locked Non-profit DAO Token";
    string private _symbol = "loNPO";
    uint8  private _decimal = 18;
    uint   private _totalSupply = 0;
    NTokenInterface private _nToken;

    struct LockedBlance{
        uint amount;
        uint unlockTime;
        uint lockTime;
    }
    mapping(address => LockedBlance) internal _lockedBalances;

    event Withdraw(address dst_, uint amt_);
    event CreateLock(address addr_, uint amt_, uint unlockTime_, uint lockTime);

    constructor(address nToken_){
        _nToken = NTokenInterface(nToken_);
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimal() public view returns (uint8) {
        return _decimal;
    }

    function totalSupply() public view returns (uint) {
        return _totalSupply;
    }


    /**
     * @notice Deposit 'amt_' tokens until 'unlockedTime_'
     * @dev This function excuted after msg.sender approves transfering nToken
     * @param amt_ amount locked in this Nlock contract
     * @param unlockTime_ Epoch time when lockedNTokens are released, rounded off to whole day
     */
    function createLock(
        uint amt_,
        uint unlockTime_
    )
        external
        returns (bool)
    {
        uint tmp1 = unlockTime_.div(DAY);
        uint unlockTime = tmp1.mul(DAY);
        uint timeStamp = block.timestamp;
        uint tmp2 =  timeStamp.div(DAY);
        uint lockTime = tmp2.mul(DAY);
        require(amt_ > 0,"NLock::invalid amount");
        require(
            unlockTime > (lockTime+MINI_LOCKTIME),
            "NLock::invalid unlockTime"
        );
        require(
            _lockedBalances[msg.sender].amount == 0,
            "NLock::You have already locked NToken"
        );

        // This line should be excuted after msg.sender approves trasfering
        _nToken.transferFrom(msg.sender, address(this) , amt_);

        LockedBlance memory newLockedBalance = LockedBlance({
            amount: amt_,
            unlockTime: unlockTime,
            lockTime:lockTime
        });
        _lockedBalances[msg.sender] = newLockedBalance;
        _totalSupply = _totalSupply.add(amt_);

        emit CreateLock(msg.sender, amt_, unlockTime, lockTime);
        return true;
    }

    /**
     * @notice Withdraw all tokens for `msg.sender`
     * @dev Only possible if the lock has expired
     */
    function withdraw() external hasLockedNToken(msg.sender) returns(bool){
        LockedBlance memory _lock = _lockedBalances[msg.sender];
        uint _t = block.timestamp;
        require(
            _lock.unlockTime < _t,
            "NLock::The lock time didn't expired"
        );
        _lock.amount = 0;
        _lock.unlockTime = 0;
        _nToken.transfer(msg.sender, _lock.amount);

        emit Withdraw(msg.sender, _lock.amount);
        return true;
    }

    /**
     * @notice Get the current voting power for "msg.sender"
     * @param addr_ user EOA address
     * @return votingPower = amount * time/MAXTIME
     *   ex) 10 NPD * 6 month / 12 month = 5 NPD * 12 month / 12 month = 5 loNPD
     */
    function balanceOf(
        address addr_
    )
        external
        view
        returns(uint)
    {
        uint time = _lockedBalances[addr_].unlockTime - _lockedBalances[addr_].lockTime;
        uint percentage = time*100/ MAX_LOCKTIME ;
        uint votingPower = _lockedBalances[addr_].amount / (100/percentage);
        return votingPower;
    }

    // function totalSupply()external {}

    modifier hasLockedNToken(address addr_) {
        require(
            _lockedBalances[addr_].amount > 0,
            "NLock:: User hasn't locked your nToken yet"
        );
        _;
    }

}

interface NTokenInterface {
    function transfer(address dst, uint amt) external returns (bool);
    function transferFrom(
        address src, address dst, uint amt
    ) external returns (bool);
}

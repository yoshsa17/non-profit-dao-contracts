//SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./lib/SafeMath.sol";

contract NLock {
    using SafeMath for uint256;

    uint256 private constant DAY = 60 * 60 * 24;

    uint256 private _maxLocktime = 0;
    uint256 private _minLocktime = 0;

    string private _name = "locked Non-profit DAO Token";
    string private _symbol = "loNPO";
    // 1 loNPO == 1 * 10 ** 18
    uint8 private _decimal = 18;
    uint256 private _totalSupply = 0;
    NTokenInterface private _nToken;

    struct LockedBlance {
        uint256 amount;
        uint256 unlockTime;
        uint256 lockTime;
    }
    mapping(address => LockedBlance) internal _lockedBalances;

    /// @notice An event emitted when a user withdraws Ntoken after its locktime has passed
    event Withdraw(address dst_, uint256 amt_);

    /// @notice An event emitted when a user locks their NToken
    event CreateLock(
        address addr_,
        uint256 amt_,
        uint256 unlockTime_,
        uint256 lockTime
    );

    /// @notice An event emitted when a user locks additional NToken
    event IncreaseLock(address addr_, uint256 newAmount_);

    constructor(
        address nToken_,
        uint256 maxLockTime_,
        uint256 minLockTime_
    ) {
        _nToken = NTokenInterface(nToken_);
        _maxLocktime = maxLockTime_;
        _minLocktime = minLockTime_;
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

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function getLockInfo(address addr_)
        external
        view
        returns (LockedBlance memory)
    {
        return _lockedBalances[addr_];
    }

    /**
     * @notice Get the current voting power for "msg.sender"
     * @param addr_ user EOA address
     * @return votingPower = Amount * lockTime / MAXTIME
     *   ex) 10 NPO * 6 month / 365 days = 5 loNPO
     *       5 NPO * 12 month / 365 days = 5 loNPO
     */
    function balanceOf(address addr_) external view returns (uint256) {
        if (_lockedBalances[addr_].amount == 0) {
            return 0;
        }
        uint256 time = _lockedBalances[addr_].unlockTime -
            _lockedBalances[addr_].lockTime;
        uint256 percentage = (time * 100) / _maxLocktime;
        uint256 votingPower = _lockedBalances[addr_].amount /
            (100 / percentage);
        return votingPower;
    }

    /**
     * @notice Lock 'amt_' tokens until 'unlockedTime_'.
     * @dev This function excutable only after msg.sender approves transfering nToken.
     * @param amt_ Amount locked in this contract.
     * @param unlockTime_ Epoch time when loNPO are released, rounded down to whole day.
     */
    function createLock(uint256 amt_, uint256 unlockTime_)
        external
        hasNotLockedNToken(msg.sender)
        returns (bool)
    {
        // Round down unlocktime & locktime to a whole day.
        uint256 unlockTime = (unlockTime_.div(DAY)).mul(DAY);
        uint256 tmp = (block.timestamp).div(DAY);
        uint256 lockTime = tmp.mul(DAY);

        require(amt_ > 0, "NLock::invalid amount");
        require(
            unlockTime > (lockTime + _minLocktime),
            "NLock::invalid unlockTime"
        );

        // This line should be excuted after msg.sender approves transferring
        _nToken.transferFrom(msg.sender, address(this), amt_);

        LockedBlance memory newLockedBalance = LockedBlance({
            amount: amt_,
            unlockTime: unlockTime,
            lockTime: lockTime
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
    function withdraw() external hasLockedNToken(msg.sender) returns (bool) {
        LockedBlance memory _lock = _lockedBalances[msg.sender];
        uint256 _t = block.timestamp;
        require(_lock.unlockTime < _t, "NLock::The lock time didn't expired");
        _lock.amount = 0;
        _lock.unlockTime = 0;
        _nToken.transfer(msg.sender, _lock.amount);

        emit Withdraw(msg.sender, _lock.amount);
        return true;
    }

    modifier hasLockedNToken(address addr_) {
        require(
            _lockedBalances[addr_].amount > 0,
            "NLock::This account has not locked NToken yet"
        );
        _;
    }

    modifier hasNotLockedNToken(address addr_) {
        require(
            _lockedBalances[msg.sender].amount == 0,
            "NLock::You have already locked NToken"
        );
        _;
    }
}

interface NTokenInterface {
    function transfer(address dst, uint256 amt) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 amt
    ) external returns (bool);
}

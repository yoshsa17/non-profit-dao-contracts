//SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./lib/SafeMath.sol";
import "./interfaces/IERC20.sol";

contract NToken is IERC20 {
    using SafeMath for uint256;

    string private _name = "Non-profit DAO Token";
    string private _symbol = "NPO";
    // 1 NPO == 1 * 10 ** 18
    uint8 private _decimals = 18;
    uint256 internal _totalSupply = 0;
    mapping(address => uint256) internal _balances;
    mapping(address => mapping(address => uint256)) internal _allowances;

    constructor(uint256 initialAmount_) {
        _totalSupply = initialAmount_;
        _balances[msg.sender] = initialAmount_;
        emit Transfer(address(0), msg.sender, initialAmount_);
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimal() public view returns (uint8) {
        return _decimals;
    }

    function allowance(address src, address dst)
        external
        view
        override
        returns (uint256)
    {
        return _allowances[src][dst];
    }

    function balanceOf(address whom) external view override returns (uint256) {
        return _balances[whom];
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function transfer(address dst, uint256 amt) public override returns (bool) {
        _balances[msg.sender] = _balances[msg.sender].sub(amt);
        _balances[dst] = _balances[dst].add(amt);

        emit Transfer(msg.sender, dst, amt);
        return true;
    }

    function transferFrom(
        address src,
        address dst,
        uint256 amt
    ) public override returns (bool) {
        uint256 allowanceOfMsgSender = _allowances[src][msg.sender];
        require(
            _balances[src] >= amt && allowanceOfMsgSender >= amt,
            "NToken::insufficient funds."
        );
        _balances[src] = _balances[src].sub(amt);
        _balances[dst] = _balances[dst].add(amt);

        //　Substract the amount transferred from the remaining allowance
        if (allowanceOfMsgSender < type(uint256).max) {
            _allowances[src][msg.sender] = _allowances[src][msg.sender].sub(
                amt
            );
        }

        emit Transfer(src, dst, amt);
        return true;
    }

    function approve(address dst, uint256 amt) public override returns (bool) {
        _allowances[msg.sender][dst] = amt;

        emit Approval(msg.sender, dst, amt);
        return true;
    }
}

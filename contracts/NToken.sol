//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NToken is IERC20 {
    // State
    string private _name = "Non-profit DAO Token";
    string private _symbol = "NPO";
    uint8 private _decimals = 18;
    uint256 private _totalSupply = 1000e18;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Error
    error InsufficientBalance(uint256 available, uint256 requested);
    error InsufficientAllowance(uint256 available, uint256 requested);
    error ZeroAddress();

    constructor() {
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function allowance(address src, address dst)
        public
        view
        override
        returns (uint256)
    {
        return _allowances[src][dst];
    }

    function balanceOf(address account)
        external
        view
        override
        returns (uint256)
    {
        return _balances[account];
    }

    function transfer(address dst, uint256 amt)
        external
        override
        returns (bool)
    {
        _transfer(msg.sender, dst, amt);
        return true;
    }

    function approve(address dst, uint256 amt)
        external
        override
        returns (bool)
    {
        _approve(msg.sender, dst, amt);
        return true;
    }

    function transferFrom(
        address src,
        address dst,
        uint256 amt
    ) external override returns (bool) {
        uint256 msgSenderAllowance = _allowances[src][msg.sender];
        if (msgSenderAllowance < amt) {
            revert InsufficientAllowance(msgSenderAllowance, amt);
        }

        unchecked {
            _approve(src, msg.sender, msgSenderAllowance - amt);
        }
        _transfer(src, dst, amt);

        return true;
    }

    function _transfer(
        address src,
        address dst,
        uint256 amt
    ) internal {
        if (src == address(0) || dst == address(0)) revert ZeroAddress();

        uint256 srcBalance = _balances[src];
        if (srcBalance < amt) revert InsufficientBalance(srcBalance, amt);
        unchecked {
            _balances[src] = srcBalance - amt;
        }
        _balances[dst] += amt;

        emit Transfer(src, dst, amt);
    }

    function _approve(
        address src,
        address dst,
        uint256 amt
    ) internal {
        if (src == address(0) || dst == address(0)) revert ZeroAddress();
        _allowances[msg.sender][dst] = amt;

        emit Approval(msg.sender, dst, amt);
    }
}

//SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./libraries/NSafeMath.sol";
import "./interfaces/IERC20.sol";

contract NToken is IERC20{
    using NSafeMath for uint;

    string private _name = "Non-profit DAO Token";
    string private _symbol = "NPO";
    uint8  private _decimals = 18;
    uint   internal _totalSupply = 0;
    mapping(address => uint) internal _balances;
    mapping(address => mapping(address => uint)) internal _allowances;

    // @Todo:: add deledate function()
    // mapping(address => address) public delegates;
    //


    constructor (uint initialAmount_) {
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

    function allowance(address src, address dst) external view  override returns (uint) {
        return _allowances[src][dst];
    }

    function balanceOf(address whom) external view override  returns (uint) {
        return _balances[whom];
    }

    function totalSupply() public view override returns (uint) {
        return _totalSupply;
    }

    function transfer(address dst, uint amt) public override returns (bool) {
        _balances[msg.sender] = _balances[msg.sender].sub(amt);
        _balances[dst] = _balances[dst].add(amt);

        emit Transfer(msg.sender, dst, amt);
        return true;
    }

    function transferFrom(
        address src,
        address dst,
        uint amt
    ) public override returns (bool) {
        uint allowanceOfmsgSender = _allowances[src][msg.sender];
        require(
            _balances[src] >= amt && allowanceOfmsgSender >= amt,
            "NToken::insufficient funds."
        );
        _balances[src] = _balances[src].sub(amt);
        _balances[dst] = _balances[dst].add(amt);

        //Substract the amount transferred form the remaining allowance
        if (allowanceOfmsgSender < type(uint256).max) {
            _allowances[src][msg.sender] = _allowances[src][msg.sender].sub(amt);
        }

        emit Transfer(src, dst, amt);
        return true;
    }

    function approve(address dst, uint amt) public override returns (bool) {
        _allowances[msg.sender][dst] = amt;

        emit Approval(msg.sender, dst, amt);
        return true;
    }

    // @Todo:: add deledate function()
    // function Delegate(address delegatee) public returns (bool){
    //     address prevDelegatee = delegates[msg.sender];
    //     uint delegatorBalance = _balances[msg.sender];
    //     delegates[msg.sender] = delegatee;

    //     emit DelegateChanged(msg.sender, prevDelegatee, delegatee);

    //     return true;
    // }

}

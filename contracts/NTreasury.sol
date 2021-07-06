//SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./libraries/NSafeMath.sol";

contract NTreasury {
    using NSafeMath for uint;

    /**
     * @notice src = address for a donor.
     * @notice dst = address for a person who acts following accepted proposal.
     * @notice info = human readable information for expenditure.
     */
    struct TxRecord{
        address src;
        address dst;
        uint amt;
        string info;
    }
    mapping(uint => TxRecord) internal _records;

    uint private _recordCnt;
    uint private _totalFunds;

    event AppendTx(uint recordId, address src, address dst, uint amt, string info);
    event Send(address dst, uint amt);

    constructor(){
        _recordCnt = 0;
        _totalFunds = 0;
    }

    function getTotalFunds() public view returns(uint){
        return _totalFunds;
    }
    function getRecordCnt() public view returns(uint){
        return _recordCnt;
    }

    /**
     *  @notice receive function to receive ether as Donation/Grants
     */
    receive() external payable {
        address _thisAddr = address(this);
        _append(msg.sender, _thisAddr, msg.value, "Donation");
        _totalFunds = _totalFunds.add(msg.value);
    }

    /**
     * @notice append a txRecord to etherTracker
     * @param src_  this contract | donor
     * @param dst_  a dao acrtive menber| another account(for a payment) | this contract
     * @param amt_  expenditure | donation
     * @param info_ human readable information for expenditure | "Donation".
     * @return  recordId
     */
    function _append(
        address src_,
        address dst_,
        uint amt_,
        string memory info_
    )
        internal
        returns(bool)
    {
        require(amt_ > 0, "NTreasury::Invalid amount");
        require(bytes(info_).length <= 30, "NTreasury::Invalid information");
        _recordCnt++;
        uint recordId = _recordCnt;
        TxRecord memory newTx = TxRecord({
            src: src_,
            dst: dst_,
            amt: amt_,
            info: info_
        });

        _records[recordId] = newTx;
        emit AppendTx(recordId, src_, dst_, amt_, info_);
        return true;
    }

    /**
     * @notice Send 'amt_'ether from NTreasury to 'dst_'
     * @dev Only a proposer of approved proposal can send
     */
    function send(
        address dst_,
        uint amt_,
        string memory info_
        )
        public
        onlyApprovedProposer
        returns(bool)
    {
        address _thisAddr = address(this);
        _append(_thisAddr, dst_, amt_, info_);
        _totalFunds = _totalFunds.sub(amt_);
        payable(dst_).transfer(amt_);
        emit Send(dst_, amt_);
        return true;
    }

    /**
     * @notice Anyone can look up records by giving recordId
     */
    function getTxRecord(
        uint recordId_
        )
        external
        view
        returns(
            address src,
            address dst,
            uint amt,
            string memory info
        )
    {
        TxRecord memory _txRecord = _records[recordId_];
        require(_txRecord.amt > 0 ,"NTreasury::Invalid recordId");
        return (
            _txRecord.src,
            _txRecord.dst,
            _txRecord.amt,
            _txRecord.info
        );
    }


    modifier onlyApprovedProposer(){
        //Todo:: msg.sender == proposer of approved proposal.
        _;
    }
}

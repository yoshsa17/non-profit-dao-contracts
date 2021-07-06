//SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "./libraries/NSafeMath.sol";

contract NVoting {
    using NSafeMath for uint;

    NLockInterface private _nLock;
    string private  _name = "NVoting";
    uint256 private _proposalCount;
    // 40320 blocks = 60*60*24*7 (7days)  /  15 sec (assuming 15s blocks)
    uint32 private _minVotingPeriod = 0;

    /**
     * @dev votesAmount includes how much Ntoken locked on  for voting.
     * @dev votorsCount include how many votors paticipate this proposal.
     */
    struct Proposal {
        uint id;
        address proposer;
        string    proposalUri;
        uint8  votingOption;
        uint32  startBlock;
        uint32  endBlock;
        uint    forAmount;
        uint    againstAmount;
        bool     canceled;
        mapping(address => uint) forVoters;
        mapping(address => uint) agaistVoters;
    }
    mapping(uint => Proposal) private _proposalList;

    enum ProposalStatus {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Canceled
    }

    /// @notice An event emitted when a new proposal is created
    event CreateProposal(uint id, address proposer, uint32 startBlock, uint32 endBlock);

    /// @notice An event emitted when a vote has been cast on a proposal
    event CastVote(address voter, uint proposalId, bool vote, uint amt);

    /// @notice An event emitted when a proposal has been canceled
    event CancelProposal(uint id);



    constructor(address nLock_){
        _nLock = NLockInterface(nLock_);
        _proposalCount = 0;
    }

    function name() public view returns(string memory) {
        return _name;
    }
    function proposalCount() public view returns(uint) {
        return _proposalCount;
    }
    function minVotingPeriod() public view returns(uint) {
        return _minVotingPeriod;
    }

    /**
     * @notice Create new proposal
     * @param proposalUri_  URI of a proposal stored with ipsf
     * @param votingOption_ voting options(For/Against, options{A,B,C})
     * @param startBlock_   block on which proposal is active for voting
     * @param endBlock_     block on which proposal is no longer active
     */
    function createProposal(
        string memory proposalUri_,
        uint8 votingOption_,
        uint startBlock_,
        uint endBlock_
    )
        external
        onlyMember(msg.sender)
        validBlock(startBlock_, endBlock_)
        returns(uint)
    {
        // @Todo::add require()
        //require(threthhold);
        //require(if uri is correct);
        _proposalCount++;
        uint proposalId = _proposalCount;

        Proposal storage p = _proposalList[proposalId];

        p.id = proposalId;
        p.proposer = msg.sender;
        p.proposalUri = proposalUri_;
        p.votingOption = votingOption_;
        p.startBlock = uint32(startBlock_);
        p.endBlock = uint32(endBlock_);
        p.forAmount = 0;
        p.againstAmount = 0;
        p.canceled = false;

        emit CreateProposal(
            p.id,
            msg.sender,
            p.startBlock,
            p.endBlock
        );
        return proposalId;
    }

    /**
     * @notice get ptoposal info
     * @param proposalId_  proposalId
     */
    function getProposal(uint proposalId_) external view
        returns (
            address proposer,
            string memory  proposalUri,
            uint8 votingOption,
            uint32  startBlock,
            uint32  endBlock,
            bool canceled
    ){
        return (
            _proposalList[proposalId_].proposer,
            _proposalList[proposalId_].proposalUri,
            _proposalList[proposalId_].votingOption,
            _proposalList[proposalId_].startBlock,
            _proposalList[proposalId_].endBlock,
            _proposalList[proposalId_].canceled
        );
    }


    /**
     * @notice get total votes
     * @param proposalId_  proposalId
     */
    function getProposalVotes(
        uint proposalId_
    )
        external
        view
        validProposalId(proposalId_)
        returns(uint totalVotes)
    {
        Proposal storage p = _proposalList[proposalId_];
        totalVotes = p.forAmount.add(p.againstAmount);
        return totalVotes;
    }

    /**
     * @notice get ptoposal info
     * @param proposalId_  proposalId
     */
    function getStatus(uint proposalId_)
        public
        view
        validProposalId(proposalId_)
        returns(ProposalStatus)
    {
        Proposal storage p = _proposalList[proposalId_];
        if (p.canceled) {
            return ProposalStatus.Canceled;
        } else if (block.number <= p.startBlock) {
            return ProposalStatus.Pending;
        } else if (block.number <= p.endBlock) {
            return ProposalStatus.Active;
        } else if (p.forAmount <= p.againstAmount) {
            return ProposalStatus.Defeated;
        } else{
            return ProposalStatus.Succeeded;
        }
    }


    /**
     * @notice cancele a proposal
     * @dev only proposer can cancele
     */
    function cancelProposal(uint proposalId_)
        external
        onlyProposeOwner(proposalId_)
    {
        _proposalList[proposalId_].canceled = true;
        emit CancelProposal(proposalId_);
    }


    /**
     * @notice cancele a proposal
     * @dev only proposer can cancele
     */
    function castVote(
        uint proposalId_ ,
        bool vote_
    )
        external
        onlyMember(msg.sender)
        validProposalId(proposalId_)
        haventVoted(proposalId_)
    {
        uint nTokenBalance = _nLock.balanceOf(msg.sender);
        Proposal storage p = _proposalList[proposalId_];
        ProposalStatus s = getStatus(proposalId_);
        require(
            s == ProposalStatus.Active,
            "NVoting:: This proposal is not active for voting"
        );

        // @Todo:: add Quadratic Voting functionality like Gitcoin
        uint weight = nTokenBalance;
        if(vote_){
            p.forAmount = p.forAmount.add(weight);
            p.forVoters[msg.sender] = weight;
        }else{
            p.againstAmount = p.againstAmount.add(weight);
            p.agaistVoters[msg.sender] = weight;
        }

        emit CastVote(msg.sender, proposalId_, vote_, weight);
    }


/**
 *  Modifiers
 */
    modifier onlyProposeOwner(uint proposalId_){
        require(
            msg.sender == _proposalList[proposalId_].proposer,
            "NVoting::You are not a propose Owner"
            );
        _;
    }

    modifier onlyMember(address aadr_) {
        require(
            _nLock.balanceOf(aadr_) > 0,
            "NVoting::You don't have locked-Ntoken"
        );
        _;
    }

    modifier haventVoted(uint proposalId_) {
        require(
            _proposalList[proposalId_].forVoters[msg.sender] == 0,
            "NVoting::You already voted for this proposal"
        );
        require(
            _proposalList[proposalId_].agaistVoters[msg.sender] ==  0,
            "NVoting::You already voted against this proposal"
        );
        _;
    }

    modifier validProposalId(uint proposalId_) {
        require(
            _proposalCount >= proposalId_ && proposalId_ > 0,
            "NVoting::Invalid proposal ID"
        );
        _;
    }

    modifier validBlock(uint startBlock, uint endBlock) {
        require(
            startBlock >= block.number + _minVotingPeriod,
            "NVoting::Invalid start block number"
        );
        require(
            endBlock.sub(startBlock) > _minVotingPeriod,
            "NVoting::Invalid end block number"
        );
        _;
    }
}
interface NLockInterface {
    function balanceOf(address addr_)external view returns(uint);
}

//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/Address.sol";

contract Voting {
    // 138 blocks 30 min (assuming 13 sec blocktime)
    uint256 private _votingPeriod = 138;
    uint256 private _votingDelay = 138;
    uint256 private _proposalTimeLock = 138;
    uint256 private _proposalMaxOperations = 5;
    uint256 private _proposalThreshold = 50;
    uint256 private _proposalCount;

    function votingPeriod() external view returns (uint256) {
        return _votingPeriod;
    }

    function proposalThreshold() external view returns (uint256) {
        return _proposalThreshold;
    }

    function votingDelay() external view returns (uint256) {
        return _votingDelay;
    }

    function proposalTimeLock() external view returns (uint256) {
        return _proposalTimeLock;
    }

    function proposalMaxOperations() external view returns (uint256) {
        return _proposalMaxOperations;
    }

    function proposalCount() external view returns (uint256) {
        return _proposalCount;
    }

    IReputation private _nReputation;
    address public _contractCreator;

    mapping(uint256 => Proposal) public _proposals;

    struct Proposal {
        address proposer;
        string description;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 startBlock;
        uint256 endBlock;
        uint256 executeBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
        mapping(address => Receipt) receipts;
    }

    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint256 votes;
    }

    enum ProposalStatus {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Canceled,
        Executed
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    // Event
    event ProposalCreated(
        uint256 proposalId,
        address proposer,
        string description,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        uint256 startBlock,
        uint256 endBlock
    );
    event VoteCast(
        address voter,
        uint256 proposalId,
        uint8 voteType,
        uint256 weight,
        string reason
    );
    event ProposalCanceled(uint256 proposalId);
    event ProposalExecuted(uint256 proposalId);

    // Error
    error OnlyMember();
    error ReputationBelowThreshold();
    error OnlyProposer();
    error InvalidOperationNumber();
    error InvalidProposalId();
    error NotActiveProposal(ProposalStatus currentStatus);
    error InvalidDoubleVoting(uint256 proposalId);
    error InvalidVoteType();
    error NotSucceededProposal();
    error InvalidBlockNumber(uint256 expectedBlock, uint256 currentBlock);

    constructor() {
        _contractCreator = msg.sender;
    }

    function propose(
        uint256 executingDelay,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external returns (bool) {
        uint256 proposerReputation = _nReputation.reputationOf(msg.sender);

        if (proposerReputation < _proposalThreshold) {
            revert ReputationBelowThreshold();
        }
        if (
            targets.length != values.length ||
            targets.length != calldatas.length
        ) revert InvalidOperationNumber();
        if (targets.length > _proposalMaxOperations || targets.length == 0) {
            revert InvalidOperationNumber();
        }

        uint256 startBlock = block.number + _votingDelay;
        uint256 endBlock = startBlock + _votingPeriod;

        _proposalCount++;
        uint256 id = _proposalCount;

        Proposal storage p = _proposals[id];
        p.proposer = msg.sender;
        p.description = description;
        p.targets = targets;
        p.values = values;
        p.calldatas = calldatas;
        p.startBlock = startBlock;
        p.endBlock = endBlock;
        p.executeBlock = endBlock + _proposalTimeLock + executingDelay;

        emit ProposalCreated(
            id,
            msg.sender,
            description,
            targets,
            values,
            calldatas,
            startBlock,
            endBlock
        );
        return true;
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            address proposer,
            string memory description,
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            uint256 startBlock,
            uint256 endBlock,
            uint256 executeBlock
        )
    {
        Proposal storage proposal = _proposals[proposalId];

        proposer = proposal.proposer;
        description = proposal.description;
        targets = proposal.targets;
        values = proposal.values;
        calldatas = proposal.calldatas;
        startBlock = proposal.startBlock;
        endBlock = proposal.endBlock;
        executeBlock = proposal.executeBlock;
    }

    /**
     * @notice get ptoposal info
     * @param proposalId  proposalId
     */
    function getStatus(uint256 proposalId)
        external
        view
        returns (ProposalStatus)
    {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.proposer == address(0)) revert InvalidProposalId();

        if (proposal.executed) {
            return ProposalStatus.Executed;
        } else if (proposal.canceled) {
            return ProposalStatus.Canceled;
        } else if (block.number < proposal.startBlock) {
            return ProposalStatus.Pending;
        } else if (block.number <= proposal.startBlock + _votingPeriod) {
            return ProposalStatus.Active;
        } else if (proposal.forVotes <= proposal.againstVotes) {
            return ProposalStatus.Defeated;
        } else {
            return ProposalStatus.Succeeded;
        }
    }

    /**
     * @notice  cast vote to a proposal.
     */
    function castVote(
        uint256 proposalId,
        uint8 support,
        string memory reason
    ) external returns (bool) {
        uint256 weight = _nReputation.reputationOf(msg.sender);
        if (weight == 0) revert OnlyMember();

        Proposal storage proposal = _proposals[proposalId];
        ProposalStatus status = this.getStatus(proposalId);
        if (status != ProposalStatus.Active) revert NotActiveProposal(status);

        Receipt storage receipt = proposal.receipts[msg.sender];
        if (receipt.hasVoted) revert InvalidDoubleVoting(proposalId);

        if (support == uint8(VoteType.Against)) {
            proposal.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposal.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposal.abstainVotes += weight;
        } else {
            revert InvalidVoteType();
        }

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = weight;

        emit VoteCast(msg.sender, proposalId, support, weight, reason);
        return true;
    }

    function execute(uint256 proposalId) external returns (bool) {
        Proposal storage proposal = _proposals[proposalId];

        if (this.getStatus(proposalId) != ProposalStatus.Succeeded)
            revert NotSucceededProposal();
        if (proposal.executeBlock > block.number)
            revert InvalidBlockNumber(proposal.executeBlock, block.number);

        _proposals[proposalId].executed = true;
        emit ProposalExecuted(proposalId);

        address[] memory targets = proposal.targets;
        uint256[] memory values = proposal.values;
        bytes[] memory calldatas = proposal.calldatas;

        string memory errorMessage = "Governor: call reverted without message";
        for (uint256 i = 0; i < targets.length; ++i) {
            (bool success, bytes memory returndata) = targets[i].call{
                value: values[i]
            }(calldatas[i]);
            Address.verifyCallResult(success, returndata, errorMessage);
        }

        return true;
    }

    function cancel(uint256 proposalId) external {
        Proposal storage proposal = _proposals[proposalId];

        if (msg.sender != proposal.proposer) revert OnlyProposer();
        ProposalStatus status = this.getStatus(proposalId);
        if (status != ProposalStatus.Pending) {
            revert NotActiveProposal(status);
        }

        _proposals[proposalId].canceled = true;
        emit ProposalCanceled(proposalId);
    }

    function hasVoted(uint256 proposalId, address account)
        external
        view
        returns (bool)
    {
        return _proposals[proposalId].receipts[account].hasVoted;
    }

    function getReceipt(uint256 proposalId, address voter)
        external
        view
        returns (Receipt memory)
    {
        return _proposals[proposalId].receipts[voter];
    }

    function init(address reputation) external {
        if (msg.sender != _contractCreator || msg.sender == address(0))
            revert("This function was already called");
        _nReputation = IReputation(reputation);
        _contractCreator = address(0);
    }
}

interface IReputation {
    function reputationOf(address account) external view returns (uint256);
}

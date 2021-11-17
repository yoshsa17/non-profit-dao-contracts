//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract Reputation {
    // State
    uint8 private _reputationValue = 100;
    uint8 private _maxEvaluation = 3;
    uint8 private _maxEvaluatiors = 10;
    // 100days 664615 blocks  60*60*24*5/13
    uint96 private _maxReputationValidPeriod = 664615;
    // 5days 33230 blocks  60*60*24*5/13(assuming 13s block time)
    uint256 private _evaluationPeriod = 33230;
    address private _governance;

    struct ReputationDetail {
        address evaluator;
        uint256 validByBlock;
    }

    mapping(address => ReputationDetail[]) private _reputations;
    mapping(address => bool) private _slashedAddresses;

    address[] private _evaluators;
    uint256 private _evaluationStartBlock;
    uint256 private _evaluationEndBlock;

    enum Evaluation {
        Active,
        InActive
    }

    // TODO:: refactor
    string[] _emptyStrArray;

    // Event
    event ReputationMinted(
        address from,
        address to,
        uint256 validByBlock,
        string reasons
    );
    event EveluationStarted(
        address[] evaluators,
        uint256 startBlock,
        uint256 endBlock
    );

    // Error
    error OnlyGovernance();
    error OnlyEveluator();
    error OverlappingEvaluationPeriod();
    error InvalidEvaluatorsNumber();
    error InvalidEvaluation();
    error InvalidArrayLength();
    error InvalidAddress(address required);
    error OnlyEvaluationPeriod();

    constructor(address[] memory _initialMembers, address governance) {
        _governance = governance;
        // TODO:: refactor
        for (uint256 i; i < _initialMembers.length; i++) {
            _emptyStrArray.push("");
        }
        _mint(address(0), _initialMembers, _emptyStrArray);
    }

    function reputationOf(address account) external view returns (uint256) {
        ReputationDetail[] memory rawReputations = _reputations[account];
        uint256 totalReputation;

        for (uint256 i; i < rawReputations.length; i++) {
            uint256 validByBlock = rawReputations[i].validByBlock;
            uint256 remainingBlocks;

            if (validByBlock < block.number) continue;
            unchecked {
                remainingBlocks = validByBlock - block.number;
            }

            uint256 percentage = (remainingBlocks * 100) /
                _maxReputationValidPeriod;
            uint256 realReputation = _reputationValue / (100 / percentage);
            totalReputation += realReputation;
        }
        return totalReputation;
    }

    function evaluate(address[] calldata contiributors, string[] memory reasons)
        external
        returns (bool)
    {
        if (_evaluationEndBlock < block.number) revert OnlyEvaluationPeriod();
        bool flag;
        for (uint256 i; i < _evaluators.length; i++) {
            if (msg.sender == _evaluators[i]) {
                flag = true;
                break;
            }
        }
        if (!flag) revert OnlyEveluator();
        if (contiributors.length > _maxEvaluation) revert InvalidEvaluation();

        _mint(msg.sender, contiributors, reasons);
        return true;
    }

    function slash(address account) external returns (bool) {
        if (msg.sender != _governance) revert OnlyGovernance();
        _slashedAddresses[account] = true;
        return true;
    }

    function startEvaluation(address[] calldata evaluators)
        external
        returns (bool)
    {
        if (msg.sender != _governance) revert OnlyGovernance();
        if (block.number < _evaluationEndBlock)
            revert OverlappingEvaluationPeriod();
        if (_maxEvaluatiors < evaluators.length)
            revert InvalidEvaluatorsNumber();

        _evaluators = evaluators;
        _evaluationStartBlock = block.number;
        _evaluationEndBlock = block.number + _evaluationPeriod;

        emit EveluationStarted(
            evaluators,
            _evaluationStartBlock,
            _evaluationEndBlock
        );
        return true;
    }

    function _mint(
        address src,
        address[] memory dst,
        string[] memory reasons
    ) internal {
        if (dst.length != reasons.length) revert InvalidArrayLength();
        ReputationDetail memory newReputation = ReputationDetail({
            evaluator: src,
            validByBlock: block.number + _maxReputationValidPeriod
        });

        for (uint8 i = 0; i < dst.length; i++) {
            if (address(0) == dst[i]) revert InvalidAddress(dst[i]);

            _reputations[dst[i]].push(newReputation);

            emit ReputationMinted(
                src,
                dst[i],
                block.number + _maxReputationValidPeriod,
                reasons[i]
            );
        }
    }
}

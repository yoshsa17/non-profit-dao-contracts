//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract Reputation {
    uint128 private _reputationValue = 100;
    uint8 private _maxEvaluation = 3;
    uint8 private _maxEvaluators = 5;
    uint96 private _maxReputationValidPeriod = 100 days;
    // 138 blocks 30 min (assuming 13 sec blocktime)
    uint256 private _evaluationPeriod = 138;
    address private _governance;

    mapping(address => bool) private _slashedAddresses;

    struct ReputationDetail {
        address evaluator;
        uint256 expirationTime;
    }
    mapping(address => ReputationDetail[]) private _reputations;

    struct EvaluationRound {
        uint256 startBlock;
        uint256 endBlock;
        address[] evaluators;
        mapping(address => bool) canEvaluate;
    }
    mapping(uint256 => EvaluationRound) private _evaluationRounds;
    uint256 evaluationRoundCount;

    // TODO:: refactor
    string[] _emptyStrArray;

    // Event
    event ReputationMinted(
        uint256 roundId,
        address from,
        address to,
        uint256 expirationTime,
        string reasons
    );
    event EvaluationStarted(
        uint256 roundId,
        address[] evaluators,
        uint256 startBlock,
        uint256 endBlock
    );

    // Error
    error OnlyGovernance();
    error OnlyEvaluator();
    error OverlappingEvaluationPeriod();
    error InvalidEvaluatorsNumber();
    error InvalidEvaluation();
    error InvalidArrayLength();
    error InvalidAddress();
    error OnlyEvaluationPeriod();
    error InvalidRoundId();

    constructor(address[] memory _initialMembers, address governance) {
        _governance = governance;
        // TODO:: remove for-loop
        for (uint256 i; i < _initialMembers.length; i++) {
            _emptyStrArray.push("");
        }
        _mint(0, address(0), _initialMembers, _emptyStrArray);
    }

    function getGovernanceAddress() external view returns (address) {
        return _governance;
    }

    function isSlashed(address account) external view returns (bool) {
        return _slashedAddresses[account];
    }

    function getEvaluationRound(uint256 id)
        external
        view
        returns (
            uint256 startBlock,
            uint256 endBlock,
            address[] memory evaluators
        )
    {
        EvaluationRound storage e = _evaluationRounds[id];
        startBlock = e.startBlock;
        endBlock = e.endBlock;
        evaluators = e.evaluators;
    }

    function reputationOf(address account) external view returns (uint256) {
        if (_slashedAddresses[account]) return 0;

        ReputationDetail[] memory reputationArray = _reputations[account];
        uint256 totalReputation;

        // TODO:: remove for-loop
        for (uint256 i; i < reputationArray.length; i++) {
            uint256 expirationTime = reputationArray[i].expirationTime;
            uint256 currentTime = (block.timestamp / 1 days) * 1 days;
            if (expirationTime < currentTime) continue;

            uint256 remainingTime;
            unchecked {
                remainingTime = expirationTime - currentTime;
            }

            uint256 basis = (remainingTime * 10000) / _maxReputationValidPeriod;
            uint256 remainingReputation = (_reputationValue * basis) / 10000;
            totalReputation += remainingReputation;
        }
        return totalReputation;
    }

    function evaluate(
        uint256 roundId,
        address[] calldata contributors,
        string[] calldata reasons
    ) external returns (bool) {
        EvaluationRound storage e = _evaluationRounds[roundId];
        if (e.startBlock == 0) revert InvalidRoundId();
        if (e.endBlock < block.number) revert OnlyEvaluationPeriod();
        if (!e.canEvaluate[msg.sender]) revert OnlyEvaluator();
        if (contributors.length > _maxEvaluation) revert InvalidEvaluation();
        if (contributors.length != reasons.length) revert InvalidArrayLength();

        e.canEvaluate[msg.sender] = false;

        _mint(roundId, msg.sender, contributors, reasons);
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
        if (_maxEvaluators < evaluators.length)
            revert InvalidEvaluatorsNumber();

        uint256 startBlock = block.number;
        uint256 endBlock = block.number + _evaluationPeriod;

        evaluationRoundCount++;
        EvaluationRound storage e = _evaluationRounds[evaluationRoundCount];
        e.startBlock = startBlock;
        e.endBlock = endBlock;
        e.evaluators = evaluators;
        for (uint8 i; i < evaluators.length; i++) {
            e.canEvaluate[evaluators[i]] = true;
        }

        emit EvaluationStarted(
            evaluationRoundCount,
            evaluators,
            startBlock,
            endBlock
        );
        return true;
    }

    function _mint(
        uint256 roundId,
        address src,
        address[] memory dst,
        string[] memory reasons
    ) internal {
        // mintedTime is rounded down to whole days
        uint256 mintedTime = (block.timestamp / 1 days) * 1 days;
        uint256 expirationTime = mintedTime + _maxReputationValidPeriod;
        ReputationDetail memory newReputation = ReputationDetail(
            src,
            expirationTime
        );

        for (uint8 i; i < dst.length; i++) {
            if (src == dst[i]) revert InvalidAddress();
            _reputations[dst[i]].push(newReputation);

            emit ReputationMinted(
                roundId,
                src,
                dst[i],
                expirationTime,
                reasons[i]
            );
        }
    }
}

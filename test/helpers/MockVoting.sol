//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract MockVoting {
    // Helper functions for `./test/reputation.js`
    IReputation _reputation;

    function initReputation(address reputaion) external {
        _reputation = IReputation(reputaion);
    }

    function callStartEvaluation(address[] calldata evaluators)
        external
        returns (bool)
    {
        bool success = _reputation.startEvaluation(evaluators);
        if (!success) revert("callStartEvaluation: call reverted");
        return true;
    }

    function callSlash(address account) external returns (bool) {
        bool success = _reputation.slash(account);
        if (!success) revert("callStartEvaluation: call reverted");
        return true;
    }

    // Helper functions for `./test/treasury.js`
    ITreasury _treasury;

    function initTreasury(address treasury) external {
        _treasury = ITreasury(treasury);
    }

    function callSend(
        address target,
        uint256 amount,
        string memory information
    ) external returns (bool) {
        bool success = _treasury.send(target, amount, information);
        if (!success) revert("callStartEvaluation: call reverted");
        return true;
    }
}

interface IReputation {
    function slash(address account) external returns (bool);

    function startEvaluation(address[] calldata evaluators)
        external
        returns (bool);
}

interface ITreasury {
    function send(
        address target,
        uint256 amount,
        string memory information
    ) external returns (bool);
}

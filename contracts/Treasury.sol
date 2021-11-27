//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// import { IERC20 } from "./interfaces/IERC20.sol";

contract Treasury {
    uint8 private constant MAX_TX_INFO_LENGTH = 20;

    struct Transaction {
        address tokenOrEther;
        address srcOrDst;
        bool isIncoming;
        uint256 amount;
        string information;
    }

    mapping(uint256 => Transaction) private _transactions;
    mapping(address => bool) private _acceptableTokens;
    address governanceContract;
    uint256 private _transactionCount;

    // Event
    // TODO:: add uint256 proposalId,
    event EtherSent(
        uint256 transactionId,
        address target,
        uint256 amount,
        string information
    );
    event EtherDeposited(
        uint256 transactionId,
        address source,
        uint256 amount,
        string information
    );

    // Error
    error InvalidInformationLength(uint8 maxLength, uint256 required);
    error ZeroValue();
    error OnlyGovernance();
    error TransactionFailed();
    error TransactionNotFound();
    error InsufficientBalance(uint256 avalable, uint256 required);

    constructor(address daoToken, address governance) {
        _acceptableTokens[daoToken] = true;
        governanceContract = governance;
    }

    receive() external payable {
        // only ether is accepted
        if (msg.value > 0) {
            _recordTransaction(address(0), msg.sender, true, msg.value, "");
            emit EtherDeposited(_transactionCount, msg.sender, msg.value, "");
        }
    }

    function isAcceptableToken(address token) external view returns (bool) {
        return _acceptableTokens[token];
    }

    function deposit(string calldata information)
        external
        payable
        returns (bool)
    {
        if (msg.value == 0) {
            //   _depositToken(information, token);
            revert ZeroValue();
        } else {
            _recordTransaction(
                address(0),
                msg.sender,
                true,
                msg.value,
                information
            );
        }
        emit EtherDeposited(
            _transactionCount,
            msg.sender,
            msg.value,
            information
        );
        return true;
    }

    function send(
        // uint256 proposalId,
        address target,
        uint256 amount,
        string memory information
    ) external returns (bool) {
        if (msg.sender != governanceContract) revert OnlyGovernance();
        if (amount > address(this).balance)
            revert InsufficientBalance(address(this).balance, amount);

        (bool sent, ) = payable(target).call{value: amount}("");
        if (!sent) revert TransactionFailed();

        _recordTransaction(address(0), target, false, amount, information);
        emit EtherSent(
            _transactionCount,
            // proposalId,
            target,
            amount,
            information
        );
        return true;
    }

    function getTransaction(uint256 transactionId)
        external
        view
        returns (Transaction memory)
    {
        Transaction storage transaction = _transactions[transactionId];
        if (transaction.amount == 0) revert TransactionNotFound();
        return transaction;
    }

    function _recordTransaction(
        address _tokenOrEther,
        address _srcOrDst,
        bool _isIncoming,
        uint256 _amount,
        string memory _information
    ) internal {
        if (bytes(_information).length > MAX_TX_INFO_LENGTH) {
            revert InvalidInformationLength(
                MAX_TX_INFO_LENGTH,
                bytes(_information).length
            );
        }

        Transaction memory newTransaction = Transaction({
            tokenOrEther: _tokenOrEther,
            srcOrDst: _srcOrDst,
            isIncoming: _isIncoming,
            amount: _amount,
            information: _information
        });

        _transactionCount++;
        _transactions[_transactionCount] = newTransaction;
    }
}

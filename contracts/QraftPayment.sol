// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Qraft Payment
/// @notice Routes 95% of every payment to treasury and burns 5% via allowance.
contract QraftPayment is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BURN_RATE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    ERC20Burnable public immutable token;
    address public immutable treasury;

    error InvalidToken();
    error InvalidTreasury();
    error ZeroPayment();

    event ServicePaid(address indexed payer, uint256 amount, uint256 treasuryAmount, uint256 burnedAmount);

    constructor(address tokenAddress, address treasuryAddress) {
        if (tokenAddress == address(0)) revert InvalidToken();
        if (treasuryAddress == address(0)) revert InvalidTreasury();
        token = ERC20Burnable(tokenAddress);
        treasury = treasuryAddress;
    }

    function pay(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroPayment();
        uint256 burnAmount = (amount * BURN_RATE_BPS) / BPS_DENOMINATOR;
        uint256 treasuryAmount = amount - burnAmount;
        IERC20(address(token)).safeTransferFrom(msg.sender, treasury, treasuryAmount);
        token.burnFrom(msg.sender, burnAmount);
        emit ServicePaid(msg.sender, amount, treasuryAmount, burnAmount);
    }
}

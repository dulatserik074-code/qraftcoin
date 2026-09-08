// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title Qraft Coin
/// @notice Fixed-supply ERC-20. All tokens are minted once to the deployer.
contract QraftCoin is ERC20, ERC20Burnable {
    uint256 public constant MAX_SUPPLY = 1_000_000 ether;

    constructor() ERC20("Qraft Coin", "QFT") {
        _mint(msg.sender, MAX_SUPPLY);
    }
}

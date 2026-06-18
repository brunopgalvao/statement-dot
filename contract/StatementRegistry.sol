// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title statement.dot — social registry
/// @notice The durable, queryable backbone of the humans-only network, deployed
///         to pallet-revive (PolkaVM) on Polkadot Asset Hub. Posts/likes/follows
///         stay on the Statement Store (ephemeral gossip); only the things that
///         must be permanent and provable live here: the handle → account
///         registry, the one-time "verified human" badge, and per-account tip
///         jars. The frontend reaches this via `@parity/product-sdk-contracts`
///         (see src/sdk/live/index.ts).
///
/// @dev Accounts are the H160 addresses pallet-revive maps SS58 accounts to.
///      The caller (msg.sender) is the unlinkable per-Product alias, so the
///      registry never sees a user's underlying identity.
contract StatementRegistry {
    mapping(bytes32 => address) private _handles; // keccak256(handle) → account
    mapping(address => string) private _names;    // account → handle
    mapping(address => bool) private _human;       // account → PoP verified
    mapping(address => uint256) private _tipJar;   // account → accrued tips

    event Registered(address indexed account, string handle, bool human);
    event Tipped(address indexed from, address indexed to, uint256 amount);

    error HandleTaken();

    /// @notice Claim a `.dot` handle and record the verified-human badge.
    function register(string calldata handle, bool human) external {
        bytes32 key = keccak256(bytes(handle));
        address owner = _handles[key];
        if (owner != address(0) && owner != msg.sender) revert HandleTaken();
        _handles[key] = msg.sender;
        _names[msg.sender] = handle;
        _human[msg.sender] = human;
        emit Registered(msg.sender, handle, human);
    }

    /// @notice Tip another account. The value sent lands in their jar.
    function tip(address to) external payable {
        _tipJar[to] += msg.value;
        emit Tipped(msg.sender, to, msg.value);
    }

    function resolve(string calldata handle) external view returns (address) {
        return _handles[keccak256(bytes(handle))];
    }

    function handleOf(address account) external view returns (string memory) {
        return _names[account];
    }

    function isHuman(address account) external view returns (bool) {
        return _human[account];
    }

    function tipsOf(address account) external view returns (uint256) {
        return _tipJar[account];
    }
}

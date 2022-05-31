// // SPDX-License-Identifier: GPL-3.0-or-later

// pragma solidity ^0.8.9;

// // import "hardhat/console.sol";
// import "./interfaces/ITWAMMTermSwapOut.sol";
// import "./interfaces/IPair.sol";
// // import "./interfaces/IFactory.sol";
// import "./libraries/Library.sol";
// import "./libraries/TransferHelper.sol";
// import "./interfaces/IWETH10.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// contract TWAMMTermSwapOut is ITWAMMTermSwapOut {
//     using Library for address;

//     address public immutable factory;
//     address public immutable WETH;

//     modifier ensure(uint256 deadline) {
//         require(deadline >= block.timestamp, "TWAMM: Expired");
//         _;
//     }

//     constructor(address _factory, address _WETH) {
//         factory = _factory;
//         WETH = _WETH;
//         // IFactory(factory).initialize(address(this));
//     }

//     receive() external payable {
//         assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
//     }


//     function cancelTermSwapTokenToToken(
//         address token0,
//         address token1,
//         uint256 orderId,
//         uint256 deadline
//     ) external virtual override ensure(deadline) {
//         address pair = Library.pairFor(factory, token0, token1);
//         IPair(pair).cancelLongTermSwap(msg.sender, orderId, false);
//     }

//     function cancelTermSwapTokenToETH(
//         address token,
//         uint256 orderId,
//         uint256 deadline
//     ) external virtual override ensure(deadline) {
//         address pair = Library.pairFor(factory, token, WETH);
//         IPair(pair).cancelLongTermSwap(msg.sender, orderId, true);
//         uint256 amountETHWithdraw = IPair(pair).tmpMapWETH(msg.sender);
//         require(
//             IWETH10(WETH).balanceOf(address(this)) >= amountETHWithdraw,
//             "Inaccurate Amount for WETH."
//         );
//         IWETH10(WETH).withdrawFrom(
//             address(this),
//             payable(msg.sender),
//             amountETHWithdraw
//         );
//         IPair(pair).resetMapWETH(msg.sender);
//     }

//     function cancelTermSwapETHToToken(
//         address token,
//         uint256 orderId,
//         uint256 deadline
//     ) external virtual override ensure(deadline) {
//         address pair = Library.pairFor(factory, WETH, token);
//         IPair(pair).cancelLongTermSwap(msg.sender, orderId, true);
//         uint256 amountETHWithdraw = IPair(pair).tmpMapWETH(msg.sender);
//         require(
//             IWETH10(WETH).balanceOf(address(this)) >= amountETHWithdraw,
//             "Inaccurate Amount for WETH."
//         );
//         IWETH10(WETH).withdrawFrom(
//             address(this),
//             payable(msg.sender),
//             amountETHWithdraw
//         );
//         IPair(pair).resetMapWETH(msg.sender);
//     }

//     function withdrawProceedsFromTermSwapTokenToToken(
//         address token0,
//         address token1,
//         uint256 orderId,
//         uint256 deadline
//     ) external virtual override ensure(deadline) {
//         address pair = Library.pairFor(factory, token0, token1);
//         IPair(pair).withdrawProceedsFromLongTermSwap(
//             msg.sender,
//             orderId,
//             false
//         );
//     }

//     function withdrawProceedsFromTermSwapTokenToETH(
//         address token,
//         uint256 orderId,
//         uint256 deadline
//     ) external virtual override ensure(deadline) {
//         address pair = Library.pairFor(factory, token, WETH);
//         IPair(pair).withdrawProceedsFromLongTermSwap(msg.sender, orderId, true);
//         uint256 amountETHWithdraw = IPair(pair).tmpMapWETH(msg.sender);
//         require(
//             IWETH10(WETH).balanceOf(address(this)) >= amountETHWithdraw,
//             "Inaccurate Amount for WETH."
//         );
//         IWETH10(WETH).withdrawFrom(
//             address(this),
//             payable(msg.sender),
//             amountETHWithdraw
//         );
//         IPair(pair).resetMapWETH(msg.sender);
//     }

//     function withdrawProceedsFromTermSwapETHToToken(
//         address token,
//         uint256 orderId,
//         uint256 deadline
//     ) external virtual override ensure(deadline) {
//         address pair = Library.pairFor(factory, WETH, token);
//         IPair(pair).withdrawProceedsFromLongTermSwap(
//             msg.sender,
//             orderId,
//             false
//         );
//     }

// }

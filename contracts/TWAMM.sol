// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "./interfaces/ITWAMM.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IFactory.sol";
import "./libraries/Library.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IWETH10.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TWAMM is ITWAMM {
    using Library for address;

    address public immutable override factory;
    address public immutable override WETH;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "TWAMM: Expired");
        _;
    }

    constructor(
        address _factory,
        address _WETH,
        address _twammInstantSwapAddr, 
        address _twammLiquidityInAddr, 
        address _twammLiquidityOutAddr,
        address _twammTermSwapInAddr, 
        address _twammTermSwapOutAddr) {
        factory = _factory;
        WETH = _WETH;
        IFactory(factory).initialize(
            address(this),
            _twammInstantSwapAddr,
            _twammLiquidityInAddr,
            _twammLiquidityOutAddr,
            _twammTermSwapInAddr,
            _twammTermSwapOutAddr

        );
    }
    
    receive() external payable {
        assert(msg.sender == WETH); 
    }

   
    function addInitialLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 deadline
    ) external virtual override ensure(deadline) {
        // create the pair if it doesn't exist yet
        if (IFactory(factory).getPair(token0, token1) == address(0)) {
            IFactory(factory).createPair(token0, token1);
        }

        address pair = Library.pairFor(factory, token0, token1);
        (address tokenA, ) = Library.sortTokens(token0, token1);
        (uint256 amountA, uint256 amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);

        IPair(pair).provideInitialLiquidity(msg.sender, amountA, amountB);
    }

    function addInitialLiquidityETH(
        address token,
        uint256 amountToken,
        uint256 amountETH,
        uint256 deadline
    ) external payable virtual override ensure(deadline) {
        if (IFactory(factory).getPair(token, WETH) == address(0)) {
            IFactory(factory).createPair(token, WETH);
        }

        address pair = Library.pairFor(factory, token, WETH);
        (address tokenA, ) = Library.sortTokens(token, WETH);
        (uint256 amountA, uint256 amountB) = tokenA == token
            ? (amountToken, amountETH)
            : (amountETH, amountToken);

        IWETH10(WETH).depositTo{value: amountETH}(msg.sender);
        IPair(pair).provideInitialLiquidity(msg.sender, amountA, amountB);

        if (msg.value > amountETH) {
            TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
        }
    }


    function executeVirtualOrdersWrapper(address pair, uint256 blockNumber)
        external
        virtual
        override
    {
        IPair(pair).executeVirtualOrders(blockNumber);
    }
}

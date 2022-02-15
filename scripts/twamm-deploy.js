const hre = require("hardhat");
const ethers = hre.ethers;
const initialLiquidityProvided = ethers.utils.parseUnits("50"); 
const ERC20Supply = ethers.utils.parseUnits("100"); 

async function main() {
    if (hre.network.name === 'mainnet') {
        console.log(
            'Deploying TWAMM to mainnet. Hit ctrl + c to abort',
        );
    };

    const [deployer] = await ethers.getSigners();
    console.log(
        "Deploying the contracts with the account:",
        await deployer.getAddress()
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());


    const ERC20Factory =  await ethers.getContractFactory("ERC20Mock");
    console.log('Supplied amount for both tokens: %s', ERC20Supply);
    const tokenA = await ERC20Factory.deploy("USDTB", "USDTB", ERC20Supply);
    const tokenB = await ERC20Factory.deploy("WETHB", "WETHB", ERC20Supply);

    await tokenA.deployed();
    await tokenB.deployed();
    console.log(typeof tokenA);
    console.log('token A (USDT) address:', tokenA.address);
    console.log('token B (WETH) address:', tokenB.address);

    const TWAMM = await ethers.getContractFactory("TWAMM");
    // const twamm = await TWAMM.deploy(
    //     hre.network.config.Name,
    //     hre.network.config.Symbol,
    //     hre.network.config.WETH,
    //     hre.network.config.USDT,
    //     hre.network.config.BlockInterval,
    // );
    console.log('TWAMM loaded');
    // const twamm = await TWAMM.deploy(
    //     hre.network.config.Name,
    //     hre.network.config.Symbol,
    //     hre.network.config.WETH,
    //     hre.network.config.USDT,
    //     hre.network.config.BlockInterval,
    // );
    
    const twamm = await TWAMM.deploy(
        // hre.network.config.Name,
        // hre.network.config.Symbol,
        "Pulsar-LP",
        "PUL-LP",
        String(tokenA.address),
        String(tokenB.address),
        // hre.network.config.BlockInterval, 
        "10",
    );

    console.log('init params:', hre.network.config.Name,
    hre.network.config.Symbol,
    String(tokenA.address),
    String(tokenB.address),
    hre.network.config.BlockInterval)
    console.log('TWAMM deployed');

    await twamm.deployed();

    console.log("TWAMM address:", twamm.address);

    // new part

    tokenA.approve(twamm.address, ERC20Supply);
    console.log('tokenA approved');
    tokenB.approve(twamm.address, ERC20Supply);
    console.log('tokenB approved');
    // await twamm.provideInitialLiquidity(initialLiquidityProvided,initialLiquidityProvided);
    // console.log('initial liquidity added');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

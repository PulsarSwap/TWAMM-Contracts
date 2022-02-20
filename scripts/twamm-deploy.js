const hre = require("hardhat");
const ethers = hre.ethers;

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

    const TWAMM = await ethers.getContractFactory("TWAMM");
    const twamm = await TWAMM.deploy(
        hre.network.config.Factory,
        hre.network.config.WETH,
    );

    await twamm.deployed();

    console.log("TWAMM address:", twamm.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

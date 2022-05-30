require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("hardhat-deploy");
require("dotenv").config();
require('hardhat-contract-sizer');

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const PRIVATE_KEY_TEST = process.env.PRIVATE_KEY_TEST;
const PRIVATE_KEY_MAINNET = process.env.PRIVATE_KEY_MAINNET;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

if (!INFURA_API_KEY) {
  console.log(
    "\n !! IMPORTANT !!\n Must set INFURA_API_KEY in .env before running hardhat"
  );
  process.exit(0);
}

const localArgs = {
  FeeToSetter: "0x5906E73D3A0356A92fe0320c4b10d7892D8Ad607",
  Factory: "0x5906E73D3A0356A92fe0320c4b10d7892D8Ad607",
  WETH: "0x5906E73D3A0356A92fe0320c4b10d7892D8Ad607",
};

const mainnetArgs = {
  FeeToSetter: "",
  Factory: "",
  WETH: "",
};

const ropstenArgs = {
  FeeToSetter: "0x9be86E75E67f2ef9a44730C60cF04Ef9F944CCee",
  Factory: "",
  WETH: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
};

const rinkebyArgs = {
  FeeToSetter: "0x9be86E75E67f2ef9a44730C60cF04Ef9F944CCee",
  Factory: "0xa4930FD0f75ea1a4f61752734E8cD9c44883c3dc",
  WETH: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
};

module.exports = {
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    maxMethodDiff: 25,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },

  defaultNetwork: "hardhat",

  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      ...localArgs,
    },

    hardhat: {
      allowUnlimitedContractSize: true,
      mining: {
        auto: false,
        interval: 5000,
      },
      ...localArgs,
    },

    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_MAINNET],
      hardfork: "berlin",
      ...mainnetArgs,
    },

    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
      hardfork: "berlin",
      ...ropstenArgs,
    },

    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
      hardfork: "berlin",
      ...rinkebyArgs,
    },
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },

  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 50,
          },
        },
      },
    ],
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 20000,
  },
};

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("hardhat-deploy");
require("dotenv").config();

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
  Factory: "",
  WETH: "",
};

const mainnetArgs = {
  Factory: "",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};

const ropstenArgs = {
  Factory: "0x4996b1B79dB27368aa90FC4631ccD9A33Ffbb75e",
  WETH: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
};

const kovanArgs = {
  Factory: "0xA7234C4db1c30FDD1fD7c552D8097d27d66BF645",
  WETH: "0xd0A1E359811322d97991E03f863a0C30C2cF029C",
};

const rinkebyArgs = {
  Factory: "0x885A730C6f022369dE783aD30594A4f7031B6eFD",
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
      ...mainnetArgs,
    },

    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
      ...ropstenArgs,
    },

    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
      ...kovanArgs,
    },

    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
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
            runs: 10,
          },
        },
      },
    ],
  },

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
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

require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('hardhat-deploy');
require('dotenv').config();


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


// task("accounts", "Prints the list of accounts", async () => {
//     const accounts = await ethers.getSigners();

//     for (const account of accounts) {
//         console.log(account.address);
//     }
// });

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const PRIVATE_KEY_TEST = process.env.PRIVATE_KEY_TEST;
const PRIVATE_KEY_MAINNET = process.env.PRIVATE_KEY_MAINNET;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

if (!INFURA_API_KEY) {
    console.log(
        '\n !! IMPORTANT !!\n Must set INFURA_API_KEY in .env before running hardhat',
    );
    process.exit(0);
}

const localArgs = {
    Factory: "",
    WETH: "",
};

const mainnetArgs = {
  Name: name,
  Symbol: symbol,
  WETH: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  USDT: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  BlockInterval: blockInterval,
};

const ropstenArgs = {
  Name: name,
  Symbol: symbol,
  WETH: "0xE22953C88933f9dF589c259a385C7FA4F5257151",
  USDT: "0x52709362Aaa0143e38d53c671B4C443ccd19B4D9", 
  BlockInterval: blockInterval,
};

// const kovanArgs = {
//   Name: name,
//   Symbol: symbol,
//   WETH: "0x19642AcD1544bB95e0F7c916f065F8C811fd14B8",
//   USDT: "0x7702d7eD5A5C53e6699cc2a135bD5318bD01777e", 
//   BlockInterval: blockInterval,
// };

module.exports = {
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    maxMethodDiff: 25,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  
  defaultNetwork: 'hardhat',

  networks: {

    hardhat: {
      // forking: {
      //   url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`, 
      //   // blockNumber: 12115900,
      //   blockNumber: 11478321,
      // },
      allowUnlimitedContractSize: true,
      mining: {
        auto: false,
      },
      // gas: "auto",
      gas: 20000000,
      // gasMultiplier: 1.3,
      ...ropstenArgs,
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      allowUnlimitedContractSize: true,
      mining: {
        auto: false,
      },
    },

    // hardhat: {
    //   // allowUnlimitedContractSize: true,
    //   // mining: {
    //   //   auto: false,
    //   // },
    //   ...ropstenArgs,
    // },

    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY_TEST],
      gas: 8000000,
      // gas: "auto",
      // gasMultiplier: 1.5,
      ...ropstenArgs,
    },

    
    // mainnet: {
    //   url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
    //   accounts: [PRIVATE_KEY_MAINNET],
    //   ...mainnetArgs,
    // },

    // ropsten: {
    //   url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
    //   accounts: [PRIVATE_KEY_TEST],
    //   ...ropstenArgs,
    // },

    // kovan: {
    //   url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
    //   accounts: [PRIVATE_KEY_TEST],
    //   ...kovanArgs,
    // },
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
    
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000},
        },
      },
    ]
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  mocha: {
    timeout: 20000,
  },
    Factory: "",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};

// const ropstenArgs = {
//     Factory: "0x6bd436Ef48A96dBeD455553E991ce29f5c586A48",
//     WETH: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
// };

// const kovanArgs = {
//     Factory: "",
//     WETH: "0xd0A1E359811322d97991E03f863a0C30C2cF029C",

// };

// module.exports = {
//     gasReporter: {
//         enabled: process.env.REPORT_GAS ? true : false,
//         maxMethodDiff: 25,
//         coinmarketcap: process.env.COINMARKETCAP_API_KEY,
//     },

//     defaultNetwork: 'hardhat',

//     networks: {
//         localhost: {
//             url: "http://127.0.0.1:8545",
//         },
//         /*
//             hardhat: {
//               forking: {
//                 url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
//                 blockNumber: 11526493,
//               },
//               hardfork: "berlin",
//               ...ropstenArgs,
//             },
//         */
//         hardhat: {
//             allowUnlimitedContractSize: true,
//             mining: {
//                 auto: false,
//                 interval: 5000,
//             },
//             ...localArgs,
//         },

//         mainnet: {
//             url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
//             accounts: [PRIVATE_KEY_MAINNET],
//             hardfork: "berlin",
//             ...mainnetArgs,
//         },

//         ropsten: {
//             url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
//             accounts: [PRIVATE_KEY_TEST],
//             hardfork: "berlin",
//             ...ropstenArgs,
//         },

//         kovan: {
//             url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
//             accounts: [PRIVATE_KEY_TEST],
//             hardfork: "berlin",
//             ...kovanArgs,
//         },
//     },

//     etherscan: {
//         apiKey: ETHERSCAN_API_KEY,
//     },

//     solidity: {
//         compilers: [
//             {
//                 version: "0.8.9",
//                 settings: {
//                     optimizer: {
//                         enabled: true,
//                         runs: 200
//                     },
//                 },
//             },
//             {
//                 version: "0.4.19",
//                 settings: {
//                     optimizer: {
//                         enabled: true,
//                         runs: 200
//                     },
//                 },
//             },
//         ]
//     },

//     paths: {
//         sources: "./contracts",
//         tests: "./test",
//         cache: "./cache",
//         artifacts: "./artifacts"
//     },

//     mocha: {
//         timeout: 20000,
//     },
// };

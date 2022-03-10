import { Contract, Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import { deployContract } from "ethereum-waffle";

import { expandTo18Decimals } from "./utilities";

import ERC20 from "../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json";
import Factory from "../../artifacts/contracts/Factory.sol/Factory.json";
import Pair from "../../artifacts/contracts/Pair.sol/Pair.json";

interface FactoryFixture {
    factory: Contract;
}

const overrides = {
    gasLimit: 9999999,
};

export async function factoryFixture(
    _: Web3Provider,
    [wallet]: Wallet[]
): Promise<FactoryFixture> {
    const factory = await deployContract(
        wallet,
        Factory,
        [wallet.address],
        overrides
    );
    return { factory };
}

interface PairFixture extends FactoryFixture {
    tokenA: Contract;
    tokenB: Contract;
    pair: Contract;
}

export async function pairFixture(
    provider: Web3Provider,
    [wallet]: Wallet[]
): Promise<PairFixture> {
    const { factory } = await factoryFixture(provider, [wallet]);

    const token0 = await deployContract(
        wallet,
        ERC20,
        [expandTo18Decimals(10000)],
        overrides
    );
    const token1 = await deployContract(
        wallet,
        ERC20,
        [expandTo18Decimals(10000)],
        overrides
    );

    await factory.createPair(token0.address, token1.address, overrides);
    const pairAddress = await factory.getPair(token0.address, token1.address);
    const pair = new Contract(
        pairAddress,
        JSON.stringify(Pair.abi),
        provider
    ).connect(wallet);

    const tokenAAddress = (await pair.tokenA()).address;
    const tokenA = token0.address === tokenAAddress ? token0 : token1;
    const tokenB = token0.address === tokenAAddress ? token1 : token0;

    return { factory, tokenA, tokenB, pair };
}
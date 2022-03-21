// import chai, { expect } from 'chai'
const { expect } = require("chai");
// const { Contract } = require('ethers');
const { ethers } = require("hardhat");
const { Contract } = ethers
// const { bigNumberify } = require('ethers/utils');
// console.log('tt', ethers.bigNumberify)
const { bigNumberify } = ethers.utils
// const bigNumberify = ethers.bigNumberify;
const { solidity, MockProvider, createFixtureLoader } = require('ethereum-waffle');

const { getCreate2Address } = require('./shared/utilities');
// const { getCreate2Address } = utilities;
// import {  getCreate2Address } from './shared/utilities';
const { factoryFixture }  = require('./shared/fixtures');
// const { factoryFixture }  = require('./shared/fixtures'); 
const { Pair }  = require('../artifacts/contracts/Factory.sol/Factory.json');

chai.use(solidity)

const TEST_ADDRESSES = [
    String('0x1000000000000000000000000000000000000000'),
    String('0x2000000000000000000000000000000000000000')
]

describe('Factory', () => {
    const provider = new MockProvider({
        hardfork: 'istanbul',
        mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
        gasLimit: 9999999
    })
    const [wallet, other] = provider.getWallets()
    const loadFixture = createFixtureLoader(provider, [wallet, other])

    let factory;
    beforeEach(async () => {
        const fixture = await loadFixture(factoryFixture)
        factory = fixture.factory
    })

    it('allPairsLength', async () => {
        expect(await factory.allPairsLength()).to.eq(0)
    })

    async function createPair(tokens) {
        const bytecode = `0x${Pair.evm.bytecode.object}`
        const create2Address = getCreate2Address(factory.address, tokens, bytecode)
        await expect(factory.createPair(...tokens))
            .to.emit(factory, 'PairCreated')
            .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, bigNumberify(1))

        await expect(factory.createPair(...tokens)).to.be.reverted // Pancake: PAIR_EXISTS
        await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted // Pancake: PAIR_EXISTS
        expect(await factory.getPair(...tokens)).to.eq(create2Address)
        expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
        expect(await factory.allPairs(0)).to.eq(create2Address)
        expect(await factory.allPairsLength()).to.eq(1)

        const pair = new Contract(create2Address, JSON.stringify(Pair.abi), provider)
        expect(await pair.factory()).to.eq(factory.address)
        expect(await pair.tokenA()).to.eq(TEST_ADDRESSES[0])
        expect(await pair.tokenB()).to.eq(TEST_ADDRESSES[1])
    }

    it('createPair', async () => {
        await createPair(TEST_ADDRESSES)
    })

    it('createPair:reverse', async () => {
        await createPair(TEST_ADDRESSES.slice().reverse()) //as [string, string])
    })

    it('createPair:gas', async () => {
        const tx = await factory.createPair(...TEST_ADDRESSES)
        const receipt = await tx.wait()
        expect(receipt.gasUsed).to.eq(2509120)
    })
})
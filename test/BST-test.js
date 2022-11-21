const { expect } = require("chai");
const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("BST", function () {
  let root;
  // let result1;
  // let insertSuccess;

  beforeEach(async function () {
    this.timeout(1000000);
    console.log("checkBST");

    const BinarySearchTreeLib = await (
      await ethers.getContractFactory("BinarySearchTreeLib")
    ).deploy();

    const bst = await (
      await ethers.getContractFactory("BST", {
        libraries: {
          BinarySearchTreeLib: BinarySearchTreeLib.address,
        },
      })
    ).deploy();

    // step 1
    root = await bst.root();
    console.log("checkroot1", root.toNumber());

    // insertSuccess = await bst.insert(470);
    // await insertSuccess.wait();
    // root = await bst.root();
    // console.log("checkroot11", root.toNumber());
    // root = await bst.root();
    // console.log("checkroot2", root.toNumber());
    // await bst.insert(472);
    // result1 = await bst.returnList(470, 480);
    // await result1.wait();

    tx1 = await bst.insert(485);
    await tx1.wait();
    tx2 = await bst.insert(520);
    await tx2.wait();
    tx3 = await bst.insert(490);
    await tx3.wait();
    tx4 = await bst.insert(550);
    await tx4.wait();
    tx5 = await bst.insert(567);
    await tx5.wait();
    tx6 = await bst.insert(450);
    await tx6.wait();
    tx7 = await bst.insert(350);
    await tx7.wait();
    tx8 = await bst.insert(540);
    await tx8.wait();
    tx9 = await bst.insert(560);
    await tx9.wait();
    tx10 = await bst.insert(580);
    await tx10.wait();
    tx11 = await bst.insert(440);
    await tx11.wait();
    tx12 = await bst.insert(640);
    await tx12.wait();
    tx13 = await bst.insert(750);
    await tx13.wait();
    tx14 = await bst.insert(860);
    await tx14.wait();
    tx15 = await bst.insert(600);
    await tx15.wait();
    tx16 = await bst.insert(670);
    await tx16.wait();
    tx17 = await bst.insert(704);
    await tx17.wait();
    tx18 = await bst.insert(599);
    await tx18.wait();
    tx19 = await bst.insert(888);
    await tx19.wait();
    tx20 = await bst.insert(740);
    await tx20.wait();

    root = await bst.root();
    console.log("checkroot2", root.toNumber());

    result1 = await bst.returnList(400, 532);
    await result1.wait();
    root = await bst.root();
    console.log("checkroot3", root.toNumber());

    tx = await bst.deleteNode(567);
    await tx.wait();
    root = await bst.root();
    console.log("checkroot", root.toNumber());

    result2 = await bst.returnList(532, 590);
    await result2.wait();
    root = await bst.root();
    console.log("checkroot4", root.toNumber());

    result3 = await bst.returnList(590, 800);
    await result3.wait();
    root = await bst.root();
    console.log("checkroot5", root.toNumber());

    // root = await bst.root();
    // console.log("rootprecheck", root.toNumber());

    // result1 = await bst.returnList(480, 495);
    // await result1.wait();
    // root = await bst.root();
    // console.log("checkroot4", root.toNumber());

    //step2 test cancel order
    // root = await bst.root();
    // console.log("checkroot1", root.toNumber());
    // insertSuccess = await bst.insert(470);
    // await insertSuccess.wait();
    // root = await bst.root();
    // console.log("checkroot11", root.toNumber());
    // await bst.insert(485);
    // await bst.insert(520);
    // await bst.insert(490);
    // await bst.insert(550);
    // root = await bst.root();
    // console.log("checkroot2", root.toNumber());
    // result1 = await bst.returnList(470, 485);
    // await result1.wait();
    // root = await bst.root();
    // console.log("checkroot3", root.toNumber());
    // result1 = await bst.remove(520);
    // await result1.wait();
    // // result1 = await bst.remove(550);
    // // await result1.wait();
    // root = await bst.root();
    // console.log("rootprecheck", root.toNumber());
    // result1 = await bst.returnList(485, 495);
    // await result1.wait();
    // root = await bst.root();
    // console.log("checkroot4", root.toNumber());

    // //step3 test list
    // root = await bst.root();
    // console.log("checkroot1", root.toNumber());
    // insertSuccess = await bst.insert(470);
    // await insertSuccess.wait();
    // root = await bst.root();
    // console.log("checkroot11", root.toNumber());
    // await bst.insert(485);
    // await bst.insert(483);
    // await bst.insert(484);
    // await bst.insert(482);
    // await bst.insert(479);
    // await bst.insert(520);
    // await bst.insert(490);
    // await bst.insert(491);
    // await bst.insert(550);
    // root = await bst.root();
    // console.log("checkroot2", root.toNumber());
    // result1 = await bst.returnList(480, 490);
    // await result1.wait();

    //step3 test trim tree
    // root = await bst.root();
    // console.log("checkroot1", root.toNumber());
    // insertSuccess = await bst.insert(470);
    // await insertSuccess.wait();
    // root = await bst.root();
    // console.log("checkroot11", root.toNumber());
    // await bst.insert(485);
    // await bst.insert(483);
    // await bst.insert(482);
    // await bst.insert(479);
    // await bst.insert(520);
    // await bst.insert(490);
    // await bst.insert(491);
    // await bst.insert(550);
    // root = await bst.root();
    // console.log("checkroot2", root.toNumber());
    // result1 = await bst.trim(470, 490);
    // await result1.wait();

    // root = await bst.root();
    // console.log("checkroot3", root.toNumber());
    // result1 = await bst.remove(520);
    // await result1.wait();
    // // result1 = await bst.remove(550);
    // // await result1.wait();
    // root = await bst.root();
    // console.log("rootprecheck", root.toNumber());
    // result1 = await bst.returnList(485, 495);
    // await result1.wait();
    // root = await bst.root();
    // console.log("checkroot4", root.toNumber());

    // await bst.insert(485);
    // await bst.insert(25);
    // tt = await bst.insert(50);
    // await tt.wait();
    // root = await bst.root();
    // console.log("checkroot", root.toNumber());
    // // const result1 = await bst.returnList(10, 50);
    // await result1.wait();
    // // tt = await bst.trim(50);
    // await tt.wait();
    // root = await bst.root();
    // console.log("checkroot", root.toNumber());
    // await bst.insert(485);
    // await bst.insert(485);
    // await bst.insert(485);
    // const result1 = await bst.returnList(470, 485);
    // await result1.wait();
    // const root1 = await bst.root();
    // console.log("checkroot1", root1.toNumber());
    // network basics
    // await network.provider.send("evm_setAutomine", [true]);
    // [owner, addr0, addr1, ...addrs] = await ethers.getSigners();
  });

  describe("BST Check", function () {
    it("BST Check", async function () {
      console.log("BST Check End");
    });
  });
});

async function mineBlocks(blockNumber) {
  for (let i = 0; i < blockNumber; i++) {
    await network.provider.send("evm_mine");
  }
}

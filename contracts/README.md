# Smart Contract Documentation

## CrowdfundingEscrow.sol

### Overview
Solidity smart contract for escrow-based crowdfunding on Avalanche C-Chain. Handles campaign creation, AVAX donations with KES display, milestone-based fund releases with donor voting, and automatic refunds.

### Key Features
- **Campaign Creation**: Store goals in both KES (display) and AVAX (blockchain)
- **Escrow Mechanism**: Funds held in contract until milestone conditions met
- **Milestone-Based Releases**: Funds released in stages with evidence verification
- **Donor Voting**: Democratic approval system (50% approval, 30% quorum)
- **Automatic Refunds**: If goal not reached by deadline, donors can claim refunds
- **Transparency**: All actions emit events for off-chain tracking

### Security Features
- OpenZeppelin ReentrancyGuard for safe withdrawals
- Access control (onlyOwner, onlyCampaignCreator modifiers)
- Safe math (Solidity 0.8+ overflow protection)
- Input validation on all public functions
- No external calls to untrusted contracts

### Deployment Instructions

#### Prerequisites
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

#### Hardhat Configuration (hardhat.config.js)
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [process.env.PRIVATE_KEY] // Add your private key to .env
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: [process.env.PRIVATE_KEY]
    },
    hardhat: {
      chainId: 31337
    }
  }
};
```

#### Deploy Script (scripts/deploy.js)
```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying CrowdfundingEscrow to", hre.network.name);
  
  const CrowdfundingEscrow = await hre.ethers.getContractFactory("CrowdfundingEscrow");
  const escrow = await CrowdfundingEscrow.deploy();
  
  await escrow.waitForDeployment();
  
  const address = await escrow.getAddress();
  console.log("CrowdfundingEscrow deployed to:", address);
  
  // Verify on explorer (Fuji or Mainnet)
  if (hre.network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await escrow.deploymentTransaction().wait(6);
    
    console.log("Verifying contract...");
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: []
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### Deployment Commands
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local Hardhat network
npx hardhat run scripts/deploy.js

# Deploy to Fuji testnet
npx hardhat run scripts/deploy.js --network fuji

# Deploy to Avalanche mainnet
npx hardhat run scripts/deploy.js --network avalanche
```

### Testing

#### Sample Test (test/CrowdfundingEscrow.test.js)
```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrowdfundingEscrow", function () {
  let escrow;
  let owner, creator, donor1, donor2, donor3;
  
  beforeEach(async function () {
    [owner, creator, donor1, donor2, donor3] = await ethers.getSigners();
    
    const CrowdfundingEscrow = await ethers.getContractFactory("CrowdfundingEscrow");
    escrow = await CrowdfundingEscrow.deploy();
  });
  
  describe("Campaign Creation", function () {
    it("Should create a campaign with correct parameters", async function () {
      const goalKES = ethers.parseUnits("500000", 0); // 500,000 KES
      const goalAVAX = ethers.parseEther("3.5"); // ~3.5 AVAX
      const conversionRate = 142857; // KES per AVAX
      const deadline = await time.latest() + 86400 * 30; // 30 days
      
      const tx = await escrow.connect(creator).createCampaign(
        "Robotics Club Equipment",
        "Purchase robotics parts for competition",
        goalKES,
        goalAVAX,
        conversionRate,
        deadline,
        ["Buy Parts", "Travel to Competition"],
        [ethers.parseUnits("300000", 0), ethers.parseUnits("200000", 0)],
        [ethers.parseEther("2.1"), ethers.parseEther("1.4")]
      );
      
      await expect(tx).to.emit(escrow, "CampaignCreated");
      
      const campaign = await escrow.getCampaign(0);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.goalAVAX).to.equal(goalAVAX);
    });
  });
  
  describe("Donations", function () {
    let campaignId, deadline;
    
    beforeEach(async function () {
      deadline = await time.latest() + 86400 * 30;
      const tx = await escrow.connect(creator).createCampaign(
        "Test Campaign",
        "Description",
        ethers.parseUnits("500000", 0),
        ethers.parseEther("3.5"),
        142857,
        deadline,
        ["Milestone 1"],
        [ethers.parseUnits("500000", 0)],
        [ethers.parseEther("3.5")]
      );
      
      const receipt = await tx.wait();
      campaignId = 0;
    });
    
    it("Should accept donations", async function () {
      const donationAmount = ethers.parseEther("1.0");
      
      await expect(
        escrow.connect(donor1).donate(campaignId, { value: donationAmount })
      ).to.emit(escrow, "DonationReceived");
      
      const donation = await escrow.getDonation(campaignId, donor1.address);
      expect(donation).to.equal(donationAmount);
    });
    
    it("Should mark goal as reached when donations exceed goal", async function () {
      await escrow.connect(donor1).donate(campaignId, { value: ethers.parseEther("2.0") });
      await escrow.connect(donor2).donate(campaignId, { value: ethers.parseEther("2.0") });
      
      const campaign = await escrow.getCampaign(campaignId);
      expect(campaign.goalReached).to.be.true;
    });
  });
  
  describe("Milestone Voting & Release", function () {
    let campaignId;
    
    beforeEach(async function () {
      const deadline = await time.latest() + 86400 * 30;
      await escrow.connect(creator).createCampaign(
        "Test Campaign",
        "Description",
        ethers.parseUnits("500000", 0),
        ethers.parseEther("3.0"),
        166666,
        deadline,
        ["Milestone 1"],
        [ethers.parseUnits("500000", 0)],
        [ethers.parseEther("3.0")]
      );
      
      campaignId = 0;
      
      // Donate to reach goal
      await escrow.connect(donor1).donate(campaignId, { value: ethers.parseEther("1.2") });
      await escrow.connect(donor2).donate(campaignId, { value: ethers.parseEther("1.2") });
      await escrow.connect(donor3).donate(campaignId, { value: ethers.parseEther("0.8") });
    });
    
    it("Should allow creator to propose milestone", async function () {
      await expect(
        escrow.connect(creator).proposeMilestoneRelease(
          campaignId,
          0,
          "ipfs://QmExample123"
        )
      ).to.emit(escrow, "MilestoneProposed");
    });
    
    it("Should allow donors to vote and finalize milestone", async function () {
      await escrow.connect(creator).proposeMilestoneRelease(
        campaignId,
        0,
        "ipfs://QmExample123"
      );
      
      // All 3 donors vote (100% quorum, >50% approval)
      await escrow.connect(donor1).voteOnMilestone(campaignId, 0, true);
      await escrow.connect(donor2).voteOnMilestone(campaignId, 0, true);
      await escrow.connect(donor3).voteOnMilestone(campaignId, 0, false);
      
      // 2/3 voted yes (66% approval) - should pass
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      
      await expect(
        escrow.finalizeMilestone(campaignId, 0)
      ).to.emit(escrow, "MilestoneFinalized");
      
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);
    });
  });
  
  describe("Refunds", function () {
    it("Should issue refunds if campaign fails", async function () {
      const deadline = await time.latest() + 86400; // 1 day
      await escrow.connect(creator).createCampaign(
        "Test Campaign",
        "Description",
        ethers.parseUnits("500000", 0),
        ethers.parseEther("5.0"), // High goal
        100000,
        deadline,
        ["Milestone 1"],
        [ethers.parseUnits("500000", 0)],
        [ethers.parseEther("5.0")]
      );
      
      const campaignId = 0;
      const donationAmount = ethers.parseEther("1.0");
      
      await escrow.connect(donor1).donate(campaignId, { value: donationAmount });
      
      // Fast forward past deadline
      await time.increase(86400 + 1);
      
      const balanceBefore = await ethers.provider.getBalance(donor1.address);
      
      await expect(
        escrow.connect(donor1).requestRefund(campaignId)
      ).to.emit(escrow, "RefundIssued");
      
      const balanceAfter = await ethers.provider.getBalance(donor1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });
});
```

### Gas Optimization Notes
- Use `memory` for function parameters and local variables
- Batch operations where possible
- Minimize storage writes (most expensive operation)
- Use events for data that doesn't need on-chain queries
- Consider upgradeability pattern (UUPS proxy) for production

### Security Considerations
- **Reentrancy**: Protected via OpenZeppelin's ReentrancyGuard
- **Integer Overflow**: Solidity 0.8+ has built-in protection
- **Access Control**: Modifiers restrict sensitive functions
- **Oracle Manipulation**: Conversion rates stored at campaign creation
- **Front-running**: Voting is binary (approve/reject) - no financial advantage
- **Griefing**: Minimum quorum prevents single donor blocking releases

### Recommended Enhancements for Production
1. **Multi-sig Admin**: Use Gnosis Safe for admin functions
2. **Emergency Pause**: Add pausable pattern for critical bugs
3. **Upgradeability**: Use UUPS proxy pattern
4. **Time-locks**: Add delay for sensitive operations
5. **Oracle Integration**: Direct Chainlink integration for real-time rates
6. **Gas Optimization**: Batch donor operations, use bit packing
7. **Extended Refund Window**: Grace period for donors to claim

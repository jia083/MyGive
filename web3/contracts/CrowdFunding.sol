// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract CrowdFunding {
    struct Campaign {
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        string image;
        string category;
        address[] donators;
        uint256[] donations;
        bool isVerified;
    }

    struct Update {
        string title;
        string content;
        uint256 timestamp;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Update[]) public campaignUpdates;
    mapping(address => bool) public verifiedOrganizers;

    address public platformOwner;
    uint256 public numberOfCampaigns = 0;

    // Events for tracking
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed owner,
        string title,
        string category,
        uint256 target,
        uint256 deadline
    );

    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 newTotal
    );

    event CampaignUpdatePosted(
        uint256 indexed campaignId,
        string title,
        uint256 timestamp
    );

    event OrganizerVerified(address indexed organizer);
    event OrganizerUnverified(address indexed organizer);

    constructor() {
        platformOwner = msg.sender;
    }

    modifier onlyPlatformOwner() {
        require(msg.sender == platformOwner, "Only platform owner can call this");
        _;
    }

    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline,
        string memory _image,
        string memory _category
    ) public returns (uint256) {
        Campaign storage campaign = campaigns[numberOfCampaigns];

        require(_deadline > block.timestamp, "The deadline should be a date in the future.");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_category).length > 0, "Category cannot be empty");
        require(_target > 0, "Target must be greater than 0");

        campaign.owner = _owner;
        campaign.title = _title;
        campaign.description = _description;
        campaign.target = _target;
        campaign.deadline = _deadline;
        campaign.amountCollected = 0;
        campaign.image = _image;
        campaign.category = _category;
        campaign.isVerified = verifiedOrganizers[_owner];

        uint256 campaignId = numberOfCampaigns;
        numberOfCampaigns++;

        emit CampaignCreated(campaignId, _owner, _title, _category, _target, _deadline);

        return campaignId;
    }

    function donateToCampaign(uint256 _id) public payable {
        uint256 amount = msg.value;

        Campaign storage campaign = campaigns[_id];

        // Check if campaign has ended (deadline passed OR target reached)
        require(block.timestamp < campaign.deadline, "Campaign deadline has passed");
        require(campaign.amountCollected < campaign.target, "Campaign has reached its funding goal");
        require(amount > 0, "Donation amount must be greater than 0");

        campaign.donators.push(msg.sender);
        campaign.donations.push(amount);

        (bool sent,) = payable(campaign.owner).call{value: amount}("");

        if(sent) {
            campaign.amountCollected = campaign.amountCollected + amount;
            emit DonationReceived(_id, msg.sender, amount, campaign.amountCollected);
        }
    }

    function getDonators(uint256 _id) view public returns (address[] memory, uint256[] memory) {
        return (campaigns[_id].donators, campaigns[_id].donations);
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](numberOfCampaigns);

        for(uint i = 0; i < numberOfCampaigns; i++) {
            Campaign storage item = campaigns[i];

            allCampaigns[i] = item;
        }

        return allCampaigns;
    }

    // Campaign Updates Functions
    function postCampaignUpdate(
        uint256 _campaignId,
        string memory _updateTitle,
        string memory _updateContent
    ) public {
        require(_campaignId < numberOfCampaigns, "Campaign does not exist");
        require(campaigns[_campaignId].owner == msg.sender, "Only campaign owner can post updates");
        require(bytes(_updateTitle).length > 0, "Update title cannot be empty");
        require(bytes(_updateContent).length > 0, "Update content cannot be empty");

        Update memory newUpdate = Update({
            title: _updateTitle,
            content: _updateContent,
            timestamp: block.timestamp
        });

        campaignUpdates[_campaignId].push(newUpdate);

        emit CampaignUpdatePosted(_campaignId, _updateTitle, block.timestamp);
    }

    function getCampaignUpdates(uint256 _campaignId) public view returns (Update[] memory) {
        return campaignUpdates[_campaignId];
    }

    // Verification Functions
    function verifyOrganizer(address _organizer) public onlyPlatformOwner {
        verifiedOrganizers[_organizer] = true;
        emit OrganizerVerified(_organizer);
    }

    function unverifyOrganizer(address _organizer) public onlyPlatformOwner {
        verifiedOrganizers[_organizer] = false;
        emit OrganizerUnverified(_organizer);
    }

    function isOrganizerVerified(address _organizer) public view returns (bool) {
        return verifiedOrganizers[_organizer];
    }

    // Update verification status of existing campaigns when organizer is verified
    function updateCampaignVerificationStatus(uint256 _campaignId) public {
        require(_campaignId < numberOfCampaigns, "Campaign does not exist");
        campaigns[_campaignId].isVerified = verifiedOrganizers[campaigns[_campaignId].owner];
    }

    // Get campaigns by owner address
    function getCampaignsByOwner(address _owner) public view returns (uint256[] memory) {
        uint256[] memory tempCampaignIds = new uint256[](numberOfCampaigns);
        uint256 count = 0;

        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            if (campaigns[i].owner == _owner) {
                tempCampaignIds[count] = i;
                count++;
            }
        }

        // Create array with exact size
        uint256[] memory campaignIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            campaignIds[i] = tempCampaignIds[i];
        }

        return campaignIds;
    }

    // Get all donations made by a specific user
    function getUserDonations(address _donor) public view returns (
        uint256[] memory campaignIds,
        uint256[] memory amounts
    ) {
        // First pass: count total donations
        uint256 totalDonations = 0;
        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            for (uint256 j = 0; j < campaigns[i].donators.length; j++) {
                if (campaigns[i].donators[j] == _donor) {
                    totalDonations++;
                }
            }
        }

        // Second pass: collect donation data
        campaignIds = new uint256[](totalDonations);
        amounts = new uint256[](totalDonations);
        uint256 index = 0;

        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            for (uint256 j = 0; j < campaigns[i].donators.length; j++) {
                if (campaigns[i].donators[j] == _donor) {
                    campaignIds[index] = i;
                    amounts[index] = campaigns[i].donations[j];
                    index++;
                }
            }
        }

        return (campaignIds, amounts);
    }

    // Get platform statistics
    function getPlatformStats() public view returns (
        uint256 totalCampaigns,
        uint256 totalDonationsCount,
        uint256 totalAmountRaised,
        uint256 activeCampaignsCount
    ) {
        totalCampaigns = numberOfCampaigns;
        totalDonationsCount = 0;
        totalAmountRaised = 0;
        activeCampaignsCount = 0;

        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            Campaign storage campaign = campaigns[i];

            // Count donations
            totalDonationsCount += campaign.donators.length;

            // Sum total amount raised
            totalAmountRaised += campaign.amountCollected;

            // Check if campaign is active (not expired and not fully funded)
            bool isExpired = block.timestamp >= campaign.deadline;
            bool isFullyFunded = campaign.amountCollected >= campaign.target;

            if (!isExpired && !isFullyFunded) {
                activeCampaignsCount++;
            }
        }

        return (totalCampaigns, totalDonationsCount, totalAmountRaised, activeCampaignsCount);
    }

    // Get only active campaigns
    function getActiveCampaigns() public view returns (Campaign[] memory) {
        // First pass: count active campaigns
        uint256 activeCount = 0;
        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            Campaign storage campaign = campaigns[i];
            bool isExpired = block.timestamp >= campaign.deadline;
            bool isFullyFunded = campaign.amountCollected >= campaign.target;

            if (!isExpired && !isFullyFunded) {
                activeCount++;
            }
        }

        // Second pass: collect active campaigns
        Campaign[] memory activeCampaigns = new Campaign[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            Campaign storage campaign = campaigns[i];
            bool isExpired = block.timestamp >= campaign.deadline;
            bool isFullyFunded = campaign.amountCollected >= campaign.target;

            if (!isExpired && !isFullyFunded) {
                activeCampaigns[index] = campaign;
                index++;
            }
        }

        return activeCampaigns;
    }
}
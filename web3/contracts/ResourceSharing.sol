// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract ResourceSharing {
    struct Resource {
        address owner;
        string title;
        string description;
        string category;
        uint256 quantityAvailable;
        uint256 quantityOriginal;
        string unit;
        string location;
        uint256 postedTimestamp;
        bool isActive;
        address[] claimers;
        uint256[] claimedAmounts;
        bool isVerified;
        string image;
    }

    struct Claim {
        uint256 resourceId;
        address claimer;
        uint256 amount;
        uint256 timestamp;
        bool isCompleted;
        bool isCancelled;
    }

    mapping(uint256 => Resource) public resources;
    mapping(uint256 => Claim[]) public resourceClaims;
    mapping(address => bool) public verifiedDonors;

    address public platformOwner;
    uint256 public numberOfResources = 0;

    // Events for tracking
    event ResourcePosted(
        uint256 indexed resourceId,
        address indexed owner,
        string title,
        string category,
        uint256 quantity,
        uint256 timestamp
    );

    event ResourceClaimed(
        uint256 indexed resourceId,
        address indexed claimer,
        uint256 amount,
        uint256 timestamp
    );

    event ClaimCompleted(
        uint256 indexed resourceId,
        uint256 indexed claimIndex,
        address indexed claimer
    );

    event ClaimCancelled(
        uint256 indexed resourceId,
        uint256 indexed claimIndex,
        address indexed claimer
    );

    event ResourceDeactivated(
        uint256 indexed resourceId,
        address indexed owner
    );

    event ResourceReactivated(
        uint256 indexed resourceId,
        address indexed owner
    );

    event DonorVerified(address indexed donor);
    event DonorUnverified(address indexed donor);

    constructor() {
        platformOwner = msg.sender;
    }

    modifier onlyPlatformOwner() {
        require(msg.sender == platformOwner, "Only platform owner can call this");
        _;
    }

    modifier onlyResourceOwner(uint256 _resourceId) {
        require(_resourceId < numberOfResources, "Resource does not exist");
        require(resources[_resourceId].owner == msg.sender, "Only resource owner can call this");
        _;
    }

    // Post a new resource
    function postResource(
        string memory _title,
        string memory _description,
        string memory _category,
        uint256 _quantity,
        string memory _unit,
        string memory _location,
        string memory _image
    ) public returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_category).length > 0, "Category cannot be empty");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(bytes(_unit).length > 0, "Unit cannot be empty");
        require(bytes(_location).length > 0, "Location cannot be empty");

        Resource storage resource = resources[numberOfResources];

        resource.owner = msg.sender;
        resource.title = _title;
        resource.description = _description;
        resource.category = _category;
        resource.quantityAvailable = _quantity;
        resource.quantityOriginal = _quantity;
        resource.unit = _unit;
        resource.location = _location;
        resource.postedTimestamp = block.timestamp;
        resource.isActive = true;
        resource.isVerified = verifiedDonors[msg.sender];
        resource.image = _image;

        uint256 resourceId = numberOfResources;
        numberOfResources++;

        emit ResourcePosted(
            resourceId,
            msg.sender,
            _title,
            _category,
            _quantity,
            block.timestamp
        );

        return resourceId;
    }

    // Claim/Request a resource
    function claimResource(uint256 _resourceId, uint256 _amount) public {
        require(_resourceId < numberOfResources, "Resource does not exist");
        require(_amount > 0, "Claim amount must be greater than 0");

        Resource storage resource = resources[_resourceId];

        require(resource.isActive, "Resource is not active");
        require(resource.quantityAvailable >= _amount, "Not enough quantity available");
        require(resource.owner != msg.sender, "Cannot claim your own resource");

        // Update resource
        resource.quantityAvailable -= _amount;
        resource.claimers.push(msg.sender);
        resource.claimedAmounts.push(_amount);

        // Create claim record
        Claim memory newClaim = Claim({
            resourceId: _resourceId,
            claimer: msg.sender,
            amount: _amount,
            timestamp: block.timestamp,
            isCompleted: false,
            isCancelled: false
        });

        resourceClaims[_resourceId].push(newClaim);

        // Auto-deactivate if no quantity left
        if (resource.quantityAvailable == 0) {
            resource.isActive = false;
        }

        emit ResourceClaimed(_resourceId, msg.sender, _amount, block.timestamp);
    }

    // Mark claim as completed (by resource owner)
    function completeClaim(uint256 _resourceId, uint256 _claimIndex) public onlyResourceOwner(_resourceId) {
        require(_claimIndex < resourceClaims[_resourceId].length, "Claim does not exist");

        Claim storage claim = resourceClaims[_resourceId][_claimIndex];
        require(!claim.isCompleted, "Claim already completed");
        require(!claim.isCancelled, "Claim was cancelled");

        claim.isCompleted = true;

        emit ClaimCompleted(_resourceId, _claimIndex, claim.claimer);
    }

    // Cancel a claim (by claimer or resource owner)
    function cancelClaim(uint256 _resourceId, uint256 _claimIndex) public {
        require(_resourceId < numberOfResources, "Resource does not exist");
        require(_claimIndex < resourceClaims[_resourceId].length, "Claim does not exist");

        Claim storage claim = resourceClaims[_resourceId][_claimIndex];
        Resource storage resource = resources[_resourceId];

        require(
            claim.claimer == msg.sender || resource.owner == msg.sender,
            "Only claimer or resource owner can cancel"
        );
        require(!claim.isCompleted, "Cannot cancel completed claim");
        require(!claim.isCancelled, "Claim already cancelled");

        claim.isCancelled = true;

        // Return quantity to available
        resource.quantityAvailable += claim.amount;

        // Reactivate resource if it was deactivated
        if (!resource.isActive && resource.quantityAvailable > 0) {
            resource.isActive = true;
        }

        emit ClaimCancelled(_resourceId, _claimIndex, claim.claimer);
    }

    // Deactivate a resource (by owner)
    function deactivateResource(uint256 _resourceId) public onlyResourceOwner(_resourceId) {
        Resource storage resource = resources[_resourceId];
        require(resource.isActive, "Resource is already inactive");

        resource.isActive = false;

        emit ResourceDeactivated(_resourceId, msg.sender);
    }

    // Reactivate a resource (by owner)
    function reactivateResource(uint256 _resourceId) public onlyResourceOwner(_resourceId) {
        Resource storage resource = resources[_resourceId];
        require(!resource.isActive, "Resource is already active");
        require(resource.quantityAvailable > 0, "No quantity available to reactivate");

        resource.isActive = true;

        emit ResourceReactivated(_resourceId, msg.sender);
    }

    // Get all resources
    function getResources() public view returns (Resource[] memory) {
        Resource[] memory allResources = new Resource[](numberOfResources);

        for (uint256 i = 0; i < numberOfResources; i++) {
            allResources[i] = resources[i];
        }

        return allResources;
    }

    // Get active resources only
    function getActiveResources() public view returns (Resource[] memory) {
        // First pass: count active resources
        uint256 activeCount = 0;
        for (uint256 i = 0; i < numberOfResources; i++) {
            if (resources[i].isActive) {
                activeCount++;
            }
        }

        // Second pass: collect active resources
        Resource[] memory activeResources = new Resource[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < numberOfResources; i++) {
            if (resources[i].isActive) {
                activeResources[index] = resources[i];
                index++;
            }
        }

        return activeResources;
    }

    // Get resources by owner
    function getResourcesByOwner(address _owner) public view returns (uint256[] memory) {
        uint256[] memory tempResourceIds = new uint256[](numberOfResources);
        uint256 count = 0;

        for (uint256 i = 0; i < numberOfResources; i++) {
            if (resources[i].owner == _owner) {
                tempResourceIds[count] = i;
                count++;
            }
        }

        uint256[] memory resourceIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            resourceIds[i] = tempResourceIds[i];
        }

        return resourceIds;
    }

    // Get resources by category
    function getResourcesByCategory(string memory _category) public view returns (Resource[] memory) {
        // First pass: count matching resources
        uint256 matchCount = 0;
        for (uint256 i = 0; i < numberOfResources; i++) {
            if (
                keccak256(bytes(resources[i].category)) == keccak256(bytes(_category)) &&
                resources[i].isActive
            ) {
                matchCount++;
            }
        }

        // Second pass: collect matching resources
        Resource[] memory matchingResources = new Resource[](matchCount);
        uint256 index = 0;

        for (uint256 i = 0; i < numberOfResources; i++) {
            if (
                keccak256(bytes(resources[i].category)) == keccak256(bytes(_category)) &&
                resources[i].isActive
            ) {
                matchingResources[index] = resources[i];
                index++;
            }
        }

        return matchingResources;
    }

    // Get claims for a resource
    function getResourceClaims(uint256 _resourceId) public view returns (Claim[] memory) {
        return resourceClaims[_resourceId];
    }

    // Get user's claims across all resources
    function getUserClaims(address _user) public view returns (
        uint256[] memory resourceIds,
        uint256[] memory amounts,
        uint256[] memory timestamps,
        bool[] memory completionStatus
    ) {
        // First pass: count total claims
        uint256 totalClaims = 0;
        for (uint256 i = 0; i < numberOfResources; i++) {
            Claim[] memory claims = resourceClaims[i];
            for (uint256 j = 0; j < claims.length; j++) {
                if (claims[j].claimer == _user && !claims[j].isCancelled) {
                    totalClaims++;
                }
            }
        }

        // Second pass: collect claim data
        resourceIds = new uint256[](totalClaims);
        amounts = new uint256[](totalClaims);
        timestamps = new uint256[](totalClaims);
        completionStatus = new bool[](totalClaims);
        uint256 index = 0;

        for (uint256 i = 0; i < numberOfResources; i++) {
            Claim[] memory claims = resourceClaims[i];
            for (uint256 j = 0; j < claims.length; j++) {
                if (claims[j].claimer == _user && !claims[j].isCancelled) {
                    resourceIds[index] = i;
                    amounts[index] = claims[j].amount;
                    timestamps[index] = claims[j].timestamp;
                    completionStatus[index] = claims[j].isCompleted;
                    index++;
                }
            }
        }

        return (resourceIds, amounts, timestamps, completionStatus);
    }

    // Get platform statistics
    function getResourceStats() public view returns (
        uint256 totalResources,
        uint256 activeResources,
        uint256 totalClaims,
        uint256 completedClaims
    ) {
        totalResources = numberOfResources;
        activeResources = 0;
        totalClaims = 0;
        completedClaims = 0;

        for (uint256 i = 0; i < numberOfResources; i++) {
            if (resources[i].isActive) {
                activeResources++;
            }

            Claim[] memory claims = resourceClaims[i];
            for (uint256 j = 0; j < claims.length; j++) {
                if (!claims[j].isCancelled) {
                    totalClaims++;
                    if (claims[j].isCompleted) {
                        completedClaims++;
                    }
                }
            }
        }

        return (totalResources, activeResources, totalClaims, completedClaims);
    }

    // Verification functions
    function verifyDonor(address _donor) public onlyPlatformOwner {
        verifiedDonors[_donor] = true;
        emit DonorVerified(_donor);
    }

    function unverifyDonor(address _donor) public onlyPlatformOwner {
        verifiedDonors[_donor] = false;
        emit DonorUnverified(_donor);
    }

    function isDonorVerified(address _donor) public view returns (bool) {
        return verifiedDonors[_donor];
    }

    // Update verification status of existing resources when donor is verified
    function updateResourceVerificationStatus(uint256 _resourceId) public {
        require(_resourceId < numberOfResources, "Resource does not exist");
        resources[_resourceId].isVerified = verifiedDonors[resources[_resourceId].owner];
    }
}

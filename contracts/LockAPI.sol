import "./Disposable.sol";
import "./PolicyDecision.sol";

/// @title LockAPIBase
/// @author Andrew Hall
/// @notice Lock API Base Contract 
contract LockAPIBase is Disposable{
    
    uint8 DEMAND_ACCESS_0 = 0;
    uint8 DEMAND_ACCESS_1 = 1;
    uint8 DEMAND_ACCESS_2 = 2;
    uint8 DEMAND_ACCESS_3 = 3;
    
    PolicyDecisionBase policyDecisionPoint;
    LogService logger;
    
    /// @notice requireAuthorisation Policy Enforcement Point Definition
    /// @param subject requesting access
    /// @param resource access is requested for
    /// @param accessRequired minimal access level for the resource
    modifier requireAuthorisation(address subject, address resource, uint8 accessRequired){ 
       bool isAuthorised = policyDecisionPoint.IsAuthorised(subject, resource, accessRequired);
       if(!isAuthorised) { return; } _
    }
    
    /// @notice LockAPIBase Constructor Function
    /// @param pdp used to run access policy rules
    /// @param eventLogger used to record access events
    function LockAPIBase(PolicyDecisionBase pdp, LogService eventLogger){
        policyDecisionPoint = pdp;
        logger = eventLogger;
    }
    
    /// @notice setPolicyDecisionPoint updates the PDP address
    /// @param pdp used to run access policy rules
    /// @return boolean
    function setPolicyDecisionPoint(PolicyDecisionBase pdp) returns (bool result){
        policyDecisionPoint = pdp;  
        result = true;
    }

    /// @notice getPolicyDecisionPoint returns the PDP address
    /// @return PolicyDecisionBase used to run access policy rules
    function getPolicyDecisionPoint() returns (PolicyDecisionBase result){
        result = policyDecisionPoint;
    }

    /// @notice setLogger returns the PDP address
    /// @param eventLogger sets the address of the logging service
    /// @return boolean
    function setLogger(LogService eventLogger) returns (bool result){
        logger = eventLogger;  
        result = true;
    }

    /// @notice getLogger returns the PDP address
    /// @return PolicyDecisionBase used to run access policy rules
    function getLogger() returns (LogService result){
        result = logger;
    }    
    
}

/// @title LockAPI 
/// @author Andrew Hall
/// @notice Lock API Contract Derives from LockAPIBase
contract LockAPI is LockAPIBase(){
    
    struct identityAttributes{
        address owner;
        bytes32 title;
        bytes32 model;
        bytes32 description;
        bool    isLocked;
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // Map of Device address to Attributes (1-1)
    ////////////////////////////////////////////////////////////////////////////
    mapping(address=>identityAttributes) public lockAttrs;
    mapping(address=>bool) public lockAttrsSet;
    
    ////////////////////////////////////////////////////////////////////////////
    // Map of Device address to Owner Address (1-1)
    ////////////////////////////////////////////////////////////////////////////
    mapping(address=>address) public lockOwner;
    
    ////////////////////////////////////////////////////////////////////////////
    // Map of Owner to Device Address (1-n)
    ////////////////////////////////////////////////////////////////////////////
    mapping(address=>address[]) public ownerLock;
    
    ////////////////////////////////////////////////////////////////////////////
    // Map of Owner to Device Address Count
    ////////////////////////////////////////////////////////////////////////////
    mapping(address=>uint) public ownerLockCount;

    /// @notice LockAPI Constructor Function, Calls Base Constructor
    /// @param pdp sets the address of the Policy Decision Point service
    /// @param logger sets the address of the logging service
    function LockAPI(PolicyDecisionBase pdp, LogService logger) LockAPIBase(pdp,logger){}
    
    /// @notice Register A New Device
    /// @notice Uses requireAuthorisation Policy Enforcement Point
    /// @param identity device address
    /// @param title device title
    /// @param model device model
    /// @param description device description
    /// @param isLocked device lock status
    /// @return boolean 
    function Register(address identity, bytes32 title, bytes32 model, bytes32 description, bool isLocked) requireAuthorisation(msg.sender, identity, DEMAND_ACCESS_1) returns(bool result){
        
        bool exists = lockAttrsSet[identity];
        if(!exists){
           identityAttributes memory newIdentity = identityAttributes(msg.sender,title,model,description,isLocked);
           lockAttrs[identity] = newIdentity;
           lockAttrsSet[identity]=true;
           lockOwner[identity] = msg.sender;
           ownerLock[msg.sender].push(identity);
           ownerLockCount[msg.sender]++;
           result = true;
           return;
        }
        
        identityAttributes storage currentIdentity = lockAttrs[identity];
        currentIdentity.title=title;
        currentIdentity.model=model;
        currentIdentity.description=description;
        currentIdentity.isLocked=isLocked;
        result=true;
    }
    
    /// @notice Transfer Ownership of a Device
    /// @notice Uses requireAuthorisation Policy Enforcement Point
    /// @param identity of device
    /// @param newOwner address of the new owner
    /// @return boolean 
    function Transfer(address identity, address newOwner) requireAuthorisation(msg.sender, identity, DEMAND_ACCESS_2) returns (bool result){
        address oldOwner = lockOwner[identity];
        lockOwner[identity] = newOwner;
        ownerLock[newOwner].push(identity);
        lockAttrs[identity].owner=newOwner;
        address[] oldOwnerItems = ownerLock[oldOwner];
        bool done = false;
        
        for(uint i=0; i < oldOwnerItems.length; i++ ){
            if(oldOwnerItems[i] == identity){
                for(uint j = i; j < oldOwnerItems.length-1; j++){
                    if(j+1 <= oldOwnerItems.length-1){
                       oldOwnerItems[j]=oldOwnerItems[j+1];
                    }
                }
                delete oldOwnerItems[oldOwnerItems.length-1];
                oldOwnerItems.length--;
                done=true;
                break;
            }
            if(done) break;
        }
        
        ownerLockCount[oldOwner]--;
        ownerLockCount[newOwner]++;
        result=true;
    
    }
    
    /// @notice Lock Sets the Lock Status 
    /// @notice Uses requireAuthorisation Policy Enforcement Point
    /// @param resource address of device
    /// @return boolean 
    function Lock(address resource) requireAuthorisation(msg.sender, resource, DEMAND_ACCESS_1) returns (bool result){
        identityAttributes storage record = lockAttrs[resource];
        record.isLocked=true;
        logger.LogLocked("LockAPI",msg.sender,resource,"Locked Successfully");
        result=true;
    }
    
    /// @notice UnLock Sets the Lock Status 
    /// @notice Uses requireAuthorisation Policy Enforcement Point
    /// @param resource address of device
    /// @return boolean 
    function Unlock(address resource) requireAuthorisation(msg.sender, resource, DEMAND_ACCESS_1) returns (bool result){
        identityAttributes storage record = lockAttrs[resource];
        record.isLocked=false;
        logger.LogUnlocked("LockAPI",msg.sender,resource,"Unlocked Successfully");
        result = true;
    }
    
}

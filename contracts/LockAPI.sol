import "./Disposable.sol";
import "./PolicyDecision.sol";

contract LockAPIBase is Disposable{
    
    PolicyDecisionBase policyDecisionPoint;
    
    ////////////////////////////////////////////////////////////////////////////
    // Policy Enforcement Points
    ////////////////////////////////////////////////////////////////////////////
    modifier requireAuthorisation(address subject, address resource){ 
       bool isAuthorised = policyDecisionPoint.IsAuthorised(subject, resource);
       if(!isAuthorised) { return; } _
    }
    
    function LockAPIBase(PolicyDecisionBase pdp){
        policyDecisionPoint = pdp;
    }
    
    function setPolicyDecisionPoint(PolicyDecisionBase pdp) returns (bool result){
        policyDecisionPoint = pdp;  
        result = true;
    }
    
}

contract LockAPI is LockAPIBase(){
    
    struct identityAttributes{
        bytes32 title;
        bytes32 model;
        bytes32 description;
        bool    isLocked;
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // Map of Device address to Attributes (1-1)
    ////////////////////////////////////////////////////////////////////////////
    mapping(address=>identityAttributes) public lockAttrs;
    
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
    
    function LockAPI(PolicyDecisionBase pdp) LockAPIBase(pdp){}
    
    function Register(address identity, bytes32 title, bytes32 model, bytes32 description, bool isLocked) returns(bool result){
        
        identityAttributes memory newIdentity = identityAttributes(title,model,description,isLocked);
        lockAttrs[identity] = newIdentity;
        lockOwner[identity] = msg.sender;
        ownerLock[msg.sender].push(identity);
        ownerLockCount[msg.sender]++;
        result = true;
    }
    
    function Transfer(address identity, address newOwner) returns (bool result){
        address oldOwner = lockOwner[identity];
        lockOwner[identity] = newOwner;
        ownerLock[newOwner].push(identity);
        
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
    
    function Lock(address resource) requireAuthorisation(msg.sender, resource) returns (bool result){
        identityAttributes storage record = lockAttrs[resource];
        record.isLocked=true;
        result=true;
    }
    
    function Unlock(address resource) requireAuthorisation(msg.sender, resource) returns (bool result){
        identityAttributes storage record = lockAttrs[resource];
        record.isLocked=false;
        result = true;
    }
    
}
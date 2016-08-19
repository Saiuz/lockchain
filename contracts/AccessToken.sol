
import "./Disposable.sol";

contract AccessToken is Disposable{
    
    address public issuedFor;
    address public issuedTo;
    uint    public issueDate;
    uint    public beginDate;
    uint    public expiryDate;
    uint8   public accessLevel;

    function AccessToken(address subject, address resource, uint startDate, uint endDate, uint8 access){
        issuedFor=resource;
        issuedTo = subject;
        beginDate = startDate;
        expiryDate = endDate;
        issueDate = now;
        accessLevel=access;
    }
    
    function Expire() returns (bool result){
        expiryDate = now;
        result = true;
    }
    
    function Serialize() constant returns (address subject, address resource, uint startDate, uint endDate, uint8 access){
        subject=issuedTo;
        resource=issuedFor;
        startDate=beginDate; 
        endDate= expiryDate; 
        access=accessLevel;
    }
    
    function Update(uint newStartDate, uint newEndDate, uint8 access) returns (bool result){
        beginDate = newStartDate;
        expiryDate = newEndDate;
        issueDate = now;
        accessLevel = access; 
        result = true;
    }

    function IsActive() constant returns (bool result){
        if(beginDate == 0 && expiryDate == 0) return true; 
        if(beginDate == 0 && expiryDate > now) return true;
        if(beginDate < now && expiryDate == 0) return true;
        if(beginDate < now && expiryDate > now) return true;
        return false;
    }
}

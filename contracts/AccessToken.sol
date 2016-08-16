
import "./Disposable.sol";

contract AccessToken is Disposable{
    
    address public issuedFor;
    address public issuedTo;
    uint    public issueDate;
    uint    public beginDate;
    uint    public expiryDate;
    bool    public isExpired;
    
    function AccessToken(address subject, address resource, uint startDate, uint endDate){
        issuedFor=resource;
        issuedTo = subject;
        beginDate = startDate;
        expiryDate = endDate;
        issueDate = now;
    }
    
    function Expire() returns (bool result){
        expiryDate = now;
        isExpired=true;
        result = isExpired;
    }
    
    function Serialize() constant returns (address subject, address resource, uint startDate, uint endDate){
        subject=issuedTo;
        resource=issuedFor;
        startDate=beginDate; 
        endDate= expiryDate; 
    }
    
    function Update(uint newStartDate, uint newEndDate) returns (bool result){
        beginDate = newStartDate;
        expiryDate = newEndDate;
        issueDate = now;
        result = true;
    }
}

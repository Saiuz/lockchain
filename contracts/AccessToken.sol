
import "./Disposable.sol";

/// @title Access Token
/// @author Andrew Hall
/// @notice Custom Token describing a capabilities assigned to subjects
contract AccessToken is Disposable{
    
    address public issuedFor;
    address public issuedTo;
    uint    public issueDate;
    uint    public beginDate;
    uint    public expiryDate;
    uint8   public accessLevel;

    /// @notice AccessToken Constructor Function
    /// @param subject The address of subject owning the resource
    /// @param resource Address of Resource this token applies to
    /// @param startDate Start date for Access (0 denotes no restriction)
    /// @param endDate End Date for Active (0 denotes no restruction)
    /// @param access Access Level To Grant
    function AccessToken(address subject, address resource, uint startDate, uint endDate, uint8 access){
        issuedFor=resource;
        issuedTo = subject;
        beginDate = startDate;
        expiryDate = endDate;
        issueDate = now;
        accessLevel=access;
    }
    
    /// @notice Expire Places an end date on the token
    /// @return Boolean Result
    function Expire() returns (bool result){
        expiryDate = now;
        result = true;
    }
    
    /// @notice Serialize Returns the token data 
    /// @return subject The address of subject owning the resource
    /// @return resource Address of Resource this token applies to
    /// @return startDate Start date for Access (0 denotes no restriction)
    /// @return endDate End Date for Active (0 denotes no restruction)
    /// @return access Access Level To Grant
    function Serialize() constant returns (address subject, address resource, uint startDate, uint endDate, uint8 access){
        subject=issuedTo;
        resource=issuedFor;
        startDate=beginDate; 
        endDate= expiryDate; 
        access=accessLevel;
    }
    
    /// @notice Update - Updates the start, end date and access level of a token
    /// @param newStartDate Start date for Access (0 denotes no restriction)
    /// @param newEndDate End Date for Active (0 denotes no restruction)
    /// @param access Access Level To Grant
    /// @return result boolean
    function Update(uint newStartDate, uint newEndDate, uint8 access) returns (bool result){
        beginDate = newStartDate;
        expiryDate = newEndDate;
        issueDate = now;
        accessLevel = access; 
        result = true;
    }

    /// @notice IsActive  
    /// @return result (true if token is active)
    function IsActive() constant returns (bool result){
        if(beginDate == 0 && expiryDate == 0) return true; 
        if(beginDate == 0 && expiryDate > now) return true;
        if(beginDate < now && expiryDate == 0) return true;
        if(beginDate < now && expiryDate > now) return true;
        return false;
    }
}

import "./Disposable.sol";
import "./AccessToken.sol";
import "./LogService.sol";

contract TokenIssuer is Disposable{
    
    modifier requireAuthorisation(address subject, address resource, uint8 accessRequired){ 
       bool isAuthorised = IsAuthorised(subject, resource, accessRequired);
       if(!isAuthorised) { return; } _
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // Mapping Subject=>Resource=>Tokens
    // One Subject Has Many Resources and Each Resource Has One Token
    ////////////////////////////////////////////////////////////////////////////
    mapping(address=>mapping(address=>AccessToken)) tokenStore;
    
    ////////////////////////////////////////////////////////////////////////////
    // Data structure for Iteration
    ////////////////////////////////////////////////////////////////////////////
    mapping(address=>address[]) subjectResources;
    mapping(address=>address[]) resourceSubjects;
    
    ////////////////////////////////////////////////////////////////////////////
    // Logging Service
    ////////////////////////////////////////////////////////////////////////////
    LogService logger;
    
    ////////////////////////////////////////////////////////////////////////////
    // Constructor Function
    ////////////////////////////////////////////////////////////////////////////
    function TokenIssuer(LogService logService){
        logger = logService;
    }
    
    ////////////////////////////////////////////////////////////////////////
    // If Access Token Contract Already Exists Edit It
    // Otherwise Create a New Contract and Store It In The Mapping
    // Add The Resource Address To The List Of Subject Resources
    ////////////////////////////////////////////////////////////////////////
    function Grant(address subject, address resource, uint startDate, uint endDate, uint8 access) requireAuthorisation(msg.sender,resource,2) returns (address result){
    
        AccessToken token = AccessToken(tokenStore[subject][resource]);
        if(address(token)==0x0){
            token = new AccessToken(subject, resource, startDate, endDate, access);
            tokenStore[subject][resource] = token;
            subjectResources[subject].push(resource);
            resourceSubjects[resource].push(subject);
        }
        else{
            token.Update(startDate,endDate, access);
        }
        logger.LogPolicyGranted("Policy",subject,resource,msg.sender,"Policy Granted");
        result = token;
    }
    
    ////////////////////////////////////////////////////////////////////////
    // If Access Token Contract Exists For The Resource Against The
    // Subject Kill The Contract And Remove It From Mapping And Remove
    // The Resource Address from the List Of Subject Resources
    ////////////////////////////////////////////////////////////////////////
    function Revoke(address subject, address resource) requireAuthorisation(msg.sender,resource,2) returns (bool result){
        AccessToken token = AccessToken(tokenStore[subject][resource]);
        if(address(token)==0x0) return false;
        var (issuedTo, issuedFor, startDate, endDate, access) = token.Serialize();
        if(issuedTo == subject && issuedFor == resource){
            token.Kill();
            tokenStore[subject][resource] = AccessToken(0x0);
            RemoveResourceForSubject(subject,resource);
            RemoveSubjectForResource(resource,subject);
            logger.LogPolicyRevoked("Policy",subject,resource,msg.sender,"Policy Revoked");
            result = true;
            return;
        }
        result=false;
    }
    
    ////////////////////////////////////////////////////////////////////////
    // Serialise the access token allocated to the given subject for 
    // the given Resource
    ////////////////////////////////////////////////////////////////////////
    function GetToken(address subject, address resource) constant returns (address issuedTo, address issuedFor, uint startDate, uint endDate, uint access){
        AccessToken token = AccessToken(tokenStore[subject][resource]);
        if(address(token)==0x0) return;
        (issuedTo, issuedFor, startDate, endDate, access) = token.Serialize();
    }
    
    ////////////////////////////////////////////////////////////////////////
    // Get All The Resource Tokens Allocated To A Given Subject 
    // Returns List Of Resources Addresses That Can Be Used In Conjunction
    // With GetToken
    ////////////////////////////////////////////////////////////////////////
    function GetTokensForSubject(address subject) constant returns(address[] result){
        result=subjectResources[subject];
    }
    
    ////////////////////////////////////////////////////////////////////////
    // Get All The Resource Tokens Allocated To A Given Subject 
    // Returns List Of Resources Addresses That Can Be Used In Conjunction
    // With GetToken
    ////////////////////////////////////////////////////////////////////////
    function GetTokensForResource(address resource) constant returns(address[] result){
        result=resourceSubjects[resource];
    }
    
    ////////////////////////////////////////////////////////////////////////
    // Get All The Resource Tokens Allocated To A Given Subject 
    // Returns List Of Resources Addresses That Can Be Used In Conjunction
    // With GetToken
    ////////////////////////////////////////////////////////////////////////
    function HasTokensForResource(address subject, address resource) constant returns(bool result){
        address[] memory subjectItems = GetTokensForResource(resource);
        result=(subjectItems.length > 0);
    }
    
    ////////////////////////////////////////////////////////////////////////
    // Helper Function To Remove An Element From The Subject Resource
    // Array Coresponsing To A Particular Resource For The Subject
    ////////////////////////////////////////////////////////////////////////
    function RemoveResourceForSubject(address subject, address resource) private returns (address[] result){
        
        address[] resourceItems = subjectResources[subject];
        
        for(uint i=0; i < resourceItems.length; i++){
            if(resourceItems[i]==resource){
                for(uint j=i; j < resourceItems.length-1; j++){
                    if(j+1 <= resourceItems.length-1){
                       resourceItems[j]=resourceItems[j+1];
                    }
                }
                delete resourceItems[resourceItems.length-1];
                resourceItems.length--;
                result=subjectResources[subject];
                return;
            }
        }
        result=subjectResources[subject];
    }
    
    ////////////////////////////////////////////////////////////////////////
    // Helper Function To Remove An Element From The Subject Resource
    // Array Coresponsing To A Particular Resource For The Subject
    ////////////////////////////////////////////////////////////////////////
    function RemoveSubjectForResource(address resource, address subject) private returns (address[] result){
        
        address[] subjectItems = resourceSubjects[resource];
        
        for(uint i=0; i < subjectItems.length; i++){
            if(subjectItems[i]==subject){
                for(uint j=i; j < subjectItems.length-1; j++){
                    if(j+1 <= subjectItems.length-1){
                       subjectItems[j]=subjectItems[j+1];
                    }
                }
                delete subjectItems[subjectItems.length-1];
                subjectItems.length--;
                result=resourceSubjects[resource];
                return;
            }
        }
        result=resourceSubjects[resource];
    }
    
    ////////////////////////////////////////////////////////////////////////
    // Authorisation Rules
    // GRANT msg.sender Must Be A Device Owner and must have token grant rights
    // REVOKE msg.sender Must Be A Device Owner and have token revoke rights
    // Subject = Requester (msg.sender)
    // Resource = Object to manage access for
    ////////////////////////////////////////////////////////////////////////    
    function IsAuthorised(address subject, address resource, uint8 required) constant returns(bool result){
        
        var (issuedTo, issuedFor, startDate, endDate, access) = GetToken(subject,resource);
        
        // Check If Resource Is New - if so then there is no policy to check
        // and the user is setting up something new and becoming the owner
        if(!HasTokensForResource(subject,resource)){
            result=true;
            return;
        }
        
        if(issuedTo != subject || issuedFor != resource){
            logger.LogAccessDenied("PDP",subject,resource);
            return false;
        }
        if(access < required){
            logger.LogAccessDenied("PDP",subject,resource);
            return false;
        }
        if(startDate != 0 && startDate > now){
            logger.LogAccessDenied("PDP",subject,resource);
            return false;
        }
        if(endDate != 0 && endDate < now){
            logger.LogAccessDenied("PDP",subject,resource);
            return false;
        }
        logger.LogAccessGranted("PDP",subject,resource);
        return true;
    }
    
}

#Lockchain

This project is a demonstration access management framework built using Ethereum smart contracts for Ethereum smart contracts. This project was built using the Ethereum development and test framework Truffle. Whilst
it is possible to manually create and deploy this code manually following instructions provided in the Ethereum
documentation Truffle provides a simpler way to get started.

This software requires access to an Ethereum blockchain network. For simple testing purposes the simplest setup
is to use TESTRPC which creates an in memory blockchain. Mining in this network is faster. TESTRPC permits creation of accounts with test ether avoiding the need to acquire test or real funds. To deploy contracts to
alternative networks the migration scripts will need to be changed to incorporate deployment environmanet parameters



##1. Pre Requisites
Windows, Linux or MacOS running a Git client and NodeJS 5.0+


##2. Installation

Install TESTRPC

    npm install -g ethereumjs-testrpc

Install Truffle
    
    npm install -g truffle

##3. Installing the application

In a new command shell clone the Lockchain repository into the desired folder
	
	mkdir lockchain
	cd lockchain
	git clone https://github.com/ah903/lockchain.git

##4. Starting the Blockchain
In a new command shell run 
	```
	testrpc -a5 -d
	```
This creates five test accounts using a determinstic generation scheme meaning the same accounts are created each time the testrpc is started and stopped. The blockchain node starts.

To stop the blockchain node type ```ctrl-c```

##5. Deploying the application contracts##
The smart contract source code is included in the git repository. To deploy these contracts to the running TESTRPC instance:

* Ensure the TESTRPC instance is running

* From a new command shell window type
    ```truffle migrate```

This command runs the deployment scripts in the migrations folder. The contracts are mined into the blockchain



##6. Starting the application##

The applcation may now be started. This can be served by any web server but the most convenient way to start the application is by running
	
	
	truffle build
	truffle serve 

The application will be served by default at http://localhost:8080


##7. Troubleshooting##
   * **How do I change the port the application is served on?**
   
   Application port may be changed through the -p parameter
   
   ```truffle serve -p 8000```   	
	
   * **How do I run the unit test suite?**
   
   It is recommended that the TESTRPC process is restarted before running the test suite to start from a clean state. To execute the mocha test suite run 
   
   ```truffle test```
   
   Note execution of the test suite recompiles and reploys contracts using the migration script as described in step 4


##8. Useful Documentation

**TESTRPC**

https://github.com/ethereumjs/testrpc

**Truffle Read The Docs**

https://truffle.readthedocs.io/en/latest/

**Ethereum Contract Deployment**

https://ethereum.gitbooks.io/frontier-guide/content/creating_contract.html
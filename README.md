# NodeJS Secure Authentication Implementations
## PROJECT UNDER CONSTRUCTION
 Secure Authentication implementation for JWT and Session methods using cookies as a storage mechanism<br>
 Projects could be run with NodeJS and verified with POSTMAN (Ready POSTMAN collections under "postman" folder).<br>
 
 ## Session-based authentication
 ### Login
 - [X] Move to DB
 - [X] Add hashing of passwords
 - [ ] Add different roles (added, but not used anywhere)
 ### Access protected page with POST
 - [ ] Maybe move the verification of session to another function.
 - [ ] Get some data from db?
 ### Refresh access token with POST
 Done<br>
 ### Logout page with POST
 Done<br>
 
 ## JWT
 ### Login
 - [x] Add different roles
 - [x] Move to DB
 - [X] Move database variables to .env file 
 - [X] Add hashing of passwords
 - [ ] Decide upon adding password hash to secret 
 ### Access protected page with POST
 - [ ] Maybe move the verification of token to another function.<br>
 ### Refresh access token with POST
 - [ ] Decide upon refresh token renewal
 - [ ] Current logic to take username from refresh token, probably should be rewritten
 - [ ] Maybe store accesstoken id in refreshtoken?
 ### Logout page with POST
 - [X] Implement secret revocation
 - [ ] Decide upon refresh tokens storaging

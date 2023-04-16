# NodeJS Secure Authentication Implementations
## PROJECT UNDER CONSTRUCTION
 Secure Authentication implementation for JWT and Session methods using cookies as a storage mechanism<br>
 Projects could be run with NodeJS and verified with POSTMAN (Ready POSTMAN collections under "postman" folder).<br>
 
 ## Session-based authentication
 ### Login
 - [ ] Add different roles<br>
 - [ ] Move to DB<br>
 ### Access protected page with POST
 - [ ] Maybe move the verification of session to another function.<br>
 ### Refresh access token with POST
 Done<br>
 ### Logout page with POST
 Done<br>
 
 ## JWT
 ### Login
 - [x] Add different roles<br>
 - [x] Move to DB<br>
 - [ ] Think how to make dynamic secrets<br>
 ### Access protected page with POST
 - [ ] Maybe move the verification of token to another function.<br>
 ### Refresh access token with POST
 - [ ] Decide upon refresh token renewal<br>
 - [ ] Current logic to take username from refresh token, probably should be rewritten<br>
 - [ ] Maybe store accesstoken id in refreshtoken?<br>
 ### Logout page with POST
 - [ ] Create secure logout (secret revocation, adding db with revoked tokens)

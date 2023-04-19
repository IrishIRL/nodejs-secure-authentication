# NodeJS Secure Authentication Implementations
## PROJECT UNDER CONSTRUCTION
 Secure Authentication implementation for JWT and Session methods using cookies as a storage mechanism<br>
 Projects could be run with NodeJS and verified with POSTMAN (Ready POSTMAN collections under "postman" folder).<br>
 
 ## Session-based authentication
 ### Login
 - [X] Move to DB
 - [X] Add hashing of passwords
 - [ ] Add different groups (not currently in use, are they even needed?)
 ### Access protected page with POST
 - [ ] Maybe move the verification of session to another function.
 - [ ] Get some data from db?
 ### Refresh access token with POST
 - [ ] Decide upon where to store sessions?
 ### Logout page with POST
 Done<br>
 
 ## JWT
 ### Login
 - [x] Add different groups
 - [x] Move to DB
 - [X] Move database variables to .env file 
 - [X] Add hashing of passwords
 - [ ] Decide upon adding password hash to secret 
 ### Access protected page
 - [ ] Maybe move the verification of token to another function
 ### Refresh access token
 - [X] Decide upon refresh token renewal
 - [X] Current logic to take username from refresh token, probably should be rewritten
 - [X] Final decision: refreshToken is now uuid and saved in DB
 ### Logout page
 - [X] Implement secret revocation
 - [X] Decide and implement upon refresh tokens storaging
 ### Other
 - [ ] refreshToken DB has expiration dates of tokens, they should be cleared when time comes
 - [X] Enhance visual part of the code, too many repetative queries.
 - [ ] Further enhance visual part of the code. 
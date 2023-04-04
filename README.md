# PROJECT UNDER CONSTRUCTION
 Secure Authentication implementation for JWT and Session methods using cookies as a storage mechanism<br>

 ## JWT
 Currently there is only backend, so here are the commands to use for JWT auth

### Login
#### Login with GET
http://localhost:3332/login?username=myusername&password=mypassword

#### Login with POST 
TODO: change login to POST
```curl --request POST \
  --url http://localhost:3332/login \
  --header 'Content-Type: application/json' \
  --data '{
    "username": "myusername",
    "password": "mypassword"
}'
```

### Access protected page with POST
```
curl -X POST http://localhost:3332/protected -H "Authorization: Bearer <access_token>"
```

### Refresh access token with POST
TODO: Refresh both tokens, currently only AccessToken is refreshed
```
curl -X POST http://localhost:3332/refresh -H 'Content-Type: application/json' -H 'Cookie: refreshToken=<your-refresh-token>'
```

### Logout page with POST
TODO: Remove both tokens<br>
TODO: Add the logout tokens to DB or change secret

```
curl -X POST http://localhost:3332/logout -H 'Content-Type: application/json' -H 'Cookie: refreshToken=<your-refresh-token>'
```
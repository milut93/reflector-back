# reflector
Reflector application  for sports news

## Init Database


In the project directory, you can run:

First clear hole database in file: src/index.ts : <br/>
Change flag drop on true in line :      
### `await initSequelize('test', true)`

When init is finish return flag drop to false.

### `npm start`

Wait for few moments for init test data.

Open [http://localhost:4000/graphql](http://localhost:4000/graphql) to view it in the browser. <br/>
You  can see all database structure with Models and Types, also you can test queries and mutations.



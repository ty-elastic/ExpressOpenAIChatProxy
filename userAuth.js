// user-auth.js

import { ADMIN_PASSWORD } from "./config.js";

const users = [
    { username: 'admin', password: ADMIN_PASSWORD },
    // Add more users as needed
  ];
  
export const  userAuth  = {
    findUserByUsername: (username) => users.find((user) => user.username === username),
    isValidPassword: (user, password) => user && user.password === password,
  };
  
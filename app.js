const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });

    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`server error is ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// register user
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  console.log(request.body);
  const hashPassword = await bcrypt.hash(request.body.password, 10);
  console.log(hashPassword);
  const postDetails = `SELECT  * FROM user WHERE username = '${username}'`;
  const getUser = await db.get(postDetails);
  console.log(getUser);
  if (getUser === undefined) {
    if (password.length >= 6) {
      const postNewUser = `INSERT INTO user (username,password,name,gender)
                            VALUES ('${username}','${hashPassword}','${name}','${gender}')`;
      await db.run(postNewUser);
      response.status(400);
      response.send("Password is too short");
    } else {
      response.status(200);
      response.send(" User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// login user
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUsername = `SELECT  * FROM user WHERE username = '${username}'`;
  const getUserDetails = await db.get(getUsername);
  console.log(getUserDetails);

  if (getUserDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const matchedPassword = await bcrypt.compare(
      password,
      getUserDetails.password
    );
    console.log(password, getUserDetails.password);
    if (matchedPassword === true) {
      const payLoad = { username: username };
      const jwtToken = await jwt.sign(payLoad, "kapilkumar");
      response.status(200);
      response.send({ jwtToken: jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Authentication with JWT Token
const authenticateToken = (request, response, next) => {
  let myToken;
  const authToken = request.header("authorization");
  if (authToken !== undefined) {
    myToken = authToken.split(" ")[1];
    console.log(myToken);
  }
  if (myToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(myToken, "kapilkumar", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// FOR POST METHOD there is no need to add the Authorization . Once check your code and remove it.

// the latest tweets of people whom the user follows. Return 4 tweets at a time API 3

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  // const =
  const latestTweet = `SELECT username,tweet,date_time as dateTime FROM user LEFT JOIN tweet ORDER BY dateTIME ASC LIMIT 4 `;
  const getLatestTweet = await db.all(latestTweet);
  response.send(getLatestTweet);
});

// the list of all names of people whom the user follows API 4
app.get("/user/following/", authenticateToken, async (request, response) => {
  const followerTweet = `SELECT DISTINCT name FROM user LEFT JOIN follower WHERE user_id = follower_user_id`;
  const getFollowerTweet = await db.all(followerTweet);
  response.send(getFollowerTweet);
});

// the list of all names of people who follows the user API 5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  const followingTweet = `SELECT DISTINCT name FROM user LEFT JOIN follower WHERE user_id = following_user_id`;
  const getFollowingTweet = await db.all(followingTweet);
  response.send(getFollowingTweet);
});

// API 6
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;

  const tweetsQuery = `
  SELECT
  *
  FROM tweet
  WHERE tweet_id=${tweetId}
  `;

  const tweetResult = await db.get(tweetsQuery);
  console.log(tweetResult);
  const userFollowersQuery = `
  SELECT 
    *
  FROM follower INNER JOIN user on user.user_id = follower.following_user_id
  WHERE follower.follower_user_id = ${tweetResult.user_id};`;
  console.log(userFollowersQuery);
  const userFollowers = await db.all(userFollowersQuery);
  console.log(userFollowers);
  if (
    userFollowers.some((item) => item.following_user_id === tweetResult.user_id)
  ) {
    // user requests a tweet other than the users he is following
    response.status(401);
    response.send("Invalid Request");
  } else {
    //   If the user requests a tweet of the user he is following, return the tweet,
    //  likes count, replies count and date-time
    response.send(userFollowers);
  }
});

// a list of all tweets of the user  API 9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getListTweet = `SELECT tweet.tweet,reply.reply AS replies, date_time AS dateTime FROM tweet LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id`;
});

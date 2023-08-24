const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Post = mongoose.model("Post");
const bcrypt = require("bcryptjs"); //import of bcrypt
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../keys.js");
const authenticateUser = require("../middleware/logginCheck.js");

//Router to handle http request-post for signup
router.post("/signup", (req, res) => {
  // extract name,email and password  and req.body
  const { name, email, password } = req.body;
  if (!email || !password || !name) {
    return res
      .status(422)
      .json({ error: "Please add all parameter as required." });
  }
  //check if user already exist with same email id -in db

  User.findOne({ email: email }).then((savedUser) => {
    if (savedUser) {
      return res.status(422).json({
        error: "User is already exist in the Database with this email.",
      });
    }
    //if the user doesn't available in db, store the user in db with
    //create a new instance of the user object
    bcrypt
      .hash(password, 15)
      .then((hashpassword) => {
        const user = new User({
          email,
          password: hashpassword,
          name,
        });

        user
          .save()
          .then((user) => {
            res.json({ message: "Registration Sucessfully completed" });
          })
          .catch((error) => {
            console.log(error);
          });
      })
      .catch((error) => {
        console.log(error);
      });
  });
});

//Router to handle http request-post for sign
router.post("/signin", (req, res) => {
  //get the email id and password from req.body
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(422)
      .json({ error: "please include email id or password" });
  }
  User.findOne({ email: email })
    .then((savedUser) => {
      if (!savedUser) {
        return res
          .status(422)
          .json({ error: "Invalid email id and password." });
      }
      //compare logic
      //enter one password from req.body and another from db
      bcrypt
        .compare(password, savedUser.password)
        .then((doMatch) => {
          if (doMatch) {
            //get the user details from the database
            //create a JWT token as payload data with JWT_SECRET
            const token = jwt.sign({ _id: savedUser }, JWT_SECRET);
            const { _id, name, email } = savedUser;
            // res.json({msg:"Login Successfully..."});
            res.json({
              msg: "Login Successfull...",
              token: token,
              user: { _id, name, email },
            });
          } else {
            return res
              .status(422)
              .json({ error: "Invalid emailid or password." });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    })
    .catch((error) => {
      console.log(error);
    });
});

//

router.get("/user/:id", authenticateUser, async (req, res) => {
  try {
    //Find the user from db -> user, exclude password
    const user = await User.findOne({ _id: req.params.id }).select("-password");
    //no user found with that id, send 404
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    //Find all post by user with id
    const posts = await Post.find({ postedBy: req.params.id })
      .populate("postedBy", "_id name")
      .exec();

    //send the response
    res.json({ user, posts });
  } catch (error) {
    return res.status(422).json({ error: error.message });
  }
});

//create  a route to follow other user
router.put("/follow", authenticateUser, async (req, res) => {
  //first -> we have to know the id of the user whom we want to follow
  try {
    const followedUser = await User.findByIdAndUpdate(
      req.body.followId,
      {
        $push: { followers: req.user._id },
      },
      {
        new: true,
      }
    );

    //error
    if (err) {
      return res.status(422).json({ error: err });
    }

    //second -> we have to know the id of the user who is following
    const followingUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: { following: req.body.followId },
      },
      {
        new: true,
      }
    ).select("-password");

    //select response to user with updated information about a person they followed
    res.json(followedUser, followingUser);
  } catch (error) {
    return res.status(422).json({ error: err });
  }
});

//create a logic to unfollow user
router.put("/unfollow", authenticateUser, async (req, res) => {
  try {
    //first -> we have to know the id of the user whom we want to unfollow
    const unfollowUser = await User.findByIdAndUpdate(
      req.body.unFollowId,
      { $pull: { followers: req.user._id } },
      {
        new: true,
      }
    );
    //error
    if (err) {
      return res.status(422).json({ error: err });
    }

    const unfollowingUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pul: { following: req.body.unfollowId } },
      {
        new: true,
      }
    ).select("-password");

    //send a response to user about person they unfollowed.
    res.json(unfollowingUser);
  } catch (error) {
    return res.status(422).json({ error: error });
  }
});

//someone want to search a user -> route -> searchUser with user data
router.post("/searchUser", async (req, res) => {
  try {
    //create a regex pattern match the user query.
    let userpattern = new RegExp("^" + req.body.query);

    //search a user from User schema for user
    const users = await User.find({ email: { $regex: userpattern } });

    //send a response
    res.json({
      users,
    });
  } catch (error) {
    return res.status(422).json({error:err})
  }
});


module.exports = router;

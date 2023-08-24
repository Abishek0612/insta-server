const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authenticateUser = require("../middleware/logginCheck");
const Post = mongoose.model("Post");

//define a Get  route
router.get("/allpost", (req, res) => {
  Post.find()
    .populate("postedBy", "_id name")
    .populate("comments.postedBy", "_id name")
    .then((post) => {
      res.json({ post });
    })
    .catch((error) => {
      console.log(error);
    });
});

//Create an endpoints->createpost->
router.post("/createpost", authenticateUser, (req, res) => {
  //extract  the title body and photo from the req.body
  const { title, body, pic } = req.body;

  //check if all fields are present in req.body or not
  if (!title || !body || !pic) {
    return res.status(422).json({ error: "Please fill all the fields." });
  }
  //create a new POst instance with data
  //make password as undefined
  req.user.password = undefined;

  const post = new Post({
    title,
    body,
    photo: pic,
    postedBy: req.user,
  });

  //save the new post to the database
  post
    .save()
    .then((result) => {
      //send the newly created post a json response
      res.json({ post: result });
    })
    .catch((error) => {
      console.log(error);
    });
});

//Routes which require the user to be logged in ->middleware
router.get("/mypost", authenticateUser, (req, res) => {
  Post.find({ postedBy: req.user._id })
    .populate("postedBy", "_id name")
    .then((mypost) => {
      res.json({ mypost });
    })
    .catch((error) => {
      console.log(error);
    });
});

//Develop a route for likes -> put method on router ==> like
router.put("/like", authenticateUser, async (req, res) => {
  try {
    //find a post by -> id and update that post
    const result = await this.Post.findByIdAndUpdate(
      req.body.postId,
      {
        $push: { likes: req.user._id },
      },
      { new: true }
    ).exec();
    //once update is complete lets update like post and send it on the frontend
    res.json(result);
  } catch (error) {
    res.status(422).json({ error: error });
  }
});

//Develop a route for unlikes -> put method on router ==> dislike

router.put("/unlike", authenticateUser, async (req, res) => {
  try {
    const result = await Post.findByIdAndUpdate(
      req.body.postId,
      { $pull: { likes: req.user._id } },
      { new: true }
    ).exec();
    //once update is complete lets update unlike post and send it on the frontend
    res.json(result);
  } catch (error) {
    res.status(422).json({ error: error });
  }
});

//create a route adding comments to  post  and send this response front end
router.put("/comment", authenticateUser, async (req, res) => {
  try {
    //create a new comment objecct with the text and user id
    const comment = {
      text: req.body.text,
      postedBy: req.user._id,
    };
    //post by comment -> ID ->add new comment ->updated post
    const result = await Post.findByIdAndUpdate(
      req.body.postId,
      {
        $push: { comments: comment },
      },
      { new: true }
    )
      .populate("comments.postedBy", "_id name")
      .populate("postedBy", "_id name")
      .exec();
    //response
    res.json(result);
  } catch (error) {
    res.status(422).json({ error: error });
  }
});

//create a route with endpoint ->  deletepost with postId

router.delete("/deletepost/:postId", authenticateUser, async (req, res) => {
  try {
    //
    const post = await Post.findOne({ _id: req.params.postId })
      .populate("postedBy", " _id")
      .exec();
    //In case if no post is available
    if (!post) {
      return res.status(422).json({ error: err });
    }
    //check if the user who made the post is same as the user who is trying to delete post
    if (post.postedBy._id.toString() === req.user._id.toString()) {
      //if user is same remove the the post
      const result = await post.deleteOne();
      res.json(result);
    }
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;

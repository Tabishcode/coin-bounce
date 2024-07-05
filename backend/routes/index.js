const express = require("express");
const router = express.Router();
const authController  = require('../controller/authController');
const auth  = require('../middlewares/auth');
const blogController = require('../controller/blogController');
const commentController = require('../controller/commentController');
// Testing route
router.get("/test", (req, res) => res.json({ msg: "Working!" }));

//user 
//login
router.post('/login',authController.login); //when request came on login then authController will respnond
//register
router.post("/register", authController.Register);
//logout
router.post("/logout",auth,authController.logout); //first will go to middleware and checks if user is authentic, if tokens are valid then we wil go to our controller
//refresh
router.get("/refresh",authController.refresh);
//blog
//Create
router.post('/blog',auth, blogController.create);

//get all
router.get('/blog/all',auth, blogController.getAll);
//get blog by Id
router.get('/blog/:id',auth, blogController.getById);
//update
router.put('/blog', auth, blogController.update);
//delete
router.delete('/blog/:id',auth,blogController.delete);
//read all blogs
//read blog by Id

//create comment
router.post('/comment', auth, commentController.create);
//get
router.get('/comment/:id',auth, commentController.getById);
//
// read comments by blod Id

module.exports = router;

const Joi = require("joi"); //class import jo J capital
const User = require("../models/user");
const bcryptjs = require("bcryptjs");
const UserDTO = require("../dto/user");
const JWTService = require("../services/JWTservice");
const RefreshToken = require('../models/token');
const authController = {
  async Register(req, res, next) {
    //asyn function is non-blocking but when await used inside then it shows only synchronous nature for that part
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
    //validate user input
    const userRegistrationSchema = Joi.object({
      userName: Joi.string().min(5).max(20).required(),
      name: Joi.string().max(20).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
      confirmPassword: Joi.ref("password"),
    });
    const { error } = userRegistrationSchema.validate(req.body); //req.body ->data send by client and needed to be validated
    // If error in validation -> return error via middle ware
    if (error) {
      return next(error);
    }
    // if email or username already registered -> return error
    const { userName, name, email, password } = req.body;
      let user;
    try {
      const emailInUse = await User.exists({ email });

      const userNameInUse = await User.exists({ userName });

      if (emailInUse) {
        const error = {
          status: 409,
          message: "Email already registered, use another email!",
        };
        return next(error);
      }
      if (userNameInUse) {
        const error = {
          status: 409,
          message: "userName already registered, use another userName!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error); //internal server error
    }
    //password hash
    const hashedPassword = await bcryptjs.hash(password, 10); //for more secuity 10 added
    //store user data in db
    let accessToken;
    let refreshToken;
    try {
      const userToRegister = new User({
        userName: userName, //we can also write short one time userName bcz both name same
        email: email,
        name: name,
        password: hashedPassword,
      });
      user = await userToRegister.save();
      //token generation
      accessToken = JWTService.signAccessToken(
        { _id: user._id}, //before userName was also in payload but to make it consistent we only write _Id
        "30m"
      );

      refreshToken = JWTService.signRefreshToken({ _id: user._id }, "60m");
    } catch (error) {
      return next(error);
    }
    //store refresh token to db
    await JWTService.storeRefreshToken(refreshToken, user._id);
    //tokens generated now we have send them to client side mean cookies
    //send tokens in cookies
    res.cookie("accessToken", accessToken, {  // "access Token" is key and our value will store by this name
      maxAge: 1000 * 60 * 60 * 24, //one day  ,1000 is milli seconds
      httpOnly: true, //for security
    });
    res.cookie("refreshToken", refreshToken, { 
      maxAge: 1000 * 60 * 60 * 24, //one day
      httpOnly: true, //for security
    });

    // response send
    const userDto = new UserDTO(user);
    return res.status(201).json({ user: userDto,auth:true }); //typically to create res we use code 201
  },
  async login(req, res, next) {
    //validate user input
    //if validation error, return error
    //match username and password
    //return responses
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
    const userLoginSchema = Joi.object({
      userName: Joi.string().min(5).max(20).required(),
      password: Joi.string().pattern(passwordPattern).required(),
    });

    const { error } = userLoginSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { userName, password } = req.body;
    try {
      const user = await User.findOne({ userName: userName });
      if (!user) {
        const error = {
          status: 401,
          message: "Invalid userName",
        };
        return next(error);
      }

      const match = await bcryptjs.compare(password, user.password);
      if (!match) {
        const error = {
          status: 401,
          message: "Invalid password",
        };
        return next(error);
      }
      
      const accessToken = JWTService.signAccessToken(
        { _id: user._id },
        "30m"
      );

      const refreshToken = JWTService.signRefreshToken({ _id: user._id }, "60m");
      
      //update refresh token in database
      try {
        await RefreshToken.updateOne({
          _id : user._id
        }, {token: RefreshToken},
      { upsert:true}); //mean if not found then it will insert it else it will update it
        
      } catch (error) {
        
      }

      res.cookie('accessToken',accessToken,{maxAge: 1000*60*60*24,httpOnly:true});
      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });


      const userDto = new UserDTO(user);
      return res.status(200).json({ user: userDto, auth:true });
    } catch (error) {
      return next(error);
    }
  },
  async logout(req, res, next){
    console.log(req);
    //1. delete refresh token from db
    const {refreshToken} = req.cookies;
    try {
         await RefreshToken.deleteOne({token: refreshToken});
    } catch (error) {
         return next(error);
    }
    //delete cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    //2. response
    res.status(200).json({ user: null, auth: false });
  },
  async refresh(req, res, next){
      //1. get refresh Token from cookies
      //2. verify refresh Tokens
      //3. generate new tokens
      //4. update db, return responce

      const originalRefreshToken = req.cookies.refreshToken;
      let _id;
      try {
          _id = JWTService.verifyRefreshToken(originalRefreshToken)._id;
      } catch (e) {
        const error= {
          status: 401,
          message: 'Unauthoraized'
        }
        return next(error);
      }
      try {
           const match = RefreshToken.findOne({_id: _id, token: originalRefreshToken});
           if(!match){
            const error = {
              status: 401,
              message: 'Unauthoriazed'
            }
            return next(error);
           }
      } catch (e) {
        return next(e);
      }
      try {
          const accessToken = JWTService.signAccessToken({_id: _id},'30m');
          const refreshToken = JWTService.signAccessToken({_id: _id},'60m');
          await RefreshToken.updateOne({_id:_id}, {token: refreshToken});
          res.cookie("accessToken", accessToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
          });
          res.cookie("refreshToken", refreshToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
          });
      } catch(e){
            return next(e); 
      }
      const user = await User.findOne({_id:_id})
      const userDto = new UserDTO(user);
      return res.status(201).json({ user: userDto, auth: true });
  }
};
module.exports = authController;

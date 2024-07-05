const Joi = require("joi");
const fs = require("fs");
const path = require("path");
const Blog = require("../models/blog");
const { BACKEND_SERVER_PATH } = require("../config/index");
const BlogDTO = require("../dto/blog");
const BlogDetailsDTO = require('../dto/blog-details');
const Comment = require('../models/comment');

const { find } = require("../models/user");
const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {
  async create(req, res, next) {
    // 1. Validate req
    const createBlogSchema = Joi.object({
      title: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      content: Joi.string().required(),
      photo: Joi.string().required(),
    });

    const { error } = createBlogSchema.validate(req.body);
    if (error) {
      console.error("Validation error:", error.details);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { title, author, content, photo } = req.body;

    // Log the photo data for debugging
    console.log("Received photo data:", photo);

    // Check if the photo data is defined and properly formatted
    if (!photo || !/^data:image\/(png|jpg|jpeg);base64,/.test(photo)) {
      console.error("Invalid photo data:", photo);
      return res.status(400).json({ error: "Invalid photo data." });
    }

    // 2. Handle photo storage, naming
    let buffer;
    try {
      buffer = Buffer.from(
        photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
        "base64"
      );

      // Ensure the buffer is not empty
      if (!buffer || buffer.length === 0) {
        console.error("Failed to create buffer from photo data.");
        return res
          .status(400)
          .json({ error: "Failed to create buffer from photo data." });
      }
    } catch (bufferError) {
      console.error("Buffer creation error:", bufferError);
      return next(bufferError);
    }

    const imagePath = path.join("storage", `${Date.now()}-${author}.png`);

    // Ensure the storage directory exists
    const storageDir = path.dirname(imagePath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    try {
      fs.writeFileSync(imagePath, buffer);
      console.log("Image saved to:", imagePath);
    } catch (writeError) {
      console.error("File write error:", writeError);
      return next(writeError);
    }

    // 3. Add to db
    let newBlog;
    try {
      newBlog = new Blog({
        title,
        author,
        content,
        photoPath: `${BACKEND_SERVER_PATH}/${imagePath}`,
      });
      await newBlog.save();
    } catch (dbError) {
      console.error("Database save error:", dbError);
      return next(dbError);
    }

    // 4. Return response
    const blogDto = new BlogDTO(newBlog);
    return res.status(201).json({ blog: blogDto });
  },
  async getAll(req, res, next) {
    try {
      const blogs = await Blog.find({}); //empty filter

      const blogsDto = [];

      for (let i = 0; i < blogs.length; i++) {
        const dto = new BlogDTO(blogs[i]);
        blogsDto.push(dto);
      }
      return res.status(200).json({ blogs: blogsDto });
    } catch (error) {
      return next(error);
    }
  },
  async getById(req, res, next) {
    //validate id
    //get response
    console.log("i am in");
    const getByIdSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });
    const { error } = getByIdSchema.validate(req.params);
    if (error) {
      next(error);
    }
    let blog;
    const { id } = req.params;
    try {
      blog = await Blog.findOne({ _id: id }).populate("author");
    } catch (error) {
      return next(error);
    }
    const blogDto = new BlogDetailsDTO(blog);
    return res.status(200).json({ blog: blogDto });
  },
  async update(req, res, next) {
    console.log("hy");
    //validate
    //
    const updateBlogSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      blogId: Joi.string().regex(mongodbIdPattern).required(),
      photo: Joi.string()
    });
    const {error} = updateBlogSchema.validate(req.body);

    const {title, content, author, blogId, photo} = req.body;
    //delete previous photo
    //save new photo
    let blog;
    try {
        blog = await Blog.findOne({ _id: blogId });
        if(blog){
          console.log('pic found');
        }
    } catch (error) {
         return next(error);
    }
    if(photo){
      let previousPhoto = blog.photoPath;
      previousPhoto = previousPhoto.split("/").at(-1); //only we get last index
      //delete photo
      console.log(`storage/${previousPhoto}`);
      fs.unlinkSync(`${previousPhoto}`);

      // 2. Handle photo storage, naming
      let buffer;
      try {
        buffer = Buffer.from(
          photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
          "base64"
        );

        // Ensure the buffer is not empty
        if (!buffer || buffer.length === 0) {
          console.error("Failed to create buffer from photo data.");
          return res
            .status(400)
            .json({ error: "Failed to create buffer from photo data." });
        }
      } catch (bufferError) {
        console.error("Buffer creation error:", bufferError);
        return next(bufferError);
      }

      const imagePath = path.join("storage", `${Date.now()}-${author}.png`);

      // Ensure the storage directory exists
      const storageDir = path.dirname(imagePath);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      try {
        fs.writeFileSync(imagePath, buffer);
        console.log("Image saved to:", imagePath);
      } catch (writeError) {
        console.error("File write error:", writeError);
        return next(writeError);
      }
      await Blog.updateOne({_id : blogId},
        {title, content, photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`}
      );

    }
    else{
      await Blog.updateOne({_id: blogId},{title,content})
    }
    return res.status(200).json( {message:'blog updated!'})

  },

  async delete(req, res, next) {
    //validate id
    //delete blog
    //delete comments on blog
    const deleteBlogSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required()
    });
    const {error} = deleteBlogSchema.validate(req.params);
    const {id} = req.params;
    //delete blogs 
    //delete comments
    try {
        await Blog.deleteOne({_id: id});

        await Comment.deleteMany({blog : id});
    } catch (error) {
       return next(error);      
    }
    return res.status(200).json({message : 'blog deleted'});
  },
};

module.exports = blogController;

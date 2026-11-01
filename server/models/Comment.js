const mongoose = require("mongoose");

/* Spec columns: body, author, post, timestamps.
   `author` and `post` are refs — the API must populate("author", "username")
   or the frontend renders an empty bubble. */
const commentSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: [true, "Comment body is required"],
      trim: true,
      maxlength: [2000, "Comment is too long"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A comment must have an author"],
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogPost",
      required: [true, "A comment must belong to a post"],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

commentSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);

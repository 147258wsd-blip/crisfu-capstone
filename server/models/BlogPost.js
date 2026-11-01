const mongoose = require("mongoose");

/* Spec columns: title, content (String), author, timestamps.
   content holds either plain text or the JSON block payload produced by
   the frontend adapter; the adapter degrades gracefully to paragraphs. */
const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [160, "Title is too long"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A post must have an author"],
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

blogPostSchema.index({ author: 1, createdAt: -1 });
blogPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model("BlogPost", blogPostSchema);

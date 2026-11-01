const mongoose = require("mongoose");

/* Spec columns: title, description, imageUrl, repoUrl, liveUrl, user.
   description carries a JSON payload written by the frontend adapter
   (blurb / problem / built / learned / stack / tags …) and falls back to
   plain text, so `required: true` still means something to a human
   editing the database by hand. */
const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title is too long"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    repoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    liveUrl: {
      type: String,
      default: "",
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A project must belong to a user"],
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

projectSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Project", projectSchema);
